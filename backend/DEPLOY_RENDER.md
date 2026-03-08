# 🚀 Guide de Déploiement Backend sur Render

## Prérequis
- Un compte [Render](https://render.com) (gratuit)
- Le code backend poussé sur GitHub/GitLab

---

## 📋 Étape 1 : Pousser le code sur GitHub

Si ce n'est pas déjà fait, crée un repo GitHub et pousse le code :

```bash
cd backend
git init
git add .
git commit -m "Prêt pour le déploiement sur Render"
git remote add origin https://github.com/TON_USERNAME/evexticket-api.git
git push -u origin main
```

> ⚠️ **Important** : Assure-toi que le `.gitignore` exclut `.env`, `db.sqlite3`, `__pycache__/` et `venv/`.

---

## 📋 Étape 2 : Créer la base de données PostgreSQL sur Render

1. Va sur [dashboard.render.com](https://dashboard.render.com)
2. Clique sur **"New +"** → **"PostgreSQL"**
3. Configure :
   - **Name** : `evexticket-db`
   - **Database** : `evexticket`
   - **User** : `evexticket`
   - **Region** : `Frankfurt (EU Central)` (ou la plus proche de toi)
   - **Plan** : `Free`
4. Clique **"Create Database"**
5. **Copie l'URL "Internal Database URL"** — tu en auras besoin à l'étape suivante.

---

## 📋 Étape 3 : Créer le Web Service sur Render

1. Clique sur **"New +"** → **"Web Service"**
2. Connecte ton repo GitHub
3. Configure :
   - **Name** : `evexticket-api`
   - **Region** : `Frankfurt (EU Central)` (même que la DB)
   - **Branch** : `main`
   - **Root Directory** : `backend` (⚠️ IMPORTANT si le backend est dans un sous-dossier)
   - **Runtime** : `Python`
   - **Build Command** : `./build.sh`
   - **Start Command** : `gunicorn togotrans_api.wsgi:application`
   - **Plan** : `Free`

4. Dans **"Environment Variables"**, ajoute :

| Clé | Valeur |
|-----|--------|
| `DATABASE_URL` | *(colle l'Internal Database URL de l'étape 2)* |
| `SECRET_KEY` | *(clique "Generate" pour une clé aléatoire)* |
| `DEBUG` | `False` |
| `CORS_ALLOW_ALL` | `True` |
| `PYTHON_VERSION` | `3.12.3` |
| `DJANGO_SUPERUSER_USERNAME` | `admin` |
| `DJANGO_SUPERUSER_PASSWORD` | *(ton mot de passe admin)* |
| `DJANGO_SUPERUSER_EMAIL` | `admin@evexticket.com` |

5. Clique **"Create Web Service"**

---

## 📋 Étape 4 : Attendre le déploiement

Render va automatiquement :
1. ✅ Installer les dépendances (`pip install -r requirements.txt`)
2. ✅ Collecter les fichiers statiques (`collectstatic`)
3. ✅ Appliquer les migrations (`migrate`) — crée toutes les tables dans PostgreSQL
4. ✅ Créer le superuser admin
5. ✅ Lancer le serveur avec Gunicorn

Le déploiement prend environ **3-5 minutes**.

---

## 📋 Étape 5 : Vérifier le déploiement

Ton API sera accessible à :
```
https://evexticket-api.onrender.com
```

Teste ces URLs :
- `https://evexticket-api.onrender.com/admin/` → Interface admin Django
- `https://evexticket-api.onrender.com/swagger/` → Documentation API Swagger
- `https://evexticket-api.onrender.com/api/cities/` → Liste des villes (API publique)

---

## 📋 Étape 6 : Connecter le Frontend

Dans ton frontend React (Vite), crée un fichier `.env` :

```env
VITE_API_BASE_URL=https://evexticket-api.onrender.com/api
```

Ou `.env.production` pour la production :

```env
VITE_API_BASE_URL=https://evexticket-api.onrender.com/api
```

Ton frontend utilisera automatiquement cette URL grâce à `resolveApiBaseUrl()` dans `src/services/api.ts`.

---

## 📋 Étape 7 : Connecter l'app React Native

Dans `react-native-reference/src/constants/`, mets à jour l'URL API :

```typescript
export const API_BASE_URL = 'https://evexticket-api.onrender.com/api';
```

---

## 🔄 Déploiement automatique

Chaque `git push` sur la branche `main` déclenche automatiquement un nouveau déploiement sur Render !

---

## ⚠️ Notes importantes

### Plan Free de Render
- Le service **s'endort après 15 minutes d'inactivité**
- Le premier appel après une période d'inactivité prend **~30 secondes** (cold start)
- Pour éviter cela, tu peux upgrader vers le plan **Starter ($7/mois)**

### Base de données Free
- **256 MB** de stockage
- La base est **supprimée après 90 jours** sur le plan free
- Pour la production, upgrader vers le plan **Starter ($7/mois)**

### Fichiers créés/modifiés pour ce déploiement
- `requirements.txt` — Dépendances Python propres avec PostgreSQL
- `togotrans_api/settings.py` — Config dynamique (env vars, PostgreSQL, WhiteNoise)
- `build.sh` — Script de build pour Render
- `render.yaml` — Configuration Infrastructure as Code (optionnel)
- `runtime.txt` — Version de Python
- `create_superuser.py` — Création auto du superuser
- `.env.example` — Documentation des variables d'environnement

---

## 🐛 Dépannage

### Erreur "No module named ..."
→ Vérifie que le package est dans `requirements.txt`

### Erreur de migration
→ Va dans l'onglet "Shell" de Render et lance :
```bash
python manage.py migrate --run-syncdb
```

### Erreur CORS
→ Vérifie que `CORS_ALLOW_ALL=True` est dans les variables d'environnement

### Erreur "Disallowed Host"
→ Vérifie que `RENDER_EXTERNAL_HOSTNAME` est bien détecté (c'est automatique sur Render)

