from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from transport.models import City, Company, Trip, Booking, Payment
from datetime import datetime, timedelta
import random


class Command(BaseCommand):
    help = 'Charge les données initiales pour TogoTrans'

    def handle(self, *args, **options):
        self.stdout.write('Chargement des données initiales...')
        
        # Créer les villes du Togo
        cities_data = [
            {'name': 'Lomé', 'region': 'Maritime'},
            {'name': 'Kara', 'region': 'Kara'},
            {'name': 'Kpalimé', 'region': 'Plateaux'},
            {'name': 'Sokodé', 'region': 'Centrale'},
            {'name': 'Atakpamé', 'region': 'Plateaux'},
            {'name': 'Dapaong', 'region': 'Savanes'},
            {'name': 'Tsévié', 'region': 'Maritime'},
            {'name': 'Aného', 'region': 'Maritime'},
            {'name': 'Bassar', 'region': 'Kara'},
            {'name': 'Mango', 'region': 'Savanes'},
        ]
        
        cities = []
        for city_data in cities_data:
            city, created = City.objects.get_or_create(
                name=city_data['name'],
                defaults={'region': city_data['region']}
            )
            cities.append(city)
            if created:
                self.stdout.write(f'Ville créée: {city.name}')
        
        # Créer un superutilisateur
        if not User.objects.filter(username='admin').exists():
            User.objects.create_superuser(
                username='admin',
                email='admin@togotrans.tg',
                password='admin123'
            )
            self.stdout.write('Superutilisateur créé: admin/admin123')
        
        # Créer des utilisateurs pour les compagnies
        company_users = []
        for i in range(3):
            username = f'company{i+1}'
            if not User.objects.filter(username=username).exists():
                user = User.objects.create_user(
                    username=username,
                    email=f'{username}@togotrans.tg',
                    password='company123',
                    first_name=f'Compagnie {i+1}',
                    last_name='Admin'
                )
                company_users.append(user)
                self.stdout.write(f'Utilisateur compagnie créé: {username}/company123')
        
        # Créer les compagnies
        companies_data = [
            {
                'name': 'TogoBus Express',
                'description': 'Service de transport premium au Togo',
                'address': 'Avenue de la Paix, Lomé',
                'phone': '+228 22 22 22 22',
                'email': 'contact@togobus.tg',
                'website': 'https://togobus.tg'
            },
            {
                'name': 'Lomé Transport',
                'description': 'Transport urbain et interurbain',
                'address': 'Boulevard du 13 Janvier, Lomé',
                'phone': '+228 22 33 44 55',
                'email': 'info@lometrans.tg',
                'website': 'https://lometrans.tg'
            },
            {
                'name': 'Kara Lines',
                'description': 'Spécialiste des trajets vers le nord',
                'address': 'Avenue du 2 Février, Kara',
                'phone': '+228 26 11 22 33',
                'email': 'contact@karalines.tg',
                'website': 'https://karalines.tg'
            }
        ]
        
        companies = []
        for i, company_data in enumerate(companies_data):
            if i < len(company_users):
                company, created = Company.objects.get_or_create(
                    name=company_data['name'],
                    defaults={
                        **company_data,
                        'admin_user': company_users[i]
                    }
                )
                companies.append(company)
                if created:
                    self.stdout.write(f'Compagnie créée: {company.name}')
        
        # Créer des trajets
        bus_types = ['Standard', 'Premium', 'VIP', 'Luxury']
        trip_data = [
            {
                'departure_city': 'Lomé',
                'arrival_city': 'Kara',
                'departure_time': '08:00',
                'arrival_time': '12:00',
                'price': 5000,
                'duration': 240,
                'bus_type': 'Premium'
            },
            {
                'departure_city': 'Kara',
                'arrival_city': 'Lomé',
                'departure_time': '14:00',
                'arrival_time': '18:00',
                'price': 5000,
                'duration': 240,
                'bus_type': 'Premium'
            },
            {
                'departure_city': 'Lomé',
                'arrival_city': 'Kpalimé',
                'departure_time': '10:00',
                'arrival_time': '12:30',
                'price': 3000,
                'duration': 150,
                'bus_type': 'Standard'
            },
            {
                'departure_city': 'Kpalimé',
                'arrival_city': 'Lomé',
                'departure_time': '15:00',
                'arrival_time': '17:30',
                'price': 3000,
                'duration': 150,
                'bus_type': 'Standard'
            },
            {
                'departure_city': 'Lomé',
                'arrival_city': 'Sokodé',
                'departure_time': '09:00',
                'arrival_time': '13:00',
                'price': 4000,
                'duration': 240,
                'bus_type': 'Standard'
            },
            {
                'departure_city': 'Sokodé',
                'arrival_city': 'Lomé',
                'departure_time': '14:00',
                'arrival_time': '18:00',
                'price': 4000,
                'duration': 240,
                'bus_type': 'Standard'
            }
        ]
        
        for company in companies:
            for trip_info in trip_data:
                departure_city = City.objects.get(name=trip_info['departure_city'])
                arrival_city = City.objects.get(name=trip_info['arrival_city'])
                
                trip, created = Trip.objects.get_or_create(
                    company=company,
                    departure_city=departure_city,
                    arrival_city=arrival_city,
                    departure_time=trip_info['departure_time'],
                    defaults={
                        'arrival_time': trip_info['arrival_time'],
                        'price': trip_info['price'],
                        'duration': trip_info['duration'],
                        'bus_type': trip_info['bus_type'],
                        'capacity': random.randint(40, 60)
                    }
                )
                if created:
                    self.stdout.write(f'Trajet créé: {trip}')
        
        # Créer quelques réservations de démonstration
        trips = Trip.objects.all()
        if trips.exists():
            for i in range(10):
                trip = random.choice(trips)
                travel_date = datetime.now().date() + timedelta(days=random.randint(1, 30))
                
                booking = Booking.objects.create(
                    trip=trip,
                    passenger_name=f'Passager {i+1}',
                    passenger_email=f'passager{i+1}@email.com',
                    passenger_phone=f'+228 90 {random.randint(10, 99)} {random.randint(10, 99)} {random.randint(10, 99)}',
                    seat_number=f'{chr(65 + random.randint(0, 5))}{random.randint(1, 20)}',
                    status=random.choice(['confirmed', 'pending', 'cancelled']),
                    payment_method=random.choice(['mobile_money', 'bank_card', 'cash']),
                    total_price=trip.price,
                    travel_date=travel_date,
                    user=None  # Réservations anonymes pour la démo
                )
                
                if booking.status == 'confirmed':
                    Payment.objects.create(
                        booking=booking,
                        amount=booking.total_price,
                        payment_method=booking.payment_method,
                        status='completed'
                    )
        
        self.stdout.write(
            self.style.SUCCESS('Données initiales chargées avec succès!')
        )
        self.stdout.write('Comptes créés:')
        self.stdout.write('- admin/admin123 (superutilisateur)')
        self.stdout.write('- company1/company123 (TogoBus Express)')
        self.stdout.write('- company2/company123 (Lomé Transport)')
        self.stdout.write('- company3/company123 (Kara Lines)')
