# Documentation API Simple pour Tests

Ce document fournit des exemples simples pour tester les points de terminaison (endpoints) de base de votre API avec `curl`.

**URL de base de l'API :** `http://127.0.0.1:8000`

---

### Authentification

Pour les requêtes nécessitant une authentification, vous devez d'abord obtenir un token en utilisant le point de terminaison de connexion. Ensuite, vous inclurez ce token dans l'en-tête de vos requêtes.

**En-tête d'authentification :** `Authorization: Token <votre_token>`

---

### 1. `POST /api/auth/token/` - Connexion Utilisateur

Ce point de terminaison vous permet de vous connecter et de récupérer un token d'authentification.

- **Méthode :** `POST`
- **URL :** `/api/auth/token/`
- **Authentification :** Non requise
- **Corps de la requête (Body) :**
  ```json
  {
      "email": "votre_email@example.com",
      "password": "votre_mot_de_passe"
  }
  ```
- **Exemple avec `curl` :**
  ```bash
  curl -X POST http://127.0.0.1:8000/api/auth/token/ \
  -H "Content-Type: application/json" \
  -d '{"email": "votre_email@example.com", "password": "votre_mot_de_passe"}'
  ```
- **Réponse en cas de succès (200 OK) :**
  ```json
  {
      "token": "ici_sera_votre_token_unique",
      "user": {
          "id": 1,
          "username": "votre_nom_utilisateur",
          "email": "votre_email@example.com"
      }
  }
  ```

---

### 2. `GET /api/cities/` - Lister les Villes

Récupère la liste de toutes les villes disponibles dans la base de données.

- **Méthode :** `GET`
- **URL :** `/api/cities/`
- **Authentification :** Non requise
- **Exemple avec `curl` :**
  ```bash
  curl -X GET http://127.0.0.1:8000/api/cities/
  ```
- **Réponse en cas de succès (200 OK) :**
  ```json
  [
      {
          "id": 1,
          "name": "Lomé",
          "country": "Togo"
      },
      {
          "id": 2,
          "name": "Kara",
          "country": "Togo"
      }
  ]
  ```

---

### 3. `GET /api/my-bookings/` - Lister mes Réservations

Récupère la liste des réservations pour l'utilisateur actuellement authentifié.

- **Méthode :** `GET`
- **URL :** `/api/my-bookings/`
- **Authentification :** **Requise**
- **Exemple avec `curl` (remplacez `<votre_token>` par le token obtenu à l'étape 1) :**
  ```bash
  curl -X GET http://127.0.0.1:8000/api/my-bookings/ \
  -H "Authorization: Token <votre_token>"
  ```
- **Réponse en cas de succès (200 OK) :**
  ```json
  [
      {
          "id": 1,
          "user": 1,
          "trip": 5,
          "booking_date": "2026-01-24T18:00:00Z",
          "status": "confirmed",
          "total_price": 6000
      }
  ]
  ```

---

### 4. `PUT /api/scheduled-trips/{id}/` - Mettre à jour un Voyage

Met à jour les détails d'un voyage planifié. **Note : Cette action requiert des droits d'administrateur pour la compagnie concernée.**

- **Méthode :** `PUT`
- **URL :** `/api/scheduled-trips/{id}/` (remplacez `{id}` par l'ID du voyage)
- **Authentification :** **Requise** (avec un compte admin)
- **Corps de la requête (Body) :**
  ```json
  {
      "date": "2026-03-10",
      "available_seats": 30
  }
  ```
- **Exemple avec `curl` (pour le voyage avec l'ID 1) :**
  ```bash
  curl -X PUT http://127.0.0.1:8000/api/scheduled-trips/1/ \
  -H "Authorization: Token <votre_token_admin>" \
  -H "Content-Type: application/json" \
  -d '{"date": "2026-03-10", "available_seats": 30}'
  ```
- **Réponse en cas de succès (200 OK) :** Le voyage mis à jour sera retourné.

---

### 5. `DELETE /api/scheduled-trips/{id}/` - Supprimer un Voyage

Supprime un voyage planifié. **Note : Cette action requiert des droits d'administrateur pour la compagnie concernée.**

- **Méthode :** `DELETE`
- **URL :** `/api/scheduled-trips/{id}/` (remplacez `{id}` par l'ID du voyage)
- **Authentification :** **Requise** (avec un compte admin)
- **Exemple avec `curl` (pour le voyage avec l'ID 1) :**
  ```bash
  curl -X DELETE http://127.0.0.1:8000/api/scheduled-trips/1/ \
  -H "Authorization: Token <votre_token_admin>"
  ```
- **Réponse en cas de succès :** `204 No Content` (aucune donnée n'est retournée, ce qui est normal).
