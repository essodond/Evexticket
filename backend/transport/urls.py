from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from rest_framework.authtoken.views import obtain_auth_token

router = DefaultRouter()
router.register(r'cities', views.CityViewSet, basename='city')        # ✅ basename ajouté
router.register(r'companies', views.CompanyViewSet, basename='company')  # ✅ basename ajouté
router.register(r'trips', views.TripViewSet, basename='trip')        # ✅ basename ajouté
router.register(r'bookings', views.BookingViewSet, basename='booking')  # ✅ déjà corrigé

urlpatterns = [
    path('', include(router.urls)),
    path('dashboard/stats/', views.DashboardStatsView.as_view(), name='dashboard-stats'),
    path('register/', views.RegisterView.as_view(), name='register'),
    path('login/', views.EmailAuthToken.as_view(), name='api-token-auth'),
    path('me/', views.CurrentUserView.as_view(), name='current-user'),
]
