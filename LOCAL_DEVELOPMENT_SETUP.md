# 🚀 EVEXTICKET - LOCAL DEVELOPMENT SETUP GUIDE

**Goal:** Run everything locally (Backend + Web + Mobile) for full testing

---

## ⚡ QUICK START (Auto Setup)

### Option 1: Windows
```bash
# Just double-click this file:
LOCAL_SETUP.bat
```

### Option 2: macOS/Linux
```bash
# Make it executable and run:
chmod +x LOCAL_SETUP.sh
./LOCAL_SETUP.sh
```

---

## 📋 MANUAL SETUP (If Auto Setup Doesn't Work)

### Prerequisites
- **Python 3.10+** - [Download](https://www.python.org/downloads/)
- **Node.js 18+** - [Download](https://nodejs.org/)
- **Expo CLI** (for mobile) - `npm install -g expo-cli`

### Step 1: Backend Setup

```bash
# Navigate to backend
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env file (copy this):
cat > .env << 'EOF'
DEBUG=True
SECRET_KEY=django-insecure-local-development-key-change-in-production
ALLOWED_HOSTS=localhost,127.0.0.1,192.168.1.*,10.0.0.*
DATABASE_URL=sqlite:///db.sqlite3
CORS_ALLOWED_ORIGINS=http://localhost:4173,http://localhost:5173,http://localhost:19006,http://localhost:8081,http://127.0.0.1:5173,http://127.0.0.1:4173,exp://localhost:19000
API_BASE_URL=http://localhost:8000/api
EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend
EOF

# Run migrations
python manage.py migrate

# Create admin user
python manage.py createsuperuser

# Or create default user:
python manage.py shell << 'EOF'
from django.contrib.auth.models import User
if not User.objects.filter(username='admin').exists():
    User.objects.create_superuser('admin', 'admin@test.com', 'admin123')
EOF

# Start backend
python manage.py runserver
# Backend now running at: http://localhost:8000
```

### Step 2: Web Frontend Setup

```bash
# In a NEW terminal, navigate to project root
cd /path/to/Evexticket

# Create .env.local
cat > .env.local << 'EOF'
VITE_API_BASE_URL=http://localhost:8000/api
EOF

# Install dependencies
npm install

# Start web app
npm run dev
# Web now running at: http://localhost:5173 or http://127.0.0.1:4173
```

### Step 3: Mobile Setup

```bash
# In a NEW terminal, navigate to mobile folder
cd react-native-reference

# Create .env
cat > .env << 'EOF'
EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:8000/api
EXPO_PUBLIC_API_URL=http://10.0.2.2:8000/api
EOF

# Install dependencies
npm install

# Start mobile dev server
npm start
# Follow the prompts to run on Android/iOS emulator or your phone
```

---

## 🔗 Access Points

Once everything is running:

| Service | URL | Notes |
|---------|-----|-------|
| **Backend API** | http://localhost:8000 | REST API endpoints |
| **Backend Admin** | http://localhost:8000/admin | Django admin (user: admin/admin123) |
| **API Documentation** | http://localhost:8000/swagger | Swagger UI |
| **Web App** | http://localhost:5173 | React web application |
| **Web App (Alt)** | http://127.0.0.1:4173 | Alternative web address |
| **Mobile** | Scan QR from terminal | Expo dev server |

---

## 👤 Test Accounts

### Default Admin Account
```
Username: admin
Email: admin@test.com
Password: admin123
```

### Create Additional Test Users

**Via Django Shell:**
```bash
python manage.py shell
>>> from django.contrib.auth.models import User
>>> User.objects.create_user('testuser', 'test@example.com', 'password123')
```

**Via Django Admin:**
1. Go to http://localhost:8000/admin
2. Login with admin/admin123
3. Click "Add User" in Users section

---

## 🧪 Testing Everything

### Test Backend API

```bash
# 1. Test health check
curl http://localhost:8000/api/cities/

# 2. Register user
curl -X POST http://localhost:8000/api/register/ \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@test.com",
    "password": "test123456",
    "password2": "test123456",
    "first_name": "Test",
    "last_name": "User"
  }'

# 3. Login
curl -X POST http://localhost:8000/api/login/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@test.com",
    "password": "test123456"
  }'

# 4. Get current user (replace TOKEN with token from login)
curl -H "Authorization: Token TOKEN" http://localhost:8000/api/me/
```

### Test Web App

1. Open http://localhost:5173
2. Click "Sign Up"
3. Create an account (or login with admin/admin123)
4. Search for trips
5. Select a trip
6. Choose a seat
7. Enter passenger info
8. Submit payment
9. Confirm booking
10. View tickets in "My Tickets"

### Test Mobile App

1. Run `npm start` in react-native-reference folder
2. Scan QR code with:
   - **iPhone:** Built-in camera or Expo Go app
   - **Android:** Expo Go app (install from Play Store)
3. Run through same flow as web

---

## ⚙️ Environment Variables Explained

### Backend (.env)

| Variable | Purpose | Local Value |
|----------|---------|-------------|
| `DEBUG` | Django debug mode | `True` |
| `SECRET_KEY` | Django secret key | Local dev key |
| `ALLOWED_HOSTS` | Allowed request hosts | `localhost,127.0.0.1,*` |
| `DATABASE_URL` | Database connection | `sqlite:///db.sqlite3` |
| `CORS_ALLOWED_ORIGINS` | Allowed CORS origins | Web + Mobile URLs |
| `API_BASE_URL` | API base URL | `http://localhost:8000/api` |
| `EMAIL_BACKEND` | Email delivery | Console output |

### Web (.env.local)

| Variable | Purpose | Local Value |
|----------|---------|-------------|
| `VITE_API_BASE_URL` | Backend API URL | `http://localhost:8000/api` |

### Mobile (.env)

| Variable | Purpose | Local Value |
|----------|---------|-------------|
| `EXPO_PUBLIC_API_BASE_URL` | Backend API URL | `http://10.0.2.2:8000/api` |
| `EXPO_PUBLIC_API_URL` | Alternative URL | Same as above |

**Note:** `10.0.2.2` is Android emulator's special address for host machine

---

## 🐛 Troubleshooting

### "Backend not running"
```
Error: Failed to fetch from http://localhost:8000
Solution:
1. Make sure backend terminal is running
2. Check: curl http://localhost:8000/api/cities/
3. Restart with: python manage.py runserver
```

### "Database error"
```
Error: No database tables
Solution:
python manage.py migrate
```

### "Port already in use"
```
Error: Port 8000 already in use
Solution (Linux/Mac):
lsof -i :8000
kill -9 <PID>

Solution (Windows):
netstat -ano | findstr :8000
taskkill /PID <PID> /F
```

### "CORS errors"
```
Error: Access to XMLHttpRequest blocked by CORS
Solution:
1. Check backend .env CORS_ALLOWED_ORIGINS includes your URL
2. Verify backend is running
3. Check browser console for exact error
```

### "Mobile can't connect"
```
Error: Can't reach http://10.0.2.2:8000
Solution:
1. Make sure backend is running on :8000
2. For physical phone: use your machine's IP (e.g., http://192.168.1.104:8000)
3. Update mobile .env with correct IP
```

### "Token not working"
```
Error: 401 Unauthorized
Solution:
1. Make sure you're logged in
2. Check token is stored in sessionStorage (not localStorage)
3. Try logging in again
```

---

## 📁 Project Structure

```
Evexticket/
├── backend/                          # Django REST API
│   ├── manage.py
│   ├── requirements.txt
│   ├── .env                          # ← Create this
│   ├── venv/                         # Virtual environment
│   ├── togotrans_api/
│   │   └── settings.py
│   └── transport/
│       ├── models.py
│       ├── serializers.py
│       ├── views.py
│       └── urls.py
│
├── src/                              # React web app
│   ├── App.tsx
│   ├── pages/
│   ├── components/
│   └── services/
│
├── react-native-reference/           # React Native mobile
│   ├── .env                          # ← Create this
│   └── src/screens/
│
├── .env.local                        # ← Create this
├── package.json
└── vite.config.ts
```

---

## ✅ Verification Checklist

Before you start coding, verify:

- [ ] Backend running on :8000
- [ ] Web running on :5173 or :4173
- [ ] Mobile running in emulator/phone
- [ ] Can login with admin/admin123
- [ ] Can create new account
- [ ] Can search trips
- [ ] Can create booking
- [ ] Can view tickets
- [ ] No console errors

---

## 🔄 Typical Development Workflow

```bash
# Terminal 1: Backend
cd backend
source venv/bin/activate  # or venv\Scripts\activate
python manage.py runserver

# Terminal 2: Web
npm run dev

# Terminal 3: Mobile
cd react-native-reference
npm start

# Terminal 4: Optional - View logs/run scripts
cd backend
python manage.py shell
```

---

## 📚 Useful Commands

### Django Commands
```bash
# Create new migration
python manage.py makemigrations

# Apply migrations
python manage.py migrate

# Django admin shell
python manage.py shell

# Clear all data
python manage.py flush

# Create superuser
python manage.py createsuperuser

# Run tests
python manage.py test
```

### Vite Commands
```bash
# Dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

### Expo Commands (Mobile)
```bash
# Start dev server
npm start

# Run on iOS emulator
npm start -- --ios

# Run on Android emulator
npm start -- --android

# Run on physical device
npm start --tunnel
```

---

## 🎓 First-Time Tips

1. **Start with backend first** - Make sure API is working before testing web/mobile
2. **Test with curl first** - Verify API endpoints work before testing UI
3. **Check browser console** - Most errors appear here (F12)
4. **Use admin panel** - http://localhost:8000/admin for quick data management
5. **Read API docs** - http://localhost:8000/swagger shows all endpoints
6. **Enable logging** - Check backend terminal for request logs

---

## 🚀 Ready to Start?

1. **Run auto setup:**
   ```bash
   # Windows: Double-click LOCAL_SETUP.bat
   # Mac/Linux: ./LOCAL_SETUP.sh
   ```

2. **Or manual setup:**
   - Backend: `cd backend && python manage.py runserver`
   - Web: `npm run dev`
   - Mobile: `cd react-native-reference && npm start`

3. **Test at:**
   - Web: http://localhost:5173
   - Admin: http://localhost:8000/admin (admin/admin123)

---

## ❓ Need Help?

- Backend issues? Check `backend/.env` exists and has right values
- Web issues? Check `.env.local` exists
- Mobile issues? Check `react-native-reference/.env` has `10.0.2.2`
- API not responding? Make sure backend is running on :8000
- Still stuck? Check browser console (F12) and backend terminal for errors

---

**You're ready! Happy coding! 🎉**
