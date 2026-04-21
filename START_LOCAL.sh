#!/bin/bash
# Quick start all 3 servers in the background

echo "🚀 Starting Evexticket locally..."
echo ""

# Backend
echo "📦 Starting Backend..."
cd backend
source venv/bin/activate 2>/dev/null || . venv/Scripts/activate
python manage.py runserver &
BACKEND_PID=$!
cd ..

# Wait for backend to start
sleep 2

# Web
echo "🌐 Starting Web..."
npm run dev > /tmp/web.log 2>&1 &
WEB_PID=$!

# Wait for web to start
sleep 3

# Mobile
echo "📱 Starting Mobile..."
cd react-native-reference
npm start > /tmp/mobile.log 2>&1 &
MOBILE_PID=$!
cd ..

echo ""
echo "✅ All services started!"
echo ""
echo "Access points:"
echo "  Backend:  http://localhost:8000"
echo "  Admin:    http://localhost:8000/admin (admin/admin123)"
echo "  Web:      http://localhost:5173"
echo "  Mobile:   Scan QR from terminal output"
echo ""
echo "PIDs: Backend=$BACKEND_PID, Web=$WEB_PID, Mobile=$MOBILE_PID"
echo ""
echo "To stop all: kill $BACKEND_PID $WEB_PID $MOBILE_PID"
echo ""

# Keep script running
wait
