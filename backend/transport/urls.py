from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from rest_framework.authtoken.views import obtain_auth_token

router = DefaultRouter()
router.register(r'cities', views.CityViewSet, basename='city')        # ✅ basename ajouté
router.register(r'companies', views.CompanyViewSet, basename='company')  # ✅ basename ajouté
router.register(r'trips', views.TripViewSet, basename='trip')        # ✅ basename ajouté
router.register(r'bookings', views.BookingViewSet, basename='booking')  # ✅ déjà corrigé
router.register(r'users', views.UserViewSet, basename='user')

urlpatterns = [
    path('', include(router.urls)),
    path('dashboard/stats/', views.DashboardStatsView.as_view(), name='dashboard-stats'),
    path('register/', views.RegisterView.as_view(), name='register'),
    path('login/', views.EmailAuthToken.as_view(), name='api-token-auth'),
    path('me/', views.CurrentUserView.as_view(), name='current-user'),
    path('scheduled_trips/', views.scheduled_trips_list, name='scheduled-trips'),
    path('scheduled_trips/search/', views.ScheduledTripSearchView.as_view(), name='scheduled-trip-search'),
    path('booked_seats/', views.booked_seats_list, name='booked-seats'),
    path('availability/', views.availability_view, name='availability'),
]
