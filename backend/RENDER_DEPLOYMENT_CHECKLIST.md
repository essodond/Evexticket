# ✅ RENDER DEPLOYMENT - FINAL CHECKLIST

## PRÉ-DÉPLOIEMENT (À FAIRE MAINTENANT)

- [ ] Code pushé sur GitHub (`git push origin main`)
- [ ] `.gitignore` contient `.env` et `db.sqlite3`
- [ ] `requirements.txt` contient:
  - [ ] Django
  - [ ] gunicorn
  - [ ] psycopg2-binary
  - [ ] djangorestframework
- [ ] `build.sh` existe et est exécutable
- [ ] `start.sh` existe et est exécutable
- [ ] `runtime.txt` = `python-3.12.3`
- [ ] `render.yaml` existe (ou sera créé via interface)
- [ ] `manage.py` existe
- [ ] `togotrans_api/wsgi.py` existe

**Comment vérifier:**
```bash
bash backend/check_render_ready.sh
```

---

## PENDANT LE DÉPLOIEMENT (SUR RENDER DASHBOARD)

### Créer PostgreSQL
- [ ] Va sur Render Dashboard
- [ ] Clique "+ New +" → "PostgreSQL"
- [ ] Remplis:
  - [ ] Name: `evexticket-db`
  - [ ] Database: `evexticket`
  - [ ] User: `evexticket`
  - [ ] Region: `Frankfurt (EU Central)`
  - [ ] Plan: `Free`
- [ ] Clique "Create Database"
- [ ] **COPIE "Internal Database URL"** 📋

### Créer Web Service
- [ ] Clique "+ New +" → "Web Service"
- [ ] Connecte ton repo GitHub
- [ ] Remplis:
  - [ ] Name: `evexticket-api`
  - [ ] Region: `Frankfurt (EU Central)` (même que BD)
  - [ ] Branch: `main`
  - [ ] Root Directory: `backend`
  - [ ] Runtime: `Python`
  - [ ] Build Command: `./build.sh`
  - [ ] Start Command: `gunicorn togotrans_api.wsgi:application`
  - [ ] Plan: `Free`

### Ajouter Variables d'Environnement
- [ ] `DATABASE_URL` = [Colle l'URL de PostgreSQL]
- [ ] `SECRET_KEY` = [Clique "Generate"]
- [ ] `DEBUG` = `False`
- [ ] `CORS_ALLOW_ALL` = `True`
- [ ] `ALLOWED_HOSTS` = `evexticket-api.onrender.com,yourdomain.com`
- [ ] `DJANGO_SUPERUSER_USERNAME` = `admin`
- [ ] `DJANGO_SUPERUSER_PASSWORD` = [Ton mot de passe fort]
- [ ] `DJANGO_SUPERUSER_EMAIL` = `admin@evexticket.com`
- [ ] `QOSPAY_BASE_URL` = `https://api.qosic.net`
- [ ] `QOSPAY_CLIENT_ID` = `USR01`
- [ ] `QOSPAY_USERNAME` = `USR01`
- [ ] `QOSPAY_PASSWORD` = `YG739G5XFVPYYV4ADJVW`
- [ ] `QOSPAY_CALLBACK_URL` = `https://evexticket-api.onrender.com/api/payments/webhook/`

### Lancer le déploiement
- [ ] Clique "Create Web Service"
- [ ] Attends que le statut passe en "Live" (vert)
- [ ] Les logs montrent:
  - [ ] `Installing build dependencies`
  - [ ] `Running build command: ./build.sh`
  - [ ] `Collecting static files`
  - [ ] `Running migrations`
  - [ ] `Creating superuser`
  - [ ] `Starting server with gunicorn`

---

## APRÈS LE DÉPLOIEMENT (VÉRIFICATIONS)

### Tests immédiats
- [ ] L'app est "Live" (vert) sur Render Dashboard
- [ ] Pas d'erreurs dans les logs

### Tests d'accès
```
- [ ] https://evexticket-api.onrender.com/admin/
  Login: admin / [ton mot de passe]
  
- [ ] https://evexticket-api.onrender.com/swagger/
  (Documentation API)
  
- [ ] https://evexticket-api.onrender.com/api/cities/
  (API publique - retourne une liste JSON)
```

### Tests de base de données
```bash
# Depuis le terminal Django admin
- [ ] Vérifier qu'il y a des données dans les tables
- [ ] Faire un test de création d'objet
```

### Tests de paiement
```
- [ ] Vérifier que le webhook URL pointe vers Render
- [ ] Tester un paiement Qospay si possible
```

---

## CONNECTER LE FRONTEND

Dans ton `.env` frontend:
```
- [ ] VITE_API_URL=https://evexticket-api.onrender.com
- [ ] VITE_API_BASE_URL=https://evexticket-api.onrender.com/api
```

Puis test:
- [ ] Frontend peut accéder à l'API
- [ ] Login fonctionne
- [ ] Données chargent correctement

---

## URL FINALE

```
Backend: https://evexticket-api.onrender.com
Admin:   https://evexticket-api.onrender.com/admin/
Swagger: https://evexticket-api.onrender.com/swagger/
```

---

## ⚠️ PROBLÈMES COURANTS

Si ça ne marche pas:

### Build Failed
1. Va dans "Logs"
2. Cherche l'erreur
3. Fix et push sur GitHub
4. Render redéploie automatiquement

### Database Connection Error
1. Vérifie que PostgreSQL est créé
2. Vérifie que DATABASE_URL est correct
3. Redéploie manuellement

### DisallowedHost
1. Ajoute l'URL à ALLOWED_HOSTS
2. Redéploie

### Static Files 404
1. C'est normal au premier déploiement
2. Les scripts `build.sh` les collecte
3. Attends et recharge

---

## 🆘 SUPPORT

**Voir les logs:**
```
Render Dashboard > Service > Logs
```

**Redéployer:**
```
Render Dashboard > Service > Redeploy
```

**Variables:**
```
Render Dashboard > Service > Environment
```

---

**Une fois tout coché ✅, c'est bon pour la production! 🚀**
