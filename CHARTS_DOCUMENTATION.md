# Documentation des Graphiques - TogoTrans

## Vue d'ensemble

L'application TogoTrans intègre des graphiques interactifs pour visualiser les données importantes des dashboards administrateur et compagnie. Les graphiques sont créés avec la bibliothèque **Recharts** qui offre une excellente intégration avec React.

## Graphiques du Dashboard Administrateur

### 1. Évolution des revenus
- **Type** : Graphique en aires (Area Chart)
- **Données** : Revenus mensuels sur 12 mois
- **Couleur** : Bleu (#3B82F6)
- **Fonctionnalités** :
  - Affichage des revenus en millions de FCFA
  - Tooltip interactif avec formatage des devises
  - Légende explicative

### 2. Croissance des utilisateurs
- **Type** : Graphique linéaire (Line Chart)
- **Données** : Nouveaux utilisateurs et total cumulé
- **Couleurs** : 
  - Nouveaux utilisateurs : Vert (#10B981)
  - Total utilisateurs : Bleu (#3B82F6)
- **Fonctionnalités** :
  - Deux lignes superposées
  - Points de données visibles
  - Formatage des nombres

### 3. Performance des compagnies
- **Type** : Graphique en barres horizontales (Horizontal Bar Chart)
- **Données** : Revenus par compagnie
- **Couleurs** : Différentes couleurs pour chaque compagnie
- **Fonctionnalités** :
  - Affichage horizontal pour une meilleure lisibilité
  - Formatage des revenus en millions
  - Couleurs distinctes par compagnie

### 4. Statut des réservations
- **Type** : Graphique en secteurs (Pie Chart)
- **Données** : Pourcentage par statut (Confirmés, En attente, Annulés)
- **Couleurs** :
  - Confirmés : Vert (#10B981)
  - En attente : Jaune (#F59E0B)
  - Annulés : Rouge (#EF4444)
- **Fonctionnalités** :
  - Secteur interne pour un effet donut
  - Pourcentages affichés
  - Légende en bas

### 5. Réservations par mois
- **Type** : Graphique en barres verticales (Bar Chart)
- **Données** : Nombre de réservations mensuelles
- **Couleur** : Violet (#8B5CF6)
- **Fonctionnalités** :
  - Barres arrondies
  - Formatage des nombres
  - Tooltip interactif

## Graphiques du Dashboard Compagnie

### 1. Évolution des réservations
- **Type** : Graphique en aires double (Dual Area Chart)
- **Données** : Réservations et revenus mensuels
- **Couleurs** :
  - Réservations : Bleu (#3B82F6)
  - Revenus : Vert (#10B981)
- **Fonctionnalités** :
  - Deux axes Y (gauche pour réservations, droite pour revenus)
  - Formatage adapté pour chaque métrique
  - Transparence des aires

### 2. Performance des trajets
- **Type** : Graphique en barres horizontales
- **Données** : Nombre de réservations par trajet
- **Couleur** : Bleu (#3B82F6)
- **Fonctionnalités** :
  - Affichage des trajets les plus performants
  - Tooltip avec détails complets
  - Formatage des nombres

### 3. Statut des réservations
- **Type** : Graphique en secteurs (Pie Chart)
- **Données** : Répartition des statuts de réservations
- **Couleurs** : Identiques au dashboard admin
- **Fonctionnalités** :
  - Vue d'ensemble des statuts
  - Pourcentages clairs
  - Légende explicative

### 4. Performance par type de bus
- **Type** : Graphique en barres verticales
- **Données** : Réservations par type de bus
- **Couleurs** : Différentes couleurs par type
- **Fonctionnalités** :
  - Comparaison des types de bus
  - Couleurs distinctes
  - Formatage des données

### 5. Réservations par jour de la semaine
- **Type** : Graphique linéaire double
- **Données** : Réservations et revenus quotidiens
- **Couleurs** :
  - Réservations : Violet (#8B5CF6)
  - Revenus : Orange (#F59E0B)
- **Fonctionnalités** :
  - Analyse des tendances hebdomadaires
  - Points de données visibles
  - Formatage adapté

### 6. Taux d'occupation des trajets
- **Type** : Graphique en barres verticales
- **Données** : Pourcentage d'occupation par trajet
- **Couleur** : Vert (#10B981)
- **Fonctionnalités** :
  - Affichage des pourcentages
  - Rotation des labels pour la lisibilité
  - Formatage en pourcentage

## Fonctionnalités Techniques

### Responsive Design
- Tous les graphiques s'adaptent automatiquement à la taille de l'écran
- Utilisation de `ResponsiveContainer` de Recharts
- Hauteur fixe de 320px (h-80) pour la cohérence

### Tooltips Interactifs
- Formatage personnalisé des valeurs
- Couleurs cohérentes avec les graphiques
- Informations contextuelles détaillées

### Formatage des Données
- **Devises** : Formatage en millions de FCFA
- **Nombres** : Séparateurs de milliers
- **Pourcentages** : Affichage avec le symbole %
- **Dates** : Format français (mois en abrégé)

### Couleurs Cohérentes
- Palette de couleurs standardisée
- Utilisation des couleurs Tailwind CSS
- Différenciation claire entre les métriques

## Données Simulées

### Dashboard Admin
- **Période** : 12 mois (Janvier à Décembre)
- **Revenus** : Croissance progressive de 1.2M à 2.25M FCFA
- **Utilisateurs** : Croissance de 45 à 85 nouveaux utilisateurs/mois
- **Compagnies** : 5 compagnies avec revenus variables
- **Réservations** : 245 à 445 réservations/mois

### Dashboard Compagnie
- **Période** : 12 mois avec données spécifiques à la compagnie
- **Trajets** : 6 trajets principaux (Lomé-Kara, Kara-Lomé, etc.)
- **Types de bus** : Premium, Standard, VIP, Luxury
- **Statuts** : 82% confirmés, 12% en attente, 6% annulés
- **Taux d'occupation** : 61% à 82% selon les trajets

## Intégration Future

### API Backend
Les graphiques sont prêts pour l'intégration avec des données réelles :
- Remplacement des données simulées par des appels API
- Mise à jour en temps réel possible
- Filtres dynamiques par période

### Personnalisation
- Couleurs configurables via props
- Données dynamiques via props
- Types de graphiques modulaires

### Performance
- Lazy loading possible pour les graphiques
- Optimisation des re-renders
- Mémoisation des calculs de données

## Utilisation

### Import des Composants
```tsx
import AdminCharts from './components/AdminCharts';
import CompanyCharts from './components/CompanyCharts';
```

### Intégration dans les Dashboards
```tsx
// Dashboard Admin
<AdminCharts className="mt-8" />

// Dashboard Compagnie
<CompanyCharts className="mt-8" />
```

### Personnalisation
```tsx
<AdminCharts 
  className="custom-charts"
  data={customData}
  colors={customColors}
/>
```

## Maintenance

### Mise à Jour des Données
- Modifier les tableaux de données dans les composants
- Adapter les formatages si nécessaire
- Tester la responsivité sur différents écrans

### Ajout de Nouveaux Graphiques
- Suivre la structure existante
- Utiliser les couleurs de la palette
- Maintenir la cohérence du design

### Debugging
- Vérifier les données d'entrée
- Contrôler les formats de date
- Tester les tooltips et légendes

---

**Note** : Cette documentation sera mise à jour lors de l'intégration avec le backend Django pour refléter les données réelles et les nouvelles fonctionnalités.
