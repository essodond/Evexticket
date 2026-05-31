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
    Siege,
    Reservation,
    CompteCagnotte,
    HistoriqueReversement,
)


class TripStopInline(admin.TabularInline):
    model = TripStop
    extra = 1
    fields = ['city', 'sequence', 'segment_price']
    ordering = ['sequence']


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
