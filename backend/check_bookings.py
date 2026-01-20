from transport.models import Booking, ScheduledTrip

print('=== Réservations avec scheduled_trip_id None ===')
for b in Booking.objects.filter(scheduled_trip_id=None):
    print(f'ID: {b.id}, Trip: {b.trip_id}, Siège: {b.seat_number}')

print('\n=== Réservations avec scheduled_trip_id ===')
for b in Booking.objects.filter(scheduled_trip_id__isnull=False):
    print(f'ID: {b.id}, ScheduledTrip: {b.scheduled_trip_id}, Trip: {b.trip_id}, Siège: {b.seat_number}')

print('\n=== Voyages programmés ===')
for st in ScheduledTrip.objects.all():
    print(f'ID: {st.id}, Trip: {st.trip_id}, Date: {st.date}, Available Seats: {st.available_seats}')
