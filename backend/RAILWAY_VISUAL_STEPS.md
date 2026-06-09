# 🚀 DÉPLOIEMENT RAILWAY - STEP BY STEP VISUEL

## ⚡ DANS 10 MINUTES - VIA INTERFACE WEB

### ÉTAPE 1: Créer un compte Railway (5 sec)
```
Va sur https://railway.app
Clique "Sign Up"
Autorise avec GitHub / Google / Email
```

### ÉTAPE 2: Pousser ton code sur GitHub (2 min)
```bash
cd ..  # À la racine du projet
git add .
git commit -m "Ready for Railway"
git push origin main
```

**Résultat attendu:** Le repo sur GitHub contient le code

### ÉTAPE 3: Créer un projet Railway (1 min)
```
Va sur https://railway.app/dashboard
Clique "+ New Project"
Sélectionne "Deploy from GitHub repo"
Autorise Railway et choisis le repo Evexticket
```

**Résultat:** Railway crée un projet et un Web Service

### ÉTAPE 4: Ajouter PostgreSQL (30 sec)
```
Dans Railway, clique "+ Add"
Sélectionne "PostgreSQL"
Railway crée une instance BD
```

**Résultat:** Une BD PostgreSQL est créée
**Info utile:** Railway génère DATABASE_URL automatiquement ✅

### ÉTAPE 5: Configurer les Variables (3 min)
```
Clique sur le Web Service
Va dans "Variables"
Ajoute ces 5 variables:
```

| Variable | Valeur |
|----------|--------|
| `DEBUG` | `False` |
| `SECRET_KEY` | *[Génère avec python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"]* |
| `ALLOWED_HOSTS` | `your-app.railway.app` |
| `CORS_ALLOW_ALL` | `True` |
| `CORS_EXTRA_ORIGINS` | `http://localhost:5173,https://yourdomain.com` |

**Après chaque variable ajoutée**, appuie sur Enter

**Résultat:** Les variables sont sauvegardées

### ÉTAPE 6: Déployer (3 min d'attente)
```
Railway détecte le Procfile
Clique "Deploy"
ou attends que ça se fasse automatiquement
```

**Ce qui se passe:**
- ✅ Build du Docker
- ✅ Installation des dépendances (pip)
- ✅ Migration BD (manage.py migrate)
- ✅ Création du superuser
- ✅ Démarrage de Gunicorn

**Logs attendus:**
```
=== RUNNING MIGRATIONS AT STARTUP ===
=== CREATING SUPERUSER ===
=== STARTING GUNICORN ===
```

### ÉTAPE 7: Récupérer l'URL (30 sec)
```
Dans Railway, clique sur le Web Service
Va dans "Deployments"
Cherche le bouton "View Deployment"
Tu vas voir l'URL générée: https://your-app.railway.app
```

### ÉTAPE 8: Tester (2 min)
```bash
# Admin
https://your-app.railway.app/admin/

# API Swagger
https://your-app.railway.app/swagger/

# Cities API
https://your-app.railway.app/api/cities/
```

**Bravo! 🎉 Tu as déployé ton backend!**

---

## ⚠️ SI CA NE MARCHE PAS

### ❌ Build failed
```
Va dans "Logs" et cherche l'erreur
Erreur courante: dépendance manquante dans requirements.txt
```

### ❌ Database connection error
```
Vérifie que PostgreSQL est "Running"
Clique sur PostgreSQL pour vérifier
```

### ❌ DisallowedHost
```
Va dans Web Service > Variables
Ajoute ton URL à ALLOWED_HOSTS
```

### ❌ Static files not found
```
C'est normal pendant le build
Le build.sh collecte les static files
```

---

## 📱 CONNECTER LE FRONTEND

1. Récupère l'URL Railway: `https://your-app.railway.app`
2. Dans ton `.env` frontend:
```
VITE_API_URL=https://your-app.railway.app
VITE_API_BASE_URL=https://your-app.railway.app/api
```

3. Redémarre le serveur frontend

---

## ✅ CHECKLIST FINALE

- [ ] Compte Railway créé
- [ ] Code sur GitHub
- [ ] Projet Railway créé
- [ ] PostgreSQL ajouté
- [ ] Variables configurées
- [ ] Déploiement réussi
- [ ] Admin accessible
- [ ] API Swagger accessible
- [ ] Frontend connecté à l'API

---

**C'est tout! Tu as déployé ton backend sur Railway! 🚀**

Pour les détails avancés, voir:
- `DEPLOYMENT_SUMMARY.md`
- `DEPLOY_RAILWAY.md`
- `RAILWAY_CLI_DETAILED.md`
