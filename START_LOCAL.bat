@echo off
REM Quick start all 3 servers for Windows

echo 🚀 Starting Evexticket locally...
echo.

REM Backend
echo 📦 Starting Backend...
cd backend
call venv\Scripts\activate.bat
start cmd /k python manage.py runserver
cd ..

REM Wait for backend
timeout /t 2 /nobreak

REM Web
echo 🌐 Starting Web...
start cmd /k npm run dev

REM Wait for web
timeout /t 3 /nobreak

REM Mobile
echo 📱 Starting Mobile...
cd react-native-reference
start cmd /k npm start
cd ..

echo.
echo ✅ All services started in separate terminals!
echo.
echo Access points:
echo   Backend:  http://localhost:8000
echo   Admin:    http://localhost:8000/admin ^(admin/admin123^)
echo   Web:      http://localhost:5173
echo   Mobile:   Scan QR from terminal output
echo.
echo You can now close these terminals individually when done.
echo.

pause
