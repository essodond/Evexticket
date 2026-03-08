from django.urls import path, include
from . import views
from rest_framework.authtoken.views import obtain_auth_token
from rest_framework.routers import DefaultRouter

# Créer un routeur
router = DefaultRouter()
router.register(r'bookings', views.BookingViewSet, basename='booking')
router.register(r'companies', views.CompanyViewSet, basename='company')
router.register(r'trips', views.TripViewSet, basename='trip')
router.register(r'scheduled_trips', views.ScheduledTripViewSet, basename='scheduled-trip')
router.register(r'users', views.UserViewSet, basename='user')

urlpatterns = [
    path('companies/<int:pk>/', views.CompanyDetailView.as_view(), name='company-detail'),
    path('companies/<int:company_id>/bookings/', views.CompanyBookingsView.as_view(), name='company-bookings'),
    path('dashboard/stats/', views.DashboardStatsView.as_view(), name='dashboard-stats'),
    path('companies/<int:company_id>/stats/', views.CompanyStatsView.as_view(), name='company-stats'),
    path('register/', views.RegisterView.as_view(), name='register'),
    path('login/', views.EmailAuthToken.as_view(), name='api-token-auth'),
    path('me/', views.CurrentUserView.as_view(), name='current-user'),
    path('scheduled_trips/<int:pk>/stops/', views.scheduled_trip_stops, name='scheduled-trip-stops'),
    path('scheduled_trips/search/', views.ScheduledTripSearchView.as_view(), name='scheduled-trip-search'),
    path('trips/sync/', views.TripSyncView.as_view(), name='trip-sync'),
    path('booked_seats/', views.booked_seats_list, name='booked-seats'),
    path('availability/', views.availability_view, name='availability'),
    path('cities/', views.cities_list, name='cities-list'),
    path('my-bookings/', views.MyBookingsView.as_view(), name='my-bookings'),
    # Inclure les routes du routeur
    path('', include(router.urls)),
]
