# ⚡ RENDER - 10 MIN (ULTRA RAPIDE)

## Les 7 Étapes

### 1. Push GitHub
```bash
git add . && git commit -m "Render deploy" && git push
```

### 2. Render Dashboard
```
https://dashboard.render.com
```

### 3. Créer PostgreSQL
```
"+ New +" > "PostgreSQL"
Name: evexticket-db
Database: evexticket
User: evexticket
Region: Frankfurt
Plan: Free
→ Copie "Internal Database URL"
```

### 4. Créer Web Service
```
"+ New +" > "Web Service"
GitHub repo: evexticket
Name: evexticket-api
Region: Frankfurt
Branch: main
Root: backend
Runtime: Python
Build: ./build.sh
Start: gunicorn togotrans_api.wsgi:application
Plan: Free
```

### 5. Variables
```
DATABASE_URL = [colle l'URL de PostgreSQL]
SECRET_KEY = [clique Generate]
DEBUG = False
CORS_ALLOW_ALL = True
ALLOWED_HOSTS = evexticket-api.onrender.com
DJANGO_SUPERUSER_USERNAME = admin
DJANGO_SUPERUSER_PASSWORD = [choose]
DJANGO_SUPERUSER_EMAIL = admin@evexticket.com
```

### 6. Créer
```
Clique "Create Web Service"
Attend que ça passe en "Live" (vert)
```

### 7. Tester
```
https://evexticket-api.onrender.com/admin/
```

## URL Finale
```
https://evexticket-api.onrender.com
```

## Frontend Config
```
VITE_API_URL=https://evexticket-api.onrender.com
```

**DONE! 🚀**

---

Pour les détails: `RENDER_FRESH_START.md` ou `DEPLOY_RENDER.md`
