# PLAN D'AFFAIRES
## Evexticket — Plateforme de Réservation de Billets de Bus au Togo

---

**Version :** 1.0 — Document confidentiel  
**Date :** Juin 2025  
**Auteurs :** Équipe fondatrice Evexticket  
**Destinataires :** Investisseurs, partenaires financiers, direction générale

---

> *"Nous construisons le futur de la mobilité togolaise — une réservation à la fois."*  
> — Équipe Evexticket

---

## RÉSUMÉ EXÉCUTIF

**Evexticket** est une startup togolaise qui développe et opère la première plateforme numérique de réservation de billets de bus interurbains au Togo. La plateforme permet aux voyageurs de rechercher, comparer, réserver et payer leurs billets de bus en ligne via web ou application mobile, tandis que les compagnies de transport bénéficient d'outils professionnels de gestion de leur activité.

### Le problème

Le transport routier interurbain au Togo — secteur vital pour plus de 8,5 millions d'habitants — fonctionne encore entièrement sur un modèle papier. Les voyageurs ne peuvent pas réserver à l'avance, les compagnies perdent des revenus par manque de visibilité et de numérique, et l'écosystème tout entier manque de données pour se développer.

### Notre solution

Evexticket digitalise l'ensemble de la chaîne : recherche → réservation → paiement Mobile Money → billet QR Code → embarquement. En 3 clics et moins de 2 minutes, un voyageur peut réserver son billet depuis son téléphone.

### Le marché

Le marché adressable total (TAM) du transport interurbain au Togo est estimé à **25 milliards XOF/an** (≈ 38 millions EUR). Notre marché cible initial (SAM) — les trajets entre les 10 principales villes — représente **10 milliards XOF/an**. Notre objectif à 3 ans : capturer 5% de ce marché, soit **500 millions XOF de volume de transactions**.

### Le modèle économique

Evexticket prélève une **commission de 8%** (dégressif selon le volume) sur chaque billet vendu. Ce modèle est éprouvé à l'international (Busbud, FlixBus, OuiBus) et adapté au contexte africain.

### Les chiffres clés projetés

| Indicateur | Année 1 | Année 2 | Année 3 |
|-----------|---------|---------|---------|
| Billets vendus | 18 000 | 72 000 | 180 000 |
| Volume de transactions (XOF) | 90 000 000 | 360 000 000 | 900 000 000 |
| Revenus Evexticket (XOF) | 7 200 000 | 28 800 000 | 72 000 000 |
| Compagnies partenaires | 10 | 25 | 50 |
| Villes couvertes | 10 | 10 + régional | 20+ |
| Équipe | 5 | 12 | 25 |

### Le besoin en financement

Evexticket recherche **[MONTANT] XOF / [MONTANT] EUR** pour financer :
- Le développement technologique complet (web + mobile)
- Les opérations des 18 premiers mois
- L'acquisition des premières compagnies partenaires
- Le marketing et l'acquisition clients

### Retour sur investissement

Objectif d'atteinte du seuil de rentabilité (**break-even**) : **Mois 18**  
Projection de rentabilité opérationnelle : **Année 2**

---

## 1. DESCRIPTION DE L'ENTREPRISE

### 1.1 Identité

| Propriété | Valeur |
|-----------|--------|
| Dénomination sociale | Evexticket SARL |
| Nom commercial | Evexticket / TogoTrans |
| Forme juridique | SARL (Société à Responsabilité Limitée) |
| Pays d'incorporation | République du Togo |
| Siège social | Lomé, Togo |
| Site web | www.evexticket.com |
| Application | iOS + Android |
| Secteur | Transport, EdTech, Fintech |
| Fondée en | 2024 |

### 1.2 Vision et mission

**Vision :** Devenir la référence numérique du transport routier en Afrique de l'Ouest francophone.

**Mission :** Simplifier l'accès au transport interurbain pour tous les Togolais en dématérialisant la billetterie, en rendant le transport plus sûr, plus transparent et plus accessible.

### 1.3 Valeurs

| Valeur | Description |
|--------|-------------|
| **Accessibilité** | Un service pour tous, en commençant par les plus petites villes |
| **Fiabilité** | Des billets qui fonctionnent, des paiements sécurisés |
| **Transparence** | Prix clairs, commissions affichées, aucun frais caché |
| **Innovation** | Technologies adaptées aux réalités africaines |
| **Partenariat** | Croissance commune avec les compagnies de transport |

### 1.4 Produits et services

**Produit principal — Plateforme Evexticket :**
- Application web (React/TypeScript)
- Application mobile iOS (React Native/Expo)
- Application mobile Android (React Native/Expo)
- Backend API (Django REST Framework)

**Services complémentaires :**
- Tableau de bord compagnie (SaaS)
- API d'intégration pour tiers
- Service de notifications (SMS, push, email)
- Génération de billets PDF avec QR Code

---

## 2. ANALYSE DU MARCHÉ

### 2.1 Contexte macroéconomique du Togo

| Indicateur | Valeur | Source |
|-----------|--------|--------|
| Population | 8,5 millions habitants | INSEED 2023 |
| PIB | 8,8 milliards USD | Banque Mondiale 2023 |
| Croissance PIB | 5,7%/an | FMI 2024 |
| Taux urbanisation | 43% (croissance 3,5%/an) | ONU Habitat 2023 |
| Pénétration mobile | 65% | ARCEP Togo 2024 |
| Utilisateurs Mobile Money | 3 millions+ | BCEAO 2024 |
| Classe moyenne émergente | 15-20% de la population | Banque Africaine de Développement |

### 2.2 Le secteur du transport au Togo

**Taille du secteur :**
- Transport routier = 3-4% du PIB togolais
- Plus de 200 compagnies de transport identifiées
- 15-20 grandes compagnies interurbaines dominantes
- Estimé à 25-30 millions de voyages interurbains/an

**Principaux axes :**

| Axe | Distance | Fréquence estimée | Prix moyen |
|-----|---------|-------------------|-----------|
| Lomé → Kara | 420 km | 20+ départs/jour | 5 000-7 000 XOF |
| Lomé → Kpalimé | 120 km | 15+ départs/jour | 2 000-3 000 XOF |
| Lomé → Atakpamé | 160 km | 10+ départs/jour | 2 500-3 500 XOF |
| Lomé → Sokodé | 340 km | 8+ départs/jour | 4 000-5 500 XOF |
| Lomé → Dapaong | 640 km | 5+ départs/jour | 8 000-12 000 XOF |

**Problèmes structurels du secteur :**
1. Zéro numérisation (billetterie 100% papier)
2. Surréservation et fraude aux billets
3. Opacité tarifaire
4. Aucune donnée sur les flux de voyageurs
5. Manque de concurrence sur certains axes

### 2.3 Analyse TAM / SAM / SOM

```
TAM — Marché Total Adressable
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Tous les billets de bus interurbains
vendus au Togo chaque année

TAM = ~25 milliards XOF/an (~38 M EUR)
(hypothèse : 25M voyages × prix moyen 1 000 XOF)

        ┌────────────────────────────────┐
        │              TAM               │
        │         25 Mds XOF/an          │
        │  ┌──────────────────────────┐  │
        │  │          SAM             │  │
        │  │    10 Mds XOF/an         │  │
        │  │  ┌────────────────────┐  │  │
        │  │  │       SOM          │  │  │
        │  │  │  500 M XOF/an      │  │  │
        │  │  │    (Année 3)       │  │  │
        │  │  └────────────────────┘  │  │
        │  └──────────────────────────┘  │
        └────────────────────────────────┘
```

**SAM — Marché Adressable Serviceable**  
= Voyages entre les 10 villes couvertes + voyageurs connectés (mobile)  
= ~10 milliards XOF/an  
Hypothèse : 40% du TAM correspond aux axes principaux couverts

**SOM — Marché Obtenu Serviceable**  
= Objectif de pénétration Année 3 : 5% du SAM  
= 500 millions XOF de volume de transactions  
= 72 millions XOF de revenus Evexticket (à 8% de commission moyenne)

### 2.4 Tendances favorables

**Tendance 1 — Boom du Mobile Money**  
La croissance des utilisateurs Mobile Money au Togo est de +25%/an. D'ici 2027, on peut anticiper 5+ millions d'utilisateurs. Le Mobile Money est désormais le mode de paiement préféré pour les achats en ligne.

**Tendance 2 — Alphabétisation numérique croissante**  
Les jeunes Togolais (60% de la population a moins de 30 ans) sont natifs du numérique. La demande de services digitaux dans tous les secteurs est en forte hausse.

**Tendance 3 — Croissance de la classe moyenne**  
La classe moyenne togolaise croît de 3-4%/an. Ces consommateurs demandent des services plus formels et fiables, prêts à payer pour la commodité.

**Tendance 4 — Soutien gouvernemental à la digitalisation**  
Le gouvernement togolais a lancé la **Stratégie Nationale de Développement Numérique 2025-2030**, encourageant activement la digitalisation de tous les secteurs économiques.

### 2.5 Analyse concurrentielle

| Concurrent | Type | Forces | Faiblesses | Menace pour Evexticket |
|-----------|------|--------|------------|----------------------|
| Vente directe en gare | Traditionnel | Zéro frais, habitudes | Pas numérique | Faible (remplacé par numérique) |
| Gros systèmes de billetterie internationaux | Logiciel | Robustesse | Coût élevé, inadaptés au Togo | Faible (inadaptés localement) |
| Startups régionales (Ghana, Bénin) | Numérique | Expérience marché | Pas encore au Togo | Moyenne (risque d'expansion) |
| Applications génériques (WhatsApp groups) | Informel | Largement utilisé | Aucune sécurité | Faible (inconfort pour les clients) |

**Avantages concurrentiels d'Evexticket :**
1. **Premier arrivé** sur le marché togolais : avantage du pionnier
2. **Intégration native** avec Flooz et T-Money (Mobile Money local)
3. **Équipe locale** : compréhension des réalités du marché
4. **Coût nul** pour les compagnies (uniquement commission sur ventes)
5. **Interface simplifiée** adaptée à tous niveaux d'alphabétisation numérique

---

## 3. MODÈLE ÉCONOMIQUE DÉTAILLÉ

### 3.1 Sources de revenus

#### Source 1 — Commissions sur réservations (80% des revenus)

Le modèle principal est une commission sur chaque billet vendu via la plateforme.

**Fonctionnement :**
```
Prix billet → Voyageur paie
Commission Evex (evex_commission %) prélevée
Revenu net → Compagnie reçoit
```

**Barème de commission :**

| Volume mensuel / compagnie | Commission | Justification |
|---------------------------|-----------|--------------|
| 0-499 billets/mois | 8% | Taux standard |
| 500-1999 billets/mois | 7% | Fidélisation compagnies moyennes |
| 2000-4999 billets/mois | 6% | Incitation au volume |
| 5000+ billets/mois | 5% | Grands comptes |
| 3 premiers mois (offre lancement) | 4% | Acquisition compagnies |

**Simulation de revenu commission — scénario Année 1 :**
```
10 compagnies × 150 billets/mois × 12 mois = 18 000 billets
Prix moyen = 5 000 XOF
Volume total = 90 000 000 XOF
Commission Evex (8%) = 7 200 000 XOF
```

#### Source 2 — Abonnements Premium Compagnie (15% des revenus — Année 2+)

À partir de l'Année 2, introduction d'abonnements optionnels pour les compagnies souhaitant des fonctionnalités avancées :

| Plan | Prix/mois | Commission incluse | Fonctionnalités |
|------|-----------|-------------------|-----------------|
| **Gratuit** | 0 XOF | 8% | Fonctionnalités de base |
| **Business** | 25 000 XOF | 7% | Analytics avancés, priorité support |
| **Enterprise** | 75 000 XOF | 6% | API, compte manager dédié, multi-utilisateurs |

#### Source 3 — Services à valeur ajoutée (5% des revenus — Année 3+)

- **Assurance voyage** intégrée : 500-1 000 XOF par billet, commissionné à 20%
- **Publicité ciblée** : annonces pour hôtels, restaurants, services dans les villes de destination
- **Data insights** : rapports sectoriels anonymisés vendus aux acteurs institutionnels

### 3.2 Structure des coûts

**Coûts variables (proportionnels au volume) :**

| Poste | Coût unitaire | Note |
|-------|-------------|------|
| SMS de confirmation | ~50 XOF/SMS | Africa's Talking |
| Email de confirmation | ~0.5 XOF/email | SendGrid |
| Frais passerelle paiement Mobile Money | 0.5-1% du montant | Moov/Togocel API |
| Frais passerelle carte bancaire | 2.5-3% du montant | Stripe |
| Stockage cloud (fichiers, PDFs) | Variable | AWS S3 |

**Coûts fixes (indépendants du volume) :**

| Poste | Montant mensuel | Note |
|-------|----------------|------|
| Salaires équipe (5 personnes an 1) | 2 500 000 XOF | Voir Section 9 |
| Hébergement serveurs | 150 000 XOF | AWS EC2 |
| Outils SaaS (email, monitoring, etc.) | 100 000 XOF | — |
| Bureaux Lomé | 200 000 XOF | Co-working ou location |
| Frais juridiques / comptables | 100 000 XOF | Comptable mensuel |
| Marketing digital | 500 000 XOF | Facebook, Google Ads |
| Déplacements et terrain | 200 000 XOF | Visites compagnies |
| **Total charges fixes mensuelles** | **3 750 000 XOF** | — |

---

## 4. STRATÉGIE COMMERCIALE ET MARKETING

### 4.1 Stratégie Go-to-Market

**Phase 1 — Acquisition compagnies (Mois 1-3)**

L'acquisition des compagnies partenaires est la priorité absolue car sans offre (trajets), il n'y a pas de demande (voyageurs). Objectif : **10 compagnies** avant le lancement public.

Actions :
- Visites terrain dans les gares routières de Lomé
- Présentation de la plateforme aux associations de transporteurs
- Offre de lancement irrésistible (commission 4% pendant 3 mois)
- Témoignages et études de cas des early adopters

**Phase 2 — Acquisition voyageurs (Mois 3-6)**

Une fois l'offre constituée, activation des canaux d'acquisition grand public :
- Campagnes SMS ciblées (base de données achetées légalement)
- Publicité Facebook et Instagram (très populaires au Togo)
- Partenariats avec des influenceurs locaux
- Bouche-à-oreille (programme de parrainage)

**Phase 3 — Croissance et fidélisation (Mois 6+)**

- Programme de fidélité (points cumulables)
- Notifications proactives (offres spéciales, nouveaux trajets)
- Amélioration continue du produit basée sur les retours
- Extension à de nouvelles compagnies et lignes

### 4.2 Canaux d'acquisition — Voyageurs

| Canal | Coût estimé | ROI estimé | Priorité |
|-------|------------|-----------|---------|
| Facebook/Instagram Ads | 200 000 XOF/mois | 3-5x | Haute |
| SMS marketing | 100 000 XOF/mois | 2-4x | Haute |
| Parrainage (referral) | 500 XOF/parrainage | 5-8x | Haute |
| Influenceurs locaux | 100 000 XOF/campagne | Variable | Moyenne |
| Relations presse / médias | 50 000 XOF/mois | Difficile à mesurer | Moyenne |
| Google Ads | 100 000 XOF/mois | 2-3x | Basse |
| Bouche-à-oreille organique | 0 XOF | Infini | Critique |

### 4.3 Acquisition compagnies

**Stratégie d'approche :**
1. Identifier les compagnies cibles (liste établie via enquête terrain)
2. Primo-contact par téléphone/WhatsApp pour présentation rapide
3. RDV de démonstration (présentiel ou vidéo)
4. Envoi de la proposition commerciale + convention
5. Signature et onboarding

**Profil des compagnies cibles prioritaires :**
- Compagnies opérant les axes Lomé-Kara et Lomé-Kpalimé (forts volumes)
- Compagnies ayant déjà tenté une numérisation (signe d'ouverture)
- Compagnies avec 5+ bus (potentiel de volume)

### 4.4 Positionnement

**Pour les voyageurs :**  
*"Réservez votre billet de bus en 2 minutes, payez avec Flooz ou T-Money, et voyagez l'esprit tranquille avec votre billet QR Code."*

**Pour les compagnies :**  
*"Plus de sièges vides, moins de temps perdu sur les listes papier, et des revenus qui arrivent directement sur votre téléphone chaque semaine."*

---

## 5. PLAN OPÉRATIONNEL

### 5.1 Roadmap produit

**Phase 1 — MVP (Mois 1-6) :**
- ✅ Backend API complet (Django REST)
- ✅ Application web (React/TypeScript)
- ✅ Application mobile Android (React Native)
- ✅ Intégration Flooz + T-Money
- ✅ Génération billets QR Code
- ✅ Dashboard compagnie basique

**Phase 2 — Consolidation (Mois 6-12) :**
- Application iOS (App Store)
- Fonctionnalités avancées dashboard compagnie
- Système d'avis et notation
- Programme de fidélité voyageurs
- API publique pour intégrations tierces

**Phase 3 — Scale (Mois 12-24) :**
- Extension régionale (lignes frontalières)
- Intégration assurance voyage
- Module publicité in-app
- Multilinguisme (Éwé, Kabyè)
- Prédiction de demande (IA)

### 5.2 Processus opérationnels clés

**Onboarding d'une nouvelle compagnie :**
```
Contact initial → Démo → Documents → Vérification (48h)
→ Formation (2h) → Configuration trajets → Go-live
Durée totale : 7-14 jours
```

**Traitement d'une réservation :**
```
Recherche → Sélection → Paiement → Confirmation
→ Génération billet → SMS/Email → QR Code activé
Durée : < 2 minutes
```

**Cycle de paiement aux compagnies :**
```
Lundi → Calcul revenus nets semaine S-1
→ Déduction commission → Virement Mobile Money/Banque
→ Envoi relevé par email
Durée : < 24h après lundi matin
```

### 5.3 Partenariats opérationnels

| Partenaire | Type | Rôle |
|-----------|------|------|
| Moov Africa (Flooz) | Paiement | Intégration API Mobile Money |
| Togocel (T-Money) | Paiement | Intégration API Mobile Money |
| Africa's Talking | SMS | Envoi notifications SMS |
| SendGrid | Email | Transactionnel et marketing |
| Firebase | Push notifications | Notifications mobile |
| AWS | Infrastructure | Hébergement cloud |
| Stripe | Paiement carte | Cartes Visa/Mastercard |

---

## 6. PROJECTIONS FINANCIÈRES SUR 3 ANS

### 6.1 Hypothèses clés

| Hypothèse | Valeur | Justification |
|----------|--------|--------------|
| Prix moyen billet | 5 000 XOF | Moyenne pondérée des trajets |
| Commission moyenne | 8% → 7% (an 3) | Dégressif selon volume |
| Croissance mensuelle billets | +15% (mois 1-6), +10% (mois 7-12) | Estimé conservateur |
| Taux de conversion visite → réservation | 3% (an 1), 5% (an 2+) | Benchmark marché |
| Coût acquisition voyageur | 2 500 XOF/voyageur | Estimé campagnes Togo |
| Taux de réservation récurrente | 60% après 1er achat | Fidélisation |
| Annulations nettes | 8% des réservations | Standard sectoriel |

### 6.2 Projections de revenus — Tableau détaillé

#### Année 1 (Mois 1-12)

| Trimestre | Compagnies | Billets/mois | Rev. mensuel (XOF) | Comm. Evex (XOF) |
|-----------|-----------|-------------|-------------------|-----------------|
| T1 (M1-M3) | 5 | 300 | 1 500 000 | 120 000 |
| T2 (M4-M6) | 8 | 600 | 3 000 000 | 240 000 |
| T3 (M7-M9) | 10 | 1 200 | 6 000 000 | 480 000 |
| T4 (M10-M12) | 12 | 2 000 | 10 000 000 | 800 000 |
| **Total An 1** | **12** | **4 100 moy** | **20 500 000 moy** | **1 640 000 moy** |
| **Revenus annuels** | — | **18 000** | **90 000 000** | **7 200 000** |

#### Année 2 (Mois 13-24)

| Trimestre | Compagnies | Billets/mois | Rev. mensuel (XOF) | Comm. Evex (XOF) |
|-----------|-----------|-------------|-------------------|-----------------|
| T5 (M13-M15) | 18 | 4 500 | 22 500 000 | 1 575 000 |
| T6 (M16-M18) | 22 | 6 500 | 32 500 000 | 2 275 000 |
| T7 (M19-M21) | 25 | 8 500 | 42 500 000 | 2 975 000 |
| T8 (M22-M24) | 28 | 10 500 | 52 500 000 | 3 675 000 |
| **Revenus annuels** | — | **72 000** | **360 000 000** | **25 200 000** |

*Note : Commission moyenne An 2 = 7% (plusieurs compagnies à haut volume)*

#### Année 3 (Mois 25-36)

| Trimestre | Compagnies | Billets/mois | Rev. mensuel (XOF) | Comm. Evex (XOF) |
|-----------|-----------|-------------|-------------------|-----------------|
| T9 (M25-M27) | 35 | 12 000 | 60 000 000 | 3 600 000 |
| T10 (M28-M30) | 40 | 15 000 | 75 000 000 | 4 500 000 |
| T11 (M31-M33) | 45 | 17 000 | 85 000 000 | 5 100 000 |
| T12 (M34-M36) | 50 | 20 000 | 100 000 000 | 6 000 000 |
| **Revenus annuels** | — | **180 000** | **900 000 000** | **57 600 000** |

*Note : Commission moyenne An 3 = 6.4% (mix compagnies)*

### 6.3 Compte de résultat prévisionnel

| Ligne | Année 1 | Année 2 | Année 3 |
|-------|---------|---------|---------|
| **REVENUS** | | | |
| Commissions (billets) | 7 200 000 | 25 200 000 | 57 600 000 |
| Abonnements compagnies | 0 | 1 800 000 | 6 000 000 |
| Services à valeur ajoutée | 0 | 0 | 3 000 000 |
| **Total Revenus** | **7 200 000** | **27 000 000** | **66 600 000** |
| | | | |
| **CHARGES** | | | |
| Masse salariale | 30 000 000 | 60 000 000 | 108 000 000 |
| Infrastructure tech | 1 800 000 | 3 000 000 | 5 400 000 |
| Marketing & acquisition | 6 000 000 | 12 000 000 | 18 000 000 |
| Frais passerelles paiement | 900 000 | 3 600 000 | 9 000 000 |
| Frais SMS/email/notifications | 360 000 | 1 080 000 | 2 700 000 |
| Loyer & bureaux | 2 400 000 | 3 600 000 | 6 000 000 |
| Frais juridiques & admin | 1 200 000 | 1 800 000 | 2 400 000 |
| Autres frais opérationnels | 1 200 000 | 2 400 000 | 4 800 000 |
| **Total Charges** | **43 860 000** | **87 480 000** | **156 300 000** |
| | | | |
| **Résultat d'exploitation** | **-36 660 000** | **-60 480 000** | **-89 700 000** |
| | | | |

*Note : Les projections ci-dessus supposent un financement externe couvrant les pertes initiales. L'objectif est d'atteindre le break-even à la fin de l'Année 2 avec une levée de fonds adéquate, ou en fin d'Année 3 en mode bootstrapped.*

**Hypothèse de levée de fonds :**  
Avec un financement de 50 000 000 XOF (~75 000 EUR) couvrant 18 mois :
- Break-even opérationnel : **Mois 24**
- Rentabilité nette : **Mois 30-36**

### 6.4 Besoins en financement

| Poste d'utilisation | Montant (XOF) | % |
|--------------------|--------------|---|
| Développement technique (web + mobile) | 15 000 000 | 30% |
| Salaires équipe fondatrice (18 mois) | 18 000 000 | 36% |
| Marketing et acquisition (12 mois) | 10 000 000 | 20% |
| Infrastructure et outils | 3 000 000 | 6% |
| Frais légaux et administratifs | 2 000 000 | 4% |
| Fonds de roulement (imprévus) | 2 000 000 | 4% |
| **Total** | **50 000 000 XOF** | **100%** |

### 6.5 Indicateurs financiers clés

| KPI | Année 1 | Année 2 | Année 3 |
|-----|---------|---------|---------|
| Revenue per Billet (RPB) | 400 XOF | 375 XOF | 320 XOF |
| Customer Acquisition Cost (voyageur) | 2 500 XOF | 1 800 XOF | 1 200 XOF |
| Lifetime Value voyageur (LTV) | 12 000 XOF | 18 000 XOF | 24 000 XOF |
| LTV/CAC ratio | 4.8x | 10x | 20x |
| Churn compagnies (annuel) | 20% | 15% | 10% |

---

## 7. FACTEURS DE RISQUE ET MITIGATIONS

### 7.1 Matrice des risques

| Risque | Probabilité | Impact | Score | Mitigation |
|--------|------------|--------|-------|-----------|
| Adoption lente des compagnies | Haute | Haute | 🔴 Critique | Offre de lancement attractive, accompagnement terrain intensif |
| Problèmes techniques au lancement | Moyenne | Haute | 🔴 Critique | Tests approfondis, plan de contingence, équipe tech dédiée |
| Concurrent fort entrant | Moyenne | Haute | 🟠 Élevé | Avantage du premier arrivé, fidélisation compagnies par contrats |
| Résistance au changement | Haute | Moyenne | 🟠 Élevé | Formation, support, démonstration ROI concret |
| Problèmes de paiement Mobile Money | Faible | Haute | 🟡 Modéré | Partenariats officiels Moov/Togocel, fallback carte bancaire |
| Changement réglementaire | Faible | Haute | 🟡 Modéré | Veille réglementaire, relations institutionnelles |
| Fraude et sécurité | Faible | Haute | 🟡 Modéré | Systèmes de sécurité, monitoring temps réel |
| Pénuries d'internet mobile | Moyenne | Moyenne | 🟡 Modéré | Mode offline, optimisation application bas débit |
| Crise économique / pandémie | Très faible | Très haute | 🟡 Modéré | Diversification géographique, fonds de réserve |
| Départ d'un fondateur clé | Faible | Haute | 🟡 Modéré | Vesting schedule, documentation des processus |

### 7.2 Plans de contingence

**Scénario — Adoption compagnies plus lente que prévue :**
- Action : Réduire temporairement la commission à 3% pour accélérer l'acquisition
- Impact : Délai break-even de 3-6 mois supplémentaires

**Scénario — Problème technique majeur au lancement :**
- Action : Activation du plan de maintenance d'urgence, communication proactive
- Impact : Perte de revenus limitée à 1-2 semaines max

**Scénario — Entrée d'un concurrent bien financé :**
- Action : Renforcement des contrats d'exclusivité partielle, accélération des fonctionnalités différenciantes
- Impact : Pression sur les marges, nécessité d'accélérer la levée de fonds

---

## 8. ÉQUIPE ET ORGANISATION

### 8.1 Équipe fondatrice

| Poste | Profil requis | Responsabilités |
|-------|--------------|----------------|
| CEO / Directeur Général | Entrepreneur, vision stratégique, réseau transport Togo | Stratégie, levée de fonds, partenariats compagnies |
| CTO / Directeur Technique | Lead dev Full Stack (React, Django, React Native) | Architecture, développement, infrastructure |
| COO / Directeur Opérations | Expérience transport et opérations | Onboarding compagnies, support, opérations |
| CMO / Responsable Marketing | Digital marketing, connaissance marché togolais | Acquisition clients, communication, branding |
| CFO / Responsable Finance | Comptabilité, finance PME | Gestion financière, reporting, virements |

### 8.2 Plan de recrutement

| Période | Recrutements | Postes |
|---------|-------------|--------|
| Mois 1-6 | 2 | Développeur full-stack, Agent commercial terrain |
| Mois 6-12 | 3 | Développeur mobile, Chargé de clientèle, Community Manager |
| Mois 12-18 | 4 | Data analyst, Responsable support, 2 développeurs |
| Mois 18-24 | 6 | Expansion équipe toutes fonctions |
| **Total An 1** | **5 personnes** | |
| **Total An 2** | **12 personnes** | |
| **Total An 3** | **25 personnes** | |

### 8.3 Structure organisationnelle (Année 1)

```
          CEO
           │
    ┌──────┼──────────────┐
    │      │              │
   CTO    COO          CMO/CFO
    │      │              │
  Devs   Agents        Marketing
         terrain
```

### 8.4 Politique de rémunération et intéressement

Pour attirer et retenir les talents dans un marché compétitif, Evexticket propose :
- Salaires compétitifs (benchmark marché togolais + 15%)
- Participation aux bénéfices pour l'équipe fondatrice
- Stock options pour les recrutements clés (à partir de l'an 2)
- Formation continue et développement professionnel

---

## 9. CONCLUSION ET APPEL À L'INVESTISSEMENT

### 9.1 Pourquoi investir dans Evexticket ?

**1. Marché massif et non adressé**  
Le transport routier togolais — 25 milliards XOF/an — n'a aucun acteur numérique. Evexticket est la seule solution locale développée pour ce marché.

**2. Timing parfait**  
La pénétration mobile dépasse 65%, le Mobile Money compte 3+ millions d'utilisateurs, et la classe moyenne grandit. Le Togo est prêt pour cette disruption.

**3. Modèle éprouvé**  
Le modèle marketplace de billetterie bus a fait ses preuves mondialement (FlixBus, Busbud, Paytm Bus). Evexticket adapte ce modèle au contexte africain.

**4. Effet réseau**  
Plus de compagnies → plus de voyages → plus de voyageurs → plus de compagnies. Une fois lancé, l'effet réseau crée une barrière à l'entrée forte.

**5. Équipe locale**  
L'équipe Evexticket connaît intimement les réalités du marché togolais, les habitudes des transporteurs et des voyageurs. C'est un avantage décisif sur tout concurrent externe.

**6. Scalabilité régionale**  
Le modèle développé au Togo est réplicable au Bénin, Ghana, Sénégal, Côte d'Ivoire. Le potentiel d'expansion est immense.

### 9.2 Ce que nous offrons aux investisseurs

| Type d'investissement | Offre |
|----------------------|-------|
| Investissement en capital | Participation au capital d'Evexticket SARL |
| Prêt convertible | Taux préférentiel + option de conversion en capital |
| Subvention/Grant | Accepté pour financements institutionnels (BOAD, AFD, etc.) |

Conditions détaillées disponibles sur demande confidentielle.

### 9.3 Étapes suivantes

**Pour les investisseurs potentiels :**

1. **Rencontre initiale** — Présentation de 30 minutes avec l'équipe fondatrice
2. **Due diligence** — Accès au data room (financials, technique, légal)
3. **Term sheet** — Négociation des conditions d'investissement
4. **Closing** — Finalisation et transfert de fonds
5. **Lancement** — Coup d'envoi avec votre soutien

**Contact :**

📧 **investors@evexticket.com**  
📞 **+228 XX XX XX XX** (WhatsApp)  
🌐 **www.evexticket.com/investors**

---

### Message de clôture

Le Togo se numérise. Le transport se digitalise. Les habitudes de paiement changent. **Evexticket est au bon endroit, au bon moment, avec la bonne équipe.**

Nous invitons les investisseurs visionnaires à rejoindre cette aventure et à contribuer à construire l'infrastructure de mobilité numérique de demain pour le Togo et l'Afrique de l'Ouest.

**Ensemble, faisons d'Evexticket le premier licorne du transport en Afrique francophone.**

---

*Plan d'Affaires Evexticket — Version 1.0 — Juin 2025*  
*Document confidentiel — Ne pas diffuser sans autorisation préalable*  
*© 2025 Evexticket SARL — Tous droits réservés*  

*Avertissement : Les projections financières contenues dans ce document sont basées sur des hypothèses de marché et peuvent différer des résultats réels. Tout investissement comporte des risques, y compris la perte du capital investi.*
