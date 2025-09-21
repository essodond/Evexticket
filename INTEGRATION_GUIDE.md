# Guide d'Intégration Frontend-Backend - TogoTrans

## Vue d'ensemble

Ce guide explique comment intégrer le frontend React avec le backend Django pour créer une application complète de réservation de transport au Togo.

## Architecture

```
togotrans/
├── project/                 # Frontend React
│   ├── src/
│   │   ├── components/      # Composants React
│   │   ├── services/        # Service API
│   │   ├── hooks/          # Hooks React personnalisés
│   │   └── ...
│   └── package.json
└── backend/                 # Backend Django
    ├── togotrans_api/      # Configuration Django
    ├── transport/          # Application Django
    ├── manage.py
    └── requirements.txt
```

## Démarrage Rapide

### 1. Backend Django

```bash
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # Linux/Mac
pip install -r requirements.txt
python manage.py migrate
python manage.py load_initial_data
python manage.py runserver
```

Le backend sera disponible sur : http://localhost:8000

### 2. Frontend React

```bash
cd project
npm install
npm run dev
```

Le frontend sera disponible sur : http://localhost:5173

## API Endpoints

### Base URL
```
http://localhost:8000/api/
```

### Endpoints Principaux

#### Villes
- `GET /cities/` - Liste des villes
- `GET /cities/{id}/` - Détails d'une ville

#### Compagnies
- `GET /companies/` - Liste des compagnies
- `POST /companies/` - Créer une compagnie
- `GET /companies/{id}/` - Détails d'une compagnie
- `PUT /companies/{id}/` - Modifier une compagnie
- `DELETE /companies/{id}/` - Supprimer une compagnie
- `GET /companies/{id}/trips/` - Trajets d'une compagnie
- `GET /companies/{id}/stats/` - Statistiques d'une compagnie

#### Trajets
- `GET /trips/` - Liste des trajets
- `POST /trips/` - Créer un trajet
- `GET /trips/{id}/` - Détails d'un trajet
- `PUT /trips/{id}/` - Modifier un trajet
- `DELETE /trips/{id}/` - Supprimer un trajet
- `POST /trips/search/` - Rechercher des trajets

#### Réservations
- `GET /bookings/` - Liste des réservations
- `POST /bookings/` - Créer une réservation
- `GET /bookings/{id}/` - Détails d'une réservation
- `PUT /bookings/{id}/` - Modifier une réservation
- `DELETE /bookings/{id}/` - Supprimer une réservation
- `POST /bookings/{id}/confirm/` - Confirmer une réservation
- `POST /bookings/{id}/cancel/` - Annuler une réservation

#### Statistiques
- `GET /dashboard/stats/` - Statistiques du dashboard admin

## Service API Frontend

### Configuration
Le service API est configuré dans `src/services/api.ts` :

```typescript
const API_BASE_URL = 'http://localhost:8000/api';
```

### Utilisation
```typescript
import { apiService } from '../services/api';

// Récupérer les villes
const cities = await apiService.getCities();

// Créer une compagnie
const newCompany = await apiService.createCompany({
  name: 'Nouvelle Compagnie',
  description: 'Description...',
  // ...
});
```

## Hooks React

### useCities
```typescript
import { useCities } from '../hooks/useApi';

const { cities, loading, error } = useCities();
```

### useCompanies
```typescript
import { useCompanies } from '../hooks/useApi';

const { 
  companies, 
  loading, 
  error, 
  createCompany, 
  updateCompany, 
  deleteCompany 
} = useCompanies();
```

### useTrips
```typescript
import { useTrips } from '../hooks/useApi';

const { 
  trips, 
  loading, 
  error, 
  createTrip, 
  updateTrip, 
  deleteTrip,
  searchTrips
} = useTrips();
```

### useBookings
```typescript
import { useBookings } from '../hooks/useApi';

const { 
  bookings, 
  loading, 
  error, 
  createBooking, 
  updateBooking, 
  deleteBooking,
  confirmBooking,
  cancelBooking
} = useBookings();
```

## Intégration dans les Composants

### Exemple : Dashboard Admin
```typescript
import { useDashboardStats } from '../hooks/useApi';

const AdminDashboard = () => {
  const { stats, loading, error } = useDashboardStats();

  if (loading) return <div>Chargement...</div>;
  if (error) return <div>Erreur: {error}</div>;

  return (
    <div>
      <h1>Utilisateurs: {stats?.total_users}</h1>
      <h1>Compagnies: {stats?.total_companies}</h1>
      {/* ... */}
    </div>
  );
};
```

### Exemple : Gestion des Compagnies
```typescript
import { useCompanies } from '../hooks/useApi';

const CompanyManagement = () => {
  const { companies, loading, createCompany, updateCompany, deleteCompany } = useCompanies();

  const handleCreateCompany = async (companyData) => {
    try {
      await createCompany(companyData);
      // Succès
    } catch (error) {
      // Gestion d'erreur
    }
  };

  return (
    <div>
      {companies.map(company => (
        <div key={company.id}>
          <h3>{company.name}</h3>
          <button onClick={() => deleteCompany(company.id)}>
            Supprimer
          </button>
        </div>
      ))}
    </div>
  );
};
```

## Gestion des Erreurs

### Frontend
```typescript
try {
  const data = await apiService.getCompanies();
  // Succès
} catch (error) {
  console.error('Erreur API:', error);
  // Afficher un message d'erreur à l'utilisateur
}
```

### Backend
Les erreurs sont gérées automatiquement par Django REST Framework avec des codes de statut HTTP appropriés.

## Authentification

### Configuration CORS
Le backend est configuré pour accepter les requêtes du frontend :

```python
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
```

### Authentification (Simulation)
Pour l'instant, l'authentification est simulée dans le frontend. Pour une authentification réelle :

1. Implémenter JWT dans le backend
2. Stocker le token dans le localStorage
3. Inclure le token dans les requêtes API

## Base de Données

### SQLite (Développement)
- Fichier : `backend/db.sqlite3`
- Données initiales chargées automatiquement

### Données de Test
- **Superutilisateur** : admin/admin123
- **Compagnies** : company1/company123, company2/company123, company3/company123
- **Villes** : Lomé, Kara, Kpalimé, Sokodé, etc.
- **Trajets** : Plusieurs trajets entre les villes
- **Réservations** : Réservations de démonstration

## Déploiement

### Backend
1. Configurer une base de données de production (PostgreSQL/MySQL)
2. Modifier `DEBUG = False` dans `settings.py`
3. Configurer les variables d'environnement
4. Utiliser un serveur web (Nginx + Gunicorn)

### Frontend
1. Build de production : `npm run build`
2. Servir les fichiers statiques
3. Configurer le proxy pour l'API

## Tests

### Backend
```bash
cd backend
python manage.py test
```

### Frontend
```bash
cd project
npm test
```

## Documentation API

Une fois le backend démarré, accédez à :
- **Swagger UI** : http://localhost:8000/swagger/
- **ReDoc** : http://localhost:8000/redoc/

## Dépannage

### Erreurs CORS
Vérifiez que `CORS_ALLOWED_ORIGINS` inclut l'URL du frontend.

### Erreurs de Connexion
Vérifiez que le backend est démarré sur le port 8000.

### Erreurs de Données
Vérifiez que les migrations sont appliquées et que les données initiales sont chargées.

## Prochaines Étapes

1. **Authentification réelle** avec JWT
2. **Tests automatisés** pour l'API
3. **Déploiement** en production
4. **Monitoring** et logs
5. **Optimisation** des performances

---

**TogoTrans** - Intégration complète Frontend-Backend ! 🚀
