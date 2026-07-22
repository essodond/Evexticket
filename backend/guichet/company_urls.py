from django.urls import path

from .views import (
    AffecterAgentAgenceView,
    AffecterGestionnaireAgenceView,
    CreerAgenceView,
    CreerGuichetAgenceView,
    DetailAgenceView,
    ListeAgencesView,
    ListeGuichetsAgenceView,
    ModifierAgenceView,
    ModifierGuichetAgenceView,
    SupprimerAgenceView,
    SupprimerGuichetAgenceView,
)


urlpatterns = [
    path('agences/', ListeAgencesView.as_view(), name='compagnie-agences'),
    path('agences/creer/', CreerAgenceView.as_view(), name='compagnie-agence-creer'),
    path('agences/<uuid:id>/', DetailAgenceView.as_view(), name='compagnie-agence-detail'),
    path('agences/<uuid:id>/modifier/', ModifierAgenceView.as_view(), name='compagnie-agence-modifier'),
    path('agences/<uuid:id>/affecter-gestionnaire/', AffecterGestionnaireAgenceView.as_view(), name='compagnie-agence-affecter-gestionnaire'),
    path('agences/<uuid:id>/guichets/', ListeGuichetsAgenceView.as_view(), name='compagnie-agence-guichets'),
    path('agences/<uuid:id>/guichets/creer/', CreerGuichetAgenceView.as_view(), name='compagnie-agence-guichet-creer'),
    path('agences/<uuid:id>/guichets/<uuid:guichet_id>/modifier/', ModifierGuichetAgenceView.as_view(), name='compagnie-agence-guichet-modifier'),
    path('agences/<uuid:id>/guichets/<uuid:guichet_id>/supprimer/', SupprimerGuichetAgenceView.as_view(), name='compagnie-agence-guichet-supprimer'),
    path('agences/<uuid:id>/supprimer/', SupprimerAgenceView.as_view(), name='compagnie-agence-supprimer'),
    path('agents/<int:id>/affectation/', AffecterAgentAgenceView.as_view(), name='compagnie-agent-affectation'),
]
