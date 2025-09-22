from rest_framework import generics
from django.contrib.auth.models import User
from rest_framework.permissions import AllowAny
from rest_framework.authtoken.models import Token
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
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db.models import Q, Count, Sum, Avg
from django.utils import timezone
from datetime import datetime, timedelta
from django.contrib.auth.models import User
from .models import Company, City, Trip, Booking, Payment, Review, Notification
from .serializers import (
    CompanySerializer, CitySerializer, TripSerializer, BookingSerializer,
    PaymentSerializer, ReviewSerializer, NotificationSerializer,
    TripSearchSerializer, BookingCreateSerializer, DashboardStatsSerializer,
    CompanyStatsSerializer
)

class CurrentUserView(APIView):
    """Retourne les informations de l'utilisateur connecté et son rôle"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        # Importer le serializer local pour éviter les dépendances circulaires
        from .serializers import UserSerializer
        data = UserSerializer(user).data
        # Indiquer si c'est un admin de compagnie
        is_company_admin = Company.objects.filter(admin_user=user).exists()
        data['is_company_admin'] = is_company_admin
        if is_company_admin:
            comp = Company.objects.filter(admin_user=user).first()
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


class TripViewSet(viewsets.ModelViewSet):
    """ViewSet pour les trajets"""
    queryset = Trip.objects.filter(is_active=True)
    serializer_class = TripSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = Trip.objects.filter(is_active=True)
        
        if not self.request.user.is_staff:
            if hasattr(self.request.user, 'company_admin'):
                queryset = queryset.filter(company=self.request.user.company_admin)
        
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