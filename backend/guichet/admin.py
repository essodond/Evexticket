from django.contrib import admin
from .models import Agence, AgentGuichet, Guichet, VenteGuichet, ControlePassager


@admin.register(Agence)
class AgenceAdmin(admin.ModelAdmin):
    list_display = ('nom', 'ville', 'compagnie', 'gestionnaire', 'is_active', 'is_deleted')
    list_filter = ('compagnie', 'ville', 'is_active', 'is_deleted')
    search_fields = ('nom', 'adresse', 'telephone')


@admin.register(Guichet)
class GuichetAdmin(admin.ModelAdmin):
    list_display = ('code', 'nom', 'agence', 'is_active', 'is_deleted')
    list_filter = ('agence__compagnie', 'agence', 'is_active', 'is_deleted')
    search_fields = ('code', 'nom', 'emplacement', 'agence__nom')

@admin.register(AgentGuichet)
class AgentGuichetAdmin(admin.ModelAdmin):
    list_display = ('nom','prenom','telephone','compagnie','agence','guichet','actif')


@admin.register(VenteGuichet)
class VenteGuichetAdmin(admin.ModelAdmin):
    list_display = ('reference_vente','client_nom','agence','guichet','voyage','siege','montant_total','mode_paiement','statut')


@admin.register(ControlePassager)
class ControlePassagerAdmin(admin.ModelAdmin):
    list_display = ('id','agent','voyage','resultat','created_at')
