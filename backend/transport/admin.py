from django.contrib import admin
from .models import Company, City, Trip, Booking, Payment, Review, Notification


@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    list_display = ['name', 'email', 'phone', 'is_active', 'created_at']
    list_filter = ['is_active', 'created_at']
    search_fields = ['name', 'email', 'phone']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(City)
class CityAdmin(admin.ModelAdmin):
    list_display = ['name', 'region', 'is_active', 'created_at']
    list_filter = ['region', 'is_active']
    search_fields = ['name', 'region']


@admin.register(Trip)
class TripAdmin(admin.ModelAdmin):
    list_display = ['__str__', 'company', 'departure_time', 'arrival_time', 'price', 'bus_type', 'is_active']
    list_filter = ['company', 'bus_type', 'is_active', 'departure_city', 'arrival_city']
    search_fields = ['departure_city__name', 'arrival_city__name', 'company__name']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = ['passenger_name', 'trip', 'travel_date', 'status', 'total_price', 'booking_date']
    list_filter = ['status', 'payment_method', 'travel_date', 'booking_date']
    search_fields = ['passenger_name', 'passenger_email', 'passenger_phone']
    readonly_fields = ['booking_date']


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ['booking', 'amount', 'payment_method', 'status', 'payment_date']
    list_filter = ['status', 'payment_method', 'payment_date']
    search_fields = ['booking__passenger_name', 'transaction_id']


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ['booking', 'rating', 'is_approved', 'created_at']
    list_filter = ['rating', 'is_approved', 'created_at']
    search_fields = ['booking__passenger_name', 'comment']


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ['user', 'title', 'notification_type', 'is_read', 'created_at']
    list_filter = ['notification_type', 'is_read', 'created_at']
    search_fields = ['user__username', 'title', 'message']