# 🚀 START HERE - DEPLOYMENT

## Du code... à la production en 10 minutes!

---

## 🎯 CHOISIS TA PLATEFORME

### ⭐ RENDER (Recommandé)
**Plus simple, plus rapide**

```bash
# 1. Push ton code
git add . && git commit -m "Deploy" && git push

# 2. Lis le guide rapide (5 min)
cat RENDER_10MIN.md

# 3. Va sur https://dashboard.render.com
# 4. Suis les 7 étapes
# 5. Attends 3-5 min
# 6. BOOM! 🎉 Tu es en prod
```

### 🚂 RAILWAY (Alternative)
**Plus de features**

```bash
# 1. Push ton code
git add . && git commit -m "Deploy" && git push

# 2. Lis le guide rapide (5 min)
cat RAILWAY_5MIN.md

# 3. Va sur https://railway.app/dashboard
# 4. Suis les 5 étapes
# 5. Attends 3-5 min
# 6. BOOM! 🎉 Tu es en prod
```

---

## 🏃 RENDER - 7 ÉTAPES ULTRA RAPIDES

### 1️⃣ GitHub
```bash
git add . && git commit -m "Deploy" && git push
```

### 2️⃣ Render Dashboard
```
https://dashboard.render.com
```

### 3️⃣ PostgreSQL
```
+ New > PostgreSQL
Name: evexticket-db
Region: Frankfurt
→ Copie l'URL
```

### 4️⃣ Web Service
```
+ New > Web Service
Root: backend
Build: ./build.sh
Start: gunicorn togotrans_api.wsgi:application
```

### 5️⃣ Variables
```
DATABASE_URL=[colle l'URL]
SECRET_KEY=Generate
DEBUG=False
CORS_ALLOW_ALL=True
ALLOWED_HOSTS=evexticket-api.onrender.com
DJANGO_SUPERUSER_USERNAME=admin
DJANGO_SUPERUSER_PASSWORD=[choose]
DJANGO_SUPERUSER_EMAIL=admin@evexticket.com
```

### 6️⃣ Create & Wait
```
Clique "Create Web Service"
Attends 3-5 min (vert = Live)
```

### 7️⃣ Test
```
https://evexticket-api.onrender.com/admin/
https://evexticket-api.onrender.com/api/cities/
```

---

## 🎯 RÉSULTAT

### Ton Backend est LIVE! 🎉

```
API:     https://evexticket-api.onrender.com
Admin:   https://evexticket-api.onrender.com/admin/
Swagger: https://evexticket-api.onrender.com/swagger/
```

### Configure le Frontend
```
VITE_API_URL=https://evexticket-api.onrender.com
```

---

## 📖 DOCUMENTATION

| Besoin | Fichier |
|--------|---------|
| **Render ultra rapide** | `RENDER_10MIN.md` |
| **Render avec détails** | `RENDER_FRESH_START.md` |
| **Render checklist** | `backend/RENDER_DEPLOYMENT_CHECKLIST.md` |
| **Railway ultra rapide** | `RAILWAY_5MIN.md` |
| **Vue d'ensemble** | `DEPLOYMENT_INDEX.md` |

---

## ✅ PRÉ-VÉRIFICATION

```bash
# Vérifie que tout est OK
bash backend/check_render_ready.sh

# Si OK → À toi de jouer!
```

---

## 🆘 PROBLÈME?

1. Lire `RENDER_FRESH_START.md` (section Troubleshooting)
2. Regarde les logs Render Dashboard
3. Fix et push sur GitHub
4. Render redéploie auto ✅

---

## 🚀 ALLEZ-Y!

**Prêt?**

1. **Lis:** `RENDER_10MIN.md` (5 min)
2. **Va sur:** https://dashboard.render.com
3. **Suis:** Les 7 étapes
4. **Attends:** 3-5 min
5. **Teste:** L'admin et l'API
6. **Célèbre:** 🎉

---

**C'est parti! Tu vas faire! 🚀**
