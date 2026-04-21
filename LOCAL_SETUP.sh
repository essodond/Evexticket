#!/bin/bash
# ============================================================================
# EVEXTICKET - LOCAL DEVELOPMENT SETUP SCRIPT
# ============================================================================
# This script sets up everything you need to run Evexticket locally
# Backend + Web + Mobile all working together

echo "🚀 EVEXTICKET LOCAL DEVELOPMENT SETUP"
echo "========================================"
echo ""

# ============================================================================
# STEP 1: BACKEND SETUP
# ============================================================================
echo "📦 Step 1: Backend Setup"
echo "------------------------"

cd backend

# Create .env for local development
echo "Creating .env file for backend..."
cat > .env << 'BACKEND_ENV'
DEBUG=True
SECRET_KEY=django-insecure-local-development-key-change-in-production
ALLOWED_HOSTS=localhost,127.0.0.1,192.168.1.*,10.0.0.*

# Database (SQLite for local development)
DATABASE_URL=sqlite:///db.sqlite3

# CORS - Allow web and mobile access from local machine
CORS_ALLOWED_ORIGINS=http://localhost:4173,http://localhost:5173,http://localhost:19006,http://localhost:8081,http://192.168.1.0:4173,http://192.168.1.0:5173,http://192.168.1.0:19006,exp://localhost:19000

# API URL for responses
API_BASE_URL=http://localhost:8000/api

# Email settings (console output for local testing)
EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend
BACKEND_ENV

echo "✅ .env created"

# Install requirements
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python -m venv venv
fi

echo "Activating virtual environment and installing requirements..."
source venv/bin/activate 2>/dev/null || . venv/Scripts/activate

pip install -q -r requirements.txt 2>/dev/null || {
    echo "requirements.txt not found, installing common packages..."
    pip install Django djangorestframework django-cors-headers python-dotenv dj-database-url drf-yasg
}

# Run migrations
echo "Running migrations..."
python manage.py migrate

# Create admin user if it doesn't exist
echo "Creating admin user (admin/admin123)..."
python manage.py shell << 'ADMIN_SETUP'
from django.contrib.auth.models import User
if not User.objects.filter(username='admin').exists():
    User.objects.create_superuser('admin', 'admin@test.com', 'admin123')
    print("✅ Admin user created: admin/admin123")
else:
    print("✅ Admin user already exists")
ADMIN_SETUP

cd ..

echo "✅ Backend ready!"
echo ""

# ============================================================================
# STEP 2: WEB FRONTEND SETUP
# ============================================================================
echo "🌐 Step 2: Web Frontend Setup"
echo "------------------------------"

# Create .env for web frontend
echo "Creating .env.local for web frontend..."
cat > .env.local << 'WEB_ENV'
VITE_API_BASE_URL=http://localhost:8000/api
WEB_ENV

echo "✅ .env.local created for web"

# Install web dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing web dependencies..."
    npm install -q
fi

echo "✅ Web frontend ready!"
echo ""

# ============================================================================
# STEP 3: MOBILE SETUP
# ============================================================================
echo "📱 Step 3: Mobile Setup"
echo "----------------------"

cd react-native-reference

# Create .env for mobile
echo "Creating .env for mobile..."
cat > .env << 'MOBILE_ENV'
EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:8000/api
EXPO_PUBLIC_API_URL=http://10.0.2.2:8000/api
MOBILE_ENV

# Install mobile dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing mobile dependencies..."
    npm install -q
fi

cd ..

echo "✅ Mobile ready!"
echo ""

# ============================================================================
# DISPLAY QUICK START INSTRUCTIONS
# ============================================================================
echo ""
echo "✅ SETUP COMPLETE!"
echo ""
echo "========================================"
echo "🚀 TO START DEVELOPMENT:"
echo "========================================"
echo ""
echo "📦 TERMINAL 1 - Backend:"
echo "  cd backend"
echo "  source venv/bin/activate  # or venv\\Scripts\\activate on Windows"
echo "  python manage.py runserver"
echo ""
echo "🌐 TERMINAL 2 - Web:"
echo "  npm run dev"
echo ""
echo "📱 TERMINAL 3 - Mobile:"
echo "  cd react-native-reference"
echo "  npm start"
echo ""
echo "========================================"
echo "🔗 ACCESS POINTS:"
echo "========================================"
echo "Backend Admin:  http://localhost:8000/admin"
echo "Web App:        http://localhost:5173"
echo "Mobile:         Scan QR from Terminal 3"
echo ""
echo "========================================"
echo "👤 TEST ACCOUNTS:"
echo "========================================"
echo "Admin:    admin / admin123"
echo "User:     test@test.com / test123456"
echo ""
echo "========================================"
echo "⚠️  IMPORTANT NOTES:"
echo "========================================"
echo "1. All data is stored in SQLite (db.sqlite3)"
echo "2. Admin panel: http://localhost:8000/admin"
echo "3. API docs: http://localhost:8000/swagger"
echo ""
echo "Ready to go! 🎉"
