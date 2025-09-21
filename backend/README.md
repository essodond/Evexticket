# TogoTrans Backend API

## Description

Backend Django REST API pour la plateforme de transport TogoTrans. Cette API fournit tous les endpoints nécessaires pour gérer les compagnies de transport, les trajets, les réservations et les paiements.

## Fonctionnalités

### 🚌 Gestion des Transport
- **Compagnies** : CRUD complet des compagnies de transport
- **Villes** : Gestion des villes du Togo
- **Trajets** : Création et gestion des trajets entre villes
- **Recherche** : Recherche de trajets par ville et date

### 📱 Réservations et Paiements
- **Réservations** : Système complet de réservation
- **Paiements** : Gestion des paiements (Mobile Money, Carte, Espèces)
- **Notifications** : Système de notifications pour les utilisateurs

### 📊 Dashboards et Statistiques
- **Dashboard Admin** : Statistiques globales de la plateforme
- **Dashboard Compagnie** : Statistiques spécifiques à chaque compagnie
- **Rapports** : Export de données et rapports

## Installation

### Prérequis
- Python 3.8+
- pip

### Installation

1. **Cloner le projet**
   ```bash
   git clone <repository-url>
   cd togotrans/backend
   ```

2. **Créer un environnement virtuel**
   ```bash
   python -m venv venv
   ```

3. **Activer l'environnement virtuel**
   ```bash
   # Windows
   venv\Scripts\activate
   
   # Linux/Mac
   source venv/bin/activate
   ```

4. **Installer les dépendances**
   ```bash
   pip install -r requirements.txt
   ```

5. **Appliquer les migrations**
   ```bash
   python manage.py migrate
   ```

6. **Charger les données initiales**
   ```bash
   python manage.py load_initial_data
   ```

7. **Démarrer le serveur**
   ```bash
   python manage.py runserver
   ```

## Configuration

### Variables d'environnement
Créez un fichier `.env` dans le dossier backend :

```env
SECRET_KEY=your-secret-key
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

### Base de données
Par défaut, l'application utilise SQLite. Pour utiliser PostgreSQL ou MySQL, modifiez les paramètres dans `settings.py`.

## API Endpoints

### Authentification
- `POST /api-auth/login/` - Connexion
- `POST /api-auth/logout/` - Déconnexion

### Villes
- `GET /api/cities/` - Liste des villes
- `GET /api/cities/{id}/` - Détails d'une ville

### Compagnies
- `GET /api/companies/` - Liste des compagnies
- `POST /api/companies/` - Créer une compagnie
- `GET /api/companies/{id}/` - Détails d'une compagnie
- `PUT /api/companies/{id}/` - Modifier une compagnie
- `DELETE /api/companies/{id}/` - Supprimer une compagnie
- `GET /api/companies/{id}/trips/` - Trajets d'une compagnie
- `GET /api/companies/{id}/stats/` - Statistiques d'une compagnie

### Trajets
- `GET /api/trips/` - Liste des trajets
- `POST /api/trips/` - Créer un trajet
- `GET /api/trips/{id}/` - Détails d'un trajet
- `PUT /api/trips/{id}/` - Modifier un trajet
- `DELETE /api/trips/{id}/` - Supprimer un trajet
- `POST /api/trips/search/` - Rechercher des trajets

### Réservations
- `GET /api/bookings/` - Liste des réservations
- `POST /api/bookings/` - Créer une réservation
- `GET /api/bookings/{id}/` - Détails d'une réservation
- `PUT /api/bookings/{id}/` - Modifier une réservation
- `DELETE /api/bookings/{id}/` - Supprimer une réservation
- `POST /api/bookings/{id}/confirm/` - Confirmer une réservation
- `POST /api/bookings/{id}/cancel/` - Annuler une réservation

### Statistiques
- `GET /api/dashboard/stats/` - Statistiques du dashboard admin

## Documentation API

Une fois le serveur démarré, accédez à la documentation interactive :

- **Swagger UI** : http://localhost:8000/swagger/
- **ReDoc** : http://localhost:8000/redoc/

## Comptes de Test

Après avoir chargé les données initiales, vous pouvez utiliser ces comptes :

### Superutilisateur
- **Username** : admin
- **Password** : admin123
- **Accès** : Interface d'administration Django

### Compagnies
- **Username** : company1 / **Password** : company123 (TogoBus Express)
- **Username** : company2 / **Password** : company123 (Lomé Transport)
- **Username** : company3 / **Password** : company123 (Kara Lines)

## Modèles de Données

### Company
- Informations de base de la compagnie
- Lien avec l'utilisateur administrateur
- Statut actif/inactif

### City
- Villes du Togo avec leurs régions
- Gestion des villes actives

### Trip
- Trajets entre villes
- Horaires, prix, type de bus
- Capacité et disponibilité

### Booking
- Réservations des passagers
- Informations de contact
- Statut et paiement

### Payment
- Paiements associés aux réservations
- Méthodes de paiement supportées
- Statut des transactions

## Sécurité

- **Authentification** : Session et Token
- **Autorisation** : Permissions basées sur les rôles
- **CORS** : Configuration pour le frontend React
- **Validation** : Validation des données côté serveur

## Déploiement

### Production
1. Modifiez `DEBUG = False` dans `settings.py`
2. Configurez une base de données de production
3. Utilisez un serveur web (Nginx + Gunicorn)
4. Configurez HTTPS

### Docker (Optionnel)
```dockerfile
FROM python:3.9
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
```

## Tests

```bash
python manage.py test
```

## Support

Pour toute question ou problème, contactez l'équipe de développement.

---

**TogoTrans Backend** - API robuste pour le transport au Togo ! 🇹🇬
