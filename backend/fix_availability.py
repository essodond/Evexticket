import re

# Chemin du fichier views.py
file_path = "c:/Users/DELL/Documents/projet/Evexticket/backend/transport/views.py"

# Lire le contenu du fichier
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Nouveau code pour availability_view
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

    # Initialiser la liste des sièges occupés
    occupied = set()

    # Trouver le voyage programmé correspondant au trip_id et à la date
    scheduled_trip = None
    try:
        scheduled_trip = ScheduledTrip.objects.get(trip_id=trip_id, date=travel_date)
        # Filtrer les réservations par voyage programmé
        qs = Booking.objects.filter(scheduled_trip=scheduled_trip, status__in=['confirmed', 'pending']).select_related('origin_stop', 'destination_stop')
    except ScheduledTrip.DoesNotExist:
        # Si aucun voyage programmé n'existe, on récupère les anciennes réservations
        qs = Booking.objects.filter(
            trip_id=trip_id,
            scheduled_trip__isnull=True,
            status__in=['confirmed', 'pending'],
            booking_date__date=travel_date
        ).select_related('origin_stop', 'destination_stop')

    # D'abord, récupérer tous les sièges des réservations complètes (sans escales)
    full_trip_bookings = qs.filter(origin_stop__isnull=True, destination_stop__isnull=True)
    full_seats = list(full_trip_bookings.values_list('seat_number', flat=True))
    occupied.update(full_seats)

    # Ensuite, traiter les réservations avec escales si on recherche pour un segment spécifique
    if origin_stop and destination_stop:
        # Resolve origin/destination to TripStop objects. Accept either TripStop PK, City id, or city name.
        def resolve_stop(value):
            # try as pk first
            try:
                return TripStop.objects.get(pk=int(value))
            except (ValueError, TripStop.DoesNotExist):
                pass
            # try as city id
            try:
                return TripStop.objects.get(city_id=int(value), trip=trip)
            except (ValueError, TripStop.DoesNotExist):
                pass
            # try as city name
            try:
                return TripStop.objects.get(city__name__iexact=str(value), trip=trip)
            except (TripStop.DoesNotExist):
                return None

        origin = resolve_stop(origin_stop)
        destination = resolve_stop(destination_stop)

        if origin and destination:
            # bookings with stops: check overlap with requested segment [origin.sequence, destination.sequence)
            segment_bookings = qs.filter(origin_stop__isnull=False, destination_stop__isnull=False)
            for b in segment_bookings:
                # if booking's segment overlaps with requested segment
                if b.origin_stop.sequence < destination.sequence and b.destination_stop.sequence > origin.sequence:
                    occupied.add(b.seat_number)

    # Calculer les sièges disponibles
    total_capacity = trip.capacity
    available = max(0, total_capacity - len(occupied))

    # Si on a un scheduled_trip, utiliser son available_seats
    if scheduled_trip:
        available = scheduled_trip.available_seats

    return Response({
        'occupied_seats': list(occupied),
        'available_seats': available,
        'capacity': total_capacity
    })'''

# Modifier le contenu du fichier
# Utiliser une regex pour trouver la fonction availability_view avec ses décorateurs
pattern = r'@api_view\([\'\"]GET[\'\"]\)\s*@permission_classes\(\[AllowAny\]\)\s*def availability_view\(request\):[\s\S]*?return Response\(\{
        [\s\S]*?\n    \}\)'

fixed_content = re.sub(pattern, new_availability_view, content, flags=re.DOTALL)

# Écrire le contenu modifié dans le fichier
with open(file_path, 'w', encoding='utf-8') as f:
    f.write(fixed_content)

print("Fonction availability_view modifiée avec succès!")
