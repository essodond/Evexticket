from django.db import transaction

from transport.models import Booking, UserProfile, XPTransaction


XP_PER_COMPLETED_TRIP = 100

XP_LEVELS = (
    {'key': 'explorer', 'label': 'Explorateur', 'minimum_xp': 0},
    {'key': 'traveler', 'label': 'Voyageur', 'minimum_xp': 500},
    {'key': 'regular', 'label': 'Habitué', 'minimum_xp': 1500},
    {'key': 'ambassador', 'label': 'Ambassadeur', 'minimum_xp': 3000},
    {'key': 'legend', 'label': 'Légende EVEX', 'minimum_xp': 5000},
)


def _trip_description(booking):
    try:
        return (
            f'{booking.trip.departure_city.name} → '
            f'{booking.trip.arrival_city.name}'
        )
    except Exception:
        return 'Voyage EVEX terminé'


def get_level_for_xp(total_xp):
    total_xp = max(int(total_xp or 0), 0)
    current_index = 0
    for index, level in enumerate(XP_LEVELS):
        if total_xp >= level['minimum_xp']:
            current_index = index
        else:
            break

    current = XP_LEVELS[current_index]
    next_level = XP_LEVELS[current_index + 1] if current_index + 1 < len(XP_LEVELS) else None
    current_floor = current['minimum_xp']
    if next_level:
        span = next_level['minimum_xp'] - current_floor
        progress_percent = round(((total_xp - current_floor) / span) * 100)
        xp_to_next_level = max(next_level['minimum_xp'] - total_xp, 0)
    else:
        progress_percent = 100
        xp_to_next_level = 0

    return {
        'key': current['key'],
        'label': current['label'],
        'minimum_xp': current_floor,
        'progress_percent': max(0, min(progress_percent, 100)),
        'xp_to_next_level': xp_to_next_level,
        'next_level': (
            {
                'key': next_level['key'],
                'label': next_level['label'],
                'minimum_xp': next_level['minimum_xp'],
            }
            if next_level
            else None
        ),
    }


def get_loyalty_summary(user, include_history=False, history_limit=20):
    profile, _ = UserProfile.objects.get_or_create(user=user)
    level = get_level_for_xp(profile.xp_total)
    payload = {
        'total_xp': profile.xp_total,
        'xp_per_completed_trip': XP_PER_COMPLETED_TRIP,
        'completed_trips_count': XPTransaction.objects.filter(
            user=user,
            event_type=XPTransaction.EVENT_TRIP_COMPLETED,
        ).count(),
        'level': level,
    }
    if include_history:
        transactions = XPTransaction.objects.filter(user=user).select_related(
            'booking__trip__departure_city',
            'booking__trip__arrival_city',
        )[:history_limit]
        payload['history'] = [
            {
                'id': item.id,
                'points': item.points,
                'event_type': item.event_type,
                'description': item.description,
                'booking_id': item.booking_id,
                'created_at': item.created_at,
            }
            for item in transactions
        ]
    return payload


@transaction.atomic
def award_completed_trip_xp(booking):
    if not booking.user_id or booking.status != 'completed':
        return None, False

    event_key = f'booking:{booking.pk}:completed'
    xp_transaction, created = XPTransaction.objects.get_or_create(
        event_key=event_key,
        defaults={
            'user_id': booking.user_id,
            'booking': booking,
            'event_type': XPTransaction.EVENT_TRIP_COMPLETED,
            'points': XP_PER_COMPLETED_TRIP,
            'description': _trip_description(booking),
        },
    )
    if created:
        profile, _ = UserProfile.objects.select_for_update().get_or_create(
            user_id=booking.user_id,
        )
        profile.xp_total += XP_PER_COMPLETED_TRIP
        profile.save(update_fields=['xp_total'])
    return xp_transaction, created


@transaction.atomic
def reverse_completed_trip_xp(booking):
    if not booking.user_id:
        return None, False

    earned = XPTransaction.objects.filter(
        event_key=f'booking:{booking.pk}:completed',
        user_id=booking.user_id,
    ).first()
    if not earned:
        return None, False

    reversal, created = XPTransaction.objects.get_or_create(
        event_key=f'booking:{booking.pk}:reversed',
        defaults={
            'user_id': booking.user_id,
            'booking': booking,
            'event_type': XPTransaction.EVENT_TRIP_REVERSED,
            'points': -earned.points,
            'description': f'Annulation : {earned.description}',
        },
    )
    if created:
        profile, _ = UserProfile.objects.select_for_update().get_or_create(
            user_id=booking.user_id,
        )
        profile.xp_total = max(profile.xp_total - earned.points, 0)
        profile.save(update_fields=['xp_total'])
    return reversal, created
