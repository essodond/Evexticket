from django.urls import path

from .platform_admin import (
    PlatformAnalyticsView,
    PlatformAuditView,
    PlatformCompaniesView,
    PlatformCompanyAdminsView,
    PlatformCompanyDetailView,
    PlatformCompanyStatusView,
    PlatformDashboardView,
    PlatformExportView,
    PlatformFinanceView,
    PlatformSettingsView,
    PlatformTicketActionView,
    PlatformTicketsView,
    PlatformUserPasswordView,
    PlatformUserSessionsView,
    PlatformUsersView,
    PlatformUserStatusView,
    PlatformVoyagesView,
    PlatformVoyageStatusView,
)


urlpatterns = [
    path('dashboard/', PlatformDashboardView.as_view(), name='platform-admin-dashboard'),
    path('companies/', PlatformCompaniesView.as_view(), name='platform-admin-companies'),
    path('companies/<int:pk>/', PlatformCompanyDetailView.as_view(), name='platform-admin-company-detail'),
    path('companies/<int:pk>/status/', PlatformCompanyStatusView.as_view(), name='platform-admin-company-status'),
    path('companies/<int:pk>/admins/', PlatformCompanyAdminsView.as_view(), name='platform-admin-company-admins'),
    path('users/', PlatformUsersView.as_view(), name='platform-admin-users'),
    path('users/<int:pk>/status/', PlatformUserStatusView.as_view(), name='platform-admin-user-status'),
    path('users/<int:pk>/reset-password/', PlatformUserPasswordView.as_view(), name='platform-admin-user-password'),
    path('users/<int:pk>/revoke-sessions/', PlatformUserSessionsView.as_view(), name='platform-admin-user-sessions'),
    path('voyages/', PlatformVoyagesView.as_view(), name='platform-admin-voyages'),
    path('voyages/<int:pk>/status/', PlatformVoyageStatusView.as_view(), name='platform-admin-voyage-status'),
    path('tickets/', PlatformTicketsView.as_view(), name='platform-admin-tickets'),
    path('tickets/<str:source>/<str:pk>/action/', PlatformTicketActionView.as_view(), name='platform-admin-ticket-action'),
    path('finance/', PlatformFinanceView.as_view(), name='platform-admin-finance'),
    path('analytics/', PlatformAnalyticsView.as_view(), name='platform-admin-analytics'),
    path('audit/', PlatformAuditView.as_view(), name='platform-admin-audit'),
    path('settings/', PlatformSettingsView.as_view(), name='platform-admin-settings'),
    path('exports/<str:resource>/', PlatformExportView.as_view(), name='platform-admin-export'),
]
