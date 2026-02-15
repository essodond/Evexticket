from django.test import Client
from django.contrib.auth.models import User
from transport.models import Company, City, Trip

# Création des objets nécessaires
c, _ = Company.objects.get_or_create(name='ApiTestCo', defaults={'description':'x','address':'x','phone':'123','email':'apitest@example.com'})
city1,_ = City.objects.get_or_create(name='ApiCity1', defaults={'region':'R'})
city2,_ = City.objects.get_or_create(name='ApiCity2', defaults={'region':'R'})
trip, _ = Trip.objects.get_or_create(company=c, departure_city=city1, arrival_city=city2, price=150, departure_time='09:00', arrival_time='11:00', duration=120, bus_type='Standard', capacity=30)

# Create staff user
user, created = User.objects.get_or_create(username='apiteststaff', defaults={'email':'staff@example.com'})
if created:
    user.set_password('testpass')
    user.is_staff = True
    user.save()

client = Client()
# login as staff
logged_in = client.login(username='apiteststaff', password='testpass')
print('logged_in', logged_in)

data = {'trip': trip.id, 'date': '2026-05-01'}
response = client.post('/api/scheduled_trips/', data)
print('status_code', response.status_code)
print('content', response.content)

