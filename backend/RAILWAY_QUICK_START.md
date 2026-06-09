# ═════════════════════════════════════════════════════════════
# 🚀 RAILWAY DEPLOYMENT - QUICK START
# ═════════════════════════════════════════════════════════════

## 1️⃣  PRÉPARATION DU CODE
───────────────────────────────────────────────────────────────

```bash
cd backend
git add .
git commit -m "Ready for Railway deployment"
git push origin main
```

## 2️⃣  CRÉER LE PROJET RAILWAY
───────────────────────────────────────────────────────────────

1. Va sur https://railway.app/dashboard
2. Clique "New Project" → "Deploy from GitHub repo"
3. Autorise Railway et sélectionne ton repo

## 3️⃣  AJOUTER POSTGRESQL
───────────────────────────────────────────────────────────────

1. Dans le projet, clique "+ Add"
2. Sélectionne "PostgreSQL"
3. Railway crée la BD automatiquement

La variable DATABASE_URL sera générée automatiquement.

## 4️⃣  CONFIGURER LES VARIABLES D'ENV
───────────────────────────────────────────────────────────────

Clique sur le Web Service, puis "Variables" et ajoute :

```
DEBUG=False
ALLOWED_HOSTS=your-app.railway.app,yourdomain.com
SECRET_KEY=[Génère avec: python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"]
CORS_ALLOW_ALL=True
CORS_EXTRA_ORIGINS=http://localhost:5173,https://yourdomain.com
QOSPAY_CALLBACK_URL=https://your-app.railway.app/api/payments/webhook/
QOSPAY_BASE_URL=https://api.qosic.net
QOSPAY_CLIENT_ID=USR01
QOSPAY_USERNAME=USR01
QOSPAY_PASSWORD=YG739G5XFVPYYV4ADJVW
```

## 5️⃣  DÉPLOYER
───────────────────────────────────────────────────────────────

Railway détecte automatiquement le Procfile et commence le déploiement.

Attends 2-3 minutes et CHECK LES LOGS :
```bash
railway logs
```

## 6️⃣  VÉRIFIER
───────────────────────────────────────────────────────────────

Une fois déployé, teste :
- https://your-app.railway.app/admin/
- https://your-app.railway.app/swagger/
- https://your-app.railway.app/api/cities/

## ⚠️  FICHIERS IMPORTANTS
───────────────────────────────────────────────────────────────

✅ Procfile          → Commands pour Railway
✅ Dockerfile        → Build container
✅ railway.json      → Config Railway
✅ build.sh          → Build script
✅ start.sh          → Start script
✅ requirements.txt  → Python dependencies
✅ runtime.txt       → Python version

Tous ces fichiers doivent être dans le dossier `backend/`.

## 🎯 URL FINALE
───────────────────────────────────────────────────────────────

Ton backend sera accessible à :
https://your-app.railway.app

Configure le frontend avec :
VITE_API_URL=https://your-app.railway.app

═════════════════════════════════════════════════════════════
