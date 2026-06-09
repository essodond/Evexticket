# 🚀 RENDER DEPLOYMENT - RECOMMENCEZ PROPRE

## ⚡ POURQUOI RENDER?
- Interface simple et intuitive
- Gratuit avec $7/mois de credits
- Détecte automatiquement le render.yaml
- Déploiement en 3-5 min
- PostgreSQL inclus

---

## 🔄 ÉTAPES POUR REDÉPLOYER

### ÉTAPE 1: Push le code sur GitHub (2 min)
```bash
# À la racine du projet
git add .
git commit -m "Fresh deployment on Render"
git push origin main
```

### ÉTAPE 2: Aller sur Render (30 sec)
```
Va sur https://dashboard.render.com
```

### ÉTAPE 3: Créer PostgreSQL (2 min)
```
1. Clique "+ New +"
2. Sélectionne "PostgreSQL"
3. Configure:
   - Name: evexticket-db
   - Database: evexticket
   - User: evexticket
   - Region: Frankfurt (EU Central)
   - Plan: Free
4. Clique "Create Database"
5. COPIE l'URL "Internal Database URL"
```

### ÉTAPE 4: Créer le Web Service (3 min)
```
1. Clique "+ New +"
2. Sélectionne "Web Service"
3. Connecte ton repo GitHub
4. Configure:
   - Name: evexticket-api
   - Region: Frankfurt (EU Central) [même que BD]
   - Branch: main
   - Root Directory: backend [IMPORTANT!]
   - Runtime: Python
   - Build Command: ./build.sh
   - Start Command: gunicorn togotrans_api.wsgi:application
   - Plan: Free
```

### ÉTAPE 5: Ajouter les variables (3 min)
```
Dans "Environment Variables", ajoute:

DATABASE_URL = [colle l'URL de l'étape 3]
SECRET_KEY = [clique "Generate"]
DEBUG = False
CORS_ALLOW_ALL = True
ALLOWED_HOSTS = evexticket-api.onrender.com,yourdomain.com
DJANGO_SUPERUSER_USERNAME = admin
DJANGO_SUPERUSER_PASSWORD = [choose a strong password]
DJANGO_SUPERUSER_EMAIL = admin@evexticket.com
```

### ÉTAPE 6: Créer et attendre (5 min)
```
Clique "Create Web Service"
Render lance le déploiement automatiquement
Attends les logs:
  - "Collecting dependencies"
  - "Building Docker image"
  - "Running migrations"
  - "Starting server"
```

### ÉTAPE 7: Vérifier (2 min)
```
Une fois "Live" (vert), teste:
- https://evexticket-api.onrender.com/admin/
- https://evexticket-api.onrender.com/swagger/
- https://evexticket-api.onrender.com/api/cities/
```

---

## 🔑 VARIABLES ESSENTIELLES

```
DATABASE_URL       ← Générée par Render (PostgreSQL)
SECRET_KEY         ← Clique "Generate"
DEBUG              = False
CORS_ALLOW_ALL     = True
ALLOWED_HOSTS      = evexticket-api.onrender.com
QOSPAY_CALLBACK_URL = https://evexticket-api.onrender.com/api/payments/webhook/
QOSPAY_BASE_URL    = https://api.qosic.net
QOSPAY_CLIENT_ID   = USR01
QOSPAY_USERNAME    = USR01
QOSPAY_PASSWORD    = YG739G5XFVPYYV4ADJVW
```

---

## ✅ FICHIERS REQUIS (Déjà prêts ✅)

- ✅ `render.yaml` → Config Render (détection auto)
- ✅ `build.sh` → Build script
- ✅ `start.sh` → Start script
- ✅ `requirements.txt` → Dépendances
- ✅ `runtime.txt` → Python 3.12.3
- ✅ `Dockerfile` → Si Render utilise Docker

---

## 🎯 URL FINALE

Ton backend sera accessible à:
```
https://evexticket-api.onrender.com
```

Configure le frontend:
```
VITE_API_URL=https://evexticket-api.onrender.com
VITE_API_BASE_URL=https://evexticket-api.onrender.com/api
```

---

## 🚨 SI ÇA NE MARCHE PAS

### ❌ Build Failed
→ Regarde les logs Render
→ Cherche l'erreur (dépendance manquante?)
→ Fix et push sur GitHub
→ Render redéploie automatiquement

### ❌ Database Connection Error
→ Vérifie que PostgreSQL est "Available"
→ Copie bien l'URL de la BD
→ Redéploie

### ❌ Migrations Failed
→ Peut être une erreur de modèle Django
→ Vérifie les logs
→ Fix et push

### ❌ DisallowedHost
→ Ajoute ton URL à ALLOWED_HOSTS
→ Redéploie

---

## 📖 POUR PLUS DE DÉTAILS

Voir `DEPLOY_RENDER.md` (guide complet)

**C'est prêt! On y va? 🚀**
