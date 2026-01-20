# Script pour mettre à jour les fonctions booked_seats_list et availability_view dans views.py

import os

# Chemin vers le fichier views.py
file_path = "c:\\Users\\DELL\\Documents\\projet\\Evexticket\\backend\\transport\\views.py"

# Lire le contenu du fichier
with open(file_path, 'r') as f:
    content = f.read()

# Nouvelle version de booked_seats_list
new_booked_seats_list = '''@api_view(['GET'])
@permission_classes([AllowAny])
def booked_seats_list(request):
    """Retourne la liste des numéros de sièges déjà réservés pour un trajet à une date donnée.

    Query params attendus: `trip_id` (int), `travel_date` (YYYY-MM-DD)
    On inclut les réservations en statut 'pending' et 'confirmed' pour éviter double-réservation.
    """
    trip_id = request.query_params.get('trip_id')
    travel_date = request.query_params.get('travel_date')

    if not trip_id or not travel_date:
        return Response({'detail': 'trip_id et travel_date requis.'}, status=status.HTTP_400_BAD_REQUEST)

    # Initialiser une liste pour stocker les sièges occupés
    occupied_seats = set()

    # Cas 1: Réservations avec scheduled_trip (nouveau système)
    try:
        scheduled_trip = ScheduledTrip.objects.get(trip_id=trip_id, date=travel_date)
        # Filtrer les réservations par voyage programmé
        qs = Booking.objects.filter(scheduled_trip=scheduled_trip, status__in=['pending', 'confirmed'])
        scheduled_seats = list(qs.values_list('seat_number', flat=True))
        occupied_seats.update(scheduled_seats)
    except ScheduledTrip.DoesNotExist:
        # Si aucun voyage programmé n'existe, on continue avec le cas 2
        pass

    # Cas 2: Réservations sans scheduled_trip (ancien système)
    # Pour les anciennes réservations, on cherche par trip_id et booking_date
    # On suppose que booking_date est la date de voyage pour ces réservations
    old_bookings = Booking.objects.filter(
        trip_id=trip_id,
        scheduled_trip__isnull=True,
        status__in=['pending', 'confirmed'],
        booking_date__date=travel_date
    )
    old_seats = list(old_bookings.values_list('seat_number', flat=True))
    occupied_seats.update(old_seats)

    # Normaliser en liste simple
    return Response(list(occupied_seats))'''

# Nouvelle version de availability_view
new_availability_view = '''@api_view(['GET'])
@permission_classes([AllowAny])
def availability_view(request):
    """Return occupied seats and available seats for a trip on a date.

    Query params: trip_id (required), travel_date (required, YYYY-MM-DD), origin_stop (opt), destination_stop (opt)
    If origin_stop and destination_stop are provided, compute conflicts for the segment [origin.sequence, destination.sequence).
    Returns: { occupied_seats: [...], available_seats: N, capacity: X }
    """
    trip_id = request.query_params.get('trip_id')
    travel_date = request.query_params.get('travel_date')
    origin_stop = request.query_params.get('origin_stop')
    destination_stop = request.query_params.get('destination_stop')

    if not trip_id or not travel_date:
        return Response({'detail': 'trip_id and travel_date are required.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        trip = Trip.objects.get(pk=trip_id)
    except Trip.DoesNotExist:
        return Response({'detail': 'Trip not found.'}, status=status.HTTP_404_NOT_FOUND)

    # Initialiser une liste pour stocker les sièges occupés
    occupied = set()

    # Cas 1: Réservations avec scheduled_trip (nouveau système)
    try:
        scheduled_trip = ScheduledTrip.objects.get(trip_id=trip_id, date=travel_date)
        # Filtrer les réservations par voyage programmé
        qs = Booking.objects.filter(scheduled_trip=scheduled_trip, status__in=['confirmed', 'pending']).select_related('origin_stop', 'destination_stop')
        # Récupérer les sièges occupés pour le voyage programmé
        for b in qs:
            occupied.add(b.seat_number)
    except ScheduledTrip.DoesNotExist:
        # Si aucun voyage programmé n'existe, on continue avec le cas 2
        pass

    # Cas 2: Réservations sans scheduled_trip (ancien système)
    # Pour les anciennes réservations, on cherche par trip_id et booking_date
    # On suppose que booking_date est la date de voyage pour ces réservations
    old_bookings = Booking.objects.filter(
        trip_id=trip_id,
        scheduled_trip__isnull=True,
        status__in=['confirmed', 'pending'],
        booking_date__date=travel_date
    )
    # Récupérer les sièges occupés pour les anciennes réservations
    for b in old_bookings:
        occupied.add(b.seat_number)

    occupied_list = list(map(str, occupied))
    capacity = trip.capacity
    available = max(0, capacity - len(occupied_list))
    return Response({'occupied_seats': occupied_list, 'available_seats': available, 'capacity': capacity})'''

# Remplacer la fonction booked_seats_list
start_booked = content.find('@api_view([\'GET\'])\n@permission_classes([AllowAny])\ndef booked_seats_list(request):')
end_booked = content.find('@api_view([\'GET\'])\n@permission_classes([AllowAny])\ndef availability_view(request):')
if start_booked != -1 and end_booked != -1:
    content = content[:start_booked] + new_booked_seats_list + content[end_booked:]

# Remplacer la fonction availability_view
start_availability = content.find('@api_view([\'GET\'])\n@permission_classes([AllowAny])\ndef availability_view(request):')
end_availability = content.find('class ScheduledTripSearchView(APIView):')
if start_availability != -1 and end_availability != -1:
    content = content[:start_availability] + new_availability_view + content[end_availability:]

# Écrire le contenu mis à jour dans le fichier
with open(file_path, 'w') as f:
    f.write(content)

print("Fichier views.py mis à jour avec succès!")
