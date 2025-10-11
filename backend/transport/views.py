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
from .models import Company, City, Trip, Booking, Payment, Review, Notification
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
            return serializer.save()

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

            return serializer.save()

        # No company provided: default to the first company the user administers
        return serializer.save(company=companies_for_user.first())

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

    @action(detail=False, methods=['post'])
    def search(self, request):
        """Rechercher des trajets"""
        serializer = TripSearchSerializer(data=request.data)
        if serializer.is_valid():
            departure_city = serializer.validated_data['departure_city']
            arrival_city = serializer.validated_data['arrival_city']
            travel_date = serializer.validated_data['travel_date']
            passengers = serializer.validated_data['passengers']
            
            trips = Trip.objects.filter(
                departure_city__name__icontains=departure_city,
                arrival_city__name__icontains=arrival_city,
                is_active=True
            ).select_related('company', 'departure_city', 'arrival_city')
            
            available_trips = []
            for trip in trips:
                confirmed_bookings = Booking.objects.filter(
                    trip=trip,
                    travel_date=travel_date,
                    status='confirmed'
                ).count()
                
                if (trip.capacity - confirmed_bookings) >= passengers:
                    available_trips.append(trip)
            
            trip_serializer = TripSerializer(available_trips, many=True)
            return Response(trip_serializer.data)
        
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


class ScheduledTripSearchView(APIView):
    """Rechercher des voyages planifiés."""
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = TripSearchSerializer(data=request.data)
        if serializer.is_valid():
            departure_city = serializer.validated_data['departure_city']
            arrival_city = serializer.validated_data['arrival_city']
            travel_date = serializer.validated_data['travel_date']
            passengers = serializer.validated_data['passengers']

            scheduled_trips = ScheduledTrip.objects.filter(
                trip__departure_city__name__icontains=departure_city,
                trip__arrival_city__name__icontains=arrival_city,
                date=travel_date,  # Filter by the exact date
                trip__is_active=True
            ).select_related('trip__company', 'trip__departure_city', 'trip__arrival_city')

            available_scheduled_trips = []
            for st in scheduled_trips:
                confirmed_bookings = Booking.objects.filter(
                    trip=st.trip,
                    travel_date=st.date,
                    status='confirmed'
                ).count()

                if (st.trip.capacity - confirmed_bookings) >= passengers:
                    available_scheduled_trips.append(st)

            st_serializer = ScheduledTripSerializer(available_scheduled_trips, many=True)
            return Response(st_serializer.data)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)