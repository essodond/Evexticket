# Cahier des Charges Fonctionnel et Technique
## Plateforme de Réservation de Billets de Bus — Evexticket (TogoTrans)

**Version :** 2.0  
**Date :** Juin 2025  
**Statut :** Validé  
**Auteur :** Équipe Evexticket  
**Destinataires :** Équipe technique, direction générale, partenaires

---

## TABLE DES MATIÈRES

1. Présentation du projet
2. Contexte et problématique
3. Objectifs stratégiques
4. Périmètre fonctionnel
5. Acteurs et parties prenantes
6. Besoins fonctionnels détaillés
7. Architecture technique
8. Modèle de données
9. API REST — Endpoints
10. Sécurité et contraintes techniques
11. Modèle économique
12. Planning et livrables
13. Critères d'acceptation
14. Annexes

---

## 1. PRÉSENTATION DU PROJET

### 1.1 Identité du projet

| Propriété | Valeur |
|-----------|--------|
| Nom commercial | Evexticket / TogoTrans |
| Secteur | Transport interurbain de voyageurs |
| Territoire | République du Togo, Afrique de l'Ouest |
| Type de solution | Plateforme SaaS multi-tenant |
| Modèle | Marketplace B2C & B2B |

### 1.2 Vision

Evexticket ambitionne de devenir **la référence numérique du transport routier en Afrique de l'Ouest**, en commençant par le Togo, en offrant une expérience de réservation moderne, transparente et sécurisée aux voyageurs, tout en dotant les compagnies de transport d'outils de gestion professionnels.

### 1.3 Mission

Simplifier l'accès au transport interurbain en dématérialisant la billetterie bus au Togo, en agrégeant l'offre de plusieurs compagnies sur une plateforme unique accessible via Web et Mobile.

---

## 2. CONTEXTE ET PROBLÉMATIQUE

### 2.1 Contexte général

Le Togo compte environ **8,5 millions d'habitants** répartis sur un territoire de 56 785 km². Le transport routier interurbain représente le principal moyen de déplacement entre les villes, avec une demande estimée à plusieurs millions de voyages par an.

Le secteur est actuellement caractérisé par :
- Une multitude de compagnies de transport non coordonnées
- Une billetterie exclusivement manuelle et papier
- Une absence totale de numérisation des processus
- Des pratiques tarifaires opaques
- Une insécurité pour les voyageurs (surréservation, fraude aux billets)
- Une gestion financière artisanale pour les compagnies

### 2.2 Problématiques identifiées

**Pour les voyageurs :**
- Impossibilité de réserver à l'avance sans se déplacer physiquement en gare
- Absence de visibilité sur les horaires et disponibilités
- Risque d'arriver en gare pour un voyage complet
- Aucun historique de réservation
- Paiements uniquement en espèces

**Pour les compagnies de transport :**
- Aucune visibilité sur les taux de remplissage en temps réel
- Gestion manuelle des listes de passagers
- Perte de revenus due aux no-shows non anticipés
- Impossibilité d'analyser les données de fréquentation
- Comptabilité artisanale

**Pour l'écosystème :**
- Marché fragmenté et non structuré
- Absence de données fiables sur les flux de mobilité
- Difficulté pour les investisseurs d'évaluer le secteur

### 2.3 Opportunité

La pénétration du mobile au Togo atteint **65%** (ARCEP Togo, 2024). Les services Mobile Money (Flooz via Moov Africa et T-Money via Togocel) sont largement adoptés avec plus de **3 millions d'utilisateurs actifs**. Cette infrastructure de paiement mobile mature constitue un levier majeur pour la numérisation du transport.

---

## 3. OBJECTIFS STRATÉGIQUES

### 3.1 Objectifs à court terme (6 mois)

- Onboarder au minimum **10 compagnies de transport** partenaires
- Couvrir les **10 villes principales** du Togo
- Atteindre **500 réservations/mois** dès le 3ème mois d'exploitation
- Déployer l'application Web et Mobile (iOS + Android)

### 3.2 Objectifs à moyen terme (12-18 mois)

- Atteindre **5 000 réservations/mois**
- Étendre à **30+ compagnies** partenaires
- Lancer les fonctionnalités avancées (abonnements, fidélité)
- Amorcer l'expansion vers le Bénin et le Ghana

### 3.3 Objectifs à long terme (3 ans)

- Devenir la plateforme leader en Afrique de l'Ouest francophone
- 100 000+ réservations/mois
- Présence dans 6 pays d'Afrique de l'Ouest
- Introduction d'un modèle de transport premium (VIP, transfert aéroport)

---

## 4. PÉRIMÈTRE FONCTIONNEL

### 4.1 Ce qui est inclus (In Scope)

| Module | Description |
|--------|-------------|
| Recherche de trajets | Recherche multicritères avec filtres |
| Réservation en ligne | Booking en temps réel avec choix de siège |
| Paiement digital | Flooz, T-Money, carte bancaire |
| Gestion des billets | QR Code, téléchargement PDF |
| Espace voyageur | Historique, annulations, profil |
| Dashboard compagnie | Gestion trajets, réservations, revenus |
| Administration plateforme | Supervision globale, commission |
| Notifications | SMS, email, push |
| Système d'avis | Notation voyageurs |
| API publique | Intégration tiers |

### 4.2 Ce qui est exclu (Out of Scope — V1)

- Transport international (Lomé-Accra, Lomé-Cotonou) : V2
- Transport de marchandises : V3
- Covoiturage : V3
- Billetterie ferroviaire : hors périmètre
- Transport maritime : hors périmètre

### 4.3 Villes couvertes — Phase 1

| # | Ville | Région | Population estimée |
|---|-------|--------|-------------------|
| 1 | Lomé | Maritime | 837 000 |
| 2 | Kara | Kara | 104 000 |
| 3 | Kpalimé | Plateaux | 75 000 |
| 4 | Sokodé | Centrale | 95 000 |
| 5 | Atakpamé | Plateaux | 65 000 |
| 6 | Dapaong | Savanes | 58 000 |
| 7 | Tsévié | Maritime | 54 000 |
| 8 | Aného | Maritime | 28 000 |
| 9 | Bassar | Kara | 32 000 |
| 10 | Mango | Savanes | 25 000 |

---

## 5. ACTEURS ET PARTIES PRENANTES

### 5.1 Voyageur (Passenger)

**Profil :** Particulier souhaitant réserver un billet de bus.

**Caractéristiques :**
- Âge : 18-65 ans
- Utilisateurs mobiles principaux (smartphone Android)
- Alphabétisation numérique variable
- Préférence pour le paiement Mobile Money

**Objectifs :**
- Trouver rapidement un trajet disponible
- Réserver et payer en ligne
- Recevoir une confirmation instantanée
- Accéder à son billet depuis son téléphone

### 5.2 Compagnie de Transport (Company)

**Profil :** Entreprise de transport routier opérant des lignes interurbaines au Togo.

**Caractéristiques :**
- PME familiales ou société formelle
- Personnel peu formé aux outils numériques
- Flotte de 2 à 50 véhicules
- Opérations sur 1 à 10 lignes

**Objectifs :**
- Digitaliser la vente de billets
- Réduire les coûts de distribution
- Maximiser le taux de remplissage
- Avoir accès à des données analytiques

### 5.3 Administrateur Plateforme (Admin)

**Profil :** Employé Evexticket responsable de la supervision de la plateforme.

**Objectifs :**
- Superviser l'activité globale
- Valider les inscriptions des compagnies
- Gérer les commissions et paiements
- Résoudre les litiges
- Analyser les KPIs

### 5.4 Parties prenantes secondaires

- **Opérateurs téléphoniques :** Moov Africa (Flooz), Togocel (T-Money) — partenaires de paiement
- **Banques :** UTB, ORABANK — partenaires pour paiement carte
- **ARCEP Togo :** Autorité régulatrice des télécommunications
- **AREMA :** Autorité de régulation du transport au Togo

---

## 6. BESOINS FONCTIONNELS DÉTAILLÉS

### 6.1 Module Voyageur

#### 6.1.1 Inscription et authentification

**BF-V-001 :** Le système doit permettre à un voyageur de créer un compte via :
- Numéro de téléphone (obligatoire) + OTP SMS
- Adresse email (optionnel)
- Nom et prénom (obligatoires)
- Photo de profil (optionnel)

**BF-V-002 :** Connexion par :
- Email + mot de passe
- Numéro de téléphone + OTP
- Biométrie (empreinte/FaceID) sur mobile

**BF-V-003 :** Réinitialisation de mot de passe par SMS ou email.

#### 6.1.2 Recherche de trajets

**BF-V-010 :** Formulaire de recherche avec :
- Ville de départ (liste déroulante des 10 villes)
- Ville d'arrivée (liste déroulante)
- Date de voyage (calendrier, minimum date du jour)
- Nombre de passagers (1-6)
- Type de bus (optionnel : Standard/Premium/VIP/Luxury)

**BF-V-011 :** Résultats affichés avec :
- Nom de la compagnie + logo
- Heure de départ et d'arrivée
- Durée estimée du trajet
- Prix par passager
- Nombre de places disponibles
- Type de bus
- Note moyenne de la compagnie (étoiles)

**BF-V-012 :** Filtres sur les résultats :
- Plage de prix (slider min/max)
- Heure de départ (matin/après-midi/soir)
- Type de bus
- Compagnie spécifique
- Note minimale

**BF-V-013 :** Tri des résultats par : prix croissant, prix décroissant, heure de départ, note.

#### 6.1.3 Réservation

**BF-V-020 :** Sélection des sièges sur plan visuel du bus (si disponible).

**BF-V-021 :** Récapitulatif de réservation avec :
- Détail du trajet
- Passager(s) avec nom complet
- Type de pièce d'identité et numéro
- Prix total calculé (base + commission plateforme)
- Modalités d'annulation

**BF-V-022 :** Système de pré-réservation avec blocage temporaire des sièges (15 minutes maximum).

**BF-V-023 :** Envoi de confirmation par SMS et email après paiement réussi.

**BF-V-024 :** Génération automatique d'un billet PDF avec QR Code unique.

#### 6.1.4 Paiement

**BF-V-030 :** Paiement via Flooz (Moov Africa).

**BF-V-031 :** Paiement via T-Money (Togocel).

**BF-V-032 :** Paiement par carte bancaire Visa/Mastercard.

**BF-V-033 :** Paiement en espèces à un point de vente partenaire (billet réservé, paiement physique sous 2h).

**BF-V-034 :** Affichage du récapitulatif financier avant paiement (prix billet + frais de service).

**BF-V-035 :** Reçu de paiement envoyé par SMS et email.

#### 6.1.5 Gestion des billets

**BF-V-040 :** Accès à l'historique de toutes les réservations (en cours, passées, annulées).

**BF-V-041 :** Téléchargement du billet en PDF depuis l'application.

**BF-V-042 :** Affichage du QR Code du billet (fonctionnel hors ligne).

**BF-V-043 :** Annulation d'une réservation selon la politique de la compagnie.

**BF-V-044 :** Demande de remboursement en ligne (initié par le voyageur, validé par la compagnie).

#### 6.1.6 Avis et notation

**BF-V-050 :** Possibilité de noter un trajet effectué (1-5 étoiles).

**BF-V-051 :** Ajout d'un commentaire textuel (max 500 caractères).

**BF-V-052 :** Un voyageur ne peut noter qu'un trajet effectivement complété.

### 6.2 Module Compagnie de Transport

#### 6.2.1 Tableau de bord (Dashboard)

**BF-C-001 :** Vue synthétique avec KPIs en temps réel :
- Réservations du jour
- Revenus du jour / semaine / mois
- Taux de remplissage moyen
- Nombre de voyageurs actifs

**BF-C-002 :** Graphiques :
- Évolution des réservations (courbe mensuelle)
- Répartition par ligne (camembert)
- Revenus nets après commission Evex

#### 6.2.2 Gestion des trajets (Trips)

**BF-C-010 :** Création d'un nouveau trajet avec :
- Ligne (ville départ → ville arrivée)
- Date et heure de départ
- Heure d'arrivée estimée
- Prix du billet
- Nombre de sièges total
- Type de bus (Standard/Premium/VIP/Luxury)
- Description (commodités : climatisation, WiFi, prises USB)

**BF-C-011 :** Modification d'un trajet (heure, prix) jusqu'à 24h avant le départ.

**BF-C-012 :** Annulation d'un trajet avec notification automatique des voyageurs réservés.

**BF-C-013 :** Duplication d'un trajet pour création rapide de voyages récurrents.

**BF-C-014 :** Création de trajets programmés (ScheduledTrips) pour automatiser les départs récurrents.

#### 6.2.3 Gestion des réservations

**BF-C-020 :** Liste de toutes les réservations avec filtres (date, trajet, statut).

**BF-C-021 :** Validation manuelle des billets par scan QR Code (application mobile compagnie).

**BF-C-022 :** Téléchargement de la liste des passagers en format PDF ou Excel.

**BF-C-023 :** Marquage des passagers "presenté" / "absent" au moment du départ.

**BF-C-024 :** Gestion des remboursements (approbation/refus).

#### 6.2.4 Gestion financière

**BF-C-030 :** Tableau de bord financier avec :
- Revenus bruts
- Commission Evex déduite (evex_commission %)
- Revenus nets
- Transactions détaillées

**BF-C-031 :** Système de virement automatique des revenus nets (hebdomadaire par défaut).

**BF-C-032 :** Téléchargement des relevés financiers mensuels.

### 6.3 Module Administrateur

#### 6.3.1 Gestion des compagnies

**BF-A-001 :** Validation des demandes d'inscription des compagnies.

**BF-A-002 :** Configuration du taux de commission (evex_commission) par compagnie.

**BF-A-003 :** Suspension/réactivation d'une compagnie.

**BF-A-004 :** Accès en lecture aux données de toutes les compagnies.

#### 6.3.2 Supervision globale

**BF-A-010 :** Tableau de bord global avec statistiques agrégées.

**BF-A-011 :** Gestion des utilisateurs voyageurs (bannissement, support).

**BF-A-012 :** Paramétrage des villes et des routes disponibles.

**BF-A-013 :** Gestion des avis (modération, suppression si inapproprié).

#### 6.3.3 Rapports et analytics

**BF-A-020 :** Génération de rapports d'activité (PDF, CSV).

**BF-A-021 :** Suivi des commissions collectées par période.

**BF-A-022 :** Analyse des tendances de voyage (villes populaires, pics de demande).

---

## 7. ARCHITECTURE TECHNIQUE

### 7.1 Vue d'ensemble

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENTS / FRONTENDS                       │
│  ┌──────────────────┐    ┌──────────────────────────────┐   │
│  │  Web App React   │    │  Mobile App React Native     │   │
│  │  (TypeScript)    │    │  (Expo / iOS + Android)      │   │
│  └────────┬─────────┘    └──────────────┬───────────────┘   │
└───────────┼──────────────────────────────┼───────────────────┘
            │ HTTPS / REST API              │ HTTPS / REST API
            ▼                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND LAYER                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │           Django REST Framework (Python 3.11+)        │   │
│  │  ┌────────────┐ ┌──────────────┐ ┌────────────────┐  │   │
│  │  │  Auth API  │ │  Booking API │ │  Payment API   │  │   │
│  │  └────────────┘ └──────────────┘ └────────────────┘  │   │
│  │  ┌────────────┐ ┌──────────────┐ ┌────────────────┐  │   │
│  │  │ Company API│ │   Trip API   │ │  Notif. API    │  │   │
│  │  └────────────┘ └──────────────┘ └────────────────┘  │   │
│  └──────────────────────────────────────────────────────┘   │
└────────────────────────────┬────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────┐
│                     DATA LAYER                               │
│  ┌─────────────────┐   ┌──────────────────────────────┐    │
│  │  PostgreSQL 15  │   │  Redis (Cache + Sessions)    │    │
│  └─────────────────┘   └──────────────────────────────┘    │
│  ┌─────────────────┐   ┌──────────────────────────────┐    │
│  │  AWS S3 / MinIO │   │  Celery (Tâches asynchrones) │    │
│  │  (Fichiers)     │   └──────────────────────────────┘    │
│  └─────────────────┘                                        │
└─────────────────────────────────────────────────────────────┘
            │                              │
┌───────────▼──────────┐    ┌─────────────▼──────────────┐
│  Payment Gateways    │    │  Notification Services      │
│  - Flooz (Moov)      │    │  - SMS (Africa's Talking)  │
│  - T-Money (Togocel) │    │  - Email (SendGrid)         │
│  - Stripe (Card)     │    │  - Push (Firebase FCM)      │
└──────────────────────┘    └────────────────────────────┘
```

### 7.2 Stack technologique détaillée

#### 7.2.1 Frontend Web

| Composant | Technologie | Version |
|-----------|-------------|---------|
| Framework | React | 18.x |
| Langage | TypeScript | 5.x |
| Build tool | Vite | 5.x |
| State management | Zustand / TanStack Query | Latest |
| UI Components | Tailwind CSS + Shadcn/ui | Latest |
| Routing | React Router v6 | 6.x |
| Formulaires | React Hook Form + Zod | Latest |
| Graphiques | Recharts | Latest |
| HTTP Client | Axios | Latest |
| Internationalisation | i18next | Latest |

#### 7.2.2 Backend

| Composant | Technologie | Version |
|-----------|-------------|---------|
| Framework | Django | 4.2.x LTS |
| API | Django REST Framework | 3.15.x |
| Auth | JWT (djangorestframework-simplejwt) | Latest |
| ORM | Django ORM | — |
| Base de données | PostgreSQL | 15.x |
| Cache | Redis | 7.x |
| Files asynchrones | Celery + Redis | 5.x |
| Stockage fichiers | AWS S3 / MinIO | — |
| Serveur WSGI | Gunicorn | Latest |
| Proxy inverse | Nginx | Latest |
| PDF | ReportLab / WeasyPrint | Latest |
| QR Code | qrcode | Latest |

#### 7.2.3 Application Mobile

| Composant | Technologie | Version |
|-----------|-------------|---------|
| Framework | React Native | 0.73.x |
| Plateforme | Expo | SDK 50.x |
| Navigation | Expo Router | Latest |
| State | Zustand | Latest |
| Paiement | Intégration SDK Moov/Togocel | — |
| Biométrie | expo-local-authentication | Latest |
| QR Code | expo-barcode-scanner | Latest |
| Notifications push | Expo Notifications | Latest |

#### 7.2.4 Infrastructure

| Composant | Service | Notes |
|-----------|---------|-------|
| Hébergement | AWS EC2 ou DigitalOcean | VPS Ubuntu 22.04 |
| CDN | CloudFront / Cloudflare | Assets statiques |
| DNS | Route53 / Cloudflare | evexticket.com |
| SSL | Let's Encrypt | Renouvellement auto |
| CI/CD | GitHub Actions | Deploy automatique |
| Monitoring | Sentry + Prometheus | Alertes temps réel |
| Backups | AWS RDS Automated Backups | Quotidien |

---

## 8. MODÈLE DE DONNÉES

### 8.1 Entités principales

#### 8.1.1 User (Utilisateur)

```python
class User(AbstractBaseUser):
    id            = UUIDField(primary_key=True)
    email         = EmailField(unique=True, null=True)
    phone         = CharField(max_length=20, unique=True)
    first_name    = CharField(max_length=100)
    last_name     = CharField(max_length=100)
    role          = CharField(choices=['passenger', 'company_admin', 'admin'])
    is_verified   = BooleanField(default=False)
    profile_image = ImageField(null=True)
    created_at    = DateTimeField(auto_now_add=True)
    updated_at    = DateTimeField(auto_now=True)
    is_active     = BooleanField(default=True)
```

#### 8.1.2 Company (Compagnie de Transport)

```python
class Company(Model):
    id               = UUIDField(primary_key=True)
    name             = CharField(max_length=200)
    slug             = SlugField(unique=True)
    owner            = ForeignKey(User, on_delete=CASCADE)
    logo             = ImageField(null=True)
    description      = TextField(null=True)
    license_number   = CharField(max_length=100, unique=True)
    phone            = CharField(max_length=20)
    email            = EmailField()
    address          = TextField()
    city             = CharField(max_length=100)
    is_verified      = BooleanField(default=False)
    is_active        = BooleanField(default=True)
    evex_commission  = DecimalField(max_digits=5, decimal_places=2, default=8.00)
    # Commission Evexticket en pourcentage — modifiable par admin
    rating           = DecimalField(max_digits=3, decimal_places=2, default=0.00)
    total_reviews    = IntegerField(default=0)
    bank_account     = CharField(max_length=50, null=True)  # IBAN ou numéro compte
    mobile_money_num = CharField(max_length=20, null=True)
    created_at       = DateTimeField(auto_now_add=True)
    updated_at       = DateTimeField(auto_now=True)
```

#### 8.1.3 City (Ville)

```python
class City(Model):
    id         = UUIDField(primary_key=True)
    name       = CharField(max_length=100)
    region     = CharField(max_length=100)
    country    = CharField(max_length=100, default='Togo')
    latitude   = DecimalField(max_digits=9, decimal_places=6, null=True)
    longitude  = DecimalField(max_digits=9, decimal_places=6, null=True)
    image      = ImageField(null=True)
    is_active  = BooleanField(default=True)
    created_at = DateTimeField(auto_now_add=True)
```

#### 8.1.4 Trip (Trajet)

```python
class Trip(Model):
    BUS_TYPES = [
        ('standard', 'Standard'),
        ('premium', 'Premium'),
        ('vip', 'VIP'),
        ('luxury', 'Luxury'),
    ]
    STATUS_CHOICES = [
        ('scheduled', 'Programmé'),
        ('boarding', 'Embarquement'),
        ('departed', 'En route'),
        ('arrived', 'Arrivé'),
        ('cancelled', 'Annulé'),
    ]
    id               = UUIDField(primary_key=True)
    company          = ForeignKey(Company, on_delete=CASCADE, related_name='trips')
    departure_city   = ForeignKey(City, on_delete=PROTECT, related_name='departures')
    arrival_city     = ForeignKey(City, on_delete=PROTECT, related_name='arrivals')
    departure_time   = DateTimeField()
    arrival_time     = DateTimeField()
    price            = DecimalField(max_digits=10, decimal_places=2)
    total_seats      = IntegerField()
    available_seats  = IntegerField()
    bus_type         = CharField(max_length=20, choices=BUS_TYPES)
    amenities        = JSONField(default=list)
    # Ex: ["AC", "WiFi", "USB", "Toilet"]
    bus_plate        = CharField(max_length=20, null=True)
    driver_name      = CharField(max_length=100, null=True)
    status           = CharField(max_length=20, choices=STATUS_CHOICES, default='scheduled')
    is_active        = BooleanField(default=True)
    created_at       = DateTimeField(auto_now_add=True)
    updated_at       = DateTimeField(auto_now=True)
```

#### 8.1.5 Booking (Réservation)

```python
class Booking(Model):
    STATUS_CHOICES = [
        ('pending', 'En attente de paiement'),
        ('confirmed', 'Confirmé'),
        ('cancelled', 'Annulé'),
        ('completed', 'Terminé'),
        ('refunded', 'Remboursé'),
        ('no_show', 'Non présenté'),
    ]
    id                 = UUIDField(primary_key=True)
    booking_reference  = CharField(max_length=20, unique=True)
    # Format: EVX-YYYYMMDD-XXXXX
    trip               = ForeignKey(Trip, on_delete=PROTECT, related_name='bookings')
    passenger          = ForeignKey(User, on_delete=PROTECT, related_name='bookings')
    seat_numbers       = JSONField(default=list)
    # Ex: [12, 13] pour 2 passagers
    passenger_details  = JSONField(default=list)
    # Ex: [{"name": "Kofi Mensah", "id_type": "CNI", "id_number": "TG123456"}]
    num_passengers     = IntegerField(default=1)
    base_price         = DecimalField(max_digits=10, decimal_places=2)
    evex_commission    = DecimalField(max_digits=5, decimal_places=2)
    # Snapshot du taux au moment de la réservation
    commission_amount  = DecimalField(max_digits=10, decimal_places=2)
    total_price        = DecimalField(max_digits=10, decimal_places=2)
    status             = CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    qr_code            = CharField(max_length=500, null=True)
    # URL du QR code ou données encodées
    is_checked_in      = BooleanField(default=False)
    checked_in_at      = DateTimeField(null=True)
    cancellation_reason = TextField(null=True)
    created_at         = DateTimeField(auto_now_add=True)
    updated_at         = DateTimeField(auto_now=True)
```

#### 8.1.6 Payment (Paiement)

```python
class Payment(Model):
    PAYMENT_METHODS = [
        ('flooz', 'Flooz (Moov Africa)'),
        ('tmoney', 'T-Money (Togocel)'),
        ('card', 'Carte bancaire'),
        ('cash', 'Espèces'),
    ]
    STATUS_CHOICES = [
        ('pending', 'En attente'),
        ('processing', 'En cours'),
        ('completed', 'Complété'),
        ('failed', 'Échoué'),
        ('refunded', 'Remboursé'),
        ('partial_refund', 'Remboursement partiel'),
    ]
    id                  = UUIDField(primary_key=True)
    booking             = OneToOneField(Booking, on_delete=CASCADE, related_name='payment')
    amount              = DecimalField(max_digits=10, decimal_places=2)
    currency            = CharField(max_length=3, default='XOF')
    payment_method      = CharField(max_length=20, choices=PAYMENT_METHODS)
    transaction_id      = CharField(max_length=200, unique=True, null=True)
    # ID fourni par la passerelle de paiement
    gateway_response    = JSONField(null=True)
    # Réponse complète de la passerelle
    status              = CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    phone_number        = CharField(max_length=20, null=True)
    # Pour Mobile Money
    refund_amount       = DecimalField(max_digits=10, decimal_places=2, null=True)
    refund_date         = DateTimeField(null=True)
    refund_reason       = TextField(null=True)
    paid_at             = DateTimeField(null=True)
    created_at          = DateTimeField(auto_now_add=True)
    updated_at          = DateTimeField(auto_now=True)
```

#### 8.1.7 Review (Avis)

```python
class Review(Model):
    id         = UUIDField(primary_key=True)
    booking    = OneToOneField(Booking, on_delete=CASCADE, related_name='review')
    company    = ForeignKey(Company, on_delete=CASCADE, related_name='reviews')
    passenger  = ForeignKey(User, on_delete=CASCADE, related_name='reviews')
    rating     = IntegerField()  # 1 à 5 étoiles
    comment    = TextField(null=True, max_length=500)
    is_visible = BooleanField(default=True)
    created_at = DateTimeField(auto_now_add=True)
    updated_at = DateTimeField(auto_now=True)
```

#### 8.1.8 Notification

```python
class Notification(Model):
    TYPES = [
        ('booking_confirmed', 'Réservation confirmée'),
        ('booking_cancelled', 'Réservation annulée'),
        ('trip_reminder', 'Rappel de voyage'),
        ('payment_success', 'Paiement réussi'),
        ('payment_failed', 'Paiement échoué'),
        ('refund_processed', 'Remboursement traité'),
        ('trip_cancelled', 'Trajet annulé'),
        ('trip_delayed', 'Trajet retardé'),
    ]
    id          = UUIDField(primary_key=True)
    user        = ForeignKey(User, on_delete=CASCADE, related_name='notifications')
    type        = CharField(max_length=50, choices=TYPES)
    title       = CharField(max_length=200)
    message     = TextField()
    data        = JSONField(null=True)
    # Données supplémentaires (booking_id, trip_id, etc.)
    is_read     = BooleanField(default=False)
    sent_via    = JSONField(default=list)
    # Ex: ["push", "sms", "email"]
    created_at  = DateTimeField(auto_now_add=True)
```

#### 8.1.9 ScheduledTrip (Trajet Programmé)

```python
class ScheduledTrip(Model):
    FREQUENCY_CHOICES = [
        ('daily', 'Quotidien'),
        ('weekdays', 'Jours ouvrés'),
        ('weekends', 'Week-ends'),
        ('weekly', 'Hebdomadaire'),
        ('custom', 'Personnalisé'),
    ]
    id              = UUIDField(primary_key=True)
    company         = ForeignKey(Company, on_delete=CASCADE)
    departure_city  = ForeignKey(City, on_delete=PROTECT, related_name='scheduled_departures')
    arrival_city    = ForeignKey(City, on_delete=PROTECT, related_name='scheduled_arrivals')
    departure_time  = TimeField()
    # Heure de départ récurrente
    duration_hours  = DecimalField(max_digits=4, decimal_places=2)
    price           = DecimalField(max_digits=10, decimal_places=2)
    total_seats     = IntegerField()
    bus_type        = CharField(max_length=20)
    frequency       = CharField(max_length=20, choices=FREQUENCY_CHOICES)
    days_of_week    = JSONField(default=list)
    # Ex: [0, 1, 2, 3, 4] pour lundi-vendredi
    valid_from      = DateField()
    valid_until     = DateField(null=True)
    is_active       = BooleanField(default=True)
    created_at      = DateTimeField(auto_now_add=True)
```

---

## 9. API REST — ENDPOINTS

### 9.1 Base URL

```
Production : https://api.evexticket.com/api/v1/
Staging    : https://staging-api.evexticket.com/api/v1/
```

### 9.2 Authentification

Tous les endpoints protégés requièrent un header :
```
Authorization: Bearer <access_token>
```

### 9.3 Endpoints d'authentification

| Méthode | Endpoint | Description | Auth |
|---------|----------|-------------|------|
| POST | `/auth/register/` | Inscription voyageur | Non |
| POST | `/auth/login/` | Connexion (email+mdp) | Non |
| POST | `/auth/token/refresh/` | Renouvellement JWT | Non |
| POST | `/auth/logout/` | Déconnexion | Oui |
| POST | `/auth/otp/send/` | Envoi OTP SMS | Non |
| POST | `/auth/otp/verify/` | Vérification OTP | Non |
| POST | `/auth/password/reset/` | Réinitialisation mdp | Non |
| GET/PUT | `/auth/profile/` | Profil utilisateur | Oui |
| POST | `/auth/company/register/` | Inscription compagnie | Non |

### 9.4 Endpoints Villes

| Méthode | Endpoint | Description | Auth |
|---------|----------|-------------|------|
| GET | `/cities/` | Liste toutes les villes actives | Non |
| GET | `/cities/{id}/` | Détail d'une ville | Non |
| POST | `/cities/` | Créer une ville | Admin |
| PUT | `/cities/{id}/` | Modifier une ville | Admin |
| DELETE | `/cities/{id}/` | Désactiver une ville | Admin |

### 9.5 Endpoints Compagnies

| Méthode | Endpoint | Description | Auth |
|---------|----------|-------------|------|
| GET | `/companies/` | Liste des compagnies actives | Non |
| GET | `/companies/{id}/` | Détail compagnie + avis | Non |
| POST | `/companies/` | Créer une compagnie | Admin |
| PUT | `/companies/{id}/` | Modifier compagnie | Company Admin |
| GET | `/companies/{id}/stats/` | Statistiques compagnie | Company Admin |
| GET | `/companies/{id}/reviews/` | Avis de la compagnie | Non |
| POST | `/companies/{id}/logo/` | Upload logo | Company Admin |
| GET | `/companies/dashboard/` | Tableau de bord compagnie | Company Admin |

### 9.6 Endpoints Trajets

| Méthode | Endpoint | Description | Auth |
|---------|----------|-------------|------|
| GET | `/trips/` | Recherche de trajets | Non |
| GET | `/trips/{id}/` | Détail d'un trajet | Non |
| POST | `/trips/` | Créer un trajet | Company Admin |
| PUT | `/trips/{id}/` | Modifier un trajet | Company Admin |
| DELETE | `/trips/{id}/` | Annuler un trajet | Company Admin |
| GET | `/trips/{id}/seats/` | Plan des sièges | Non |
| POST | `/scheduled-trips/` | Créer trajet programmé | Company Admin |
| GET | `/scheduled-trips/` | Lister trajets programmés | Company Admin |

**Paramètres de recherche GET `/trips/` :**
```
departure_city  : ID ou nom de la ville de départ
arrival_city    : ID ou nom de la ville d'arrivée
date            : Date au format YYYY-MM-DD
passengers      : Nombre de passagers (int, défaut: 1)
bus_type        : standard | premium | vip | luxury
min_price       : Prix minimum (XOF)
max_price       : Prix maximum (XOF)
sort_by         : price_asc | price_desc | departure_time | rating
```

### 9.7 Endpoints Réservations

| Méthode | Endpoint | Description | Auth |
|---------|----------|-------------|------|
| GET | `/bookings/` | Mes réservations | Voyageur |
| POST | `/bookings/` | Créer une réservation | Voyageur |
| GET | `/bookings/{id}/` | Détail réservation | Voyageur/Admin |
| POST | `/bookings/{id}/cancel/` | Annuler réservation | Voyageur |
| GET | `/bookings/{id}/ticket/` | Télécharger billet PDF | Voyageur |
| POST | `/bookings/{id}/checkin/` | Check-in QR Code | Company Admin |
| GET | `/admin/bookings/` | Toutes les réservations | Admin |
| GET | `/companies/{id}/bookings/` | Réservations compagnie | Company Admin |

### 9.8 Endpoints Paiements

| Méthode | Endpoint | Description | Auth |
|---------|----------|-------------|------|
| POST | `/payments/initiate/` | Initier un paiement | Voyageur |
| POST | `/payments/flooz/callback/` | Webhook Flooz | Système |
| POST | `/payments/tmoney/callback/` | Webhook T-Money | Système |
| POST | `/payments/card/callback/` | Webhook carte | Système |
| GET | `/payments/{id}/status/` | Statut paiement | Voyageur |
| POST | `/payments/{id}/refund/` | Initier remboursement | Admin |
| GET | `/admin/payments/` | Tous les paiements | Admin |

### 9.9 Endpoints Dashboard Stats

| Méthode | Endpoint | Description | Auth |
|---------|----------|-------------|------|
| GET | `/stats/overview/` | Stats globales plateforme | Admin |
| GET | `/stats/revenue/` | Rapport revenus | Admin |
| GET | `/stats/bookings/` | Stats réservations | Admin |
| GET | `/stats/companies/` | Classement compagnies | Admin |
| GET | `/companies/{id}/stats/daily/` | Stats journalières | Company Admin |
| GET | `/companies/{id}/stats/monthly/` | Stats mensuelles | Company Admin |

---

## 10. SÉCURITÉ ET CONTRAINTES TECHNIQUES

### 10.1 Sécurité applicative

**Authentification :**
- JWT avec access token (durée : 15 min) + refresh token (durée : 7 jours)
- Rotation automatique des refresh tokens
- Stockage sécurisé des tokens (HttpOnly cookies côté web, Secure Storage côté mobile)
- Limite de tentatives de connexion : 5 essais, blocage 30 min

**Autorisation :**
- RBAC (Role-Based Access Control) : 3 rôles (passenger, company_admin, admin)
- Vérification des permissions à chaque endpoint
- Isolation des données : une compagnie ne peut accéder qu'à ses propres données

**Communication :**
- HTTPS obligatoire (TLS 1.3 minimum)
- HSTS activé
- Certificats SSL renouvelés automatiquement

**Protection contre les attaques courantes :**
- Protection CSRF (Django CSRF middleware)
- Prévention injection SQL (Django ORM paramétré)
- Validation et sanitisation de toutes les entrées utilisateur
- Rate limiting sur les endpoints critiques (100 req/min par IP)
- Protection DDoS via Cloudflare

**Paiements :**
- Validation double côté serveur de tous les paiements
- Callbacks signés avec secret partagé (HMAC-SHA256)
- Journalisation complète des transactions

### 10.2 Contraintes de performance

| Indicateur | Cible |
|-----------|-------|
| Temps de réponse API (p95) | < 500 ms |
| Disponibilité (uptime) | 99.5% minimum |
| Temps de chargement page web (3G) | < 4 secondes |
| Concurrent users supportés | 500+ simultanément |
| Délai confirmation paiement | < 30 secondes |

### 10.3 Contraintes réglementaires

- Conformité avec la **Loi n°2019-014** sur la protection des données personnelles au Togo
- Respect des réglementations BCEAO sur la monnaie électronique
- Certification PCI-DSS pour les paiements par carte bancaire
- Archivage des données de transaction pendant **10 ans** (obligations fiscales togolaises)

### 10.4 Accessibilité et inclusivité

- Interface disponible en français (langue officielle) et en langues locales (Éwé, Kabyè) — V2
- Interface responsive (mobile-first)
- Support des connexions bas débit (2G/3G)
- Mode offline basique pour consultation des billets

---

## 11. MODÈLE ÉCONOMIQUE

### 11.1 Sources de revenus

#### 11.1.1 Commission sur les réservations (principal)

Evexticket prélève une commission sur chaque réservation confirmée.

| Type de compagnie | Commission Evex (`evex_commission`) | Notes |
|-------------------|-------------------------------------|-------|
| Standard (défaut) | 8% | Applicable à toutes les nouvelles compagnies |
| Partenaire premium | 6% | Compagnies avec volume > 500 billets/mois |
| Partenaire stratégique | 5% | Compagnies avec volume > 2 000 billets/mois |
| Période de lancement | 4% | 3 premiers mois pour nouvelles compagnies |

**Calcul de la commission :**
```
Commission Evex = Prix du billet × evex_commission / 100
Revenu net compagnie = Prix du billet × (1 - evex_commission/100)
Prix facturé au voyageur = Prix du billet (la commission est prélevée sur le montant reçu)
```

**Exemple concret :**
```
Trajet Lomé → Kara : 5 000 XOF
Commission Evex (8%) : 400 XOF
Revenu net compagnie : 4 600 XOF
Evexticket perçoit : 400 XOF par billet
```

#### 11.1.2 Abonnements compagnie (secondaire — V2)

| Offre | Prix mensuel | Inclus |
|-------|-------------|--------|
| Starter | Gratuit | Commission 8%, 1 ligne, 50 billets/mois |
| Business | 25 000 XOF/mois | Commission 7%, 5 lignes, illimité |
| Enterprise | 75 000 XOF/mois | Commission 6%, illimité, API, support dédié |

#### 11.1.3 Services à valeur ajoutée (V3)

- Publicité ciblée dans l'application
- Assurance voyage intégrée au billet
- Transferts aéroport premium

### 11.2 Modèle de paiement des compagnies

1. Le voyageur paie le billet complet sur la plateforme
2. Evexticket reçoit la totalité du paiement
3. Chaque semaine, Evexticket vire aux compagnies : Total réservations confirmées - Commission Evex
4. Rapport financier détaillé envoyé par email

---

## 12. PLANNING ET LIVRABLES

### 12.1 Phases du projet

| Phase | Durée | Période | Livrables |
|-------|-------|---------|-----------|
| Phase 0 — Initialisation | 2 semaines | Mois 1 | Cahier des charges, architecture, setup env |
| Phase 1 — Backend Core | 6 semaines | Mois 1-2 | API Auth, Companies, Cities, Trips |
| Phase 2 — Booking & Payment | 4 semaines | Mois 2-3 | API Bookings, intégration Mobile Money |
| Phase 3 — Frontend Web | 6 semaines | Mois 2-4 | Application web complète |
| Phase 4 — Mobile App | 6 semaines | Mois 3-5 | App React Native iOS + Android |
| Phase 5 — Tests & QA | 3 semaines | Mois 5-6 | Tests unitaires, intégration, UAT |
| Phase 6 — Déploiement | 2 semaines | Mois 6 | Mise en production, monitoring |
| Phase 7 — Onboarding | Continue | Mois 6+ | Intégration compagnies partenaires |

### 12.2 Jalons clés

| Jalon | Date cible | Critère de succès |
|-------|-----------|------------------|
| MVP Backend | M+3 | API fonctionnelles, tests passés à 90% |
| Beta Web | M+4 | Interface complète, utilisable par 10 bêta-testeurs |
| Beta Mobile | M+5 | App disponible en test interne |
| Lancement public | M+6 | 5 compagnies intégrées, paiements actifs |
| Objectif 500 réservations/mois | M+9 | — |

---

## 13. CRITÈRES D'ACCEPTATION

### 13.1 Critères fonctionnels

| ID | Critère | Priorité |
|----|---------|---------|
| CA-001 | Un voyageur peut créer un compte en moins de 3 minutes | Critique |
| CA-002 | Recherche de trajets retourne des résultats en < 2 secondes | Critique |
| CA-003 | Paiement Mobile Money complété en < 60 secondes | Critique |
| CA-004 | Billet QR Code généré et accessible sans connexion internet | Critique |
| CA-005 | Une compagnie peut créer un trajet en < 5 minutes | Haute |
| CA-006 | Dashboard compagnie affiche les stats du jour en temps réel | Haute |
| CA-007 | Notifications SMS envoyées en < 30 secondes après booking | Haute |
| CA-008 | Annulation et remboursement traités en < 24h | Haute |
| CA-009 | QR Code scannable pour validation embarquement | Critique |
| CA-010 | Commission Evex calculée et affichée correctement | Critique |

### 13.2 Critères techniques

| ID | Critère | Seuil |
|----|---------|-------|
| CT-001 | Couverture de tests unitaires | > 80% |
| CT-002 | Temps de réponse API | p95 < 500 ms |
| CT-003 | Disponibilité de la plateforme | > 99.5% |
| CT-004 | Score Lighthouse Performance | > 80/100 |
| CT-005 | Absence de vulnérabilités critiques (OWASP Top 10) | 0 critique |

---

## 14. ANNEXES

### Annexe A — Glossaire

| Terme | Définition |
|-------|-----------|
| XOF | Franc CFA Ouest-Africain (devise officielle du Togo) |
| Mobile Money | Paiement par téléphone mobile (Flooz/T-Money) |
| OTP | One-Time Password — Code à usage unique envoyé par SMS |
| QR Code | Quick Response Code — Code-barres 2D pour la validation des billets |
| evex_commission | Taux de commission Evexticket en % prélevé sur chaque billet |
| Dashboard | Tableau de bord de gestion |
| JWT | JSON Web Token — Standard d'authentification stateless |
| SaaS | Software as a Service — Logiciel en tant que service |

### Annexe B — Contacts projet

| Rôle | Contact | Email |
|------|---------|-------|
| Chef de projet | À définir | projet@evexticket.com |
| Lead développeur | À définir | tech@evexticket.com |
| Responsable commercial | À définir | commercial@evexticket.com |
| Support technique | — | support@evexticket.com |

---

*Document soumis à révision trimestrielle. Version contrôlée par l'équipe Evexticket.*  
*© 2025 Evexticket SARL — Tous droits réservés*
