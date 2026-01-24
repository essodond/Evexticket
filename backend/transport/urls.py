from django.urls import path, include
from . import views
from rest_framework.authtoken.views import obtain_auth_token
from rest_framework.routers import DefaultRouter

# Créer un routeur
router = DefaultRouter()
router.register(r'bookings', views.BookingViewSet, basename='booking')

urlpatterns = [
    path('dashboard/stats/', views.DashboardStatsView.as_view(), name='dashboard-stats'),
    path('register/', views.RegisterView.as_view(), name='register'),
    path('login/', views.EmailAuthToken.as_view(), name='api-token-auth'),
    path('me/', views.CurrentUserView.as_view(), name='current-user'),
    path('scheduled_trips/', views.scheduled_trips_list, name='scheduled-trips'),
    path('scheduled_trips/<int:pk>/', views.ScheduledTripDetailView.as_view(), name='scheduled-trip-detail'),
    path('scheduled_trips/<int:pk>/stops/', views.scheduled_trip_stops, name='scheduled-trip-stops'),
    path('scheduled_trips/search/', views.ScheduledTripSearchView.as_view(), name='scheduled-trip-search'),
    path('trips/sync/', views.TripSyncView.as_view(), name='trip-sync'),
    path('booked_seats/', views.booked_seats_list, name='booked-seats'),
    path('availability/', views.availability_view, name='availability'),
    path('cities/', views.cities_list, name='cities-list'),
    # Inclure les routes du routeur
    path('', include(router.urls)),
]
