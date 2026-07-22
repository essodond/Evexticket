from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Agence, AgentGuichet, Guichet, VenteGuichet, ControlePassager
from transport.models import ScheduledTrip, Siege


class AgentGuichetSerializer(serializers.ModelSerializer):
    class Meta:
        model = AgentGuichet
        fields = ['id', 'nom', 'prenom', 'telephone', 'actif', 'compagnie', 'agence', 'guichet']


class AgenceSerializer(serializers.ModelSerializer):
    ville_id = serializers.PrimaryKeyRelatedField(source='ville', queryset=Agence._meta.get_field('ville').remote_field.model.objects.filter(is_active=True), write_only=True)
    gestionnaire_id = serializers.PrimaryKeyRelatedField(
        source='gestionnaire',
        queryset=AgentGuichet.objects.all(),
        write_only=True,
        required=False,
        allow_null=True,
    )
    ville = serializers.SerializerMethodField()
    gestionnaire = serializers.SerializerMethodField()
    nb_personnel = serializers.SerializerMethodField()
    billets_vendus_mois = serializers.SerializerMethodField()
    nb_guichets = serializers.SerializerMethodField()
    statut = serializers.SerializerMethodField()

    class Meta:
        model = Agence
        fields = [
            'id', 'nom', 'ville_id', 'ville', 'adresse', 'telephone',
            'gestionnaire_id', 'gestionnaire', 'nb_personnel',
            'nb_guichets', 'billets_vendus_mois', 'statut', 'is_active',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate(self, attrs):
        compagnie = self.context.get('compagnie')
        gestionnaire = attrs.get('gestionnaire', getattr(self.instance, 'gestionnaire', None))
        nom = attrs.get('nom', getattr(self.instance, 'nom', '')).strip()
        attrs['nom'] = nom

        if not nom:
            raise serializers.ValidationError({'nom': "Le nom de l'agence est requis."})
        if compagnie and gestionnaire:
            if gestionnaire.compagnie_id != compagnie.id:
                raise serializers.ValidationError({'gestionnaire_id': 'Ce gestionnaire appartient à une autre compagnie.'})
            if not gestionnaire.actif:
                raise serializers.ValidationError({'gestionnaire_id': 'Ce gestionnaire est désactivé.'})
            if gestionnaire.agence_id and (
                not self.instance or gestionnaire.agence_id != self.instance.id
            ):
                raise serializers.ValidationError({
                    'gestionnaire_id': 'Ce gestionnaire est déjà affecté à une autre agence.',
                })
            occupied = Agence.objects.filter(gestionnaire=gestionnaire)
            if self.instance:
                occupied = occupied.exclude(pk=self.instance.pk)
            if occupied.exists():
                raise serializers.ValidationError({'gestionnaire_id': 'Ce gestionnaire dirige déjà une autre agence.'})
        if compagnie:
            duplicate = Agence.objects.filter(compagnie=compagnie, nom__iexact=nom)
            if self.instance:
                duplicate = duplicate.exclude(pk=self.instance.pk)
            if duplicate.exists():
                raise serializers.ValidationError({'nom': 'Une agence portant ce nom existe déjà.'})
        return attrs

    def get_ville(self, obj):
        return {'id': obj.ville_id, 'nom': obj.ville.name, 'region': obj.ville.region}

    def get_gestionnaire(self, obj):
        if not obj.gestionnaire:
            return None
        return {
            'id': obj.gestionnaire_id,
            'nom': obj.gestionnaire.nom,
            'prenom': obj.gestionnaire.prenom,
            'telephone': obj.gestionnaire.telephone,
            'email': obj.gestionnaire.user.email,
            'actif': obj.gestionnaire.actif,
        }

    def get_nb_personnel(self, obj):
        return obj.agents.count()

    def get_nb_guichets(self, obj):
        return obj.guichets.filter(is_active=True).count()

    def get_billets_vendus_mois(self, obj):
        from django.utils import timezone
        today = timezone.localdate()
        return obj.ventes.filter(
            created_at__year=today.year,
            created_at__month=today.month,
            statut__in=['valide', 'utilise'],
        ).count()

    def get_statut(self, obj):
        return 'active' if obj.is_active else 'inactive'


class GuichetSerializer(serializers.ModelSerializer):
    nb_agents = serializers.SerializerMethodField()
    billets_vendus_mois = serializers.SerializerMethodField()
    revenu_mois = serializers.SerializerMethodField()
    statut = serializers.SerializerMethodField()

    class Meta:
        model = Guichet
        fields = [
            'id', 'code', 'nom', 'emplacement', 'nb_agents',
            'billets_vendus_mois', 'revenu_mois', 'statut', 'is_active',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate(self, attrs):
        agence = self.context.get('agence') or getattr(self.instance, 'agence', None)
        code = attrs.get('code', getattr(self.instance, 'code', '')).strip().upper()
        nom = attrs.get('nom', getattr(self.instance, 'nom', '')).strip()
        attrs['code'] = code
        attrs['nom'] = nom
        attrs['emplacement'] = attrs.get(
            'emplacement',
            getattr(self.instance, 'emplacement', ''),
        ).strip()

        if not code:
            raise serializers.ValidationError({'code': 'Le code du guichet est requis.'})
        if not nom:
            raise serializers.ValidationError({'nom': 'Le nom du guichet est requis.'})
        if agence:
            duplicate = Guichet.objects.filter(agence=agence, code__iexact=code)
            if self.instance:
                duplicate = duplicate.exclude(pk=self.instance.pk)
            if duplicate.exists():
                raise serializers.ValidationError({
                    'code': 'Un guichet portant ce code existe déjà dans cette agence.',
                })
        return attrs

    def get_nb_agents(self, obj):
        return obj.agents.count()

    def get_billets_vendus_mois(self, obj):
        from django.utils import timezone
        today = timezone.localdate()
        return obj.ventes.filter(
            created_at__year=today.year,
            created_at__month=today.month,
            statut__in=['valide', 'utilise'],
        ).count()

    def get_revenu_mois(self, obj):
        from django.db.models import Sum
        from django.utils import timezone
        today = timezone.localdate()
        return obj.ventes.filter(
            created_at__year=today.year,
            created_at__month=today.month,
            statut__in=['valide', 'utilise'],
        ).aggregate(total=Sum('montant_billet'))['total'] or 0

    def get_statut(self, obj):
        return 'active' if obj.is_active else 'inactive'


class VenteGuichetSerializer(serializers.ModelSerializer):
    class Meta:
        model = VenteGuichet
        fields = [
            'reference_vente', 'qr_code_data', 'client_nom', 'client_telephone',
            'voyage', 'siege', 'montant_billet', 'frais_evex', 'montant_total', 'mode_paiement', 'statut', 'created_at'
        ]


class ControlePassagerSerializer(serializers.ModelSerializer):
    class Meta:
        model = ControlePassager
        fields = ['id', 'agent', 'vente', 'reservation', 'voyage', 'resultat', 'message', 'created_at']


class VoyageDisponibleSerializer(serializers.ModelSerializer):
    trajet = serializers.SerializerMethodField()
    trip_id = serializers.IntegerField(source='trip.id', read_only=True)
    heure_depart = serializers.TimeField(source='trip.departure_time', read_only=True)
    heure_arrivee = serializers.TimeField(source='trip.arrival_time', read_only=True)
    prix = serializers.DecimalField(source='trip.price', max_digits=10, decimal_places=2, read_only=True)
    places_total = serializers.IntegerField(source='trip.capacity', read_only=True)
    places_libres = serializers.IntegerField(source='available_seats', read_only=True)
    statut = serializers.SerializerMethodField()

    class Meta:
        model = ScheduledTrip
        fields = [
            'id', 'trip_id', 'trajet', 'date', 'heure_depart', 'heure_arrivee',
            'prix', 'places_total', 'places_libres', 'statut',
        ]

    def get_trajet(self, obj):
        return f"{obj.trip.departure_city.name}→{obj.trip.arrival_city.name}"

    def get_statut(self, obj):
        return 'actif' if obj.is_active else 'inactif'


class PassagerSerializer(serializers.Serializer):
    numero_siege = serializers.CharField()
    client_nom = serializers.CharField()
    client_telephone = serializers.CharField()
    source = serializers.CharField()
    reference = serializers.CharField()
    statut_controle = serializers.CharField()
