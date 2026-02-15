from transport.models import Company, City, Trip, ScheduledTrip
from transport.serializers import ScheduledTripSerializer

c, _ = Company.objects.get_or_create(name='TestCoShell', defaults={'description':'x','address':'x','phone':'123','email':'shell@example.com'})
city1,_ = City.objects.get_or_create(name='CS1', defaults={'region':'R'})
city2,_ = City.objects.get_or_create(name='CS2', defaults={'region':'R'})
trip, created = Trip.objects.get_or_create(company=c, departure_city=city1, arrival_city=city2, price=100, departure_time='08:00', arrival_time='10:00', duration=120, bus_type='Standard', capacity=40)
print('trip', trip.id)
data = {'trip': trip.id, 'date': '2026-04-01'}
s = ScheduledTripSerializer(data=data, context={'request': None})
print('is_valid', s.is_valid())
print('errors', s.errors)
if s.is_valid():
    obj = s.save()
    print('created id', obj.id, 'trip_id', obj.trip_id, 'available_seats', obj.available_seats)

