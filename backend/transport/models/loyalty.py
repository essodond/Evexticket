from django.contrib.auth.models import User
from django.db import models

from .base import Booking


class XPTransaction(models.Model):
    EVENT_TRIP_COMPLETED = 'trip_completed'
    EVENT_TRIP_REVERSED = 'trip_reversed'
    EVENT_ADJUSTMENT = 'adjustment'

    EVENT_CHOICES = [
        (EVENT_TRIP_COMPLETED, 'Voyage terminé'),
        (EVENT_TRIP_REVERSED, 'Voyage annulé ou remboursé'),
        (EVENT_ADJUSTMENT, 'Ajustement administratif'),
    ]

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='xp_transactions',
    )
    booking = models.ForeignKey(
        Booking,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='xp_transactions',
    )
    event_key = models.CharField(max_length=100, unique=True)
    event_type = models.CharField(max_length=30, choices=EVENT_CHOICES)
    points = models.IntegerField()
    description = models.CharField(max_length=250)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at', '-id']
        verbose_name = 'Transaction XP'
        verbose_name_plural = 'Transactions XP'
        indexes = [models.Index(fields=['user', '-created_at'])]

    def __str__(self):
        sign = '+' if self.points > 0 else ''
        return f'{self.user} {sign}{self.points} XP ({self.event_type})'
