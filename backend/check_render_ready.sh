#!/bin/bash
# 🚀 Script de vérification avant déploiement Render

set -e

echo "════════════════════════════════════════════════════════════"
echo "    🚀 RENDER DEPLOYMENT - PRE-CHECK"
echo "════════════════════════════════════════════════════════════"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

check_pass() { echo -e "${GREEN}✅ $1${NC}"; }
check_fail() { echo -e "${RED}❌ $1${NC}"; }
check_warn() { echo -e "${YELLOW}⚠️  $1${NC}"; }

echo ""
echo "1️⃣  CHECKING FILES"
echo "────────────────────────────────────────────────────────────"

files=("requirements.txt" "build.sh" "start.sh" "runtime.txt" "manage.py")
for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        check_pass "$file exists"
    else
        check_fail "$file MISSING!"
        exit 1
    fi
done

# Check render.yaml
if [ -f "render.yaml" ]; then
    check_pass "render.yaml exists"
else
    check_warn "render.yaml not found (Render will auto-detect from GitHub)"
fi

echo ""
echo "2️⃣  CHECKING GIT"
echo "────────────────────────────────────────────────────────────"

cd ..
if [ -d ".git" ]; then
    check_pass "Git repo detected"
else
    check_fail "Git repo NOT found!"
    exit 1
fi

if git diff-index --quiet HEAD --; then
    check_pass "All files committed"
else
    check_warn "Uncommitted changes detected:"
    git status --short
fi

if grep -q "\.env" .gitignore 2>/dev/null; then
    check_pass ".env in .gitignore"
else
    check_fail ".env NOT in .gitignore!"
    exit 1
fi

echo ""
echo "3️⃣  CHECKING DEPENDENCIES"
echo "────────────────────────────────────────────────────────────"

cd backend

deps=("Django" "gunicorn" "psycopg2" "djangorestframework")
for dep in "${deps[@]}"; do
    if grep -q "$dep" requirements.txt; then
        check_pass "$dep found in requirements.txt"
    else
        check_fail "$dep MISSING in requirements.txt!"
        exit 1
    fi
done

echo ""
echo "4️⃣  CHECKING DJANGO CONFIG"
echo "────────────────────────────────────────────────────────────"

if [ -f "togotrans_api/wsgi.py" ]; then
    check_pass "wsgi.py found"
else
    check_fail "wsgi.py NOT found!"
    exit 1
fi

if [ -f "manage.py" ]; then
    check_pass "manage.py found"
else
    check_fail "manage.py NOT found!"
    exit 1
fi

echo ""
echo "════════════════════════════════════════════════════════════"
echo "✅ ALL CHECKS PASSED!"
echo "════════════════════════════════════════════════════════════"

echo ""
echo "🚀 NEXT STEPS:"
echo ""
echo "1. Push to GitHub:"
echo "   git add . && git commit -m 'Deploy Render' && git push"
echo ""
echo "2. Go to https://dashboard.render.com"
echo ""
echo "3. Create PostgreSQL:"
echo "   + New > PostgreSQL"
echo "   Name: evexticket-db"
echo "   Region: Frankfurt"
echo "   Copy Internal Database URL"
echo ""
echo "4. Create Web Service:"
echo "   + New > Web Service"
echo "   Root Directory: backend"
echo "   Build: ./build.sh"
echo "   Start: gunicorn togotrans_api.wsgi:application"
echo ""
echo "5. Add Environment Variables:"
echo "   DATABASE_URL=[from PostgreSQL]"
echo "   SECRET_KEY=[Generate]"
echo "   DEBUG=False"
echo "   DJANGO_SUPERUSER_USERNAME=admin"
echo "   DJANGO_SUPERUSER_PASSWORD=[choose]"
echo ""
echo "For details, see RENDER_FRESH_START.md or RENDER_10MIN.md"
echo ""
