from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import Booking
from .services.loyalty import award_completed_trip_xp, reverse_completed_trip_xp


@receiver(post_save, sender=Booking)
def synchronize_booking_xp(sender, instance, **kwargs):
    if instance.status == 'completed':
        award_completed_trip_xp(instance)
    elif instance.status == 'cancelled':
        reverse_completed_trip_xp(instance)
