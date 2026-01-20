import re

# Chemin du fichier views.py
file_path = "c:/Users/DELL/Documents/projet/Evexticket/backend/transport/views.py"

# Lire le contenu du fichier
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Nouveau code pour booked_seats_list
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

# Modifier le contenu du fichier
# Utiliser une regex pour trouver la fonction booked_seats_list avec ses décorateurs
pattern = r'@api_view\([\'\"]GET[\'\"]\)\s*@permission_classes\(\[AllowAny\]\)\s*def booked_seats_list\(request\):[\s\S]*?return Response\(seats\)\)'

fixed_content = re.sub(pattern, new_booked_seats_list, content, flags=re.DOTALL)

# Écrire le contenu modifié dans le fichier
with open(file_path, 'w', encoding='utf-8') as f:
    f.write(fixed_content)

print("Fichier views.py modifié avec succès!")
