from rest_framework import serializers
from django.contrib.auth.models import User

from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Company, City, Trip, Booking, Payment, Review, Notification

# Serializer pour l'inscription d'utilisateur
class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, style={'input_type': 'password'})
    password2 = serializers.CharField(write_only=True, required=True, style={'input_type': 'password'})

    class Meta:
        model = User
        fields = ('username', 'email', 'first_name', 'last_name', 'password', 'password2')

    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({"password": "Les mots de passe ne correspondent pas."})
        return attrs

    def create(self, validated_data):
        validated_data.pop('password2')
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
            password=validated_data['password']
        )
        return user


class UserSerializer(serializers.ModelSerializer):
    """Serializer pour les utilisateurs"""
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'is_active', 'date_joined']
        read_only_fields = ['id', 'date_joined']


class CitySerializer(serializers.ModelSerializer):
    """Serializer pour les villes"""
    class Meta:
        model = City
        fields = ['id', 'name', 'region', 'is_active', 'created_at']
        read_only_fields = ['id', 'created_at']


class CompanySerializer(serializers.ModelSerializer):
    """Serializer pour les compagnies"""
    admin_user = UserSerializer(read_only=True)
    admins = UserSerializer(many=True, read_only=True)
    # Champs write-only pour créer un administrateur lors de la création d'une compagnie
    admin_email = serializers.EmailField(write_only=True, required=False, allow_null=True)
    admin_password = serializers.CharField(write_only=True, required=False, allow_null=True)
    trips_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Company
        fields = [
            'id', 'name', 'description', 'address', 'phone', 'email', 
            'website', 'logo', 'is_active', 'created_at', 'updated_at',
            'admin_user', 'admins', 'trips_count'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'trips_count']

    def get_trips_count(self, obj):
        return obj.trips.count()

    def create(self, validated_data):
        # Extraire les champs pour création d'utilisateur si fournis
        admin_email = validated_data.pop('admin_email', None)
        admin_password = validated_data.pop('admin_password', None)

        company = super().create(validated_data)

        if admin_email and admin_password:
            # Créer l'utilisateur admin pour la compagnie
            from django.contrib.auth.models import User
            from django.db import IntegrityError
            try:
                # Utiliser l'email comme username pour simplifier
                if User.objects.filter(username=admin_email).exists():
                    # Ne pas écraser l'utilisateur existant, ajouter erreur
                    raise serializers.ValidationError({'admin_email': 'Un utilisateur avec cet email existe déjà.'})

                user = User.objects.create_user(username=admin_email, email=admin_email, password=admin_password)
                # Ajouter aux administrateurs M2M
                try:
                    company.admins.add(user)
                except Exception:
                    pass
                # Si admin_user legacy non défini, l'assigner pour compatibilité
                if not company.admin_user:
                    company.admin_user = user
                    company.save()
            except IntegrityError:
                raise serializers.ValidationError({'admin_email': 'Impossible de créer l\'utilisateur admin (conflit).'})

        return company


class TripSerializer(serializers.ModelSerializer):
    """Serializer pour les trajets"""
    company_name = serializers.CharField(source='company.name', read_only=True)
    departure_city_name = serializers.CharField(source='departure_city.name', read_only=True)
    arrival_city_name = serializers.CharField(source='arrival_city.name', read_only=True)
    bookings_count = serializers.SerializerMethodField()
    available_seats = serializers.SerializerMethodField()
    
    class Meta:
        model = Trip
        fields = [
            'id', 'company', 'company_name', 'departure_city', 'departure_city_name',
            'arrival_city', 'arrival_city_name', 'departure_time', 'arrival_time',
            'price', 'duration', 'bus_type', 'capacity', 'is_active',
            'created_at', 'updated_at', 'bookings_count', 'available_seats'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'bookings_count', 'available_seats']

    def get_bookings_count(self, obj):
        return obj.bookings.filter(status__in=['confirmed', 'pending']).count()

    def get_available_seats(self, obj):
        confirmed_bookings = obj.bookings.filter(status='confirmed').count()
        return obj.capacity - confirmed_bookings

    def validate(self, data):
        if data['departure_city'] == data['arrival_city']:
            raise serializers.ValidationError("La ville de départ et d'arrivée doivent être différentes.")
        return data


class BookingSerializer(serializers.ModelSerializer):
    """Serializer pour les réservations"""
    trip_details = TripSerializer(source='trip', read_only=True)
    passenger_full_name = serializers.SerializerMethodField()
    
    class Meta:
        model = Booking
        fields = [
            'id', 'trip', 'trip_details', 'passenger_name', 'passenger_email',
            'passenger_phone', 'seat_number', 'status', 'payment_method',
            'total_price', 'booking_date', 'travel_date', 'notes', 'user',
            'passenger_full_name'
        ]
        read_only_fields = ['id', 'booking_date', 'passenger_full_name']

    def get_passenger_full_name(self, obj):
        return f"{obj.passenger_name}"

    def validate_seat_number(self, value):
        # Vérifier que le siège n'est pas déjà pris pour ce trajet et cette date
        if self.instance:
            # Mode édition
            existing_booking = Booking.objects.filter(
                trip=self.instance.trip,
                travel_date=self.instance.travel_date,
                seat_number=value,
                status__in=['confirmed', 'pending']
            ).exclude(id=self.instance.id)
        else:
            # Mode création
            trip = self.initial_data.get('trip')
            travel_date = self.initial_data.get('travel_date')
            if trip and travel_date:
                existing_booking = Booking.objects.filter(
                    trip=trip,
                    travel_date=travel_date,
                    seat_number=value,
                    status__in=['confirmed', 'pending']
                )
            else:
                existing_booking = Booking.objects.none()

        if existing_booking.exists():
            raise serializers.ValidationError("Ce siège est déjà réservé pour ce trajet.")
        return value


class PaymentSerializer(serializers.ModelSerializer):
    """Serializer pour les paiements"""
    booking_details = BookingSerializer(source='booking', read_only=True)
    
    class Meta:
        model = Payment
        fields = [
            'id', 'booking', 'booking_details', 'amount', 'payment_method',
            'status', 'transaction_id', 'payment_date', 'notes'
        ]
        read_only_fields = ['id', 'payment_date']


class ReviewSerializer(serializers.ModelSerializer):
    """Serializer pour les avis"""
    booking_details = BookingSerializer(source='booking', read_only=True)
    
    class Meta:
        model = Review
        fields = [
            'id', 'booking', 'booking_details', 'rating', 'comment',
            'created_at', 'is_approved'
        ]
        read_only_fields = ['id', 'created_at']


class NotificationSerializer(serializers.ModelSerializer):
    """Serializer pour les notifications"""
    class Meta:
        model = Notification
        fields = [
            'id', 'user', 'title', 'message', 'notification_type',
            'is_read', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class TripSearchSerializer(serializers.Serializer):
    """Serializer pour la recherche de trajets"""
    departure_city = serializers.CharField(required=True)
    arrival_city = serializers.CharField(required=True)
    travel_date = serializers.DateField(required=True)
    passengers = serializers.IntegerField(min_value=1, max_value=10, default=1)


class BookingCreateSerializer(serializers.ModelSerializer):
    """Serializer pour la création de réservations"""
    class Meta:
        model = Booking
        fields = [
            'trip', 'passenger_name', 'passenger_email', 'passenger_phone',
            'seat_number', 'payment_method', 'travel_date', 'notes'
        ]

    def create(self, validated_data):
        trip = validated_data['trip']
        validated_data['total_price'] = trip.price
        validated_data['status'] = 'pending'
        return super().create(validated_data)


class DashboardStatsSerializer(serializers.Serializer):
    """Serializer pour les statistiques du dashboard"""
    total_users = serializers.IntegerField()
    total_companies = serializers.IntegerField()
    total_trips = serializers.IntegerField()
    total_bookings = serializers.IntegerField()
    total_revenue = serializers.DecimalField(max_digits=12, decimal_places=2)
    monthly_growth = serializers.FloatField()


class CompanyStatsSerializer(serializers.Serializer):
    """Serializer pour les statistiques de la compagnie"""
    total_trips = serializers.IntegerField()
    total_bookings = serializers.IntegerField()
    total_revenue = serializers.DecimalField(max_digits=12, decimal_places=2)
    active_trips = serializers.IntegerField()
    pending_bookings = serializers.IntegerField()
    monthly_growth = serializers.FloatField()
