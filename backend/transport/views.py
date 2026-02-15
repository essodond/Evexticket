import logging
from rest_framework.decorators import action
from rest_framework.decorators import api_view
from rest_framework.decorators import permission_classes
from rest_framework.permissions import AllowAny

from rest_framework.views import APIView
from datetime import datetime, timedelta
from django.utils import timezone
from django.db.models import Sum, Q
from rest_framework import generics, status, permissions, viewsets
from rest_framework.response import Response
from django.contrib.auth.models import User
from rest_framework.permissions import AllowAny
from rest_framework.authtoken.models import Token
from django.contrib.auth import authenticate
from .models import ScheduledTrip
from .serializers import ScheduledTripSerializer
from .serializers import RegisterSerializer, UserSerializer, CompanySerializer, TripSerializer, BookingSerializer, PaymentSerializer, ReviewSerializer, NotificationSerializer, ScheduledTripSerializer, CompanyStatsSerializer, TripStopSerializer, BoardingZoneSerializer, CitySerializer, TripSearchSerializer, BookingCreateSerializer, DashboardStatsSerializer
from django.http import Http404
from .models import Company, City, Trip, Booking, Payment, Review, Notification, ScheduledTrip, UserProfile, TripStop, BoardingZone
from django.contrib.auth import authenticate

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (AllowAny,)
    serializer_class = RegisterSerializer

class EmailAuthToken(APIView):
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        email = request.data.get('email')
        phone_number = request.data.get('phone_number')
        password = request.data.get('password')
        
        # Vérifier que password est fourni et soit email soit phone_number
        if not password:
            return Response({'detail': 'Le champ password est requis.'}, status=status.HTTP_400_BAD_REQUEST)
        
        if not email and not phone_number:
            return Response({'detail': 'Vous devez fournir soit un email soit un numéro de téléphone.'}, status=status.HTTP_400_BAD_REQUEST)
        
        user = None
        
        if email:
            # Connexion avec email
            user = authenticate(request, username=email, password=password)
        elif phone_number:
            # Connexion avec numéro de téléphone
            try:
                user_profile = UserProfile.objects.get(phone_number=phone_number)
                user = authenticate(request, username=user_profile.user.username, password=password)
            except UserProfile.DoesNotExist:
                user = None
        
        if user:
            token, created = Token.objects.get_or_create(user=user)
            user_serializer = UserSerializer(user)
            return Response({
                'token': token.key,
                'user': user_serializer.data
            })
        else:
            return Response({'detail': 'Identifiants invalides.'}, status=status.HTTP_401_UNAUTHORIZED)

class ScheduledTripViewSet(viewsets.ModelViewSet):
    queryset = ScheduledTrip.objects.all()
    serializer_class = ScheduledTripSerializer
    permission_classes = [permissions.AllowAny]

    def perform_create(self, serializer):
        # Logic to ensure only company admins or staff can create scheduled trips
        trip = serializer.validated_data.get('trip')
        if trip:
            company = trip.company
            if not (self.request.user.is_staff or company.admins.filter(id=self.request.user.id).exists()):
                raise serializers.ValidationError(
                    f"Vous n'avez pas la permission de créer des trajets planifiés pour la compagnie '{company.name}' (ID: {company.id})."
                )
        serializer.save()

    def perform_update(self, serializer):
        scheduled_trip = self.get_object()
        trip = scheduled_trip.trip
        if not (self.request.user.is_staff or trip.company.admins.filter(id=self.request.user.id).exists()):
            raise serializers.ValidationError(
                f"Vous n'avez pas la permission de modifier ce trajet planifié pour la compagnie '{trip.company.name}'."
            )
        serializer.save()

    def perform_destroy(self, instance):
        trip = instance.trip
        if not (self.request.user.is_staff or trip.company.admins.filter(id=self.request.user.id).exists()):
            raise serializers.ValidationError(
                f"Vous n'avez pas la permission de supprimer ce trajet planifié pour la compagnie '{trip.company.name}'."
            )
        instance.delete()


class MyBookingsView(generics.ListAPIView):
    """
    Renvoie la liste des réservations pour l'utilisateur actuellement authentifié.
    Retourne directement un tableau sans pagination.
    """
    serializer_class = BookingSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None  # Désactiver la pagination

    def get_queryset(self):
        """
        Cette vue doit retourner une liste de toutes les réservations
        pour l'utilisateur actuellement authentifié.
        """
        user = self.request.user
        # Filter bookings by user, and prefetch related trip details for efficiency
        return Booking.objects.filter(user=user).select_related(
            'trip', 
            'trip__company', 
            'trip__departure_city', 
            'trip__arrival_city',
            'scheduled_trip'
        ).order_by('-booking_date')



class TripSyncView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, *args, **kwargs):
        last_sync_str = request.query_params.get('last_sync_timestamp')
        
        if last_sync_str:
            try:
                last_sync_timestamp = datetime.fromisoformat(last_sync_str).replace(tzinfo=timezone.utc)
            except ValueError:
                return Response({"error": "Invalid last_sync_timestamp format. Use ISO 8601."}, status=status.HTTP_400_BAD_REQUEST)
            
            # Fetch trips that were created or updated since last_sync_timestamp
            updated_trips = ScheduledTrip.objects.filter(
                Q(created_at__gte=last_sync_timestamp) | Q(updated_at__gte=last_sync_timestamp)
            ).distinct()
            
            updated_trip_serializer = TripSearchSerializer(updated_trips, many=True)
            
            return Response({
                "updated_trips": updated_trip_serializer.data,
                "current_timestamp": datetime.now(timezone.utc).isoformat()
            }, status=status.HTTP_200_OK)
        else:
            # If no timestamp is provided, return all trips (initial sync)
            all_trips = ScheduledTrip.objects.all()
            all_trip_serializer = TripSearchSerializer(all_trips, many=True)
            return Response({
                "all_trips": all_trip_serializer.data,
                "current_timestamp": datetime.now(timezone.utc).isoformat()
            }, status=status.HTTP_200_OK)


@api_view(['GET'])
def scheduled_trip_stops(request, pk):
    """
    Retourne les arrêts pour un ScheduledTrip donné.
    Les arrêts sont ceux du Trip associé.
    """
    try:
        scheduled_trip = ScheduledTrip.objects.get(pk=pk)
        trip = scheduled_trip.trip
        stops = TripStop.objects.filter(trip=trip).order_by('sequence')
        serializer = TripStopSerializer(stops, many=True)
        return Response(serializer.data)
    except ScheduledTrip.DoesNotExist:
        return Response({'detail': 'Trajet planifié non trouvé.'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['GET'])
@permission_classes([AllowAny])
def cities_list(request):
    """
    Retourne la liste de toutes les villes disponibles.
    """
    cities = City.objects.all().order_by('name')
    serializer = CitySerializer(cities, many=True)
    return Response(serializer.data)

class CurrentUserView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, *args, **kwargs):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

class DashboardStatsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, *args, **kwargs):
        # Calculate dashboard statistics
        today = timezone.now().date()
        week_ago = today - timedelta(days=7)
        month_ago = today - timedelta(days=30)

        # Total bookings
        total_bookings = Booking.objects.count()
        
        # Bookings this week
        bookings_this_week = Booking.objects.filter(booking_date__gte=week_ago).count()
        
        # Bookings this month
        bookings_this_month = Booking.objects.filter(booking_date__gte=month_ago).count()
        
        # Total revenue
        total_revenue = Booking.objects.aggregate(total=Sum('total_price'))['total'] or 0
        
        # Revenue this week
        revenue_this_week = Booking.objects.filter(booking_date__gte=week_ago).aggregate(total=Sum('total_price'))['total'] or 0
        
        # Revenue this month
        revenue_this_month = Booking.objects.filter(booking_date__gte=month_ago).aggregate(total=Sum('total_price'))['total'] or 0
        
        # Active trips
        active_trips = Trip.objects.filter(is_active=True).count()
        
        # Active companies
        active_companies = Company.objects.filter(is_active=True).count()
        
        stats = {
            'total_bookings': total_bookings,
            'bookings_this_week': bookings_this_week,
            'bookings_this_month': bookings_this_month,
            'total_revenue': total_revenue,
            'revenue_this_week': revenue_this_week,
            'revenue_this_month': revenue_this_month,
            'active_trips': active_trips,
            'active_companies': active_companies,
        }
        
        serializer = DashboardStatsSerializer(stats)
        return Response(serializer.data)
from django.db.models import Sum
class CompanyStatsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, company_id, *args, **kwargs):
        try:
            company = Company.objects.get(pk=company_id)
        except Company.DoesNotExist:
            return Response({"detail": "Compagnie non trouvée."}, status=status.HTTP_404_NOT_FOUND)

        # Vérifier si l'utilisateur est un admin de la compagnie
        if not (request.user.is_staff or company.admins.filter(id=request.user.id).exists()):
            return Response({"detail": "Vous n'êtes pas autorisé à voir les statistiques de cette compagnie."}, status=status.HTTP_403_FORBIDDEN)

        # Calculer les statistiques pour la compagnie
        total_bookings = Booking.objects.filter(trip__company=company).count()
        total_revenue = Booking.objects.filter(trip__company=company, status='confirmed').aggregate(total=Sum('total_price'))['total'] or 0
        active_clients = Booking.objects.filter(trip__company=company).values('passenger_email').distinct().count()
        scheduled_trips = ScheduledTrip.objects.filter(trip__company=company, date__gte=timezone.now().date()).count()
        
# Nombre de réservations confirmées
        confirmed_bookings = Booking.objects.filter(
            trip__company=company,
            status='confirmed'
        ).count()

        # Nombre total de places disponibles
        total_seats = ScheduledTrip.objects.filter(
            trip__company=company
        ).aggregate(
            total=Sum('trip__capacity')
        )['total'] or 0

        # Calcul du taux moyen d’occupation
        average_occupancy = (
            confirmed_bookings / total_seats
            if total_seats > 0 else 0
        )
        stats = {
            'total_bookings': total_bookings,
            'total_revenue': total_revenue,
            'active_clients': active_clients,
            'scheduled_trips': scheduled_trips,
            "average_occupancy": average_occupancy,
        }
        
        serializer = CompanyStatsSerializer(stats)
        return Response(serializer.data)

class CompanyViewSet(viewsets.ModelViewSet):
    queryset = Company.objects.all()
    serializer_class = CompanySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            self.permission_classes = [permissions.IsAuthenticated]
        elif self.action == 'retrieve':
            self.permission_classes = [permissions.IsAuthenticated]
        return super().get_permissions()

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

class CompanyDetailView(generics.RetrieveAPIView):
    queryset = Company.objects.all()
    serializer_class = CompanySerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'pk'

class CompanyBookingsView(generics.ListAPIView):
    serializer_class = BookingSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        company_id = self.kwargs['company_id']
        try:
            company = Company.objects.get(pk=company_id)
        except Company.DoesNotExist:
            raise Http404

        # Check if the user is an admin of the company or a staff member
        if not (self.request.user.is_staff or company.admins.filter(id=self.request.user.id).exists()):
            # If not, return an empty queryset or raise a permission denied error
            # For now, returning an empty queryset to avoid 403 for non-admins
            return Booking.objects.none()

        return Booking.objects.filter(trip__company=company).select_related(
            'trip',
            'trip__company',
            'trip__departure_city',
            'trip__arrival_city'
        ).order_by('-booking_date')

class TripViewSet(viewsets.ModelViewSet):
    queryset = Trip.objects.all()
    serializer_class = TripSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        # Allow staff to see all trips, company admins to see their company's trips
        if self.request.user.is_staff:
            return Trip.objects.all()
        # Filter trips by companies the user administers
        return Trip.objects.filter(company__admins=self.request.user).distinct()

    def perform_create(self, serializer):
        # Ensure the user creating the trip is an admin of the associated company
        company = serializer.validated_data.get('company')
        if not (self.request.user.is_staff or company.admins.filter(id=self.request.user.id).exists()):
            raise serializers.ValidationError(
                f"Vous n'avez pas la permission de créer des trajets pour la compagnie '{company.name}' (ID: {company.id}). "
                f"Votre ID utilisateur: {self.request.user.id}. Admins de la compagnie: {[admin.id for admin in company.admins.all()]}"
            )
        serializer.save()

    def perform_update(self, serializer):
        # Ensure the user updating the trip is an admin of the associated company
        company = serializer.instance.company
        if not (self.request.user.is_staff or company.admins.filter(id=self.request.user.id).exists()):
            raise serializers.ValidationError("You do not have permission to update trips for this company.")
        serializer.save()

    def perform_destroy(self, instance):
        # Ensure the user deleting the trip is an admin of the associated company
        company = instance.company
        if not (self.request.user.is_staff or company.admins.filter(id=self.request.user.id).exists()):
            raise serializers.ValidationError("You do not have permission to delete trips for this company.")
        instance.delete()

class ScheduledTripSearchView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = TripSearchSerializer(data=request.data)
        if serializer.is_valid():
            departure_city = serializer.validated_data['departure_city']
            arrival_city = serializer.validated_data['arrival_city']
            travel_date = serializer.validated_data['travel_date']
            passengers = serializer.validated_data['passengers']

            from unidecode import unidecode

            dep_norm = unidecode(departure_city).lower()
            arr_norm = unidecode(arrival_city).lower()

            # Récupérer tous les voyages planifiés pour la date donnée
            scheduled_trips = ScheduledTrip.objects.filter(
                date=travel_date,
                trip__is_active=True
            ).select_related('trip__company', 'trip__departure_city', 'trip__arrival_city')

            matches = []
            for st in scheduled_trips:
                trip = st.trip
                # Récupérer les escales ordonnées
                stops = list(TripStop.objects.filter(trip=trip).select_related('city').order_by('sequence'))

                # Cas 1: correspondance directe aux extrémités du trajet
                direct_match = (
                    dep_norm in unidecode((trip.departure_city.name or '')).lower() and
                    arr_norm in unidecode((trip.arrival_city.name or '')).lower()
                )
                if direct_match:
                    booked = Booking.objects.filter(
                        trip=trip,
                        travel_date=st.date,
                        status__in=['confirmed', 'pending']
                    ).values_list('seat_number', flat=True)
                    available = max(trip.capacity - len(set(booked)), 0)
                    if available >= passengers:
                        matches.append(st)
                        continue

                # Cas 2: recherche par escales (segments)
                origin_candidates = [s for s in stops if dep_norm in unidecode(s.city.name or '').lower()]
                dest_candidates = [s for s in stops if arr_norm in unidecode(s.city.name or '').lower()]
                found = False
                for o in origin_candidates:
                    for d in dest_candidates:
                        if o.sequence < d.sequence:
                            qs = Booking.objects.filter(
                                trip=trip,
                                travel_date=st.date,
                                status__in=['confirmed', 'pending']
                            ).select_related('origin_stop', 'destination_stop')

                            occupied = set()
                            for b in qs:
                                try:
                                    if b.origin_stop and b.destination_stop:
                                        # chevauchement si NOT (b.dest <= o OR b.orig >= d)
                                        if not (b.destination_stop.sequence <= o.sequence or b.origin_stop.sequence >= d.sequence):
                                            occupied.add(b.seat_number)
                                    else:
                                        # réservation sans escales: considérer comme occupant toutes les sections
                                        occupied.add(b.seat_number)
                                except Exception:
                                    occupied.add(b.seat_number)

                            available = max(trip.capacity - len(occupied), 0)
                            if available >= passengers:
                                matches.append(st)
                                found = True
                                break
                    if found:
                        break

            # Sérialiser avec le contexte pour calculer available_seats par segment
            st_serializer = ScheduledTripSerializer(
                matches,
                many=True,
                context={'origin_city': departure_city, 'destination_city': arrival_city}
            )
            return Response(st_serializer.data)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class BookingViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    
    def get_serializer_class(self):
        # Utiliser BookingCreateSerializer pour la création, BookingSerializer pour les autres opérations
        if self.action == 'create':
            return BookingCreateSerializer
        return BookingSerializer
    
    def get_queryset(self):
        import logging
        logger = logging.getLogger(__name__)
        
        # Log de la requête
        logger.info(f"Received request for bookings from user: {self.request.user}, action: {self.action}")
        
        # Renvoyer les réservations de l'utilisateur connecté
        queryset = Booking.objects.filter(user=self.request.user)
        logger.info(f"Found {queryset.count()} bookings for user")
        return queryset
    
    def create(self, request, *args, **kwargs):
        import logging
        logger = logging.getLogger(__name__)
        
        # Log des données de requête
        logger.info(f"Received booking request: {request.data}")
        logger.info(f"User: {request.user}")
        
        # Ajouter le user à la requête data si non fourni
        if 'user' not in request.data:
            request.data['user'] = request.user.id
        
        # Appeler la méthode parent pour la création
        response = super().create(request, *args, **kwargs)
        
        # Log de la réponse
        logger.info(f"Booking created successfully: {response.data}")
        
        return response

@api_view(['GET'])
def scheduled_trips_list(request):
    # Récupérer les paramètres de requête
    departure_city = request.query_params.get('departure_city')
    arrival_city = request.query_params.get('arrival_city')
    # Accepter 'travel_date', 'date' et 'departure_date' comme paramètres
    travel_date = request.query_params.get('travel_date') or request.query_params.get('date') or request.query_params.get('departure_date')
    
    # Filtrer les trajets planifiés actifs
    scheduled_trips = ScheduledTrip.objects.filter(
        trip__is_active=True
    ).select_related('trip__company', 'trip__departure_city', 'trip__arrival_city')
    
    # Appliquer le filtre de date
    from datetime import datetime, timedelta
    if travel_date:
        # Gérer différents formats de date (y compris avec des points)
        try:
            date_formats = ['%d/%m/%Y', '%d-%m-%Y', '%Y-%m-%d', '%m/%d/%Y', '%m-%d-%Y', '%d.%m.%Y']
            parsed_date = None
            for fmt in date_formats:
                try:
                    parsed_date = datetime.strptime(travel_date, fmt).date()
                    break
                except ValueError:
                    continue
            
            if parsed_date:
                if departure_city or arrival_city:
                    # Requête de recherche: afficher exactement la date recherchée
                    scheduled_trips = scheduled_trips.filter(date=parsed_date)
                    print(f"[DEBUG] Date exacte filtrée: {parsed_date}, Nombre de trajets: {scheduled_trips.count()}")
                else:
                    # Page d'accueil: afficher 3 jours
                    end_date = parsed_date + timedelta(days=3)
                    scheduled_trips = scheduled_trips.filter(date__gte=parsed_date, date__lte=end_date)
                    print(f"[DEBUG] Dates filtrées pour accueil: {parsed_date} à {end_date}, Nombre de trajets: {scheduled_trips.count()}")
        except Exception as e:
            print(f"[DEBUG] Erreur de parsing de date: {e}")
    else:
        today = datetime.now().date()
        if departure_city or arrival_city:
            # Requête de recherche: afficher tous les trajets futurs
            scheduled_trips = scheduled_trips.filter(date__gte=today)
            print(f"[DEBUG] Requête de recherche sans date: affichage de tous les trajets futurs à partir de {today}, Nombre de trajets: {scheduled_trips.count()}")
        else:
            # Page d'accueil: afficher 3 jours
            end_date = today + timedelta(days=3)
            scheduled_trips = scheduled_trips.filter(date__gte=today, date__lte=end_date)
            print(f"[DEBUG] Page d'accueil sans date: affichage des trajets du {today} au {end_date}, Nombre de trajets: {scheduled_trips.count()}")
    
    # Trier les trajets par date ascendante (plus proche d'abord)
    scheduled_trips = scheduled_trips.order_by('date')
    
    # Filtrer les trajets pour la page d'accueil (pas de filtres de ville ET pas de paramètre de date spécifique)
    if not departure_city and not arrival_city and not travel_date:
        from django.db.models import F, ExpressionWrapper, DateTimeField, OuterRef, Subquery, Count, IntegerField
        from django.utils import timezone
        from .models import Booking
        
        now = timezone.now()
        cutoff = now + timedelta(hours=3)
        
        # Annoter avec la date et l'heure de départ complètes
        scheduled_trips = scheduled_trips.annotate(
            full_departure_time=ExpressionWrapper(
                F('date') + F('trip__departure_time'),
                output_field=DateTimeField()
            )
        )
        
        # Filtrer les trajets qui partent dans plus de 3 heures
        scheduled_trips = scheduled_trips.filter(full_departure_time__gt=cutoff)
        
        # Annoter avec le nombre de réservations confirmées
        confirmed_bookings = Booking.objects.filter(
            scheduled_trip=OuterRef('pk'),
            status='confirmed'
        ).values('scheduled_trip').annotate(count=Count('id')).values('count')
        
        # Filtrer les trajets avec au moins une place disponible
        scheduled_trips = scheduled_trips.annotate(
            confirmed_bookings_count=Subquery(confirmed_bookings, output_field=IntegerField())
        ).filter(
            trip__capacity__gt=F('confirmed_bookings_count')
        )
    
    if departure_city and arrival_city:
        from unidecode import unidecode
        matches = []
        
        # Normaliser les paramètres de recherche
        dep_norm = unidecode(departure_city).lower()
        arr_norm = unidecode(arrival_city).lower()
        
        for st in scheduled_trips:
            trip = st.trip
            match_found = False
            
            # Récupérer les escales ordonnées
            stops = list(TripStop.objects.filter(trip=trip).select_related('city').order_by('sequence'))
            
            # Cas 1: correspondance directe aux extrémités du trajet
            direct_match = (
                dep_norm in unidecode((trip.departure_city.name or '')).lower() and
                arr_norm in unidecode((trip.arrival_city.name or '')).lower()
            )
            if direct_match:
                match_found = True
            else:
                # Cas 2: correspondance via les escales (la ville de départ doit être avant l'arrivée dans la séquence)
                origin_candidates = [s for s in stops if dep_norm in unidecode(s.city.name or '').lower()]
                dest_candidates = [s for s in stops if arr_norm in unidecode(s.city.name or '').lower()]
                
                # Vérifier si nous avons un point de départ et un point d'arrivée valides avec la bonne séquence
                for o in origin_candidates:
                    for d in dest_candidates:
                        if o.sequence < d.sequence:
                            match_found = True
                            break
                    if match_found:
                        break
            
            if match_found:
                matches.append(st)
        
        # Sérialiser avec le contexte pour calculer available_seats par segment
        st_serializer = ScheduledTripSerializer(
            matches,
            many=True,
            context={'origin_city': departure_city, 'destination_city': arrival_city}
        )
        return Response(st_serializer.data)
    elif departure_city:
        # Cas 3: seulement filtre de départ
        from unidecode import unidecode
        dep_norm = unidecode(departure_city).lower()
        scheduled_trips = [st for st in scheduled_trips if 
                          dep_norm in unidecode((st.trip.departure_city.name or '')).lower() or 
                          any(dep_norm in unidecode(s.city.name or '').lower() for s in TripStop.objects.filter(trip=st.trip))]
        serializer = ScheduledTripSerializer(scheduled_trips, many=True)
        return Response(serializer.data)
    elif arrival_city:
        # Cas 4: seulement filtre d'arrivée
        from unidecode import unidecode
        arr_norm = unidecode(arrival_city).lower()
        scheduled_trips = [st for st in scheduled_trips if 
                          arr_norm in unidecode((st.trip.arrival_city.name or '')).lower() or 
                          any(arr_norm in unidecode(s.city.name or '').lower() for s in TripStop.objects.filter(trip=st.trip))]
        serializer = ScheduledTripSerializer(scheduled_trips, many=True)
        return Response(serializer.data)
    
    # Si pas de filtres de ville, retourner les trajets filtrés par date
    serializer = ScheduledTripSerializer(scheduled_trips, many=True)
    return Response(serializer.data)

@api_view(['GET'])
def booked_seats_list(request):
    booked_seats = Booking.objects.values_list('seat_number', flat=True).distinct()
    return Response({'booked_seats': list(booked_seats)})

@api_view(['GET'])
def availability_view(request):
    # This view would typically return availability information based on query parameters
    return Response({'message': 'Availability view placeholder'})