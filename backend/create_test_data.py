from transport.models import Trip, City, Company, ScheduledTrip
from django.utils import timezone
from datetime import timedelta

# Créer une compagnie de test si nécessaire
company = Company.objects.first()
if not company:
    company = Company.objects.create(
        name='Test Company',
        description='Test',
        address='Test',
        phone='123',
        email='test@test.com'
    )

# Récupérer les villes
lome = City.objects.filter(name__icontains='Lom').first()
kara = City.objects.filter(name__icontains='Kara').first()

if not lome or not kara:
    print("Erreur : Villes non trouvées")
    exit(1)

# Créer un trajet s'il n'existe pas déjà
trip = Trip.objects.filter(
    departure_city=lome,
    arrival_city=kara,
    departure_time='08:00',
    arrival_time='14:00'
).first()

if not trip:
    trip = Trip.objects.create(
        company=company,
        departure_city=lome,
        arrival_city=kara,
        departure_time='08:00',
        arrival_time='14:00',
        price=10000,
        duration=360,
        bus_type='Standard',
        capacity=50
    )

# Créer un voyage programmé pour demain s'il n'existe pas déjà
tomorrow = timezone.now().date() + timedelta(days=1)
scheduled_trip = ScheduledTrip.objects.filter(trip=trip, date=tomorrow).first()

if not scheduled_trip:
    ScheduledTrip.objects.create(
        trip=trip,
        date=tomorrow,
        is_active=True,
        available_seats=50
    )
    print("Nouveau voyage programmé créé avec succès !")
else:
    print("Le voyage programmé existe déjà.")