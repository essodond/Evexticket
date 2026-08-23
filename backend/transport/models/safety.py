import uuid

from django.conf import settings
from django.db import models
from django.utils import timezone

from .base import ScheduledTrip
from .tracking import TripTrackingSession


class SafetyIncident(models.Model):
    class IncidentType(models.TextChoices):
        ACCIDENT = 'accident', 'Accident'
        BREAKDOWN = 'breakdown', 'Panne'
        MEDICAL = 'medical', 'Urgence médicale'
        ROAD_HAZARD = 'road_hazard', 'Danger sur la route'
        SECURITY = 'security', 'Problème de sécurité'
        OTHER = 'other', 'Autre incident'

    class TravelState(models.TextChoices):
        CONTINUING = 'continuing', 'Le véhicule peut continuer'
        STOPPED = 'stopped', 'Le véhicule est à l’arrêt'
        UNKNOWN = 'unknown', 'État inconnu'

    class Severity(models.TextChoices):
        LOW = 'low', 'Faible'
        MEDIUM = 'medium', 'Modérée'
        HIGH = 'high', 'Élevée'
        CRITICAL = 'critical', 'Critique'

    class Status(models.TextChoices):
        REPORTED = 'reported', 'Signalé'
        ACKNOWLEDGED = 'acknowledged', 'Pris en charge'
        RESOLVED = 'resolved', 'Résolu'

    class LocationSource(models.TextChoices):
        DEVICE = 'device', 'Appareil du déclarant'
        TRACKING = 'tracking', 'Dernière position du suivi'
        UNAVAILABLE = 'unavailable', 'Indisponible'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    scheduled_trip = models.ForeignKey(
        ScheduledTrip,
        on_delete=models.PROTECT,
        related_name='safety_incidents',
    )
    tracking_session = models.ForeignKey(
        TripTrackingSession,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='safety_incidents',
    )
    reported_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reported_safety_incidents',
    )
    incident_type = models.CharField(max_length=24, choices=IncidentType.choices)
    travel_state = models.CharField(
        max_length=16,
        choices=TravelState.choices,
        default=TravelState.UNKNOWN,
    )
    severity = models.CharField(max_length=12, choices=Severity.choices)
    status = models.CharField(
        max_length=16,
        choices=Status.choices,
        default=Status.REPORTED,
    )
    description = models.TextField(blank=True, max_length=1000)
    public_message = models.CharField(max_length=300)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    accuracy_m = models.FloatField(null=True, blank=True)
    location_recorded_at = models.DateTimeField(null=True, blank=True)
    location_source = models.CharField(
        max_length=16,
        choices=LocationSource.choices,
        default=LocationSource.UNAVAILABLE,
    )
    injured_count = models.PositiveSmallIntegerField(default=0)
    emergency_services_contacted = models.BooleanField(default=False)
    idempotency_key = models.UUIDField(unique=True, editable=False)
    occurred_at = models.DateTimeField(default=timezone.now)
    acknowledged_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='acknowledged_safety_incidents',
    )
    acknowledged_at = models.DateTimeField(null=True, blank=True)
    resolved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='resolved_safety_incidents',
    )
    resolved_at = models.DateTimeField(null=True, blank=True)
    resolution_note = models.TextField(blank=True, max_length=2000)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-occurred_at', '-created_at']
        indexes = [
            models.Index(fields=['scheduled_trip', 'status'], name='safety_trip_status_idx'),
            models.Index(fields=['severity', 'status'], name='safety_severity_status_idx'),
            models.Index(fields=['-created_at'], name='safety_created_idx'),
        ]
        constraints = [
            models.CheckConstraint(
                condition=(
                    models.Q(
                        latitude__isnull=True,
                        longitude__isnull=True,
                        accuracy_m__isnull=True,
                        location_recorded_at__isnull=True,
                        location_source='unavailable',
                    )
                    | (
                        models.Q(
                            latitude__isnull=False,
                            longitude__isnull=False,
                            latitude__gte=-90,
                            latitude__lte=90,
                            longitude__gte=-180,
                            longitude__lte=180,
                            location_recorded_at__isnull=False,
                            location_source__in=['device', 'tracking'],
                        )
                    )
                ),
                name='safety_location_consistent',
            ),
            models.CheckConstraint(
                condition=(
                    models.Q(accuracy_m__isnull=True)
                    | models.Q(accuracy_m__gte=0, accuracy_m__lte=100000)
                ),
                name='safety_accuracy_valid',
            ),
            models.CheckConstraint(
                condition=models.Q(injured_count__lte=999),
                name='safety_injured_count_valid',
            ),
            models.CheckConstraint(
                condition=(
                    ~models.Q(status='resolved')
                    | (
                        models.Q(resolved_at__isnull=False)
                        & ~models.Q(resolution_note='')
                    )
                ),
                name='safety_resolution_consistent',
            ),
            models.CheckConstraint(
                condition=(
                    models.Q(status='reported')
                    | models.Q(acknowledged_at__isnull=False)
                ),
                name='safety_acknowledged_consistent',
            ),
        ]
        verbose_name = 'Incident de sécurité'
        verbose_name_plural = 'Incidents de sécurité'

    def __str__(self):
        return f'{self.get_incident_type_display()} — voyage {self.scheduled_trip_id}'
