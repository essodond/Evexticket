from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from rest_framework.exceptions import NotFound, ValidationError

from guichet.models import ControlePassager, VenteGuichet

from .models import Booking, Reservation, ScheduledTrip, Siege
from .models.audit import log_action


TERMINAL_STATUSES = {
    'booking': {'cancelled', 'completed'},
    'mobile': {
        Reservation.STATUT_ECHOUE,
        Reservation.STATUT_EXPIRE,
        Reservation.STATUT_REMBOURSE,
    },
    'guichet': {'annule', 'rembourse', 'utilise'},
}


def _as_number(value):
    return float(value or 0)


def _route(trip):
    return f'{trip.departure_city.name} → {trip.arrival_city.name}'


def _last_control(item, source):
    relation = {
        'booking': 'controles_guichet',
        'mobile': 'controles',
        'guichet': 'controles',
    }[source]
    controls = getattr(item, relation).all()
    return max(controls, key=lambda control: control.created_at, default=None)


def serialize_ticket(item, source):
    if source == 'booking':
        company = item.trip.company
        voyage = item.scheduled_trip
        status = item.status
        latest_payment = max(
            item.payments.all(),
            key=lambda payment: payment.payment_date,
            default=None,
        )
        payment_status = latest_payment.status if latest_payment else None
        payload = {
            'id': str(item.id),
            'reference': f'EVEX-{item.id:06d}',
            'client_name': item.passenger_name,
            'client_email': item.passenger_email,
            'client_phone': item.passenger_phone,
            'route': _route(item.trip),
            'travel_date': voyage.date if voyage else None,
            'departure_time': item.trip.departure_time,
            'voyage_id': voyage.id if voyage else None,
            'seat': item.seat_number,
            'amount': _as_number(item.total_price),
            'payment_method': item.payment_method,
            'status': status,
            'payment_status': payment_status,
            'created_at': item.booking_date,
            'sale_location': None,
        }
        can_refund = status == 'confirmed'
    elif source == 'mobile':
        company = item.voyage.trip.company
        voyage = item.voyage
        status = item.statut_paiement
        payload = {
            'id': str(item.id),
            'reference': item.reference_evex,
            'client_name': item.client_nom,
            'client_email': None,
            'client_phone': item.client_telephone,
            'route': _route(item.voyage.trip),
            'travel_date': item.voyage.date,
            'departure_time': item.voyage.trip.departure_time,
            'voyage_id': item.voyage_id,
            'seat': item.siege.numero,
            'amount': item.montant_total,
            'payment_method': item.operateur.lower(),
            'status': status,
            'payment_status': status,
            'created_at': item.created_at,
            'sale_location': 'Application Evex',
        }
        can_refund = status == Reservation.STATUT_PAYE
    else:
        company = item.voyage.trip.company
        voyage = item.voyage
        status = item.statut
        location = None
        if item.agence:
            location = item.agence.nom
        if item.guichet:
            location = f'{location} · {item.guichet.code}' if location else item.guichet.code
        payload = {
            'id': str(item.id),
            'reference': item.reference_vente,
            'client_name': item.client_nom,
            'client_email': None,
            'client_phone': item.client_telephone,
            'route': _route(item.voyage.trip),
            'travel_date': item.voyage.date,
            'departure_time': item.voyage.trip.departure_time,
            'voyage_id': item.voyage_id,
            'seat': item.siege.numero,
            'amount': item.montant_total,
            'payment_method': item.mode_paiement,
            'status': status,
            'payment_status': status,
            'created_at': item.created_at,
            'sale_location': location,
        }
        can_refund = status == 'valide'

    last_control = _last_control(item, source)
    used = (
        status in {'completed', 'utilise'}
        or bool(last_control and last_control.resultat == 'valide')
    )
    terminal = status in TERMINAL_STATUSES[source]
    payload.update({
        'source': source,
        'channel': 'guichet' if source == 'guichet' else 'application',
        'company_id': company.id,
        'company_name': company.name,
        'control_status': last_control.resultat if last_control else 'en_attente',
        'can_cancel': not terminal and not used,
        'can_refund': can_refund and not used,
        'can_edit': not terminal and not used,
    })
    return payload


def ticket_collection(company=None, voyage=None, limit=500):
    booking_queryset = Booking.all_objects.select_related(
        'trip__company',
        'trip__departure_city',
        'trip__arrival_city',
        'scheduled_trip',
    ).prefetch_related('payments', 'controles_guichet')
    reservation_queryset = Reservation.objects.select_related(
        'voyage__trip__company',
        'voyage__trip__departure_city',
        'voyage__trip__arrival_city',
        'siege',
    ).prefetch_related('controles')
    counter_queryset = VenteGuichet.objects.select_related(
        'voyage__trip__company',
        'voyage__trip__departure_city',
        'voyage__trip__arrival_city',
        'siege',
        'agence',
        'guichet',
    ).prefetch_related('controles')

    if company is not None:
        booking_queryset = booking_queryset.filter(trip__company=company)
        reservation_queryset = reservation_queryset.filter(voyage__trip__company=company)
        counter_queryset = counter_queryset.filter(voyage__trip__company=company)
    if voyage is not None:
        booking_queryset = booking_queryset.filter(scheduled_trip=voyage)
        reservation_queryset = reservation_queryset.filter(voyage=voyage)
        counter_queryset = counter_queryset.filter(voyage=voyage)

    if limit:
        booking_queryset = booking_queryset.order_by('-booking_date')[:limit]
        reservation_queryset = reservation_queryset.order_by('-created_at')[:limit]
        counter_queryset = counter_queryset.order_by('-created_at')[:limit]

    items = [serialize_ticket(item, 'booking') for item in booking_queryset]
    items.extend(serialize_ticket(item, 'mobile') for item in reservation_queryset)
    items.extend(serialize_ticket(item, 'guichet') for item in counter_queryset)
    return sorted(items, key=lambda item: item['created_at'], reverse=True)


def filter_ticket_collection(items, params):
    query = str(params.get('q') or '').strip().lower()
    source = str(params.get('source') or '').strip()
    state = str(params.get('status') or '').strip()
    company_id = str(params.get('company') or '').strip()
    travel_date = str(params.get('date') or '').strip()
    voyage_id = str(params.get('voyage') or '').strip()
    if query:
        items = [
            item for item in items
            if query in ' '.join([
                item['reference'],
                item['client_name'],
                item['client_phone'],
                item['company_name'],
                item['route'],
            ]).lower()
        ]
    if source:
        items = [item for item in items if item['source'] == source]
    if state:
        items = [item for item in items if item['status'] == state]
    if company_id:
        items = [item for item in items if str(item['company_id']) == company_id]
    if travel_date:
        items = [item for item in items if str(item['travel_date'] or '') == travel_date]
    if voyage_id:
        items = [item for item in items if str(item['voyage_id'] or '') == voyage_id]
    return items


def _get_ticket(company, source, pk, for_update=False):
    manager = {
        'booking': Booking.all_objects,
        'mobile': Reservation.objects,
        'guichet': VenteGuichet.objects,
    }.get(source)
    if manager is None:
        raise ValidationError({'detail': 'Source de billet inconnue.'})
    if for_update:
        manager = manager.select_for_update()
    filters = {
        'booking': {'pk': pk, 'trip__company': company},
        'mobile': {'pk': pk, 'voyage__trip__company': company},
        'guichet': {'pk': pk, 'voyage__trip__company': company},
    }[source]
    item = manager.filter(**filters).first()
    if item is None:
        raise NotFound('Billet introuvable pour cette compagnie.')
    return item


def _ticket_voyage(item, source):
    return item.scheduled_trip if source == 'booking' else item.voyage


def _ticket_is_used(item, source):
    if source == 'booking':
        return item.status == 'completed' or ControlePassager.objects.filter(
            booking=item,
            resultat='valide',
        ).exists()
    if source == 'mobile':
        return ControlePassager.objects.filter(
            reservation=item,
            resultat='valide',
        ).exists()
    return item.statut == 'utilise' or ControlePassager.objects.filter(
        vente=item,
        resultat='valide',
    ).exists()


def recalculate_voyage_availability(voyage):
    if voyage is None:
        return
    occupied = {
        str(number)
        for number in Booking.objects.filter(
            scheduled_trip=voyage,
            status__in=['pending', 'confirmed'],
        ).values_list('seat_number', flat=True)
    }
    occupied.update(
        str(number)
        for number in Reservation.objects.filter(
            voyage=voyage,
            statut_paiement__in=[
                Reservation.STATUT_EN_ATTENTE,
                Reservation.STATUT_PAYE,
            ],
        ).values_list('siege__numero', flat=True)
    )
    occupied.update(
        str(number)
        for number in VenteGuichet.objects.filter(
            voyage=voyage,
            statut__in=['valide', 'utilise'],
        ).values_list('siege__numero', flat=True)
    )
    ScheduledTrip.objects.filter(pk=voyage.pk).update(
        available_seats=max(voyage.trip.capacity - len(occupied), 0),
    )


def _release_seat_if_unused(voyage, seat_number):
    if voyage is None:
        return
    active = (
        Booking.objects.filter(
            scheduled_trip=voyage,
            seat_number=str(seat_number),
            status__in=['pending', 'confirmed'],
        ).exists()
        or Reservation.objects.filter(
            voyage=voyage,
            siege__numero=seat_number,
            statut_paiement__in=[
                Reservation.STATUT_EN_ATTENTE,
                Reservation.STATUT_PAYE,
            ],
        ).exists()
        or VenteGuichet.objects.filter(
            voyage=voyage,
            siege__numero=seat_number,
            statut__in=['valide', 'utilise'],
        ).exists()
    )
    if not active:
        Siege.objects.filter(voyage=voyage, numero=seat_number).update(
            statut=Siege.STATUT_LIBRE,
            reserve_at=None,
        )


def _actor_role(user):
    if hasattr(user, 'agentguichet'):
        return 'AGENT_GUICHET'
    return 'ADMIN_COMPAGNIE'


@transaction.atomic
def perform_ticket_action(
    *,
    user,
    company,
    source,
    pk,
    action,
    reason='',
    changes=None,
    ip_address=None,
):
    if action not in {'cancel', 'refund', 'update'}:
        raise ValidationError({'detail': 'Action de billet inconnue.'})
    reason = str(reason or '').strip()
    changes = changes or {}
    if action in {'cancel', 'refund'} and not reason:
        raise ValidationError({'detail': 'Une justification est obligatoire.'})

    item = _get_ticket(company, source, pk, for_update=True)
    voyage = _ticket_voyage(item, source)
    if _ticket_is_used(item, source):
        raise ValidationError({'detail': 'Un billet déjà utilisé ne peut plus être modifié, annulé ou remboursé.'})

    old_values = {
        'status': item.status if source == 'booking' else (
            item.statut_paiement if source == 'mobile' else item.statut
        ),
        'client_name': item.passenger_name if source == 'booking' else item.client_nom,
        'client_phone': item.passenger_phone if source == 'booking' else item.client_telephone,
        'client_email': item.passenger_email if source == 'booking' else None,
    }
    seat_number = item.seat_number if source == 'booking' else item.siege.numero

    if action == 'update':
        name = str(changes.get('client_name') or '').strip()
        phone = str(changes.get('client_phone') or '').strip()
        if not name or not phone:
            raise ValidationError({'detail': 'Le nom et le téléphone du passager sont obligatoires.'})
        if source == 'booking':
            item.passenger_name = name
            item.passenger_phone = phone
            fields = ['passenger_name', 'passenger_phone']
            if 'client_email' in changes:
                item.passenger_email = str(changes.get('client_email') or '').strip()
                fields.append('passenger_email')
            item.updated_by = user
            fields.append('updated_by')
            item.save(update_fields=fields)
        else:
            item.client_nom = name
            item.client_telephone = phone
            item.save(update_fields=['client_nom', 'client_telephone'])
    elif source == 'booking':
        if item.status in TERMINAL_STATUSES[source]:
            raise ValidationError({'detail': 'Ce billet est déjà clôturé.'})
        item.status = 'cancelled'
        item.is_deleted = True
        item.deleted_at = timezone.now()
        item.deleted_by = user
        item.updated_by = user
        item.save(update_fields=[
            'status',
            'is_deleted',
            'deleted_at',
            'deleted_by',
            'updated_by',
        ])
        if action == 'refund':
            item.payments.filter(status='completed').update(status='refunded')
    elif source == 'mobile':
        if item.statut_paiement in TERMINAL_STATUSES[source]:
            raise ValidationError({'detail': 'Ce billet est déjà clôturé.'})
        if action == 'refund' and item.statut_paiement != Reservation.STATUT_PAYE:
            raise ValidationError({'detail': 'Seul un billet payé peut être remboursé.'})
        item.statut_paiement = (
            Reservation.STATUT_REMBOURSE
            if action == 'refund'
            else Reservation.STATUT_EXPIRE
        )
        item.save(update_fields=['statut_paiement'])
    else:
        if item.statut in TERMINAL_STATUSES[source]:
            raise ValidationError({'detail': 'Ce billet est déjà clôturé.'})
        item.statut = 'rembourse' if action == 'refund' else 'annule'
        item.save(update_fields=['statut'])

    _release_seat_if_unused(voyage, seat_number)
    recalculate_voyage_availability(voyage)
    refreshed = _get_ticket(company, source, pk)
    serialized = serialize_ticket(refreshed, source)
    log_action(
        user=user,
        action='UPDATE',
        instance=refreshed,
        old_values=old_values,
        new_values={
            'operation': action,
            'reason': reason or 'Mise à jour des informations du passager',
            'actor_role': _actor_role(user),
            'source': source,
            'status': serialized['status'],
            'client_name': serialized['client_name'],
            'client_phone': serialized['client_phone'],
            'client_email': serialized['client_email'],
        },
        ip_address=ip_address,
    )
    return serialized


def ticket_audit_queryset(company):
    booking_ids = Booking.all_objects.filter(
        trip__company=company,
    ).values_list('id', flat=True)
    reservation_ids = Reservation.objects.filter(
        voyage__trip__company=company,
    ).values_list('id', flat=True)
    sale_ids = VenteGuichet.objects.filter(
        voyage__trip__company=company,
    ).values_list('id', flat=True)
    from .models import AuditLog
    return AuditLog.objects.select_related('user').filter(
        Q(model_name='Booking', object_id__in=[str(value) for value in booking_ids])
        | Q(model_name='Reservation', object_id__in=[str(value) for value in reservation_ids])
        | Q(model_name='VenteGuichet', object_id__in=[str(value) for value in sale_ids])
    )
