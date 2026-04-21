@echo off
REM ============================================================================
REM EVEXTICKET - LOCAL DEVELOPMENT SETUP SCRIPT (WINDOWS)
REM ============================================================================
REM This script sets up everything you need to run Evexticket locally
REM Backend + Web + Mobile all working together

setlocal enabledelayedexpansion

echo.
echo 🚀 EVEXTICKET LOCAL DEVELOPMENT SETUP
echo ========================================
echo.

REM ============================================================================
REM STEP 1: BACKEND SETUP
REM ============================================================================
echo 📦 Step 1: Backend Setup
echo ------------------------

cd backend

REM Create .env for local development
echo Creating .env file for backend...
(
    echo DEBUG=True
    echo SECRET_KEY=django-insecure-local-development-key-change-in-production
    echo ALLOWED_HOSTS=localhost,127.0.0.1,192.168.1.*,10.0.0.*
    echo.
    echo REM Database (SQLite for local development^)
    echo DATABASE_URL=sqlite:///db.sqlite3
    echo.
    echo REM CORS - Allow web and mobile access from local machine
    echo CORS_ALLOWED_ORIGINS=http://localhost:4173,http://localhost:5173,http://localhost:19006,http://localhost:8081,http://127.0.0.1:5173,http://127.0.0.1:4173,exp://localhost:19000
    echo.
    echo REM API URL for responses
    echo API_BASE_URL=http://localhost:8000/api
    echo.
    echo REM Email settings (console output for local testing^)
    echo EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend
) > .env

echo ✅ .env created

REM Create virtual environment
if not exist "venv\" (
    echo Creating virtual environment...
    python -m venv venv
)

echo Activating virtual environment and installing requirements...
call venv\Scripts\activate.bat

pip install -q -r requirements.txt >nul 2>&1 || (
    echo requirements.txt not found, installing common packages...
    pip install Django djangorestframework django-cors-headers python-dotenv dj-database-url drf-yasg
)

REM Run migrations
echo Running migrations...
python manage.py migrate

REM Create admin user
echo Creating admin user (admin/admin123^)...
python manage.py shell << ADMIN_SETUP
from django.contrib.auth.models import User
if not User.objects.filter(username='admin').exists():
    User.objects.create_superuser('admin', 'admin@test.com', 'admin123')
    print("✅ Admin user created: admin/admin123")
else:
    print("✅ Admin user already exists")
ADMIN_SETUP

cd ..

echo ✅ Backend ready!
echo.

REM ============================================================================
REM STEP 2: WEB FRONTEND SETUP
REM ============================================================================
echo 🌐 Step 2: Web Frontend Setup
echo ----------------------------

REM Create .env.local for web frontend
echo Creating .env.local for web frontend...
(
    echo VITE_API_BASE_URL=http://localhost:8000/api
) > .env.local

echo ✅ .env.local created for web

REM Install web dependencies if needed
if not exist "node_modules\" (
    echo Installing web dependencies...
    call npm install -q
)

echo ✅ Web frontend ready!
echo.

REM ============================================================================
REM STEP 3: MOBILE SETUP
REM ============================================================================
echo 📱 Step 3: Mobile Setup
echo ----------------------

cd react-native-reference

REM Create .env for mobile
echo Creating .env for mobile...
(
    echo EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:8000/api
    echo EXPO_PUBLIC_API_URL=http://10.0.2.2:8000/api
) > .env

REM Install mobile dependencies if needed
if not exist "node_modules\" (
    echo Installing mobile dependencies...
    call npm install -q
)

cd ..

echo ✅ Mobile ready!
echo.

REM ============================================================================
REM DISPLAY QUICK START INSTRUCTIONS
REM ============================================================================
echo.
echo ✅ SETUP COMPLETE!
echo.
echo ========================================
echo 🚀 TO START DEVELOPMENT:
echo ========================================
echo.
echo 📦 TERMINAL 1 - Backend:
echo   cd backend
echo   venv\Scripts\activate
echo   python manage.py runserver
echo.
echo 🌐 TERMINAL 2 - Web:
echo   npm run dev
echo.
echo 📱 TERMINAL 3 - Mobile:
echo   cd react-native-reference
echo   npm start
echo.
echo ========================================
echo 🔗 ACCESS POINTS:
echo ========================================
echo Backend Admin:  http://localhost:8000/admin
echo Web App:        http://localhost:5173 or http://127.0.0.1:4173
echo Mobile:         Scan QR from Terminal 3
echo.
echo ========================================
echo 👤 TEST ACCOUNTS:
echo ========================================
echo Admin:    admin / admin123
echo User:     test@test.com / test123456
echo.
echo ========================================
echo ⚠️  IMPORTANT NOTES:
echo ========================================
echo 1. All data is stored in SQLite (db.sqlite3^)
echo 2. Admin panel: http://localhost:8000/admin
echo 3. API docs: http://localhost:8000/swagger
echo 4. Make sure you have Python and Node.js installed
echo.
echo Ready to go! 🎉

pause
