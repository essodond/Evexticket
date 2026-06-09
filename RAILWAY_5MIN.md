# ⚡ 5 MINUTES - ULTRA RAPIDE RAILWAY

## Les 5 Étapes (5 min max)

### 1. GitHub
```bash
git add . && git commit -m "Deploy" && git push
```

### 2. Railway
```
https://railway.app/dashboard > "+ New Project" > "GitHub repo"
```

### 3. BD
```
Railway > "+ Add" > "PostgreSQL"
```

### 4. Vars
```
Web Service > Variables > Ajoute:
- DEBUG=False
- SECRET_KEY=[générée]
- ALLOWED_HOSTS=your-app.railway.app
- CORS_ALLOW_ALL=True
```

### 5. Attendre
```
Railway lance le build automatiquement
Attends 3 min...
Clique "View Deployment" > Test l'admin
```

## URL Finale
```
https://your-app.railway.app/admin/
https://your-app.railway.app/api/cities/
```

## Frontend
```
VITE_API_URL=https://your-app.railway.app
```

**DONE! 🚀**

---

Pour les détails:
- `RAILWAY_VISUAL_STEPS.md` → Step-by-step visuel
- `DEPLOYMENT_SUMMARY.md` → Vue d'ensemble complète
- `RAILWAY_CLI_DETAILED.md` → CLI + Troubleshooting
