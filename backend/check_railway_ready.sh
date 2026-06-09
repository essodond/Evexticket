#!/bin/bash
# 🚀 Script de préparation pour déploiement Railway
# Ce script vérifie que tout est prêt avant le déploiement

set -e

echo "════════════════════════════════════════════════════════════"
echo "    🚀 RAILWAY DEPLOYMENT PREPARATION CHECKLIST"
echo "════════════════════════════════════════════════════════════"

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

check_pass() {
    echo -e "${GREEN}✅ $1${NC}"
}

check_fail() {
    echo -e "${RED}❌ $1${NC}"
}

check_warn() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

echo ""
echo "1️⃣  VÉRIFICATION DES FICHIERS"
echo "─────────────────────────────────────────────────────────────"

# Vérifier requirements.txt
if [ -f "requirements.txt" ]; then
    check_pass "requirements.txt existe"
else
    check_fail "requirements.txt MANQUANT!"
    exit 1
fi

# Vérifier Procfile
if [ -f "Procfile" ]; then
    check_pass "Procfile existe"
else
    check_fail "Procfile MANQUANT!"
    exit 1
fi

# Vérifier Dockerfile
if [ -f "Dockerfile" ]; then
    check_pass "Dockerfile existe"
else
    check_fail "Dockerfile MANQUANT!"
    exit 1
fi

# Vérifier build.sh
if [ -f "build.sh" ]; then
    check_pass "build.sh existe"
else
    check_fail "build.sh MANQUANT!"
    exit 1
fi

# Vérifier start.sh
if [ -f "start.sh" ]; then
    check_pass "start.sh existe"
else
    check_fail "start.sh MANQUANT!"
    exit 1
fi

# Vérifier runtime.txt
if [ -f "runtime.txt" ]; then
    check_pass "runtime.txt existe"
else
    check_fail "runtime.txt MANQUANT!"
    exit 1
fi

echo ""
echo "2️⃣  VÉRIFICATION GIT"
echo "─────────────────────────────────────────────────────────────"

# Vérifier que le repo git existe
if [ -d "../.git" ]; then
    check_pass "Repo Git détecté"
else
    check_fail "Repo Git MANQUANT! (Init avec 'git init' et push sur GitHub)"
    exit 1
fi

# Vérifier qu'il n'y a pas de fichiers non committés
cd ..
if git diff-index --quiet HEAD --; then
    check_pass "Tous les fichiers sont committés"
else
    check_warn "Il y a des fichiers modifiés non committés. Push-les avant le déploiement:"
    git status
fi

# Vérifier que .env est ignoré
if grep -q "\.env" .gitignore; then
    check_pass ".env est dans .gitignore"
else
    check_warn ".env n'est pas dans .gitignore! Ajoute-le pour éviter les fuites de secrets"
fi

echo ""
echo "3️⃣  VÉRIFICATION DES DÉPENDANCES"
echo "─────────────────────────────────────────────────────────────"

cd backend

# Vérifier que gunicorn est dans requirements.txt
if grep -q "gunicorn" requirements.txt; then
    check_pass "gunicorn est dans requirements.txt"
else
    check_fail "gunicorn MANQUANT dans requirements.txt!"
    exit 1
fi

# Vérifier que Django est dans requirements.txt
if grep -q "Django" requirements.txt; then
    check_pass "Django est dans requirements.txt"
else
    check_fail "Django MANQUANT dans requirements.txt!"
    exit 1
fi

# Vérifier que psycopg2 est dans requirements.txt (pour PostgreSQL)
if grep -q "psycopg2\|psycopg" requirements.txt; then
    check_pass "psycopg2 est dans requirements.txt (PostgreSQL driver)"
else
    check_warn "psycopg2 n'est pas dans requirements.txt. Ajoute-le: pip install psycopg2-binary"
fi

echo ""
echo "4️⃣  VÉRIFICATION DE LA CONFIGURATION DJANGO"
echo "─────────────────────────────────────────────────────────────"

# Vérifier que togotrans_api existe (ou chercher wsgi.py)
if [ -d "togotrans_api" ]; then
    if [ -f "togotrans_api/wsgi.py" ]; then
        check_pass "togotrans_api/wsgi.py existe"
    else
        check_fail "togotrans_api/wsgi.py MANQUANT!"
        exit 1
    fi
else
    check_fail "Dossier togotrans_api MANQUANT!"
    exit 1
fi

# Vérifier manage.py
if [ -f "manage.py" ]; then
    check_pass "manage.py existe"
else
    check_fail "manage.py MANQUANT!"
    exit 1
fi

echo ""
echo "════════════════════════════════════════════════════════════"
echo "✅ TOUS LES CHECKS SONT PASSÉS!"
echo "════════════════════════════════════════════════════════════"

echo ""
echo "🚀 PROCHAINES ÉTAPES:"
echo ""
echo "1. Va sur https://railway.app/dashboard"
echo "2. Crée un nouveau projet"
echo "3. Sélectionne 'Deploy from GitHub repo'"
echo "4. Autorise Railway et sélectionne ton repo"
echo "5. Ajoute PostgreSQL via '+ Add'"
echo "6. Configure les variables d'env (voir .env.railway)"
echo "7. Railway détecte le Procfile et lance le déploiement automatiquement"
echo ""
echo "Pour plus de détails, voir RAILWAY_QUICK_START.md ou DEPLOY_RAILWAY.md"
echo ""
