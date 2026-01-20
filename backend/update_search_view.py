# Script pour mettre à jour la vue ScheduledTripSearchView dans views.py

import os

# Chemin vers le fichier views.py
file_path = "c:/Users/DELL/Documents/projet/Evexticket/backend/transport/views.py"

# Lire le contenu du fichier
with open(file_path, 'r') as f:
    content = f.read()

# Nouvelle version de la méthode post de ScheduledTripSearchView
new_post_method = '''    def post(self, request, *args, **kwargs):
        print(f"[DEBUG] ScheduledTripSearchView.post: request.data = {request.data}")
        serializer = TripSearchSerializer(data=request.data)
        if serializer.is_valid():
            # Récupérer les données validées avec des valeurs par défaut
            departure_city = serializer.validated_data.get('departure_city', '')
            arrival_city = serializer.validated_data.get('arrival_city', '')
            travel_date = serializer.validated_data.get('travel_date')
            passengers = serializer.validated_data.get('passengers', 1)
            print(f"[DEBUG] validated_data: departure_city={departure_city}, arrival_city={arrival_city}, travel_date={travel_date}, passengers={passengers}")

            # Vérifier les champs requis
            if not departure_city or not arrival_city or not travel_date:
                return Response({'detail': 'Les champs departure_city, arrival_city et travel_date sont requis.'}, status=status.HTTP_400_BAD_REQUEST)

            from unidecode import unidecode

            dep_norm = unidecode(departure_city).lower()
            arr_norm = unidecode(arrival_city).lower()
            print(f"[DEBUG] normalized: dep_norm={dep_norm}, arr_norm={arr_norm}")

            # Récupérer tous les voyages planifiés pour la date donnée
            scheduled_trips = ScheduledTrip.objects.filter(
                date=travel_date,
                trip__is_active=True
            ).select_related('trip__company', 'trip__departure_city', 'trip__arrival_city')
            print(f"[DEBUG] scheduled_trips count: {scheduled_trips.count()}")

            matches = []
            for st in scheduled_trips:
                trip = st.trip
                print(f"[DEBUG] checking scheduled_trip id={st.id}, trip_id={trip.id}")
                # Récupérer les escales ordonnées
                stops = list(TripStop.objects.filter(trip=trip).select_related('city').order_by('sequence'))
                print(f"[DEBUG] trip stops: {[s.city.name for s in stops]}")

                # Cas 1: correspondance directe aux extrémités du trajet
                direct_match = (
                    dep_norm in unidecode((trip.departure_city.name or '')).lower() and
                    arr_norm in unidecode((trip.arrival_city.name or '')).lower()
                )
                print(f"[DEBUG] direct_match check: dep_city={trip.departure_city.name}, arr_city={trip.arrival_city.name}, result={direct_match}")
                if direct_match:
                    # Utiliser scheduled_trip pour filtrer les réservations
                    booked = Booking.objects.filter(
                        scheduled_trip=st,
                        status__in=['confirmed', 'pending']
                    ).values_list('seat_number', flat=True)
                    # Inclure aussi les anciennes réservations sans scheduled_trip
                    old_booked = Booking.objects.filter(
                        trip=trip,
                        scheduled_trip__isnull=True,
                        booking_date__date=travel_date,
                        status__in=['confirmed', 'pending']
                    ).values_list('seat_number', flat=True)
                    all_booked = set(list(booked) + list(old_booked))
                    available = max(trip.capacity - len(all_booked), 0)
                    print(f"[DEBUG] direct_match: booked seats={list(all_booked)}, available={available}")
                    if available >= passengers:
                        matches.append(st)
                        print(f"[DEBUG] direct_match added scheduled_trip id={st.id}")
                        continue

                # Cas 2: recherche par escales (segments)
                origin_candidates = [s for s in stops if dep_norm in unidecode(s.city.name or '').lower()]
                dest_candidates = [s for s in stops if arr_norm in unidecode(s.city.name or '').lower()]
                print(f"[DEBUG] segment search: origin_candidates={[s.city.name for s in origin_candidates]}, dest_candidates={[s.city.name for s in dest_candidates]}")
                found = False
                for o in origin_candidates:
                    for d in dest_candidates:
                        if o.sequence < d.sequence:
                            print(f"[DEBUG] checking segment: origin={o.city.name} (seq={o.sequence}), destination={d.city.name} (seq={d.sequence})")
                            # Utiliser scheduled_trip pour filtrer les réservations
                            qs = Booking.objects.filter(
                                scheduled_trip=st,
                                status__in=['confirmed', 'pending']
                            ).select_related('origin_stop', 'destination_stop')
                            # Inclure aussi les anciennes réservations sans scheduled_trip
                            old_qs = Booking.objects.filter(
                                trip=trip,
                                scheduled_trip__isnull=True,
                                booking_date__date=travel_date,
                                status__in=['confirmed', 'pending']
                            ).select_related('origin_stop', 'destination_stop')

                            occupied = set()
                            # Vérifier les réservations avec scheduled_trip
                            for b in qs:
                                try:
                                    if b.origin_stop and b.destination_stop:
                                        # chevauchement si NOT (b.dest <= o OR b.orig >= d)
                                        overlap = not (b.destination_stop.sequence <= o.sequence or b.origin_stop.sequence >= d.sequence)
                                        print(f"[DEBUG] booking id={b.id}: origin={b.origin_stop.city.name} (seq={b.origin_stop.sequence}), dest={b.destination_stop.city.name} (seq={b.destination_stop.sequence}), overlap={overlap}")
                                        if overlap:
                                            occupied.add(b.seat_number)
                                    else:
                                        # réservation sans escales: considérer comme occupant toutes les sections
                                        occupied.add(b.seat_number)
                                except Exception as e:
                                    print(f"[DEBUG] exception while checking booking id={b.id}: {e}")
                                    occupied.add(b.seat_number)
                            
                            # Vérifier les anciennes réservations sans scheduled_trip
                            for b in old_qs:
                                try:
                                    if b.origin_stop and b.destination_stop:
                                        # chevauchement si NOT (b.dest <= o OR b.orig >= d)
                                        overlap = not (b.destination_stop.sequence <= o.sequence or b.origin_stop.sequence >= d.sequence)
                                        print(f"[DEBUG] old booking id={b.id}: origin={b.origin_stop.city.name} (seq={b.origin_stop.sequence}), dest={b.destination_stop.city.name} (seq={b.destination_stop.sequence}), overlap={overlap}")
                                        if overlap:
                                            occupied.add(b.seat_number)
                                    else:
                                        # réservation sans escales: considérer comme occupant toutes les sections
                                        occupied.add(b.seat_number)
                                except Exception as e:
                                    print(f"[DEBUG] exception while checking old booking id={b.id}: {e}")
                                    occupied.add(b.seat_number)

                            available = max(trip.capacity - len(occupied), 0)
                            print(f"[DEBUG] segment: occupied seats={list(occupied)}, available={available}")
                            if available >= passengers:
                                matches.append(st)
                                found = True
                                print(f"[DEBUG] segment match added scheduled_trip id={st.id}")
                                break
                    if found:
                        break

            print(f"[DEBUG] final matches count: {len(matches)}")
            # Sérialiser avec le contexte pour calculer available_seats par segment
            st_serializer = ScheduledTripSerializer(
                matches,
                many=True,
                context={'origin_city': departure_city, 'destination_city': arrival_city}
            )
            print(f"[DEBUG] serialized matches data: {st_serializer.data}")
            return Response(st_serializer.data)
           

        print(f"[DEBUG] serializer errors: {serializer.errors}")
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)'''

# Localiser le début et la fin de la méthode post
start_marker = "    def post(self, request, *args, **kwargs):"
end_marker = "class ScheduledTripDetailView(generics.RetrieveAPIView):"

start_index = content.find(start_marker)
end_index = content.find(end_marker)

if start_index != -1 and end_index != -1:
    # Remplacer la méthode post
    updated_content = content[:start_index] + new_post_method + content[end_index:]
    
    # Écrire le contenu mis à jour dans le fichier
    with open(file_path, 'w') as f:
        f.write(updated_content)
    
    print("La vue ScheduledTripSearchView a été mise à jour avec succès!")
else:
    print("Erreur: Impossible de localiser la méthode post dans ScheduledTripSearchView")
