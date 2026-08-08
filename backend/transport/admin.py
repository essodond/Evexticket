from django.contrib import admin
from django.contrib import messages
from .models import (
    Company,
    City,
    Trip,
    Booking,
    Payment,
    Review,
    Notification,
    TripStop,
    BoardingZone,
    Siege,
    Reservation,
    CompteCagnotte,
    HistoriqueReversement,
    XPTransaction,
    BusPosition,
    TripTrackingSession,
)


class TripStopInline(admin.TabularInline):
    model = TripStop
    extra = 1
    fields = ['city', 'sequence', 'segment_price']
    ordering = ['sequence']


@admin.register(BoardingZone)
class BoardingZoneAdmin(admin.ModelAdmin):
    list_display = ['name', 'city', 'trip_stop', 'latitude', 'longitude']
    list_filter = ['city', 'trip_stop__trip__company']
    search_fields = ['name', 'description', 'city__name', 'trip_stop__trip__company__name']


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
    inlines = [TripStopInline]

    def save_model(self, request, obj, form, change):
        super().save_model(request, obj, form, change)
        if not change:
            messages.success(request, f"Le trajet '{obj}' a été créé avec succès.")


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = ['passenger_name', 'trip', 'status', 'total_price', 'booking_date']
    list_filter = ['status', 'payment_method', 'booking_date']
    search_fields = ['passenger_name', 'passenger_email', 'passenger_phone']
    readonly_fields = ['booking_date']


@admin.register(XPTransaction)
class XPTransactionAdmin(admin.ModelAdmin):
    list_display = ['user', 'points', 'event_type', 'booking', 'created_at']
    list_filter = ['event_type', 'created_at']
    search_fields = ['user__username', 'user__email', 'event_key', 'description']
    readonly_fields = [
        'user', 'booking', 'event_key', 'event_type', 'points', 'description', 'created_at'
    ]


@admin.register(TripTrackingSession)
class TripTrackingSessionAdmin(admin.ModelAdmin):
    list_display = ['scheduled_trip', 'driver', 'is_active', 'speed_kmh', 'delay_minutes', 'last_position_at']
    list_filter = ['is_active', 'started_at', 'last_position_at']
    search_fields = ['scheduled_trip__trip__company__name', 'driver__username']
    readonly_fields = ['started_at', 'stopped_at', 'last_position_at', 'updated_at']


@admin.register(BusPosition)
class BusPositionAdmin(admin.ModelAdmin):
    list_display = ['session', 'latitude', 'longitude', 'speed_kmh', 'accuracy_m', 'recorded_at']
    list_filter = ['recorded_at']
    readonly_fields = ['session', 'latitude', 'longitude', 'speed_kmh', 'accuracy_m', 'heading', 'recorded_at', 'created_at']


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ['booking', 'amount', 'payment_method', 'status', 'payment_date']
    list_filter = ['status', 'payment_method', 'payment_date']
    search_fields = ['booking__passenger_name', 'transaction_id']


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ['booking', 'rating', 'created_at']
    list_filter = ['rating', 'created_at']
    search_fields = ['booking__passenger_name', 'comment']


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ['user', 'title', 'type', 'is_read', 'created_at']
    list_filter = ['type', 'is_read', 'created_at']
    search_fields = ['user__username', 'title', 'message']


@admin.register(Siege)
class SiegeAdmin(admin.ModelAdmin):
    list_display = ['voyage', 'numero', 'statut', 'reserve_at']
    list_filter = ['statut']
    search_fields = ['numero']


@admin.register(Reservation)
class ReservationAdmin(admin.ModelAdmin):
    list_display = ['reference_evex', 'client_nom', 'montant_total', 'statut_paiement', 'reversement_effectue']
    list_filter = ['statut_paiement', 'operateur', 'reversement_effectue']
    search_fields = ['reference_evex', 'client_nom', 'client_telephone', 'transaction_id_qos']
    readonly_fields = ['created_at', 'paid_at', 'reversement_at']


@admin.register(CompteCagnotte)
class CompteCagnotteAdmin(admin.ModelAdmin):
    list_display = ['compagnie', 'solde_a_reverser', 'total_reverse', 'updated_at']
    search_fields = ['compagnie__name']
    readonly_fields = ['updated_at']


@admin.register(HistoriqueReversement)
class HistoriqueReversementAdmin(admin.ModelAdmin):
    list_display = ['compagnie', 'reservation', 'montant', 'statut', 'created_at']
    list_filter = ['statut', 'created_at']
    search_fields = ['reservation__reference_evex', 'reference_qos_reversement']
