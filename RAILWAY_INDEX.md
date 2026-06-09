# 📚 INDEX - FICHIERS DE DÉPLOIEMENT RAILWAY

## 📂 Structure créée

```
backend/
├── Procfile                           ✨ NOUVEAU - Commandes de démarrage
├── Dockerfile                         ✨ NOUVEAU - Build Docker
├── railway.json                       ✨ NOUVEAU - Config Railway
├── .env.railway                       ✨ NOUVEAU - Exemple vars prod
├── DEPLOYMENT_SUMMARY.md              ✨ NOUVEAU - Vue d'ensemble
├── DEPLOY_RAILWAY.md                  ✨ NOUVEAU - Guide complet
├── RAILWAY_QUICK_START.md             ✨ NOUVEAU - Résumé 10 min
├── RAILWAY_VISUAL_STEPS.md            ✨ NOUVEAU - Step by step visuel
├── RAILWAY_CLI_DETAILED.md            ✨ NOUVEAU - CLI + troubleshooting
├── check_railway_ready.sh             ✨ NOUVEAU - Script de vérification
├── build.sh                           (existant)
├── start.sh                           (existant)
├── runtime.txt                        (existant)
├── requirements.txt                   (existant)
├── manage.py                          (existant)
├── togotrans_api/
│   └── wsgi.py                        (existant)
└── ...
```

Et à la racine:
```
├── RAILWAY_5MIN.md                    ✨ NOUVEAU - Ultra rapide (5 min)
└── ...
```

---

## 📖 GUIDE DE LECTURE

### 🏃 J'ai 5 minutes
**→ Lis** `RAILWAY_5MIN.md`
- Les 5 étapes essentielles
- URLs finales
- Configuration minimale

### 🚴 J'ai 10 minutes
**→ Lis** `backend/RAILWAY_QUICK_START.md`
- Résumé du déploiement
- Variables d'env
- Les fichiers importants
- Vérification finale

### 🚗 J'ai 20 minutes et je veux comprendre
**→ Lis** `backend/RAILWAY_VISUAL_STEPS.md`
- Step by step avec screenshots
- Étapes détaillées
- Troubleshooting simple
- Tests après déploiement

### 🚁 Je veux TOUT savoir
**→ Lis** `backend/DEPLOYMENT_SUMMARY.md`
- Checklist complète
- Vue d'ensemble du processus
- Toutes les variables
- Guide de test
- Ressources

### 💻 Je préfère la CLI
**→ Lis** `backend/RAILWAY_CLI_DETAILED.md`
- Installation CLI
- Commandes détaillées
- Troubleshooting avancé
- Tips & tricks

### 📖 Je veux la documentation complète
**→ Lis** `backend/DEPLOY_RAILWAY.md`
- Guide long et détaillé (similaire à DEPLOY_RENDER.md)
- Toutes les étapes
- Explications complètes

---

## 📋 FICHIERS DE CONFIGURATION

### Procfile ✅
**Ce que c'est:** Définit comment Railway démarre l'app
**Contient:**
- `release:` → Commandes avant le démarrage (migrations)
- `web:` → Commande pour lancer l'app (gunicorn)

### Dockerfile ✅
**Ce que c'est:** Définit comment builder l'image Docker
**Contient:**
- Base image Python 3.12.3
- Installation des dépendances
- Collecte des static files
- Port exposé: 8000

### railway.json ✅
**Ce que c'est:** Config spécifique à Railway
**Contient:**
- Build command
- Deploy command
- Restart policy

### .env.railway ✅
**Ce que c'est:** Exemple de variables d'env pour la production
**À utiliser:** Copie-colle dans Railway Dashboard > Variables

---

## 🔑 VARIABLES D'ENVIRONNEMENT

À configurer dans Railway Dashboard:

```
DEBUG=False
SECRET_KEY=[généré]
ALLOWED_HOSTS=your-app.railway.app
CORS_ALLOW_ALL=True
CORS_EXTRA_ORIGINS=http://localhost:5173,https://yourdomain.com
QOSPAY_CALLBACK_URL=https://your-app.railway.app/api/payments/webhook/
```

`DATABASE_URL` est généré automatiquement par Railway (PostgreSQL) ✅

---

## ✅ PRÉREQUIS VÉRIFIÉS

- ✅ `gunicorn==23.0.0` dans requirements.txt
- ✅ `psycopg2-binary==2.9.10` dans requirements.txt
- ✅ `build.sh` pour installer les dépendances
- ✅ `start.sh` pour démarrer l'app
- ✅ `manage.py` pour les migrations
- ✅ `togotrans_api/wsgi.py` pour Django
- ✅ `runtime.txt` avec Python 3.12.3

**Tout est prêt! ✅**

---

## 🚀 COMMANDES ESSENTIELLES

### Avant le déploiement
```bash
# Vérifier que tout est OK
bash backend/check_railway_ready.sh

# Push sur GitHub
git add . && git commit -m "Deploy" && git push
```

### Installation CLI Railway
```bash
npm install -g @railway/cli
railway login
```

### Déploiement via CLI
```bash
cd backend
railway init
railway add    # PostgreSQL
railway up
```

### Voir les logs
```bash
railway logs --follow
```

### Variables
```bash
railway variables
railway variables set DEBUG=False
```

---

## 🔗 RESSOURCES EXTERNES

- [Railway Docs](https://docs.railway.app)
- [Django Deployment](https://docs.djangoproject.com/en/stable/howto/deployment/)
- [Procfile Format](https://devcenter.heroku.com/articles/procfile)
- [PostgreSQL on Railway](https://docs.railway.app/guides/databases)

---

## ❓ FAQ RAPIDE

**Q: Quel est le coût?**
A: Railway te donne $5/mois gratuit. Suffisant pour une petite app.

**Q: Quelle région choisir?**
A: Choisis la même pour l'app et la BD (ex: Frankfurt pour Europe)

**Q: Comment mettre à jour l'app?**
A: Push sur GitHub, Railway redéploie automatiquement.

**Q: Comment voir les logs?**
A: `railway logs` ou Railway Dashboard > Logs

**Q: Comment connecter le frontend?**
A: Met l'URL Railway dans le `.env` frontend

---

## 🎯 NEXT STEPS

1. **Immédiat:**
   - Lis `RAILWAY_5MIN.md` (5 sec)
   - Crée ton compte Railway

2. **Préparation (5 min):**
   - Push ton code sur GitHub
   - Généré une SECRET_KEY

3. **Déploiement (10 min):**
   - Crée un projet Railway
   - Ajoute PostgreSQL
   - Configure les variables
   - Attends 3 min

4. **Vérification (2 min):**
   - Accède à `/admin/`
   - Teste `/api/cities/`

5. **Finale:**
   - Configure le frontend
   - Test complet

---

**Tu es prêt? Commence par https://railway.app! 🚀**

Des questions? Reviens voir ces fichiers!
