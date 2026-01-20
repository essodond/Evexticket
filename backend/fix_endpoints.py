# Chemin du fichier views.py
file_path = "c:/Users/DELL/Documents/projet/Evexticket/backend/transport/views.py"

# Lire le contenu du fichier
with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Trouver les indices de début et de fin des fonctions à modifier
def find_function_indices(lines, func_name):
    start_idx = None
    end_idx = None
    brace_count = 0
    in_docstring = False
    docstring_quote = None
    
    for i, line in enumerate(lines):
        # Chercher le début de la fonction
        if func_name in line and start_idx is None:
            start_idx = i
        
        # Si on a trouvé le début de la fonction, chercher la fin
        if start_idx is not None:
            # Gérer les docstrings
            if '"""' in line or "'''" in line:
                if in_docstring:
                    in_docstring = False
                    docstring_quote = None
                else:
                    in_docstring = True
                    if '"""' in line:
                        docstring_quote = '"""'
                    else:
                        docstring_quote = "'''
            
            # Compter les accolades pour trouver la fin de la fonction
            if not in_docstring:
                brace_count += line.count('{') - line.count('}')
                # Compter également les parenthèses pour les retours
                brace_count += line.count('(') - line.count(')')
            
            # Vérifier si c'est la fin de la fonction
            if i > start_idx and 'return Response' in line:
                # Trouver la fin de la ligne de retour
                if ')' in line:
                    end_idx = i + 1
                    break
    
    return start_idx, end_idx

# Nouveau code pour booked_seats_list
new_booked_seats = [
    '@api_view([\'GET\'])\n',
    '@permission_classes([AllowAny])\n',
    'def booked_seats_list(request):\n',
    '    """Retourne la liste des numéros de sièges déjà réservés pour un trajet à une date donnée.\n',
    '\n',
    '    Query params attendus: `trip_id` (int), `travel_date` (YYYY-MM-DD)\n',
    '    On inclut les réservations en statut \'pending\' et \'confirmed\' pour éviter double-réservation.\n',
    '    """\n',
    '    trip_id = request.query_params.get(\'trip_id\')\n',
    '    travel_date = request.query_params.get(\'travel_date\')\n',
    '\n',
    '    if not trip_id or not travel_date:\n',
    '        return Response({\'detail\': \'trip_id et travel_date requis.\'}, status=status.HTTP_400_BAD_REQUEST)\n',
    '\n',
    '    # Initialiser une liste pour stocker les sièges occupés\n',
    '    occupied_seats = set()\n',
    '\n',
    '    # Cas 1: Réservations avec scheduled_trip (nouveau système)\n',
    '    try:\n',
    '        scheduled_trip = ScheduledTrip.objects.get(trip_id=trip_id, date=travel_date)\n',
    '        # Filtrer les réservations par voyage programmé\n',
    '        qs = Booking.objects.filter(scheduled_trip=scheduled_trip, status__in=[\'pending\', \'confirmed\'])\n',
    '        scheduled_seats = list(qs.values_list(\'seat_number\', flat=True))\n',
    '        occupied_seats.update(scheduled_seats)\n',
    '    except ScheduledTrip.DoesNotExist:\n',
    '        # Si aucun voyage programmé n\'existe, on continue avec le cas 2\n',
    '        pass\n',
    '\n',
    '    # Cas 2: Réservations sans scheduled_trip (ancien système)\n',
    '    # Pour les anciennes réservations, on cherche par trip_id et booking_date\n',
    '    # On suppose que booking_date est la date de voyage pour ces réservations\n',
    '    old_bookings = Booking.objects.filter(\n',
    '        trip_id=trip_id,\n',
    '        scheduled_trip__isnull=True,\n',
    '        status__in=[\'pending\', \'confirmed\'],\n',
    '        booking_date__date=travel_date\n',
    '    )\n',
    '    old_seats = list(old_bookings.values_list(\'seat_number\', flat=True))\n',
    '    occupied_seats.update(old_seats)\n',
    '\n',
    '    # Normaliser en liste simple\n',
    '    return Response(list(occupied_seats))\n',
    '\n'
]

# Trouver les indices de booked_seats_list
bs_start, bs_end = find_function_indices(lines, 'def booked_seats_list')

# Remplacer la fonction booked_seats_list
if bs_start is not None and bs_end is not None:
    lines = lines[:bs_start] + new_booked_seats + lines[bs_end:]
    print(f"Fonction booked_seats_list modifiée avec succès!")

# Écrire le contenu modifié dans le fichier
with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(lines)

print("Modifications terminées!")
