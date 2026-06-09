# 🚀 Railway Deployment - Étapes Détaillées + CLI

## 📋 Table des matières
1. [Installation de Railway CLI](#cli)
2. [Méthode 1: Interface Web (Recommandée)](#web)
3. [Méthode 2: CLI Railway](#cli-method)
4. [Commandes utiles](#commands)
5. [Troubleshooting](#troubleshooting)

---

## <a name="cli"></a>Installation de Railway CLI

### Pour macOS / Linux:
```bash
npm install -g @railway/cli
railway login
```

### Pour Windows (PowerShell):
```powershell
npm install -g @railway/cli
railway login
```

**Puis autorise Railway à accéder à ton GitHub quand demandé.**

---

## <a name="web"></a>Méthode 1: Déploiement via Interface Web (Recommandée)

### Étape 1: Créer le projet
1. Va sur https://railway.app/dashboard
2. Clique **"+ New Project"**
3. Sélectionne **"Deploy from GitHub repo"**
4. Autorise Railway à accéder à ton compte GitHub
5. Sélectionne le repo qui contient ton code Evexticket
6. Railway crée automatiquement un dossier backend si détecté

### Étape 2: Ajouter PostgreSQL
1. Dans le projet Railway, clique **"+ Add"**
2. Sélectionne **"PostgreSQL"**
3. Railway crée une instance PostgreSQL
4. Railway génère automatiquement `DATABASE_URL` 

**Pourquoi PostgreSQL?** Django recommande PostgreSQL pour la production.

### Étape 3: Configurer le Web Service
1. Clique sur le service Web (le premier qui a été créé)
2. Va dans **"Variables"**
3. Ajoute ces variables:

```
DEBUG=False
SECRET_KEY=VOTRE-CLÉ-SECRÈTE-ICI
ALLOWED_HOSTS=your-app.railway.app,yourdomain.com
CORS_ALLOW_ALL=True
CORS_EXTRA_ORIGINS=http://localhost:5173,https://yourdomain.com
QOSPAY_CALLBACK_URL=https://your-app.railway.app/api/payments/webhook/
```

### Étape 4: Vérifier le déploiement
1. Railway détecte automatiquement le **Procfile**
2. Il va :
   - Installer les dépendances de `requirements.txt`
   - Lancer la commande **release** (migrations + superuser)
   - Lancer la commande **web** (gunicorn)
3. Attends 2-3 minutes

### Étape 5: Voir les logs
1. Va dans ton projet Railway
2. Clique sur le service Web
3. Va dans **"Logs"**
4. Tu dois voir:
   ```
   === RUNNING MIGRATIONS AT STARTUP ===
   === CREATING SUPERUSER ===
   === STARTING GUNICORN ===
   ```

---

## <a name="cli-method"></a>Méthode 2: Déploiement via CLI Railway

### Prérequis:
- Railway CLI installée (`npm install -g @railway/cli`)
- Authentifié (`railway login`)

### Étapes:

```bash
# 1. Va dans le dossier backend
cd backend

# 2. Initialise le projet Railway
railway init

# Réponds aux questions:
# - "Create a new project?" → yes
# - "Project name?" → evexticket
# - "Environment name?" → production

# 3. Ajoute PostgreSQL
railway add

# Sélectionne PostgreSQL dans la liste

# 4. Déploie
railway up

# Railway va:
# - Uploader le code
# - Build le Dockerfile (ou détecter Procfile)
# - Lancer le déploiement
# - Appliquer les migrations
# - Créer le superuser

# 5. Voir les logs
railway logs

# 6. Voir l'URL du déploiement
railway domain

```

---

## <a name="commands"></a>Commandes Utiles Railway CLI

### Afficher les informations du projet
```bash
railway status
```

### Voir les logs en temps réel
```bash
railway logs --follow
```

### Voir les variables d'environnement
```bash
railway variables
```

### Ajouter/modifier une variable
```bash
railway variables set DEBUG=False
railway variables set SECRET_KEY=your-new-key
```

### Voir l'URL de l'app
```bash
railway domain
```

### Redéployer
```bash
railway redeploy
```

### Exécuter une commande sur le serveur en prod
```bash
# Par exemple, créer un superuser manuellement
railway run python manage.py createsuperuser
```

### Se connecter à la base de données PostgreSQL depuis le CLI
```bash
railway db:connect
```

### Arrêter le déploiement
```bash
railway stop
```

### Supprimer le projet
```bash
railway delete
```

---

## <a name="troubleshooting"></a>Troubleshooting

### ❌ Migrations échouent
**Log:**
```
ERROR: Database connection failed
```

**Solutions:**
1. Vérifie que PostgreSQL est ajouté au projet
2. Redéploie : `railway redeploy`
3. Vérifie les logs : `railway logs`

### ❌ Module non trouvé
**Log:**
```
ImportError: No module named 'package_name'
```

**Solutions:**
1. Ajoute le module à `requirements.txt`
2. Push : `git push origin main`
3. Redéploie : `railway redeploy` (si on utilise Railway CLI)
4. Sinon, Railway re-build automatiquement depuis GitHub

### ❌ Port 8000 déjà utilisé
Railway gère les ports automatiquement, ignore ce message.

### ❌ Static files manquants
**Log:**
```
ERROR: Static files not collected
```

**Solutions:**
Le `build.sh` collecte les static files automatiquement, mais tu peux le faire manuellement:
```bash
railway run python manage.py collectstatic --no-input
```

### ❌ Secret key manquante
**Log:**
```
ImproperlyConfigured: The SECRET_KEY setting must not be empty
```

**Solutions:**
1. Génère une clé: `python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"`
2. Ajoute-la à Railway: `railway variables set SECRET_KEY=your-key`
3. Redéploie

### ❌ ALLOWED_HOSTS vide
**Log:**
```
DisallowedHost at /admin/
```

**Solutions:**
1. Obtiens le nom de ton app Railway
2. Ajoute-le à ALLOWED_HOSTS: `railway variables set ALLOWED_HOSTS=your-app.railway.app`
3. Redéploie

### ❌ Connexion à la BD échoue au démarrage
**Log:**
```
could not connect to server: Connection refused
```

**Solutions:**
1. Vérifie que PostgreSQL est "Running" dans Railway
2. Redéploie : `railway redeploy`
3. Attends 30 secondes et vérifie les logs à nouveau

---

## 🎯 URL Finale

Une fois déployé, ton API sera accessible à:
```
https://your-app.railway.app
```

Test ces endpoints:
```bash
# Admin Django
https://your-app.railway.app/admin/

# Documentation API Swagger
https://your-app.railway.app/swagger/

# API publique (exemple)
https://your-app.railway.app/api/cities/

# Webhooks Qospay
https://your-app.railway.app/api/payments/webhook/
```

---

## 📝 Notes importantes

1. **Région**: Choisis la même région pour l'app et la BD (ex: Frankfurt)
2. **Plan gratuit**: Railway te donne $5/mois. Suffisant pour une petite app
3. **Autoscaling**: Railways inclut l'autoscaling automatique
4. **Logs**: Garde les logs pour déboguer
5. **Backups**: Railway sauvegarde PostgreSQL automatiquement

---

## 🔗 Ressources

- [Railway Docs](https://docs.railway.app)
- [Django on Railway](https://docs.railway.app/guides/django)
- [PostgreSQL on Railway](https://docs.railway.app/guides/databases)
- [Railway CLI Docs](https://docs.railway.app/cli/commands)

---

**Prêt à déployer? Lance `railway up` ou va sur le dashboard! 🚀**
