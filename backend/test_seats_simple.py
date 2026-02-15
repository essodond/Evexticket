#!/usr/bin/env python
"""
Script de test pour vérifier que l'API ScheduledTrip retourne correctement les sièges avec leur statut.
À exécuter dans le shell Django: python manage.py shell < test_seats_simple.py
"""
from transport.models import Company, City, Trip, ScheduledTrip, Booking
from transport.serializers import ScheduledTripSerializer
from datetime import datetime

# Créer les données de test
try:
    company = Company.objects.get_or_create(
        name='TestCompany',
        defaults={'description': 'Test Company', 'address': 'Test', 'phone': '123', 'email': 'test@example.com'}
    )[0]
    print(f"✅ Compagnie: {company.name}")

    city1 = City.objects.get_or_create(name='Dakar', defaults={'region': 'Dakar'})[0]
    city2 = City.objects.get_or_create(name='Thiès', defaults={'region': 'Thiès'})[0]
    print(f"✅ Villes: {city1.name} -> {city2.name}")

    trip = Trip.objects.get_or_create(
        company=company,
        departure_city=city1,
        arrival_city=city2,
        defaults={
            'price': 5000,
            'departure_time': '08:00',
            'arrival_time': '10:00',
            'duration': 120,
            'bus_type': 'Standard',
            'capacity': 50
        }
    )[0]
    print(f"✅ Trajet: {trip.company.name} - {trip.departure_city.name} → {trip.arrival_city.name} (capacité: {trip.capacity})")

    # Créer un ScheduledTrip pour aujourd'hui
    today = datetime.now().date()
    scheduled_trip = ScheduledTrip.objects.get_or_create(
        trip=trip,
        date=today,
        defaults={'is_active': True, 'available_seats': trip.capacity}
    )[0]
    print(f"✅ Voyage programmé: {scheduled_trip.date}")

    # Créer quelques réservations pour tester
    print("\n--- Création de réservations de test ---")
    for seat_num in [1, 5, 10]:
        booking, created = Booking.objects.get_or_create(
            scheduled_trip=scheduled_trip,
            seat_number=str(seat_num),
            defaults={
                'trip': trip,
                'passenger_name': f'Passenger {seat_num}',
                'passenger_email': f'passenger{seat_num}@example.com',
                'passenger_phone': '123456789',
                'status': 'confirmed',
                'payment_method': 'card',
                'total_price': 5000
            }
        )
        if created:
            print(f"  ✅ Réservation créée pour le siège {seat_num}")
        else:
            print(f"  ℹ️  Réservation existante pour le siège {seat_num}")

    # Tester le serializer
    print("\n--- Test du ScheduledTripSerializer ---")
    serializer = ScheduledTripSerializer(scheduled_trip, context={'request': None})
    data = serializer.data

    print(f"ID: {data.get('id')}")
    print(f"Date: {data.get('date')}")
    print(f"Places disponibles: {data.get('available_seats')}")

    # Afficher les sièges
    seats = data.get('seats', [])
    print(f"\n--- Sièges (total: {len(seats)}) ---")
    booked = [s for s in seats if s['status'] == 'occupied']
    available = [s for s in seats if s['status'] == 'available']

    print(f"Sièges réservés ({len(booked)}): {[s['number'] for s in booked]}")
    print(f"Sièges disponibles: {len(available)}")

    # Afficher les premiers sièges
    print("\nPremiers 15 sièges:")
    for seat in seats[:15]:
        status_symbol = "🔴" if seat['status'] == 'occupied' else "🟢"
        print(f"  {status_symbol} Siège {seat['number']:2d}: {seat['status']}")

    print("\n✅ Test réussi!")

except Exception as e:
    print(f"❌ Erreur: {e}")
    import traceback
    traceback.print_exc()

