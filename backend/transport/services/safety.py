from datetime import datetime, timedelta

from django.db.models import Q
from django.utils import timezone


ACTIVE_INCIDENT_STATUSES = ('reported', 'acknowledged')


def incident_reporting_window(scheduled_trip):
    departure = datetime.combine(scheduled_trip.date, scheduled_trip.trip.departure_time)
    arrival = datetime.combine(scheduled_trip.date, scheduled_trip.trip.arrival_time)
    if arrival <= departure:
        arrival += timedelta(days=1)
    current_timezone = timezone.get_current_timezone()
    departure = timezone.make_aware(departure, current_timezone)
    arrival = timezone.make_aware(arrival, current_timezone)
    return departure - timedelta(hours=2), arrival + timedelta(hours=12)


def is_incident_reportable_now(scheduled_trip):
    if not scheduled_trip.is_active or not scheduled_trip.trip.is_active:
        return False
    starts_at, ends_at = incident_reporting_window(scheduled_trip)
    return starts_at <= timezone.now() <= ends_at


def is_booking_suspended_for_safety(scheduled_trip):
    """Return True while an active critical or immobilising incident exists."""
    from transport.models import SafetyIncident

    return SafetyIncident.objects.filter(
        scheduled_trip=scheduled_trip,
        status__in=ACTIVE_INCIDENT_STATUSES,
    ).filter(
        Q(severity=SafetyIncident.Severity.CRITICAL)
        | Q(travel_state=SafetyIncident.TravelState.STOPPED)
    ).exists()
