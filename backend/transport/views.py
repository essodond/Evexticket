from rest_framework.views import APIView
from rest_framework import generics, status
from django.contrib.auth.models import User
from rest_framework.permissions import AllowAny
from rest_framework.authtoken.models import Token
from django.contrib.auth import authenticate
from .serializers import RegisterSerializer

# Vue d'inscription

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        # Utiliser le serializer pour valider et créer l'utilisateur
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        # Générer un token si vous utilisez DRF authtoken
        token, created = Token.objects.get_or_create(user=user)

        data = serializer.data
        # serializer.data n'inclura pas le token ni le mot de passe
        data['id'] = user.id
        data['token'] = token.key
        return Response(data, status=status.HTTP_201_CREATED)

class EmailAuthToken(APIView):
    """Authentification par email -> retourne un token."""
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        import logging
        logger = logging.getLogger(__name__)

        email = request.data.get('email')
        username = request.data.get('username')
        password = request.data.get('password')
        if not password or (not email and not username):
            return Response({'detail': 'Email/username et mot de passe requis.'}, status=status.HTTP_400_BAD_REQUEST)

        attempts = []

        # 1) If email provided, try to find user by email and authenticate with that user's username
        if email:
            try:
                user_by_email = User.objects.get(email=email)
                attempts.append(f'found_user_by_email:{user_by_email.username}')
                user_auth = authenticate(request, username=user_by_email.username, password=password)
                if user_auth:
                    token, created = Token.objects.get_or_create(user=user_auth)
                    from .serializers import UserSerializer
                    user_data = UserSerializer(user_auth).data
                    return Response({'token': token.key, 'user': user_data})
                attempts.append('auth_failed_for_user_by_email')
            except User.DoesNotExist:
                attempts.append('no_user_with_email')

            # Also try authenticating directly using the email as username (in case username == email)
            user_auth = authenticate(request, username=email, password=password)
            if user_auth:
                token, created = Token.objects.get_or_create(user=user_auth)
                from .serializers import UserSerializer
                user_data = UserSerializer(user_auth).data
                return Response({'token': token.key, 'user': user_data})
            attempts.append('auth_failed_using_email_as_username')

        # 2) If username provided, try username authentication
        if username:
            user_auth = authenticate(request, username=username, password=password)
            if user_auth:
                token, created = Token.objects.get_or_create(user=user_auth)
                from .serializers import UserSerializer
                user_data = UserSerializer(user_auth).data
                return Response({'token': token.key, 'user': user_data})
            attempts.append('auth_failed_for_provided_username')

        # 3) Final fallback: try authenticate with username equal to provided password? (not typical) - skip

        # Log attempts for debugging (server-side only)
        logger.warning('EmailAuthToken failed: attempts=%s, remote=%s', attempts, request.META.get('REMOTE_ADDR'))

        return Response({'detail': 'Identifiants invalides.'}, status=status.HTTP_400_BAD_REQUEST)
from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q, Count, Sum, Avg
from django.utils import timezone
from datetime import datetime, timedelta
from django.contrib.auth.models import User
from .models import Company, City, Trip, Booking, Payment, Review, Notification, TripStop
from .serializers import (
    CompanySerializer, CitySerializer, TripSerializer, BookingSerializer,
    PaymentSerializer, ReviewSerializer, NotificationSerializer,
    TripSearchSerializer, BookingCreateSerializer, DashboardStatsSerializer,
    CompanyStatsSerializer, UserSerializer
)

class CurrentUserView(APIView):
    """Retourne les informations de l'utilisateur connecté et son rôle"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        # Importer le serializer local pour éviter les dépendances circulaires
        from .serializers import UserSerializer
        data = UserSerializer(user).data
        # Indiquer si c'est un admin de compagnie (legacy admin_user ou nouveaux admins M2M)
        # Important: un administrateur global (is_staff) ne doit pas être traité comme
        # admin de compagnie pour éviter les redirections/confusions côté frontend.
        if user.is_staff:
            is_company_admin = False
        else:
            is_company_admin = Company.objects.filter(Q(admin_user=user) | Q(admins=user)).exists()
        data['is_company_admin'] = is_company_admin
        if is_company_admin:
            comp = Company.objects.filter(Q(admin_user=user) | Q(admins=user)).first()
            data['company_id'] = comp.id
        return Response(data)




def create_scheduled_trips_for_trip(trip, days=14, start_offset=1):
    """Utility: create ScheduledTrip instances for a Trip for the next `days` days.

    This will create (if not existing) ScheduledTrip objects starting from
    today + start_offset (default: tomorrow) for `days` consecutive days.
    Returns the number created.
    """
    try:
        from .models import ScheduledTrip
        from django.utils import timezone
    except Exception:
        return 0

    today = timezone.localdate()
    start_date = today + timedelta(days=start_offset)
    created = 0
    for n in range(days):
        d = start_date + timedelta(days=n)
        obj, was_created = ScheduledTrip.objects.get_or_create(
            trip=trip,
            date=d,
            defaults={'is_active': True, 'available_seats': trip.capacity}
        )
        if was_created:
            created += 1
    return created


class CityViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet pour les villes (lecture seule)"""
    queryset = City.objects.filter(is_active=True)
    serializer_class = CitySerializer
    permission_classes = [permissions.AllowAny]


class CompanyViewSet(viewsets.ModelViewSet):
    """ViewSet pour les compagnies"""
    queryset = Company.objects.all()
    serializer_class = CompanySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if not self.request.user.is_staff:
            return Company.objects.filter(is_active=True)
        return Company.objects.all()

    @action(detail=True, methods=['get'])
    def trips(self, request, pk=None):
        """Récupérer les trajets d'une compagnie"""
        company = self.get_object()
        trips = company.trips.filter(is_active=True)
        serializer = TripSerializer(trips, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def stats(self, request, pk=None):
        company = self.get_object()
        
        # Ne compter que les voyages programmés
        total_trips = Trip.objects.filter(
            company=company,
            scheduled_trips__isnull=False
        ).distinct().count()
        
        total_bookings = Booking.objects.filter(trip__company=company).count()
        
        total_revenue = Booking.objects.filter(
            trip__company=company,
            status='confirmed'
        ).aggregate(total=Sum('total_price'))['total'] or 0
        
        # Pour les utilisateurs actifs, nous pourrions compter les utilisateurs uniques ayant réservé un voyage avec cette compagnie
        active_users = Booking.objects.filter(
            trip__company=company
        ).values('user').distinct().count()

        stats_data = {
            'total_trips': total_trips,
            'total_bookings': total_bookings,
            'total_revenue': total_revenue,
            'active_users': active_users,
        }
        
        serializer = CompanyStatsSerializer(stats_data)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def bookings(self, request, pk=None):
        """Liste des réservations pour une compagnie spécifique"""
        company = self.get_object()
        user = request.user
        # Autoriser seulement staff ou administrateurs de la compagnie
        is_admin_of_company = (company.admin_user_id == user.id) or company.admins.filter(id=user.id).exists()
        if not user.is_staff and not is_admin_of_company:
            return Response({'detail': 'Accès non autorisé'}, status=status.HTTP_403_FORBIDDEN)
        qs = Booking.objects.filter(trip__company=company).select_related('trip', 'trip__departure_city', 'trip__arrival_city')
        serializer = BookingSerializer(qs, many=True)
        return Response(serializer.data)

    def perform_create(self, serializer):
        user = self.request.user
        if not user.is_staff:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Seul un administrateur peut créer une compagnie.")
        # Si l'utilisateur est déjà admin d'une compagnie, ne pas échouer — on crée quand même
        try:
            company = serializer.save()
            # Ajouter l'utilisateur courant aux administrateurs M2M
            try:
                company.admins.add(user)
            except Exception:
                pass
        except Exception as e:
            from rest_framework.exceptions import ValidationError
            error_msg = str(e)
            raise ValidationError({'detail': f"Erreur lors de la création de la compagnie: {error_msg}"})


class TripViewSet(viewsets.ModelViewSet):
    """ViewSet pour les trajets"""
    queryset = Trip.objects.filter(is_active=True)
    serializer_class = TripSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        user = self.request.user
        # Staff can create for any company
        if user.is_staff:
            trip = serializer.save()
            # After creating a trip, create scheduled runs for the next 14 days
            try:
                create_scheduled_trips_for_trip(trip, days=14, start_offset=1)
            except Exception:
                pass
            return trip

        # Non-staff: must be admin of a company
        companies_for_user = Company.objects.filter(Q(admin_user=user) | Q(admins=user))
        if not companies_for_user.exists():
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Vous n'êtes pas autorisé à créer des trajets.")

        # If client provided a company, ensure it's one of their companies
        provided_company = serializer.validated_data.get('company') if hasattr(serializer, 'validated_data') else None
        if provided_company:
            if isinstance(provided_company, Company):
                company_obj = provided_company
            else:
                # provided_company may be a primary key
                try:
                    company_obj = Company.objects.get(pk=provided_company)
                except Company.DoesNotExist:
                    from rest_framework.exceptions import ValidationError
                    raise ValidationError({'company': 'Compagnie inexistante.'})

            if not companies_for_user.filter(pk=company_obj.pk).exists():
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied("Vous ne pouvez créer que des trajets pour vos compagnies.")

            trip = serializer.save()
            try:
                create_scheduled_trips_for_trip(trip, days=14, start_offset=1)
            except Exception:
                pass
            return trip

        # No company provided: default to the first company the user administers
        trip = serializer.save(company=companies_for_user.first())
        try:
            create_scheduled_trips_for_trip(trip, days=14, start_offset=1)
        except Exception:
            pass
        return trip

    def perform_update(self, serializer):
        user = self.request.user
        if user.is_staff:
            return serializer.save()

        companies_for_user = Company.objects.filter(Q(admin_user=user) | Q(admins=user))
        if not companies_for_user.exists():
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Vous n'êtes pas autorisé à modifier ce trajet.")

        instance_company = serializer.instance.company
        if not companies_for_user.filter(pk=instance_company.pk).exists():
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Vous ne pouvez modifier que les trajets de vos compagnies.")

        # If attempting to change company, forbid it unless it's still one of their companies
        new_company = serializer.validated_data.get('company') if hasattr(serializer, 'validated_data') else None
        if new_company and (isinstance(new_company, Company) and not companies_for_user.filter(pk=new_company.pk).exists()):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Impossible d'assigner le trajet à une compagnie que vous ne gérez pas.")

        return serializer.save()

    def get_queryset(self):
        queryset = Trip.objects.filter(is_active=True)

        if not self.request.user.is_staff:
            # Si l'utilisateur est admin d'une compagnie (legacy ou nouveau), limiter
            companies_for_user = Company.objects.filter(Q(admin_user=self.request.user) | Q(admins=self.request.user))
            if companies_for_user.exists():
                queryset = queryset.filter(company__in=companies_for_user)

        return queryset

    def create(self, request, *args, **kwargs):
        """Override create to return a friendly confirmation message and create notifications for company admins."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            self.perform_create(serializer)
        except Exception as e:
            # Return a 400 with the error message to help frontend debugging instead of 500
            import traceback, logging
            logger = logging.getLogger(__name__)
            tb = traceback.format_exc()
            logger.error('Error creating Trip: %s\n%s', str(e), tb)
            # If DRF ValidationError, re-raise to keep normal handling
            from rest_framework.exceptions import ValidationError
            if isinstance(e, ValidationError):
                raise
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        headers = self.get_success_headers(serializer.data)

        trip_obj = serializer.instance
        # create notification for company admins
        try:
            company = trip_obj.company
            admins = []
            if company.admin_user:
                admins.append(company.admin_user)
            admins_qs = company.admins.all()
            for a in admins_qs:
                if a not in admins:
                    admins.append(a)

            for u in admins:
                try:
                    Notification.objects.create(
                        user=u,
                        title=f"Nouveau trajet créé: {company.name}",
                        message=f"Un nouveau trajet {trip_obj.departure_city.name} → {trip_obj.arrival_city.name} a été créé pour la compagnie {company.name}.",
                        notification_type='general'
                    )
                except Exception:
                    pass
        except Exception:
            pass

        return Response({'message': 'Trajet créé avec succès.', 'trip': serializer.data}, status=status.HTTP_201_CREATED, headers=headers)

    @action(detail=False, methods=['post'])
    def search(self, request):
        """Rechercher des trajets"""
        serializer = TripSearchSerializer(data=request.data)
        if serializer.is_valid():
            departure_city = serializer.validated_data['departure_city']
            arrival_city = serializer.validated_data['arrival_city']
            travel_date = serializer.validated_data['travel_date']
            passengers = serializer.validated_data['passengers']
            # Consider any active trip which either directly matches OR contains the
            # requested cities as ordered stops. We'll compute segment info when present.
            trips = Trip.objects.filter(is_active=True).select_related('company', 'departure_city', 'arrival_city')

            results = []
            for trip in trips:
                # Gather ordered stops
                stops = list(TripStop.objects.filter(trip=trip).select_related('city').order_by('sequence'))

                # Helper to compute segment price and available seats given origin/destination indices
                def compute_segment_info(origin_seq, dest_seq):
                    # sum segment_price for sequence in [origin_seq, dest_seq)
                    segments = [s for s in stops if s.sequence >= origin_seq and s.sequence < dest_seq]
                    prices = [s.segment_price for s in segments]
                    if any(p is None for p in prices) or len(prices) == 0:
                        total_price = trip.price
                    else:
                        total_price = sum(prices)

                    # determine occupied seats for this segment

                # We'll search scheduled trips for the date and try to match segments similarly to Trip.search
                scheduled_trips = ScheduledTrip.objects.filter(date=travel_date, trip__is_active=True).select_related('trip__company', 'trip__departure_city', 'trip__arrival_city')

                results = []
                for st in scheduled_trips:
                    trip = st.trip
                    stops = list(TripStop.objects.filter(trip=trip).select_related('city').order_by('sequence'))

                    def compute_segment_info(origin_seq, dest_seq):
                        segments = [s for s in stops if s.sequence >= origin_seq and s.sequence < dest_seq]
                        prices = [s.segment_price for s in segments]
                        if any(p is None for p in prices) or len(prices) == 0:
                            total_price = trip.price
                        else:
                            total_price = sum(prices)

                        qs = Booking.objects.filter(trip=trip, travel_date=st.date, status__in=['confirmed', 'pending']).select_related('origin_stop', 'destination_stop')
                        conflicting_seats = set()
                        for b in qs:
                            try:
                                if b.origin_stop and b.destination_stop:
                                    if not (b.destination_stop.sequence <= origin_seq or b.origin_stop.sequence >= dest_seq):
                                        conflicting_seats.add(b.seat_number)
                                else:
                                    conflicting_seats.add(b.seat_number)
                            except Exception:
                                conflicting_seats.add(b.seat_number)
                        available = max(trip.capacity - len(conflicting_seats), 0)
                        return total_price, available

                    # direct endpoints
                    if departure_city.lower() in (trip.departure_city.name or '').lower() and arrival_city.lower() in (trip.arrival_city.name or '').lower():
                        total_price = trip.price
                        confirmed = Booking.objects.filter(trip=trip, travel_date=st.date, status__in=['confirmed','pending']).values_list('seat_number', flat=True)
                        available = max(trip.capacity - len(set(confirmed)), 0)
                        if available >= passengers:
                            results.append({'scheduled_trip': ScheduledTripSerializer(st).data, 'origin_stop': None, 'destination_stop': None, 'segment_price': total_price, 'available_seats': available})
                            continue

                    origin_candidates = [s for s in stops if departure_city.lower() in (s.city.name or '').lower()]
                    dest_candidates = [s for s in stops if arrival_city.lower() in (s.city.name or '').lower()]
                    matched = False
                    for o in origin_candidates:
                        for d in dest_candidates:
                            if o.sequence < d.sequence:
                                total_price, available = compute_segment_info(o.sequence, d.sequence)
                                if available >= passengers:
                                    matched = True
                                    results.append({'scheduled_trip': ScheduledTripSerializer(st).data, 'origin_stop': {'id': o.id, 'city_id': o.city_id, 'city_name': o.city.name, 'sequence': o.sequence}, 'destination_stop': {'id': d.id, 'city_id': d.city_id, 'city_name': d.city.name, 'sequence': d.sequence}, 'segment_price': total_price, 'available_seats': available})
                                    break
                        if matched:
                            break

                return Response(results)
                if departure_city.lower() in (trip.departure_city.name or '').lower() and arrival_city.lower() in (trip.arrival_city.name or '').lower():
                    # compute availability for full trip
                    total_price = trip.price
                    confirmed = Booking.objects.filter(trip=trip, travel_date=travel_date, status__in=['confirmed','pending']).values_list('seat_number', flat=True)
                    available = max(trip.capacity - len(set(confirmed)), 0)
                    if available >= passengers:
                        matched = True
                        results.append({ 'trip': TripSerializer(trip).data, 'origin_stop': None, 'destination_stop': None, 'segment_price': total_price, 'available_seats': available })

                if matched:
                    continue

                # 2) try to find stops matching departure and arrival in order
                origin_candidates = [s for s in stops if departure_city.lower() in (s.city.name or '').lower()]
                dest_candidates = [s for s in stops if arrival_city.lower() in (s.city.name or '').lower()]
                for o in origin_candidates:
                    for d in dest_candidates:
                        if o.sequence < d.sequence:
                            total_price, available = compute_segment_info(o.sequence, d.sequence)
                            if available >= passengers:
                                matched = True
                                results.append({ 'trip': TripSerializer(trip).data, 'origin_stop': {'id': o.id, 'city_id': o.city_id, 'city_name': o.city.name, 'sequence': o.sequence}, 'destination_stop': {'id': d.id, 'city_id': d.city_id, 'city_name': d.city.name, 'sequence': d.sequence}, 'segment_price': total_price, 'available_seats': available })
                                break
                    if matched:
                        break

            return Response(results)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class BookingViewSet(viewsets.ModelViewSet):
    """ViewSet pour les réservations"""
    serializer_class = BookingSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if not self.request.user.is_staff:
            return Booking.objects.filter(user=self.request.user)
        return Booking.objects.all()

    def get_serializer_class(self):
        if self.action == 'create':
            return BookingCreateSerializer
        return BookingSerializer

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class DashboardStatsView(APIView):
    """Vue pour les statistiques du dashboard admin"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        import logging, traceback
        logger = logging.getLogger(__name__)

        try:
            if not request.user.is_staff:
                return Response({'error': 'Accès non autorisé'}, status=status.HTTP_403_FORBIDDEN)

            total_users = User.objects.count()
            total_companies = Company.objects.count()
            total_trips = Trip.objects.count()
            total_bookings = Booking.objects.count()

            total_revenue = Booking.objects.filter(
                status='confirmed'
            ).aggregate(total=Sum('total_price'))['total'] or 0

            stats_data = {
                'total_users': total_users,
                'total_companies': total_companies,
                'total_trips': total_trips,
                'total_bookings': total_bookings,
                'total_revenue': total_revenue,
                'monthly_growth': 18.5
            }

            serializer = DashboardStatsSerializer(stats_data)
            return Response(serializer.data)
        except Exception as e:
            tb = traceback.format_exc()
            logger.error('Error in DashboardStatsView.get: %s\n%s', str(e), tb)
            return Response({'error': 'Erreur serveur lors du calcul des statistiques', 'detail': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class UserViewSet(viewsets.ModelViewSet):
    """ViewSet pour les utilisateurs"""
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAdminUser]


from rest_framework.decorators import api_view
from .serializers import ScheduledTripSerializer, TripSearchSerializer
from .models import ScheduledTrip, Booking


@api_view(['GET'])
def scheduled_trips_list(request):
    """List scheduled trips, optionally filtered by company_id."""
    company_id = request.query_params.get('company_id')
    qs = ScheduledTrip.objects.all().select_related('trip', 'trip__departure_city', 'trip__arrival_city')
    if company_id:
        qs = qs.filter(trip__company_id=company_id)
    serializer = ScheduledTripSerializer(qs, many=True)
    return Response(serializer.data)


@api_view(['GET'])
def booked_seats_list(request):
    """Retourne la liste des numéros de sièges déjà réservés pour un trajet à une date donnée.

    Query params attendus: `trip_id` (int), `travel_date` (YYYY-MM-DD)
    On inclut les réservations en statut 'pending' et 'confirmed' pour éviter double-réservation.
    """
    trip_id = request.query_params.get('trip_id')
    travel_date = request.query_params.get('travel_date')

    if not trip_id or not travel_date:
        return Response({'detail': 'trip_id et travel_date requis.'}, status=status.HTTP_400_BAD_REQUEST)

    qs = Booking.objects.filter(trip_id=trip_id, travel_date=travel_date, status__in=['pending', 'confirmed'])
    seats = list(qs.values_list('seat_number', flat=True))
    # Normaliser en liste simple
    return Response(seats)


@api_view(['GET'])
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

    qs = Booking.objects.filter(trip=trip, travel_date=travel_date, status__in=['confirmed', 'pending']).select_related('origin_stop', 'destination_stop')

    # D'abord, récupérer tous les sièges des réservations complètes (sans escales)
    full_trip_bookings = qs.filter(origin_stop__isnull=True, destination_stop__isnull=True)
    occupied = set(full_trip_bookings.values_list('seat_number', flat=True))

    # Ensuite, traiter les réservations avec escales si on recherche pour un segment spécifique
    if origin_stop and destination_stop:
        # Resolve origin/destination to TripStop objects. Accept either TripStop PK, City id, or city name.
        def resolve_stop(value):
            # try as pk first
            try:
                return TripStop.objects.get(pk=int(value))
            except Exception:
                pass

            # try by city id
            try:
                v = int(value)
                st = TripStop.objects.filter(trip=trip, city_id=v).order_by('sequence').first()
                if st:
                    return st
            except Exception:
                pass

            # try by city name (contains / normalized)
            try:
                from unidecode import unidecode
                val = str(value).strip()
                norm = unidecode(val).lower()
                sts = TripStop.objects.filter(trip=trip).select_related('city')
                for s in sts:
                    if unidecode(s.city.name).lower() == norm:
                        return s
                for s in sts:
                    if unidecode(s.city.name).lower().startswith(norm) or norm in unidecode(s.city.name).lower():
                        return s
            except Exception:
                pass

            return None

        o = resolve_stop(origin_stop)
        d = resolve_stop(destination_stop)
        if not o or not d:
            return Response({'detail': 'Origin or destination stop not found for this trip.'}, status=status.HTTP_400_BAD_REQUEST)
        if o.trip_id != trip.id or d.trip_id != trip.id:
            return Response({'detail': 'Origin/destination stops do not belong to this trip.'}, status=status.HTTP_400_BAD_REQUEST)
        if o.sequence >= d.sequence:
            return Response({'detail': 'Origin must come before destination.'}, status=status.HTTP_400_BAD_REQUEST)

        # Récupérer toutes les réservations avec escales
        segment_bookings = qs.filter(origin_stop__isnull=False, destination_stop__isnull=False)
        
        # Vérifier les chevauchements pour chaque réservation avec escales
        for b in segment_bookings:
            try:
                # Une réservation chevauche si elle n'est pas entièrement avant ou après le segment demandé
                if not (b.destination_stop.sequence <= o.sequence or b.origin_stop.sequence >= d.sequence):
                    occupied.add(b.seat_number)
            except Exception:
                # En cas d'erreur, considérer le siège comme occupé par sécurité
                occupied.add(b.seat_number)
    else:
        # Si pas de segment spécifié, tous les sièges réservés sont considérés comme occupés
        occupied = set(qs.values_list('seat_number', flat=True))

    occupied_list = list(map(str, occupied))
    capacity = trip.capacity
    available = max(0, capacity - len(occupied_list))
    return Response({'occupied_seats': occupied_list, 'available_seats': available, 'capacity': capacity})


class ScheduledTripSearchView(APIView):
    """Rechercher des voyages planifiés avec prise en compte des escales (segments)."""
    permission_classes = [AllowAny]

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