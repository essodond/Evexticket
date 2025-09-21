from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'cities', views.CityViewSet, basename='city')        # ✅ basename ajouté
router.register(r'companies', views.CompanyViewSet, basename='company')  # ✅ basename ajouté
router.register(r'trips', views.TripViewSet, basename='trip')        # ✅ basename ajouté
router.register(r'bookings', views.BookingViewSet, basename='booking')  # ✅ déjà corrigé

urlpatterns = [
    path('', include(router.urls)),
    path('dashboard/stats/', views.DashboardStatsView.as_view(), name='dashboard-stats'),
]
