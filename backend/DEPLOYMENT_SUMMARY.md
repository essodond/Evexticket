# 🚀 RAILWAY DEPLOYMENT - RÉSUMÉ COMPLET

## ✅ CHECKLIST AVANT LE DÉPLOIEMENT

- [ ] Code sur GitHub (repo public ou privé)
- [ ] `.gitignore` configure `.env` et `db.sqlite3`
- [ ] `requirements.txt` à jour avec gunicorn et psycopg2
- [ ] `Procfile` présent ✅ (créé automatiquement)
- [ ] `Dockerfile` présent ✅ (créé automatiquement)
- [ ] `build.sh` présent ✅ (existe déjà)
- [ ] `start.sh` présent ✅ (existe déjà)
- [ ] `runtime.txt` présent ✅ (existe déjà)
- [ ] `SECRET_KEY` généré (ne pas pousser sur GitHub)
- [ ] Test en local (`python manage.py runserver`)
- [ ] Logs vérifiés (pas d'erreurs Django)

---

## 🚀 DÉPLOIEMENT EN 5 ÉTAPES

### 1️⃣ VIA INTERFACE WEB (RECOMMANDÉ)

```
1. Va sur https://railway.app/dashboard
2. Clique "New Project" > "Deploy from GitHub repo"
3. Autorise Railway et sélectionne ton repo
4. Railway crée le Web Service
5. Clique "+ Add" et ajoute PostgreSQL
6. Va dans le Web Service > Variables > Ajoute:
   - DEBUG=False
   - SECRET_KEY=[générée]
   - ALLOWED_HOSTS=your-app.railway.app
   - CORS_ALLOW_ALL=True
7. Railway détecte le Procfile et démarre automatiquement
8. Attends 2-3 min, puis vérifie les logs
```

### 2️⃣ VIA CLI RAILWAY

```bash
npm install -g @railway/cli
railway login
cd backend
railway init        # Crée un nouveau projet
railway add         # Ajoute PostgreSQL
railway variables set DEBUG=False
railway variables set SECRET_KEY=your-key
railway variables set ALLOWED_HOSTS=your-app.railway.app
railway up          # Déploie tout
railway logs        # Vérifie les logs
```

---

## 📊 QU'EST-CE QUI SE PASSE PENDANT LE DÉPLOIEMENT

```
1. Railway pull ton code depuis GitHub
2. Build le Dockerfile ou détecte Procfile
3. Installe les dépendances (pip install -r requirements.txt)
4. Collecte les static files (python manage.py collectstatic)
5. Lance la commande "release" du Procfile:
   - Applique les migrations (python manage.py migrate)
   - Crée le superuser (python create_superuser.py)
6. Lance la commande "web" du Procfile:
   - Démarre Gunicorn (gunicorn togotrans_api.wsgi:application)
7. L'app est maintenant LIVE! 🎉
```

---

## 🧪 COMMENT TESTER APRÈS LE DÉPLOIEMENT

Récupère l'URL depuis Railway (ex: `https://evexticket-api.railway.app`)

### Test 1: Admin Django
```
https://evexticket-api.railway.app/admin/
Username: admin
Password: [celui configuré]
```

### Test 2: API Swagger
```
https://evexticket-api.railway.app/swagger/
```

### Test 3: API publique
```bash
curl https://evexticket-api.railway.app/api/cities/
```

### Test 4: Webhooks (optionnel)
```bash
curl -X POST https://evexticket-api.railway.app/api/payments/webhook/ \
  -H "Content-Type: application/json" \
  -d '{"status": "success"}'
```

---

## 🔗 CONNECTER LE FRONTEND

Dans ton `.env` frontend:

```
VITE_API_URL=https://evexticket-api.railway.app
VITE_API_BASE_URL=https://evexticket-api.railway.app/api
```

---

## 📚 DOCUMENTATION DE DÉPLOIEMENT

J'ai créé plusieurs fichiers pour t'aider:

| Fichier | Contenu |
|---------|---------|
| `RAILWAY_QUICK_START.md` | Résumé 5 min |
| `DEPLOY_RAILWAY.md` | Guide complet (long) |
| `RAILWAY_CLI_DETAILED.md` | CLI + Troubleshooting |
| `.env.railway` | Variables d'env pour prod |
| `Procfile` | Commandes de démarrage ✅ |
| `Dockerfile` | Config Docker ✅ |
| `railway.json` | Config Railway ✅ |

---

## 🚨 VARIABLES D'ENVIRONNEMENT À CONFIGURER

```
# Django
DEBUG=False
SECRET_KEY=<génère-une-clé>
ALLOWED_HOSTS=your-app.railway.app

# Database
DATABASE_URL=<généré par Railway>

# CORS
CORS_ALLOW_ALL=True
CORS_EXTRA_ORIGINS=https://yourdomain.com

# Qospay
QOSPAY_BASE_URL=https://api.qosic.net
QOSPAY_CLIENT_ID=USR01
QOSPAY_USERNAME=USR01
QOSPAY_PASSWORD=YG739G5XFVPYYV4ADJVW
QOSPAY_CALLBACK_URL=https://your-app.railway.app/api/payments/webhook/

# Email (optionnel)
EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend
```

---

## ⚠️ POINTS IMPORTANTS

1. **Ne push pas `.env` sur GitHub!** C'est déjà dans `.gitignore`
2. **Génère une vraie `SECRET_KEY` pour la prod**, pas la locale
3. **Mets `DEBUG=False` en production**
4. **ALLOWED_HOSTS** doit contenir l'URL de Railway
5. **DATABASE_URL** est générée automatiquement par Railway
6. **Qospay callback** doit pointer vers ton URL Railway

---

## 🎯 APRÈS LE DÉPLOIEMENT

- ✅ Teste tous les endpoints
- ✅ Vérifie les logs pour les erreurs
- ✅ Configure le frontend avec la bonne URL API
- ✅ Teste les paiements via Qospay
- ✅ Configure un domaine personnalisé (optionnel)
- ✅ Active les notifications Slack (optionnel)

---

## 🆘 BESOIN D'AIDE?

**Logs en temps réel:**
```bash
railway logs --follow
```

**Vérifier une variable:**
```bash
railway variables
```

**Redéployer:**
```bash
railway redeploy
```

**Exécuter une commande sur le serveur:**
```bash
railway run python manage.py shell
```

---

## 🔗 RESSOURCES

- [Railway Docs](https://docs.railway.app)
- [Django Deployment](https://docs.djangoproject.com/en/stable/howto/deployment/)
- [Procfile Reference](https://devcenter.heroku.com/articles/procfile)

---

**Tu es prêt à déployer? 🚀 Commence par la méthode Web, c'est la plus simple!**

Des questions? Regarde les autres fichiers de documentation ou les logs Railway!
