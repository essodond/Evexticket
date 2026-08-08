from django.conf import settings
from django.db import models

from .base import ScheduledTrip


class TripTrackingSession(models.Model):
    scheduled_trip = models.OneToOneField(
        ScheduledTrip,
        on_delete=models.CASCADE,
        related_name='tracking_session',
    )
    driver = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='driven_tracking_sessions',
    )
    is_active = models.BooleanField(default=False)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    accuracy_m = models.FloatField(null=True, blank=True)
    speed_kmh = models.FloatField(null=True, blank=True)
    heading = models.FloatField(null=True, blank=True)
    delay_minutes = models.IntegerField(default=0)
    passed_stop_ids = models.JSONField(default=list, blank=True)
    started_at = models.DateTimeField(null=True, blank=True)
    stopped_at = models.DateTimeField(null=True, blank=True)
    last_position_at = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Suivi GPS de voyage'
        verbose_name_plural = 'Suivis GPS de voyage'

    def __str__(self):
        return f'Suivi #{self.scheduled_trip_id}'


class BusPosition(models.Model):
    session = models.ForeignKey(
        TripTrackingSession,
        on_delete=models.CASCADE,
        related_name='positions',
    )
    latitude = models.DecimalField(max_digits=9, decimal_places=6)
    longitude = models.DecimalField(max_digits=9, decimal_places=6)
    accuracy_m = models.FloatField(null=True, blank=True)
    speed_kmh = models.FloatField(null=True, blank=True)
    heading = models.FloatField(null=True, blank=True)
    recorded_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-recorded_at', '-id']
        indexes = [models.Index(fields=['session', '-recorded_at'])]
        verbose_name = 'Position du bus'
        verbose_name_plural = 'Positions du bus'

    def __str__(self):
        return f'{self.session_id} @ {self.latitude}, {self.longitude}'
