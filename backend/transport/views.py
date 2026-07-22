import json
import logging
from decimal import Decimal
from rest_framework.decorators import action
from rest_framework.decorators import api_view
from rest_framework.decorators import permission_classes
from rest_framework.permissions import AllowAny

from rest_framework.views import APIView
from datetime import datetime, timedelta
from django.utils import timezone
from django.db import transaction
from django.db.models import Sum, Q, Count, ProtectedError
from django.core.serializers.json import DjangoJSONEncoder
from django.forms.models import model_to_dict
from rest_framework import generics, status, permissions, viewsets, serializers
from rest_framework.exceptions import PermissionDenied
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
from .models.audit import log_action
from django.contrib.auth import authenticate
from django.contrib.auth.hashers import check_password, make_password

logger = logging.getLogger(__name__)


def get_client_ip(request):
    x_forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
    return x_forwarded.split(',')[0] if x_forwarded else request.META.get('REMOTE_ADDR')


def make_json_safe(data):
    return json.loads(json.dumps(data, cls=DjangoJSONEncoder))


def normalize_phone(value):
    """Normalize phone to canonical '228' + 8 digits, or return None if invalid/empty."""
    if not value:
        return None
    digits = ''.join([c for c in str(value) if c.isdigit()])
    if digits.startswith('228') and len(digits) == 11:
        return digits
    if len(digits) == 8:
        return '228' + digits
    return None


def build_company_delete_snapshot(company):
    trip_ids = list(Trip.all_objects.filter(company=company).values_list('id', flat=True))
    booking_ids = list(Booking.all_objects.filter(trip_id__in=trip_ids).values_list('id', flat=True))
    scheduled_trip_ids = list(ScheduledTrip.objects.filter(trip_id__in=trip_ids).values_list('id', flat=True))
    trip_stop_ids = list(TripStop.objects.filter(trip_id__in=trip_ids).values_list('id', flat=True))
    payment_ids = list(Payment.objects.filter(booking_id__in=booking_ids).values_list('id', flat=True))
    review_ids = list(Review.objects.filter(booking_id__in=booking_ids).values_list('id', flat=True))

    return make_json_safe({
        'company': model_to_dict(company),
        'trip_ids': trip_ids,
        'booking_ids': booking_ids,
        'scheduled_trip_ids': scheduled_trip_ids,
        'trip_stop_ids': trip_stop_ids,
        'payment_ids': payment_ids,
        'review_ids': review_ids,
        'counts': {
            'trips': len(trip_ids),
            'bookings': len(booking_ids),
            'scheduled_trips': len(scheduled_trip_ids),
            'trip_stops': len(trip_stop_ids),
            'payments': len(payment_ids),
            'reviews': len(review_ids),
        },
    })


def get_occupied_seats(scheduled_trip, origin_stop=None, destination_stop=None):
    """Retourne l'ensemble des numéros de sièges occupés pour un ScheduledTrip donné.

    Si origin_stop et destination_stop sont fournis (objets TripStop), seuls les
    sièges dont la réservation chevauche le segment demandé sont comptabilisés.
    Sinon, tous les sièges des réservations actives sont retournés.

    Args:
        scheduled_trip: instance ScheduledTrip
        origin_stop: instance TripStop (optionnel) — début du segment
        destination_stop: instance TripStop (optionnel) — fin du segment

    Returns:
        set[str] — numéros de sièges occupés
    """
    qs = (
        Booking.objects
        .filter(scheduled_trip=scheduled_trip, status__in=['pending', 'confirmed'])
        .select_related('origin_stop', 'destination_stop')
    )

    occupied = set()

    if origin_stop and destination_stop:
        for b in qs:
            try:
                if b.origin_stop and b.destination_stop:
                    # Chevauchement: NOT (b.dest_seq <= origin_seq OR b.orig_seq >= dest_seq)
                    if not (
                        b.destination_stop.sequence <= origin_stop.sequence
                        or b.origin_stop.sequence >= destination_stop.sequence
                    ):
                        occupied.add(b.seat_number)
                else:
                    # Réservation sans escales = trajet complet = occupe tous les segments
                    occupied.add(b.seat_number)
            except Exception:
                occupied.add(b.seat_number)
    else:
        # Pas de segment précisé: tous les sièges réservés sont occupés
        occupied = set(qs.values_list('seat_number', flat=True))

    return occupied


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (AllowAny,)
    serializer_class = RegisterSerializer

class EmailAuthToken(APIView):
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        email = request.data.get('email')
        # Le frontend peut envoyer 'phone' ou 'phone_number'
        raw_phone = request.data.get('phone') or request.data.get('phone_number')
        phone = normalize_phone(raw_phone) if raw_phone else None
        username = request.data.get('username')
        # Accept either 'password' (legacy) or 'pin' (new mobile flow)
        password = request.data.get('password') or request.data.get('pin')
        
        if not password:
            return Response({'detail': 'Le champ password ou pin est requis.'}, status=status.HTTP_400_BAD_REQUEST)
        
        if not email and not phone and not username:
            return Response({'detail': 'Vous devez fournir un email, un numéro de téléphone ou un username.'}, status=status.HTTP_400_BAD_REQUEST)

        user = None
        
        if email:
            # Connexion avec email — chercher l'utilisateur par email
            try:
                user_obj = User.objects.get(email=email)
                user = authenticate(request, username=user_obj.username, password=password)
            except User.DoesNotExist:
                # Tenter aussi avec email comme username
                user = authenticate(request, username=email, password=password)

        if not user and phone:
            # Connexion avec numéro de téléphone — vérifier PIN côté profil
            try:
                profiles = UserProfile.objects.filter(phone=phone)
                if not profiles.exists():
                    user = None
                else:
                    provided_pin = password
                    # find profiles where PIN matches
                    matched = []
                    for p in profiles:
                        if p.pin and check_password(provided_pin, p.pin):
                            matched.append(p)

                    if len(matched) == 1:
                        user = matched[0].user
                    elif len(matched) > 1:
                        # Ambiguous: multiple accounts with same phone and same PIN -> deny login and ask support
                        return Response({'detail': 'Plusieurs comptes sont associés à ce numéro. Contactez le support pour résoudre le conflit.'}, status=status.HTTP_400_BAD_REQUEST)
                    else:
                        # No matching PIN among profiles
                        user = None
            except Exception:
                user = None
        
        if not user and username:
            # Connexion avec username direct (fallback)
            user = authenticate(request, username=username, password=password)

        if user:
            if hasattr(user, 'agentguichet') and not user.agentguichet.actif:
                return Response(
                    {'detail': 'Ce compte guichet est désactivé.'},
                    status=status.HTTP_403_FORBIDDEN,
                )
            token, created = Token.objects.get_or_create(user=user)
            user_serializer = UserSerializer(user)
            return Response({
                'token': token.key,
                'user': user_serializer.data
            })
        else:
            return Response({'detail': 'Identifiants invalides.'}, status=status.HTTP_401_UNAUTHORIZED)


def build_auth_response(user):
    token, created = Token.objects.get_or_create(user=user)
    user_serializer = UserSerializer(user)
    return Response({
        'token': token.key,
        'user': user_serializer.data
    })


def user_is_client(user):
    return (
        user
        and user.is_active
        and not user.is_staff
        and not user.is_superuser
        and not user.admin_companies.exists()
        and not hasattr(user, 'company_admin')
        and not hasattr(user, 'agentguichet')
    )


def user_is_company_admin(user):
    return (
        user
        and user.is_active
        and not user.is_staff
        and not user.is_superuser
        and (
            user.admin_companies.filter(is_active=True).exists()
            or (hasattr(user, 'company_admin') and user.company_admin.is_active)
        )
    )


def user_is_guichet_agent(user):
    return (
        user
        and user.is_active
        and not user.is_staff
        and not user.is_superuser
        and hasattr(user, 'agentguichet')
        and user.agentguichet.actif
        and user.agentguichet.compagnie.is_active
    )


def user_is_super_admin(user):
    return user and user.is_active and user.is_superuser


class ClientAuthToken(APIView):
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        email = request.data.get('email')
        password = request.data.get('password')
        if email:
            if not password:
                return Response(
                    {'detail': 'Le mot de passe est requis.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            try:
                user_obj = User.objects.get(email=email)
                user = authenticate(request, username=user_obj.username, password=password)
            except User.DoesNotExist:
                user = authenticate(request, username=email, password=password)

            if not user:
                return Response(
                    {'detail': 'Identifiants invalides.'},
                    status=status.HTTP_401_UNAUTHORIZED,
                )
            if not user_is_client(user):
                return Response(
                    {'detail': 'Accès non autorisé pour ce portail.'},
                    status=status.HTTP_403_FORBIDDEN,
                )
            return build_auth_response(user)

        raw_phone = request.data.get('phone') or request.data.get('phone_number')
        phone = normalize_phone(raw_phone) if raw_phone else None
        pin = request.data.get('pin')

        if not phone:
            return Response({'detail': 'Le numéro de téléphone est requis.'}, status=status.HTTP_400_BAD_REQUEST)
        if not pin:
            return Response({'detail': 'Le code PIN est requis.'}, status=status.HTTP_400_BAD_REQUEST)

        profiles = UserProfile.objects.select_related('user').filter(phone=phone)
        matched_users = [
            profile.user
            for profile in profiles
            if profile.pin and check_password(str(pin), profile.pin)
        ]

        if len(matched_users) != 1:
            return Response({'detail': 'Identifiants invalides.'}, status=status.HTTP_401_UNAUTHORIZED)

        user = matched_users[0]
        if not user_is_client(user):
            return Response({'detail': 'Accès non autorisé pour ce portail.'}, status=status.HTTP_403_FORBIDDEN)

        return build_auth_response(user)


class CompanyAuthToken(APIView):
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        email = request.data.get('email')
        password = request.data.get('password')

        if not email:
            return Response({'detail': "L'email professionnel est requis."}, status=status.HTTP_400_BAD_REQUEST)
        if not password:
            return Response({'detail': 'Le mot de passe est requis.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user_obj = User.objects.get(email=email)
            user = authenticate(request, username=user_obj.username, password=password)
        except User.DoesNotExist:
            user = authenticate(request, username=email, password=password)

        if not user:
            return Response({'detail': 'Identifiants invalides.'}, status=status.HTTP_401_UNAUTHORIZED)
        if not user_is_company_admin(user):
            return Response({'detail': 'Accès non autorisé pour ce portail.'}, status=status.HTTP_403_FORBIDDEN)

        return build_auth_response(user)


class GuichetAuthToken(APIView):
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        email = request.data.get('email')
        password = request.data.get('password')

        if not email:
            return Response(
                {'detail': "L'email du gestionnaire est requis."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not password:
            return Response(
                {'detail': 'Le mot de passe est requis.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            user_obj = User.objects.get(email=email)
            user = authenticate(request, username=user_obj.username, password=password)
        except User.DoesNotExist:
            user = authenticate(request, username=email, password=password)

        if not user:
            return Response(
                {'detail': 'Identifiants invalides.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        if not user_is_guichet_agent(user):
            return Response(
                {'detail': 'Accès non autorisé pour ce portail.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        return build_auth_response(user)


class SuperAdminAuthToken(APIView):
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        email = request.data.get('email')
        password = request.data.get('password')

        if not email:
            return Response({'detail': "L'email administrateur est requis."}, status=status.HTTP_400_BAD_REQUEST)
        if not password:
            return Response({'detail': 'Le mot de passe est requis.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user_obj = User.objects.get(email=email)
            user = authenticate(request, username=user_obj.username, password=password)
        except User.DoesNotExist:
            user = authenticate(request, username=email, password=password)

        if not user:
            return Response({'detail': 'Identifiants invalides.'}, status=status.HTTP_401_UNAUTHORIZED)
        if not user_is_super_admin(user):
            return Response({'detail': 'Accès non autorisé pour ce portail.'}, status=status.HTTP_403_FORBIDDEN)

        return build_auth_response(user)


class ChangePinView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def put(self, request, *args, **kwargs):
        """Change le PIN de l'utilisateur authentifié.

        body: { old_pin: str, new_pin: str }
        """
        user = request.user
        old_pin = request.data.get('old_pin')
        new_pin = request.data.get('new_pin')

        if not new_pin or len(new_pin) != 4 or not str(new_pin).isdigit():
            return Response({'detail': 'Le nouveau PIN doit être exactement 4 chiffres.'}, status=status.HTTP_400_BAD_REQUEST)

        profile = getattr(user, 'profile', None)
        if not profile:
            return Response({'detail': 'Profil utilisateur introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        # If there is an existing pin, verify old_pin
        if profile.pin:
            if not old_pin:
                return Response({'detail': 'L\'ancien PIN est requis.'}, status=status.HTTP_400_BAD_REQUEST)
            if not check_password(old_pin, profile.pin):
                return Response({'detail': 'Ancien PIN incorrect.'}, status=status.HTTP_403_FORBIDDEN)

        # Save new hashed pin
        try:
            profile.pin = make_password(new_pin)
            profile.save()
            return Response({'detail': 'PIN mis à jour avec succès.'})
        except Exception as e:
            return Response({'detail': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class TokenRefreshView(APIView):
    """Refresh authentication token endpoint.
    
    Accepts a valid token and returns a fresh one for continued session.
    Used to keep user logged in without re-entering credentials.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        try:
            token, created = Token.objects.get_or_create(user=request.user)
            user_serializer = UserSerializer(request.user)
            return Response({
                'token': token.key,
                'user': user_serializer.data
            })
        except Exception as e:
            return Response({'detail': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class ScheduledTripViewSet(viewsets.ModelViewSet):
    queryset = ScheduledTrip.objects.all()
    serializer_class = ScheduledTripSerializer
    permission_classes = [permissions.AllowAny]

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [permissions.IsAuthenticated()]
        return [permissions.AllowAny()]

    def get_queryset(self):
        queryset = ScheduledTrip.objects.all()
        company_id = self.request.query_params.get('company_id')
        if company_id:
            queryset = queryset.filter(trip__company_id=company_id)
        return queryset.select_related('trip__company', 'trip__departure_city', 'trip__arrival_city')

    def perform_create(self, serializer):
        # Logic to ensure only company admins or staff can create scheduled trips
        trip = serializer.validated_data.get('trip')
        if trip:
            company = trip.company
            if not (
                self.request.user.is_staff
                or company.admin_user_id == self.request.user.id
                or company.admins.filter(id=self.request.user.id).exists()
            ):
                raise serializers.ValidationError(
                    f"Vous n'avez pas la permission de créer des trajets planifiés pour la compagnie '{company.name}' (ID: {company.id})."
                )
        serializer.save()

    def perform_update(self, serializer):
        scheduled_trip = self.get_object()
        trip = scheduled_trip.trip
        if not (
            self.request.user.is_staff
            or trip.company.admin_user_id == self.request.user.id
            or trip.company.admins.filter(id=self.request.user.id).exists()
        ):
            raise serializers.ValidationError(
                f"Vous n'avez pas la permission de modifier ce trajet planifié pour la compagnie '{trip.company.name}'."
            )
        serializer.save()

    def perform_destroy(self, instance):
        trip = instance.trip
        if not (
            self.request.user.is_staff
            or trip.company.admin_user_id == self.request.user.id
            or trip.company.admins.filter(id=self.request.user.id).exists()
        ):
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


class UserViewSet(viewsets.ModelViewSet):
    """CRUD utilisateurs — réservé aux admins (is_staff)."""
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAdminUser]
    pagination_class = None

    def get_queryset(self):
        return User.objects.all().order_by('-date_joined')

    def update(self, request, *args, **kwargs):
        user = self.get_object()
        data = request.data
        if 'first_name' in data:
            user.first_name = data['first_name']
        if 'last_name' in data:
            user.last_name = data['last_name']
        if 'email' in data:
            user.email = data['email']
        if 'is_active' in data:
            user.is_active = data['is_active']
        user.save()
        phone = data.get('phone_number') or data.get('phone')
        if phone is not None:
            try:
                profile = getattr(user, 'profile', None)
                if profile:
                    profile.phone = phone
                    profile.save()
            except Exception:
                pass
        return Response(UserSerializer(user).data)

    def destroy(self, request, *args, **kwargs):
        user = self.get_object()
        if user == request.user:
            return Response({'detail': 'Vous ne pouvez pas supprimer votre propre compte.'}, status=status.HTTP_400_BAD_REQUEST)
        user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class DashboardStatsView(APIView):
    permission_classes = [permissions.IsAdminUser]

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

        # Total users
        total_users = User.objects.count()

        stats = {
            'total_bookings': total_bookings,
            'bookings_this_week': bookings_this_week,
            'bookings_this_month': bookings_this_month,
            'total_revenue': total_revenue,
            'revenue_this_week': revenue_this_week,
            'revenue_this_month': revenue_this_month,
            'active_trips': active_trips,
            'active_companies': active_companies,
            'total_users': total_users,
        }
        
        # Monthly analytics for the last six months
        stats['monthly_bookings'] = []
        stats['monthly_revenue'] = []
        stats['booking_status_counts'] = {
            'confirmed': Booking.objects.filter(status='confirmed').count(),
            'pending': Booking.objects.filter(status='pending').count(),
            'cancelled': Booking.objects.filter(status='cancelled').count(),
        }
        stats['top_companies'] = []

        # Build last 6 months summary
        months = []
        current = today.replace(day=1)
        for _ in range(6):
            months.insert(0, current)
            year = current.year
            month = current.month - 1
            if month == 0:
                month = 12
                year -= 1
            current = current.replace(year=year, month=month)

        for month_date in months:
            month_start = month_date
            next_month = month_date.replace(day=28) + timedelta(days=4)
            month_end = next_month - timedelta(days=next_month.day)
            monthly_bookings = Booking.objects.filter(booking_date__gte=month_start, booking_date__lte=month_end).count()
            monthly_revenue = Booking.objects.filter(booking_date__gte=month_start, booking_date__lte=month_end).aggregate(total=Sum('total_price'))['total'] or 0
            stats['monthly_bookings'].append({
                'month': month_date.strftime('%b'),
                'total_bookings': monthly_bookings,
            })
            stats['monthly_revenue'].append({
                'month': month_date.strftime('%b'),
                'total_revenue': monthly_revenue,
            })

        # Top companies by revenue and trip count
        company_performance = Company.objects.annotate(
            trips_count=Count('trips', distinct=True),
            revenue=Sum('trips__bookings__total_price')
        ).order_by('-revenue')[:6]
        for company in company_performance:
            stats['top_companies'].append({
                'company_name': company.name,
                'trips': company.trips_count or 0,
                'revenue': company.revenue or 0,
            })

        serializer = DashboardStatsSerializer(stats)
        return Response(serializer.data)

class CompanyStatsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, company_id, *args, **kwargs):
        try:
            company = Company.objects.get(pk=company_id)
        except Company.DoesNotExist:
            return Response({"detail": "Compagnie non trouvée."}, status=status.HTTP_404_NOT_FOUND)

        # Vérifier si l'utilisateur est un admin de la compagnie
        if not (
            request.user.is_staff
            or company.admin_user_id == request.user.id
            or company.admins.filter(id=request.user.id).exists()
        ):
            return Response({"detail": "Vous n'êtes pas autorisé à voir les statistiques de cette compagnie."}, status=status.HTTP_403_FORBIDDEN)

        # Imports locaux pour éviter une dépendance circulaire au chargement des apps.
        from guichet.models import Agence, VenteGuichet

        today = timezone.localdate()
        valid_sale_statuses = ['valide', 'utilise']
        confirmed_bookings_qs = Booking.objects.filter(
            trip__company=company,
            status='confirmed',
        )
        guichet_sales_qs = VenteGuichet.objects.filter(
            voyage__trip__company=company,
            statut__in=valid_sale_statuses,
        )

        mobile_bookings = confirmed_bookings_qs.count()
        guichet_sales = guichet_sales_qs.count()
        mobile_revenue = confirmed_bookings_qs.aggregate(total=Sum('total_price'))['total'] or Decimal('0')
        guichet_revenue = guichet_sales_qs.aggregate(total=Sum('montant_billet'))['total'] or 0
        total_bookings = mobile_bookings + guichet_sales
        total_revenue = mobile_revenue + Decimal(guichet_revenue)

        mobile_clients = Booking.objects.filter(
            trip__company=company,
        ).exclude(passenger_email='').values('passenger_email').distinct().count()
        guichet_clients = VenteGuichet.objects.filter(
            voyage__trip__company=company,
            statut__in=valid_sale_statuses,
        ).exclude(client_telephone='').values('client_telephone').distinct().count()
        active_clients = mobile_clients + guichet_clients

        upcoming_trips = ScheduledTrip.objects.filter(
            trip__company=company,
            date__gte=today,
            is_active=True,
        )
        scheduled_trips = upcoming_trips.count()
        total_seats = upcoming_trips.aggregate(total=Sum('trip__capacity'))['total'] or 0
        occupied_upcoming = Booking.objects.filter(
            scheduled_trip__in=upcoming_trips,
            status='confirmed',
        ).count() + VenteGuichet.objects.filter(
            voyage__in=upcoming_trips,
            statut__in=valid_sale_statuses,
        ).count()
        average_occupancy = min(occupied_upcoming / total_seats, 1) if total_seats > 0 else 0

        agency_performance = []
        for agence in Agence.objects.filter(compagnie=company):
            valid_sales = agence.ventes.filter(statut__in=valid_sale_statuses)
            agency_performance.append({
                'id': str(agence.id),
                'name': agence.nom,
                'tickets': valid_sales.count(),
                'revenue': valid_sales.aggregate(total=Sum('montant_billet'))['total'] or 0,
                'active': agence.is_active,
            })
        unassigned_sales = guichet_sales_qs.filter(agence=None)
        if unassigned_sales.exists():
            agency_performance.append({
                'id': 'sans-agence',
                'name': 'Sans agence',
                'tickets': unassigned_sales.count(),
                'revenue': unassigned_sales.aggregate(total=Sum('montant_billet'))['total'] or 0,
                'active': False,
            })
        agency_performance.sort(key=lambda item: item['tickets'], reverse=True)

        sales_analytics = []
        for offset in range(6, -1, -1):
            day = today - timedelta(days=offset)
            day_bookings = confirmed_bookings_qs.filter(booking_date__date=day)
            day_guichet_sales = guichet_sales_qs.filter(created_at__date=day)
            day_mobile_revenue = day_bookings.aggregate(total=Sum('total_price'))['total'] or Decimal('0')
            day_guichet_revenue = day_guichet_sales.aggregate(total=Sum('montant_billet'))['total'] or 0
            sales_analytics.append({
                'date': day.isoformat(),
                'tickets': day_bookings.count() + day_guichet_sales.count(),
                'revenue': day_mobile_revenue + Decimal(day_guichet_revenue),
            })

        recent_guichet_sales = [
            {
                'id': sale.reference_vente,
                'passenger_name': sale.client_nom,
                'passenger_phone': sale.client_telephone,
                'route': f'{sale.voyage.trip.departure_city.name} → {sale.voyage.trip.arrival_city.name}',
                'agency': sale.agence.nom if sale.agence else 'Sans agence',
                'counter': sale.guichet.nom if sale.guichet else None,
                'agent': f'{sale.agent.prenom} {sale.agent.nom}'.strip(),
                'travel_date': sale.voyage.date,
                'booking_date': sale.created_at,
                'status': sale.statut,
                'source': 'guichet',
            }
            for sale in VenteGuichet.objects.filter(
                voyage__trip__company=company,
            ).select_related(
                'agent',
                'agence',
                'guichet',
                'voyage__trip__departure_city',
                'voyage__trip__arrival_city',
            ).order_by('-created_at')[:5]
        ]

        stats = {
            'total_bookings': total_bookings,
            'mobile_bookings': mobile_bookings,
            'guichet_sales': guichet_sales,
            'total_revenue': total_revenue,
            'mobile_revenue': mobile_revenue,
            'guichet_revenue': guichet_revenue,
            'active_clients': active_clients,
            'scheduled_trips': scheduled_trips,
            'average_occupancy': average_occupancy,
            'agency_performance': agency_performance,
            'sales_analytics': sales_analytics,
            'recent_guichet_sales': recent_guichet_sales,
        }
        
        serializer = CompanyStatsSerializer(stats)
        return Response(serializer.data)

class CompanyViewSet(viewsets.ModelViewSet):
    queryset = Company.objects.all()
    serializer_class = CompanySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_permissions(self):
        if self.action in ['create', 'destroy', 'hard_delete', 'restore_company']:
            self.permission_classes = [permissions.IsAdminUser]
        elif self.action in ['retrieve', 'update', 'partial_update']:
            self.permission_classes = [permissions.IsAuthenticated]
        return super().get_permissions()

    def get_queryset(self):
        filter_value = self.request.query_params.get('filter', 'active')

        if self.action in ['hard_delete', 'restore_company']:
            base_queryset = Company.all_objects.all()
        elif filter_value == 'active':
            base_queryset = Company.objects.all()
        elif filter_value in ['deleted', 'all']:
            if not self.request.user.is_staff:
                return Company.objects.all()
            base_queryset = Company.all_objects.all() if filter_value == 'all' else Company.all_objects.filter(is_deleted=True)
        else:
            base_queryset = Company.objects.all()

        return base_queryset.order_by('name')

    def perform_update(self, serializer):
        company = serializer.instance
        user = self.request.user
        is_company_admin = (
            company.admin_user_id == user.id
            or company.admins.filter(id=user.id).exists()
        )
        if not (user.is_staff or is_company_admin):
            raise PermissionDenied("Vous ne pouvez modifier que votre propre compagnie.")

        changed_fields = list(serializer.validated_data.keys())
        old_values = make_json_safe({
            field: getattr(company, field, None)
            for field in changed_fields
        })
        updated_company = serializer.save()
        new_values = make_json_safe({
            field: getattr(updated_company, field, None)
            for field in changed_fields
        })
        log_action(
            user=user,
            action='UPDATE',
            instance=updated_company,
            old_values=old_values,
            new_values=new_values,
            ip_address=get_client_ip(self.request),
        )

    def perform_destroy(self, instance):
        old_values = build_company_delete_snapshot(instance)
        instance.soft_delete(user=self.request.user)
        log_action(
            user=self.request.user,
            action='DELETE',
            instance=instance,
            old_values=old_values,
            new_values=make_json_safe({
                'is_deleted': instance.is_deleted,
                'deleted_at': instance.deleted_at,
                'deleted_by': instance.deleted_by_id,
            }),
            ip_address=get_client_ip(self.request),
        )

    @action(detail=True, methods=['post'])
    def hard_delete(self, request, pk=None):
        if not request.user.is_superuser:
            return Response(
                {'detail': 'Vous n’avez pas la permission d’effectuer cette suppression définitive.'},
                status=status.HTTP_403_FORBIDDEN
            )

        admin_password = request.data.get('password', '')
        if not admin_password:
            return Response(
                {'detail': 'Le champ password est requis.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not request.user.check_password(admin_password):
            return Response(
                {'detail': 'Mot de passe administrateur incorrect.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        company = self.get_object()
        old_values = build_company_delete_snapshot(company)

        with transaction.atomic():
            Booking.all_objects.filter(trip__company=company).delete()
            ScheduledTrip.objects.filter(trip__company=company).delete()
            TripStop.objects.filter(trip__company=company).delete()
            Trip.all_objects.filter(company=company).delete()
            BoardingZone.objects.filter(company=company).delete()
            company.hard_delete()

        log_action(
            user=request.user,
            action='HARD_DELETE',
            instance=company,
            old_values=old_values,
            new_values=make_json_safe({'hard_deleted': True}),
            ip_address=get_client_ip(request),
        )

        return Response(
            {'detail': 'Compagnie supprimée définitivement avec succès.'},
            status=status.HTTP_200_OK
        )

    @action(detail=True, methods=['post'])
    def restore_company(self, request, pk=None):
        if not request.user.is_staff:
            return Response(
                {'detail': 'Vous n’avez pas la permission de restaurer cette compagnie.'},
                status=status.HTTP_403_FORBIDDEN
            )

        company = self.get_object()
        old_values = build_company_delete_snapshot(company)
        company.restore()
        log_action(
            user=request.user,
            action='RESTORE',
            instance=company,
            old_values=old_values,
            new_values=make_json_safe({
                'is_deleted': company.is_deleted,
                'deleted_at': company.deleted_at,
                'deleted_by': company.deleted_by_id,
            }),
            ip_address=get_client_ip(request),
        )

        serializer = self.get_serializer(company)
        return Response(serializer.data, status=status.HTTP_200_OK)

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
        if not (
            self.request.user.is_staff
            or company.admin_user_id == self.request.user.id
            or company.admins.filter(id=self.request.user.id).exists()
        ):
            # Properly return 403 Forbidden instead of silently returning empty queryset
            raise permissions.PermissionDenied("You do not have permission to view this company's bookings.")

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

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [permissions.IsAuthenticated()]
        return [permissions.AllowAny()]

    def get_queryset(self):
        # Allow staff to see all trips, authenticated company admins to see their company trips,
        # and anonymous users to get active public trips.
        user = self.request.user
        if user.is_staff:
            return Trip.objects.all()
        if not user.is_authenticated:
            return Trip.objects.filter(is_active=True)
        # Filter trips by companies the user administers
        return Trip.objects.filter(
            Q(company__admins=user) | Q(company__admin_user=user)
        ).distinct()

    def perform_create(self, serializer):
        # Ensure the user creating the trip is an admin of the associated company
        company = serializer.validated_data.get('company')
        if not (
            self.request.user.is_staff
            or company.admin_user_id == self.request.user.id
            or company.admins.filter(id=self.request.user.id).exists()
        ):
            raise serializers.ValidationError(
                f"Vous n'avez pas la permission de créer des trajets pour la compagnie '{company.name}' (ID: {company.id}). "
                f"Votre ID utilisateur: {self.request.user.id}. Admins de la compagnie: {[admin.id for admin in company.admins.all()]}"
            )
        serializer.save()

    def perform_update(self, serializer):
        # Ensure the user updating the trip is an admin of the associated company
        company = serializer.instance.company
        if not (
            self.request.user.is_staff
            or company.admin_user_id == self.request.user.id
            or company.admins.filter(id=self.request.user.id).exists()
        ):
            raise serializers.ValidationError("You do not have permission to update trips for this company.")
        serializer.save()

    def perform_destroy(self, instance):
        from django.db.models import ProtectedError
        company = instance.company
        if not (
            self.request.user.is_staff
            or company.admin_user_id == self.request.user.id
            or company.admins.filter(id=self.request.user.id).exists()
        ):
            raise serializers.ValidationError("You do not have permission to delete trips for this company.")
        try:
            instance.delete()
        except ProtectedError:
            raise serializers.ValidationError(
                "Ce trajet ne peut pas être supprimé car il possède des réservations existantes. "
                "Veuillez d'abord annuler ou supprimer les réservations associées."
            )

class ScheduledTripSearchView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = TripSearchSerializer(data=request.data)
        if serializer.is_valid():
            departure_city = serializer.validated_data['departure_city']
            arrival_city = serializer.validated_data['arrival_city']
            travel_date = serializer.validated_data['travel_date']
            passengers = serializer.validated_data['passengers']

            try:
                from unidecode import unidecode
            except ImportError:
                def unidecode(s):
                    return s

            dep_norm = unidecode(departure_city).lower()
            arr_norm = unidecode(arrival_city).lower()

            scheduled_trips = ScheduledTrip.objects.filter(
                date=travel_date,
                trip__is_active=True
            ).select_related('trip__company', 'trip__departure_city', 'trip__arrival_city')

            matches = []
            for st in scheduled_trips:
                trip = st.trip
                stops = list(TripStop.objects.filter(trip=trip).select_related('city').order_by('sequence'))

                # Cas 1: correspondance directe aux extrémités du trajet
                direct_match = (
                    dep_norm in unidecode((trip.departure_city.name or '')).lower() and
                    arr_norm in unidecode((trip.arrival_city.name or '')).lower()
                )
                if direct_match:
                    occupied = get_occupied_seats(st)
                    available = max(trip.capacity - len(occupied), 0)
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
                            occupied = get_occupied_seats(st, origin_stop=o, destination_stop=d)
                            available = max(trip.capacity - len(occupied), 0)
                            if available >= passengers:
                                matches.append(st)
                                found = True
                                break
                    if found:
                        break

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

        scheduled_trip_id = request.data.get('scheduled_trip')
        scheduled_trip = ScheduledTrip.objects.get(pk=scheduled_trip_id)
        departure_datetime = timezone.make_aware(
            datetime.combine(scheduled_trip.date, scheduled_trip.trip.departure_time)
        )
        if departure_datetime <= timezone.now() + timedelta(hours=1):
            return Response(
                {
                    'detail': 'Les réservations sont fermées pour ce trajet car le départ est imminent.'
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Appeler la méthode parent pour la création
        response = super().create(request, *args, **kwargs)
        
        # Log de la réponse
        logger.info(f"Booking created successfully: {response.data}")
        
        return response

    def perform_destroy(self, instance):
        # Soft-delete the booking so it disappears from the user's tickets list
        if instance.user != self.request.user and not self.request.user.is_staff:
            raise permissions.PermissionDenied("Vous ne pouvez pas supprimer cette réservation.")

        instance.status = 'cancelled'
        instance.is_deleted = True
        instance.deleted_at = timezone.now()
        instance.deleted_by = self.request.user
        instance.save(update_fields=['status', 'is_deleted', 'deleted_at', 'deleted_by'])

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        instance = self.get_object()
        if instance.user != request.user and not request.user.is_staff:
            raise permissions.PermissionDenied("Vous ne pouvez pas annuler cette réservation.")

        if instance.is_deleted or instance.status == 'cancelled':
            return Response({'detail': 'Cette réservation est déjà annulée.'}, status=status.HTTP_400_BAD_REQUEST)

        instance.status = 'cancelled'
        instance.is_deleted = True
        instance.deleted_at = timezone.now()
        instance.deleted_by = request.user
        instance.save(update_fields=['status', 'is_deleted', 'deleted_at', 'deleted_by'])

        serializer = self.get_serializer(instance)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def confirm(self, request, pk=None):
        instance = self.get_object()
        if instance.user != request.user and not request.user.is_staff:
            raise permissions.PermissionDenied("Vous ne pouvez pas confirmer cette réservation.")

        if instance.is_deleted:
            return Response({'detail': 'Impossible de confirmer une réservation annulée.'}, status=status.HTTP_400_BAD_REQUEST)

        instance.status = 'confirmed'
        instance.save(update_fields=['status'])

        serializer = self.get_serializer(instance)
        return Response(serializer.data, status=status.HTTP_200_OK)

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
                else:
                    # Page d'accueil: afficher 3 jours
                    end_date = parsed_date + timedelta(days=3)
                    scheduled_trips = scheduled_trips.filter(date__gte=parsed_date, date__lte=end_date)
        except Exception as e:
            pass
    else:
        today = datetime.now().date()
        if departure_city or arrival_city:
            # Requête de recherche: afficher tous les trajets futurs
            scheduled_trips = scheduled_trips.filter(date__gte=today)
        else:
            # Page d'accueil: afficher 3 jours
            end_date = today + timedelta(days=3)
            scheduled_trips = scheduled_trips.filter(date__gte=today, date__lte=end_date)
    
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
    """Retourne les sièges occupés pour un ScheduledTrip spécifié par trip_id + travel_date.
    Supporte les paramètres origin_stop et destination_stop pour les réservations partielles.
    """
    trip_id = request.query_params.get('trip_id')
    travel_date = request.query_params.get('travel_date')
    origin_stop_id = request.query_params.get('origin_stop')
    dest_stop_id = request.query_params.get('destination_stop')

    if not trip_id or not travel_date:
        return Response(
            {'error': 'Les paramètres trip_id et travel_date sont requis.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        st = ScheduledTrip.objects.get(trip_id=trip_id, date=travel_date)
    except ScheduledTrip.DoesNotExist:
        return Response({'booked_seats': []})

    origin_stop = None
    destination_stop = None
    if origin_stop_id:
        try:
            origin_stop = TripStop.objects.get(pk=origin_stop_id)
        except TripStop.DoesNotExist:
            pass
    if dest_stop_id:
        try:
            destination_stop = TripStop.objects.get(pk=dest_stop_id)
        except TripStop.DoesNotExist:
            pass

    occupied = get_occupied_seats(st, origin_stop=origin_stop, destination_stop=destination_stop)
    return Response({'booked_seats': sorted(occupied)})


@api_view(['GET'])
def availability_view(request):
    """Retourne la disponibilité des sièges pour un voyage planifié.

    Paramètres requis: trip_id, travel_date
    Paramètres optionnels: origin_stop, destination_stop (IDs TripStop pour segment)

    Réponse:
        { occupied_seats: [...], available_seats: N, capacity: M }
    """
    trip_id = request.query_params.get('trip_id')
    travel_date = request.query_params.get('travel_date')
    origin_stop_id = request.query_params.get('origin_stop')
    dest_stop_id = request.query_params.get('destination_stop')

    if not trip_id or not travel_date:
        return Response(
            {'error': 'Les paramètres trip_id et travel_date sont requis.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        st = ScheduledTrip.objects.select_related('trip').get(trip_id=trip_id, date=travel_date)
    except ScheduledTrip.DoesNotExist:
        return Response(
            {'error': 'Aucun voyage planifié trouvé pour ces paramètres.'},
            status=status.HTTP_404_NOT_FOUND
        )

    origin_stop = None
    destination_stop = None
    if origin_stop_id:
        try:
            origin_stop = TripStop.objects.get(pk=origin_stop_id)
        except TripStop.DoesNotExist:
            pass
    if dest_stop_id:
        try:
            destination_stop = TripStop.objects.get(pk=dest_stop_id)
        except TripStop.DoesNotExist:
            pass

    occupied = get_occupied_seats(st, origin_stop=origin_stop, destination_stop=destination_stop)
    capacity = st.trip.capacity
    available = max(capacity - len(occupied), 0)

    return Response({
        'occupied_seats': sorted(occupied),
        'available_seats': available,
        'capacity': capacity,
    })


class InitierPaiementView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        from .models import Reservation
        from .services import qos_service, reservation_service

        required = [
            'voyage_id',
            'numero_siege',
            'client_nom',
            'client_telephone',
            'montant_billet',
            'operateur',
        ]
        missing = [field for field in required if request.data.get(field) in [None, '']]
        if missing:
            return Response({'erreur': 'CHAMPS_REQUIS', 'champs': missing}, status=status.HTTP_400_BAD_REQUEST)

        voyage_id = request.data.get('voyage_id')
        numero_siege = request.data.get('numero_siege')
        siege_id = reservation_service.reserver_siege_temporaire(voyage_id, numero_siege)
        if not siege_id:
            return Response({'erreur': 'SIEGE_INDISPONIBLE'}, status=status.HTTP_409_CONFLICT)

        try:
            reservation = reservation_service.creer_reservation(
                voyage_id=voyage_id,
                siege_id=siege_id,
                client_nom=request.data.get('client_nom'),
                client_telephone=request.data.get('client_telephone'),
                montant_billet=request.data.get('montant_billet'),
                operateur=request.data.get('operateur'),
            )

            description = (
                f"Billet EVEX {request.data.get('ville_depart', '')} "
                f"- {request.data.get('ville_arrivee', '')}"
            ).strip()
            paiement = qos_service.initier_paiement(
                reservation.client_telephone,
                reservation.montant_total,
                reservation.reference_evex,
                reservation.operateur,
                description,
            )
            if not paiement.get('succes'):
                reservation_service.liberer_siege(siege_id)
                reservation.statut_paiement = Reservation.STATUT_ECHOUE
                reservation.save(update_fields=['statut_paiement'])
                return Response(
                    {'erreur': 'QOS_INIT_ECHOUE', 'detail': paiement.get('erreur')},
                    status=status.HTTP_502_BAD_GATEWAY,
                )

            reservation.transaction_id_qos = paiement.get('transaction_id')
            reservation.reference_qos = paiement.get('reference_qos')
            reservation.save(update_fields=['transaction_id_qos', 'reference_qos'])
            return Response({
                'reference_evex': reservation.reference_evex,
                'transaction_id': reservation.transaction_id_qos,
                'montant_billet': reservation.montant_billet,
                'frais_evex': reservation.frais_evex,
                'montant_total': reservation.montant_total,
                'operateur': reservation.operateur,
                'siege': numero_siege,
                'expires_dans': '5 minutes',
            })
        except Exception as exc:
            logger.exception("Payment init endpoint failed")
            reservation_service.liberer_siege(siege_id)
            return Response({'erreur': 'ERREUR_INTERNE', 'detail': str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class WebhookQOSView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request, *args, **kwargs):
        from .models import Reservation
        from .services import qos_service, reservation_service

        signature = request.headers.get('X-QOS-Signature')
        if not qos_service.valider_signature_webhook(request.body, signature):
            logger.warning("Invalid QOS webhook signature")
            return Response({'erreur': 'SIGNATURE_INVALIDE'}, status=status.HTTP_401_UNAUTHORIZED)

        payload = request.data
        reference = payload.get('reference')
        qos_status = str(payload.get('status') or '').upper()
        transaction_id = payload.get('transactionId') or payload.get('transaction_id')

        try:
            reservation = Reservation.objects.get(reference_evex=reference)
        except Reservation.DoesNotExist:
            return Response({'erreur': 'RESERVATION_INTROUVABLE'}, status=status.HTTP_404_NOT_FOUND)

        if qos_status == 'SUCCESS':
            reservation_service.confirmer_paiement(reference, transaction_id)
        elif qos_status in ['FAILED', 'CANCELLED', 'EXPIRED']:
            reservation_service.liberer_siege(reservation.siege_id)
            reservation.statut_paiement = Reservation.STATUT_ECHOUE
            reservation.save(update_fields=['statut_paiement'])

        return Response({'received': True})


class VerifierPaiementView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, ref, *args, **kwargs):
        from .models import Reservation
        from .services import qos_service, reservation_service

        try:
            reservation = Reservation.objects.select_related('siege').get(reference_evex=ref)
        except Reservation.DoesNotExist:
            return Response({'erreur': 'RESERVATION_INTROUVABLE'}, status=status.HTTP_404_NOT_FOUND)

        if reservation.statut_paiement == Reservation.STATUT_EN_ATTENTE and reservation.transaction_id_qos:
            verification = qos_service.verifier_paiement(reservation.transaction_id_qos)
            nouveau_statut = verification.get('statut')
            if nouveau_statut == Reservation.STATUT_PAYE:
                reservation = reservation_service.confirmer_paiement(
                    reservation.reference_evex,
                    reservation.transaction_id_qos,
                )
            elif nouveau_statut in [Reservation.STATUT_ECHOUE, Reservation.STATUT_EXPIRE]:
                reservation_service.liberer_siege(reservation.siege_id)
                reservation.statut_paiement = nouveau_statut
                reservation.save(update_fields=['statut_paiement'])

        reservation.refresh_from_db()
        return Response({
            'reference': reservation.reference_evex,
            'statut': reservation.statut_paiement,
            'montant_total': reservation.montant_total,
            'frais_evex': reservation.frais_evex,
            'montant_billet': reservation.montant_billet,
            'siege': reservation.siege.numero,
            'paye': reservation.statut_paiement == Reservation.STATUT_PAYE,
            'message': 'Paiement confirme' if reservation.statut_paiement == Reservation.STATUT_PAYE else 'Paiement en attente',
        })


class SiegesView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, voyage_id, *args, **kwargs):
        from .models import Siege
        from .services import reservation_service

        reservation_service.liberer_sieges_expires()
        sieges = list(Siege.objects.filter(voyage_id=voyage_id).order_by('numero'))
        resume = {
            'total': len(sieges),
            'libres': sum(1 for siege in sieges if siege.statut == Siege.STATUT_LIBRE),
            'occupes': sum(1 for siege in sieges if siege.statut == Siege.STATUT_OCCUPE),
            'temporaires': sum(1 for siege in sieges if siege.statut == Siege.STATUT_RESERVE_TEMP),
        }
        return Response({
            'voyage_id': str(voyage_id),
            'sieges': [
                {'id': str(siege.id), 'numero': siege.numero, 'statut': siege.statut}
                for siege in sieges
            ],
            'resume': resume,
        })
