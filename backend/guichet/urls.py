from django.urls import path
from .views import (
    CreerAgentView, ListeAgentsView, ActiverAgentView, DashboardGuichetView,
    VoyagesDisponiblesView, SiegesVoyageView, CreerVenteView, AnnulerVenteView,
    ScannerQRView, HistoriqueControlesView, HistoriqueVentesView, PassagersVoyageView,
)

urlpatterns = [
    path('agents/creer/', CreerAgentView.as_view()),
    path('agents/', ListeAgentsView.as_view()),
    path('agents/<int:id>/activer/', ActiverAgentView.as_view()),
    path('dashboard/', DashboardGuichetView.as_view()),
    path('voyages/disponibles/', VoyagesDisponiblesView.as_view()),
    path('voyages/<int:vid>/sieges/', SiegesVoyageView.as_view()),
    path('ventes/creer/', CreerVenteView.as_view()),
    path('ventes/<str:ref>/annuler/', AnnulerVenteView.as_view()),
    path('controle/scanner/', ScannerQRView.as_view()),
    path('controle/historique/', HistoriqueControlesView.as_view()),
    path('ventes/historique/', HistoriqueVentesView.as_view()),
    path('voyages/<int:vid>/passagers/', PassagersVoyageView.as_view()),
]
