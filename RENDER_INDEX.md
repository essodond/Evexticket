# 📚 RENDER DEPLOYMENT - GUIDE COMPLET

## 📖 COMMENT UTILISER CES GUIDES

### Si tu as **5 minutes** ⚡
**→ Lis:** `RENDER_10MIN.md`
- Les 7 étapes essentielles
- URL finale
- Variables clés

### Si tu as **15 minutes** 🏃
**→ Lis:** `RENDER_FRESH_START.md`
- Étapes détaillées
- Explications
- Troubleshooting simple

### Si tu veux **tout comprendre** 🚁
**→ Lis:** `DEPLOY_RENDER.md`
- Guide complet (long)
- Toutes les étapes
- Explications détaillées

---

## 🚀 DÉMARRAGE RAPIDE

### 1. Push sur GitHub
```bash
git add . && git commit -m "Render deploy" && git push origin main
```

### 2. Aller sur Render
```
https://dashboard.render.com
```

### 3. Créer PostgreSQL
```
+ New > PostgreSQL
Name: evexticket-db
Database: evexticket
User: evexticket
Region: Frankfurt
Plan: Free
→ Copie "Internal Database URL"
```

### 4. Créer Web Service
```
+ New > Web Service
Root Directory: backend
Build Command: ./build.sh
Start Command: gunicorn togotrans_api.wsgi:application
```

### 5. Variables d'environnement
```
DATABASE_URL=[Colle l'URL PostgreSQL]
SECRET_KEY=[Clique Generate]
DEBUG=False
CORS_ALLOW_ALL=True
ALLOWED_HOSTS=evexticket-api.onrender.com
DJANGO_SUPERUSER_USERNAME=admin
DJANGO_SUPERUSER_PASSWORD=[Ton mot de passe]
DJANGO_SUPERUSER_EMAIL=admin@evexticket.com
```

### 6. Créer & Attendre
```
Clique "Create Web Service"
Attends que ça passe en "Live" (vert) - 3-5 min
```

### 7. Tester
```
https://evexticket-api.onrender.com/admin/
https://evexticket-api.onrender.com/api/cities/
```

---

## 📋 FICHIERS DE CONFIGURATION

### render.yaml ✅
**Ce que c'est:** Configuration Render
**Contient:**
- PostgreSQL config
- Web Service config
- Variables d'env
- Build/Start commands

### build.sh ✅
**Ce que c'est:** Script de build
**Fait:**
- Installe les dépendances
- Collecte les static files

### start.sh ✅
**Ce que c'est:** Script de démarrage
**Fait:**
- Applique les migrations
- Crée le superuser
- Lance Gunicorn

### .env.render ✅
**Ce que c'est:** Exemple de variables pour Render
**À utiliser:** Copie-colle dans Render Dashboard

---

## 🔑 VARIABLES ESSENTIELLES

```
DATABASE_URL        ← Render le génère
SECRET_KEY          ← Clique "Generate" dans Render
DEBUG               = False
CORS_ALLOW_ALL      = True
ALLOWED_HOSTS       = evexticket-api.onrender.com
DJANGO_SUPERUSER_*  = Les 3 variables pour l'admin
QOSPAY_*            = Les infos Qospay
```

---

## 🧪 APRÈS LE DÉPLOIEMENT

### Tester l'admin
```
https://evexticket-api.onrender.com/admin/
Username: admin
Password: [celui que tu as configuré]
```

### Tester l'API Swagger
```
https://evexticket-api.onrender.com/swagger/
```

### Tester une API publique
```bash
curl https://evexticket-api.onrender.com/api/cities/
```

### Voir les logs
```
Render Dashboard > Service > Logs
```

---

## 🔗 CONNECTER LE FRONTEND

Dans ton `.env` frontend:
```
VITE_API_URL=https://evexticket-api.onrender.com
VITE_API_BASE_URL=https://evexticket-api.onrender.com/api
```

---

## ✅ PRÉREQUIS VÉRIFIÉS

- ✅ `gunicorn` dans requirements.txt
- ✅ `psycopg2-binary` pour PostgreSQL
- ✅ `build.sh` pour installer les dépendances
- ✅ `start.sh` pour démarrer l'app
- ✅ `manage.py` pour les migrations
- ✅ `togotrans_api/wsgi.py` pour Django
- ✅ `runtime.txt` avec Python 3.12.3
- ✅ `render.yaml` pour la config

**Tout est prêt! ✅**

---

## 🚨 TROUBLESHOOTING

### ❌ Build Failed
```
→ Regarde les logs Render
→ Cherche l'erreur (dépendance manquante?)
→ Fix et push sur GitHub
→ Render redéploie automatiquement
```

### ❌ Database Connection Error
```
→ Vérifie que PostgreSQL est créé
→ Copie bien l'URL "Internal Database URL"
→ Met-la exactement dans DATABASE_URL
```

### ❌ DisallowedHost
```
→ Ajoute l'URL à ALLOWED_HOSTS
→ Redéploie (Render le fera auto à chaque push)
```

### ❌ Migrations Failed
```
→ Peut être une erreur dans un modèle Django
→ Vérifie les logs pour l'erreur
→ Fix et push sur GitHub
```

---

## 🎯 URL FINALE

```
https://evexticket-api.onrender.com
```

### Endpoints à tester:
- Admin: `/admin/`
- Swagger: `/swagger/`
- Cities: `/api/cities/`
- Payments webhook: `/api/payments/webhook/`

---

## 📚 RESSOURCES

- [Render Docs](https://render.com/docs)
- [Django Deployment](https://docs.djangoproject.com/en/stable/howto/deployment/)
- [Render PostgreSQL](https://render.com/docs/databases)

---

## ❓ FAQ

**Q: Quel est le coût?**
A: Gratuit avec $7/mois de crédits. Suffisant pour une petite app.

**Q: Quelle région choisir?**
A: Frankfurt (EU Central) pour Europe.

**Q: Comment mettre à jour?**
A: Push sur GitHub, Render redéploie automatiquement.

**Q: Comment voir les logs?**
A: Render Dashboard > Service > Logs

**Q: Comment redéployer?**
A: Render redéploie automatiquement à chaque push GitHub.

---

## ✨ C'EST PRÊT!

1. **Immédiat:** Crée un compte Render (gratuit)
2. **5 min:** Suis `RENDER_10MIN.md`
3. **15 min:** Lis `RENDER_FRESH_START.md` pour les détails
4. **3-5 min:** Attends que Render déploie
5. **2 min:** Teste l'admin et l'API

**Prêt? Va sur https://dashboard.render.com! 🚀**
