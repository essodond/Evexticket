import uuid
from datetime import timedelta

from django.db import IntegrityError
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Booking, SafetyIncident, ScheduledTrip, TripTrackingSession
from .models.audit import log_action
from .safety_serializers import PublicSafetyIncidentSerializer, SafetyIncidentSerializer
from .services.access import (
    can_administer_company,
    can_manage_scheduled_trip,
    admin_company_ids_for_user,
)
from .services.db_retry import run_in_transaction
from .services.safety import incident_reporting_window, is_incident_reportable_now


ACTIVE_STATUSES = [
    SafetyIncident.Status.REPORTED,
    SafetyIncident.Status.ACKNOWLEDGED,
]
MAX_ACTIVE_INCIDENTS_PER_TRIP = 10


class ActiveIncidentLimitReached(Exception):
    pass


class IdempotencyKeyCollision(Exception):
    pass


class IncidentWindowClosed(Exception):
    pass


def _incident_queryset():
    return SafetyIncident.objects.select_related(
        'scheduled_trip__trip__company',
        'scheduled_trip__trip__departure_city',
        'scheduled_trip__trip__arrival_city',
        'reported_by',
        'acknowledged_by',
        'resolved_by',
    )


def _scheduled_trip(pk):
    try:
        return ScheduledTrip.objects.select_related(
            'trip__company',
            'trip__departure_city',
            'trip__arrival_city',
        ).get(pk=pk)
    except (ScheduledTrip.DoesNotExist, ValueError, TypeError):
        return None


def _passenger_can_view(user, scheduled_trip):
    return Booking.objects.filter(
        user=user,
        scheduled_trip=scheduled_trip,
        status__in=['confirmed', 'completed'],
    ).exists()


def _severity_for(incident_type, travel_state):
    if incident_type in [SafetyIncident.IncidentType.ACCIDENT, SafetyIncident.IncidentType.MEDICAL]:
        return SafetyIncident.Severity.CRITICAL
    if incident_type == SafetyIncident.IncidentType.SECURITY:
        return SafetyIncident.Severity.HIGH
    if travel_state == SafetyIncident.TravelState.STOPPED:
        return SafetyIncident.Severity.HIGH
    if incident_type in [SafetyIncident.IncidentType.BREAKDOWN, SafetyIncident.IncidentType.ROAD_HAZARD]:
        return SafetyIncident.Severity.MEDIUM
    return SafetyIncident.Severity.LOW


def _public_message_for(incident_type, travel_state):
    messages = {
        SafetyIncident.IncidentType.ACCIDENT: (
            'Un accident a été signalé sur ce voyage. Suivez les instructions du personnel.'
        ),
        SafetyIncident.IncidentType.BREAKDOWN: (
            'Une panne a été signalée sur ce voyage. Une prise en charge est en cours.'
        ),
        SafetyIncident.IncidentType.MEDICAL: (
            'Une urgence médicale a été signalée à bord. Suivez les instructions du personnel.'
        ),
        SafetyIncident.IncidentType.ROAD_HAZARD: (
            'Un danger routier perturbe ce voyage. Restez attentif aux prochaines instructions.'
        ),
        SafetyIncident.IncidentType.SECURITY: (
            'Un problème de sécurité a été signalé. Suivez les instructions du personnel.'
        ),
        SafetyIncident.IncidentType.OTHER: (
            'Un incident a été signalé sur ce voyage. Suivez les instructions du personnel.'
        ),
    }
    message = messages[incident_type]
    if travel_state == SafetyIncident.TravelState.STOPPED:
        message += ' Le véhicule est actuellement à l’arrêt.'
    return message


def _parse_boolean(value, field_name, default=False):
    if value is None:
        return default
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        normalized = value.strip().lower()
        if normalized in ['true', '1', 'yes']:
            return True
        if normalized in ['false', '0', 'no']:
            return False
    raise ValueError(f'Le champ {field_name} doit être un booléen.')


def _parse_report_payload(data, scheduled_trip):
    incident_type = data.get('incident_type')
    valid_types = {choice for choice, _ in SafetyIncident.IncidentType.choices}
    if incident_type not in valid_types:
        raise ValueError('Type d’incident invalide.')

    travel_state = data.get('travel_state', SafetyIncident.TravelState.UNKNOWN)
    valid_states = {choice for choice, _ in SafetyIncident.TravelState.choices}
    if travel_state not in valid_states:
        raise ValueError('État du trajet invalide.')

    description = str(data.get('description') or '').strip()
    if len(description) > 1000:
        raise ValueError('La description ne peut pas dépasser 1000 caractères.')

    try:
        injured_count = int(data.get('injured_count', 0))
    except (TypeError, ValueError):
        raise ValueError('Le nombre de blessés est invalide.')
    if injured_count < 0 or injured_count > 999:
        raise ValueError('Le nombre de blessés doit être compris entre 0 et 999.')

    emergency_contacted = _parse_boolean(
        data.get('emergency_services_contacted'),
        'emergency_services_contacted',
    )

    raw_key = data.get('idempotency_key')
    try:
        idempotency_key = uuid.UUID(str(raw_key))
    except (TypeError, ValueError, AttributeError):
        raise ValueError('Une clé idempotency_key UUID valide est obligatoire.')

    occurred_at = timezone.now()
    if data.get('occurred_at'):
        occurred_at = parse_datetime(str(data['occurred_at']))
        if not occurred_at:
            raise ValueError('Date de l’incident invalide.')
        if timezone.is_naive(occurred_at):
            occurred_at = timezone.make_aware(occurred_at)
        if occurred_at > timezone.now() + timedelta(minutes=5):
            raise ValueError('La date de l’incident ne peut pas être dans le futur.')

    latitude = data.get('latitude')
    longitude = data.get('longitude')
    has_latitude = latitude not in [None, '']
    has_longitude = longitude not in [None, '']
    if has_latitude != has_longitude:
        raise ValueError('Latitude et longitude doivent être fournies ensemble.')

    accuracy_m = None
    location_recorded_at = None
    location_source = SafetyIncident.LocationSource.UNAVAILABLE
    if has_latitude:
        try:
            latitude = float(latitude)
            longitude = float(longitude)
            if not -90 <= latitude <= 90 or not -180 <= longitude <= 180:
                raise ValueError
            raw_accuracy = data.get('accuracy_m')
            accuracy_m = float(raw_accuracy) if raw_accuracy not in [None, ''] else None
            if accuracy_m is not None and not 0 <= accuracy_m <= 100000:
                raise ValueError
        except (TypeError, ValueError):
            raise ValueError('Coordonnées GPS invalides.')
        location_recorded_at = occurred_at
        location_source = SafetyIncident.LocationSource.DEVICE
    else:
        latitude = None
        longitude = None
        session = TripTrackingSession.objects.filter(scheduled_trip=scheduled_trip).first()
        if (
            session
            and session.latitude is not None
            and session.longitude is not None
            and session.last_position_at
            and timezone.now() - timedelta(minutes=2) <= session.last_position_at
            and session.last_position_at <= timezone.now() + timedelta(minutes=2)
        ):
            latitude = session.latitude
            longitude = session.longitude
            accuracy_m = session.accuracy_m
            location_recorded_at = session.last_position_at
            location_source = SafetyIncident.LocationSource.TRACKING

    return {
        'incident_type': incident_type,
        'travel_state': travel_state,
        'severity': _severity_for(incident_type, travel_state),
        'description': description,
        'public_message': _public_message_for(incident_type, travel_state),
        'latitude': latitude,
        'longitude': longitude,
        'accuracy_m': accuracy_m,
        'location_recorded_at': location_recorded_at,
        'location_source': location_source,
        'injured_count': injured_count,
        'emergency_services_contacted': emergency_contacted,
        'idempotency_key': idempotency_key,
        'occurred_at': occurred_at,
    }


class SafetyIncidentListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        company_ids = admin_company_ids_for_user(request.user)
        if company_ids is not None and not company_ids:
            return Response(
                {'detail': 'Accès réservé aux administrateurs des compagnies.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        incidents = _incident_queryset()
        if company_ids is not None:
            incidents = incidents.filter(scheduled_trip__trip__company_id__in=company_ids)

        requested_status = request.query_params.get('status')
        if requested_status == 'active':
            incidents = incidents.filter(status__in=ACTIVE_STATUSES)
        elif requested_status:
            valid_statuses = {choice for choice, _ in SafetyIncident.Status.choices}
            if requested_status not in valid_statuses:
                return Response({'detail': 'Filtre de statut invalide.'}, status=status.HTTP_400_BAD_REQUEST)
            incidents = incidents.filter(status=requested_status)

        severity = request.query_params.get('severity')
        if severity:
            valid_severities = {choice for choice, _ in SafetyIncident.Severity.choices}
            if severity not in valid_severities:
                return Response({'detail': 'Filtre de gravité invalide.'}, status=status.HTTP_400_BAD_REQUEST)
            incidents = incidents.filter(severity=severity)

        scheduled_trip = request.query_params.get('scheduled_trip')
        if scheduled_trip:
            if not str(scheduled_trip).isdigit():
                return Response({'detail': 'Voyage invalide.'}, status=status.HTTP_400_BAD_REQUEST)
            incidents = incidents.filter(scheduled_trip_id=scheduled_trip)

        return Response(SafetyIncidentSerializer(incidents[:250], many=True).data)


class ScheduledTripIncidentView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        scheduled_trip = _scheduled_trip(pk)
        if not scheduled_trip:
            return Response({'detail': 'Voyage introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        incidents = _incident_queryset().filter(scheduled_trip=scheduled_trip)
        if can_administer_company(request.user, scheduled_trip.trip.company_id):
            return Response(SafetyIncidentSerializer(incidents, many=True).data)
        if (
            can_manage_scheduled_trip(request.user, scheduled_trip)
            or _passenger_can_view(request.user, scheduled_trip)
        ):
            incidents = incidents.filter(status__in=ACTIVE_STATUSES)
            return Response(PublicSafetyIncidentSerializer(incidents, many=True).data)
        return Response({'detail': 'Accès non autorisé.'}, status=status.HTTP_403_FORBIDDEN)

    def post(self, request, pk):
        scheduled_trip = _scheduled_trip(pk)
        if not scheduled_trip:
            return Response({'detail': 'Voyage introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        if not can_manage_scheduled_trip(request.user, scheduled_trip):
            return Response({'detail': 'Accès non autorisé.'}, status=status.HTTP_403_FORBIDDEN)

        try:
            values = _parse_report_payload(request.data, scheduled_trip)
        except ValueError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        idempotency_key = values.pop('idempotency_key')
        existing = _incident_queryset().filter(idempotency_key=idempotency_key).first()
        if existing:
            if (
                existing.scheduled_trip_id != scheduled_trip.id
                or existing.reported_by_id != request.user.id
            ):
                return Response(
                    {'detail': 'Cette clé de déduplication appartient à un autre signalement.'},
                    status=status.HTTP_409_CONFLICT,
                )
            return Response(SafetyIncidentSerializer(existing).data, status=status.HTTP_200_OK)

        if not is_incident_reportable_now(scheduled_trip):
            return Response(
                {'detail': 'Un incident en direct ne peut être signalé que pendant la fenêtre d’exploitation d’un voyage actif.'},
                status=status.HTTP_409_CONFLICT,
            )
        window_start, _ = incident_reporting_window(scheduled_trip)
        if values['occurred_at'] < window_start:
            return Response(
                {'detail': 'La date déclarée précède la fenêtre d’exploitation du voyage.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        def create_incident():
            locked_trip = ScheduledTrip.objects.select_for_update().select_related('trip').get(
                pk=scheduled_trip.pk
            )
            if not is_incident_reportable_now(locked_trip):
                raise IncidentWindowClosed
            duplicate = SafetyIncident.objects.filter(idempotency_key=idempotency_key).first()
            if duplicate:
                if (
                    duplicate.scheduled_trip_id != scheduled_trip.id
                    or duplicate.reported_by_id != request.user.id
                ):
                    raise IdempotencyKeyCollision
                return duplicate, False
            active_count = SafetyIncident.objects.filter(
                scheduled_trip=scheduled_trip,
                status__in=ACTIVE_STATUSES,
            ).count()
            if active_count >= MAX_ACTIVE_INCIDENTS_PER_TRIP:
                raise ActiveIncidentLimitReached
            session = TripTrackingSession.objects.filter(scheduled_trip=locked_trip).first()
            new_incident = SafetyIncident.objects.create(
                **values,
                idempotency_key=idempotency_key,
                scheduled_trip=locked_trip,
                tracking_session=session,
                reported_by=request.user,
                status=SafetyIncident.Status.REPORTED,
            )
            log_action(
                request.user,
                'CREATE',
                new_incident,
                new_values={
                    'incident_type': new_incident.incident_type,
                    'travel_state': new_incident.travel_state,
                    'severity': new_incident.severity,
                    'status': new_incident.status,
                    'scheduled_trip': str(new_incident.scheduled_trip_id),
                },
                ip_address=request.META.get('REMOTE_ADDR'),
            )
            return new_incident, True

        try:
            incident, created = run_in_transaction(create_incident)
        except IdempotencyKeyCollision:
            return Response(
                {'detail': 'Cette clé de déduplication appartient à un autre signalement.'},
                status=status.HTTP_409_CONFLICT,
            )
        except ActiveIncidentLimitReached:
            return Response(
                {'detail': 'Trop d’incidents sont déjà ouverts pour ce voyage. Traitez-les avant un nouveau signalement.'},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )
        except IncidentWindowClosed:
            return Response(
                {'detail': 'Ce voyage n’est plus dans sa fenêtre d’exploitation active.'},
                status=status.HTTP_409_CONFLICT,
            )
        except IntegrityError:
            duplicate = _incident_queryset().filter(idempotency_key=idempotency_key).first()
            if not duplicate:
                raise
            if (
                duplicate.scheduled_trip_id != scheduled_trip.id
                or duplicate.reported_by_id != request.user.id
            ):
                return Response(
                    {'detail': 'Cette clé de déduplication appartient à un autre signalement.'},
                    status=status.HTTP_409_CONFLICT,
                )
            incident, created = duplicate, False

        return Response(
            SafetyIncidentSerializer(incident).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class SafetyIncidentDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, pk):
        try:
            incident = _incident_queryset().get(pk=pk)
        except (SafetyIncident.DoesNotExist, ValueError, TypeError):
            return Response({'detail': 'Incident introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        company_id = incident.scheduled_trip.trip.company_id
        if not can_administer_company(request.user, company_id):
            return Response(
                {'detail': 'Seuls les administrateurs de la compagnie peuvent traiter cet incident.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        requested_status = request.data.get('status')
        if requested_status not in [SafetyIncident.Status.ACKNOWLEDGED, SafetyIncident.Status.RESOLVED]:
            return Response(
                {'detail': 'Le statut doit être acknowledged ou resolved.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        resolution_note = str(request.data.get('resolution_note') or '').strip()
        if requested_status == SafetyIncident.Status.RESOLVED and not resolution_note:
            return Response(
                {'detail': 'Une note de résolution est obligatoire.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if len(resolution_note) > 2000:
            return Response(
                {'detail': 'La note de résolution ne peut pas dépasser 2000 caractères.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        def transition_incident():
            current = SafetyIncident.objects.select_for_update().get(pk=incident.pk)
            old_status = current.status
            now = timezone.now()
            if requested_status == SafetyIncident.Status.ACKNOWLEDGED:
                if current.status == SafetyIncident.Status.RESOLVED:
                    return current, True
                if current.status == SafetyIncident.Status.REPORTED:
                    current.status = SafetyIncident.Status.ACKNOWLEDGED
                    current.acknowledged_by = request.user
                    current.acknowledged_at = now
            else:
                if current.status != SafetyIncident.Status.RESOLVED:
                    if not current.acknowledged_at:
                        current.acknowledged_by = request.user
                        current.acknowledged_at = now
                    current.status = SafetyIncident.Status.RESOLVED
                    current.resolved_by = request.user
                    current.resolved_at = now
                    current.resolution_note = resolution_note
            current.save()
            if current.status != old_status:
                log_action(
                    request.user,
                    'UPDATE',
                    current,
                    old_values={'status': old_status},
                    new_values={'status': current.status},
                    ip_address=request.META.get('REMOTE_ADDR'),
                )
            return current, False

        incident, cannot_reopen = run_in_transaction(transition_incident)
        if cannot_reopen:
            return Response(
                {'detail': 'Un incident résolu ne peut pas être rouvert.'},
                status=status.HTTP_409_CONFLICT,
            )

        return Response(SafetyIncidentSerializer(incident).data)
