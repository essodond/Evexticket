# 🚀 Guide de Déploiement Backend + BD sur Railway

## Prérequis
- Un compte [Railway](https://railway.app) (gratuit, gratuit avec GitHub)
- Le code backend poussé sur GitHub
- CLI Railway installé (optionnel mais recommandé)

---

## 📋 Étape 1 : Pousser le code sur GitHub

Assure-toi que tout est sur GitHub :

```bash
cd backend
git add .
git commit -m "Prêt pour déploiement Railway"
git push origin main
```

✅ **Vérifie que** : `.gitignore` exclut `.env`, `db.sqlite3`, `__pycache__/`, `.venv/`

---

## 📋 Étape 2 : Créer un projet Railway

### Option A : Via l'interface web
1. Va sur [railway.app/dashboard](https://railway.app/dashboard)
2. Clique **"+ New Project"** → **"Deploy from GitHub repo"**
3. Sélectionne ton repo GitHub contenant le code
4. Autorise Railway à accéder à GitHub

### Option B : Via CLI Railway
```bash
npm install -g @railway/cli
railway login
cd backend
railway init
```

---

## 📋 Étape 3 : Configurer la Base de Données PostgreSQL

### Via l'interface web :
1. Dans ton projet Railway, clique **"+ Add"**
2. Sélectionne **"PostgreSQL"**
3. Railway crée automatiquement une instance

### Variables d'environnement BD :
Railway génère automatiquement une variable `DATABASE_URL` dans le format :
```
postgresql://user:password@host:port/database
```

---

## 📋 Étape 4 : Configurer le Web Service

Railway va automatiquement détecter le `Procfile`. Les variables d'env à ajouter :

| Clé | Valeur |
|-----|--------|
| `DEBUG` | `False` |
| `ALLOWED_HOSTS` | `your-app.railway.app,yourdomain.com` |
| `SECRET_KEY` | *(Génère une clé forte)* |
| `CORS_ALLOW_ALL` | `True` |
| `CORS_EXTRA_ORIGINS` | *(URL de ton frontend)* |
| `QOSPAY_CALLBACK_URL` | `https://your-app.railway.app/api/payments/webhook/` |
| `PYTHON_VERSION` | `3.12.3` |

**Pour générer une clé SECRET_KEY** :
```bash
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

---

## 📋 Étape 5 : Configurer le déploiement

1. Railway détecte le `Procfile` automatiquement
2. Il utilisera la commande `release` pour les migrations :
   ```
   python manage.py migrate --no-input && python create_superuser.py
   ```
3. Il utilisera `web` pour lancer l'app :
   ```
   gunicorn togotrans_api.wsgi:application --bind 0.0.0.0:$PORT
   ```

---

## 📋 Étape 6 : Déployer

**Via interface** : Railway va déployer automatiquement à chaque push sur `main`

**Via CLI** :
```bash
railway up
```

Attends 2-3 minutes pour que Railway :
- ✅ Installe les dépendances
- ✅ Collecte les fichiers statiques
- ✅ Exécute les migrations
- ✅ Lance le serveur

---

## 📋 Étape 7 : Vérifier le déploiement

Ton app sera accessible à :
```
https://your-app.railway.app
```

Teste ces endpoints :
- `https://your-app.railway.app/admin/` → Admin Django
- `https://your-app.railway.app/swagger/` → Documentation API
- `https://your-app.railway.app/api/cities/` → API publique

**Vérifie les logs** :
```bash
railway logs
```

---

## 📋 Étape 8 : Problèmes courants

### ❌ Migrations échouent
```bash
railway logs --service backend
# Cherche l'erreur, puis relaunch
railway redeploy
```

### ❌ Module non trouvé
- Vérifie que `requirements.txt` est à jour
- Ajoute-le à `requirements.txt` et push

### ❌ BD non trouvée
- Vérifie que `DATABASE_URL` est définie dans Railway
- Redéploie : `railway redeploy`

---

## 📋 Étape 9 : Connecter le Frontend

Dans ton `.env` frontend :
```
VITE_API_URL=https://your-app.railway.app
VITE_API_BASE_URL=https://your-app.railway.app/api
```

---

## 🔗 Ressources utiles

- [Docs Railway](https://docs.railway.app)
- [Django sur Railway](https://docs.railway.app/guides/django)
- [PostgreSQL sur Railway](https://docs.railway.app/guides/databases)

---

## ✅ Checklist avant déploiement

- [ ] Code sur GitHub
- [ ] `.gitignore` correct
- [ ] `requirements.txt` à jour
- [ ] `SECRET_KEY` défini
- [ ] `DEBUG=False` en prod
- [ ] `ALLOWED_HOSTS` configuré
- [ ] `CORS_EXTRA_ORIGINS` configuré
- [ ] Email backend configuré (si besoin)
- [ ] `QOSPAY_CALLBACK_URL` à jour
- [ ] Fichiers de config (Procfile, Dockerfile) présents

**C'est bon ? Lance le déploiement ! 🚀**
