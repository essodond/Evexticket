# 🚀 EVEXTICKET - LOCAL TESTING QUICK START

**Everything you need to test Evexticket locally in 5 minutes**

---

## ⚡ SUPER QUICK START (Choose One)

### Option A: Windows - Auto Setup + Start
```bash
# 1. Double-click this file to setup:
LOCAL_SETUP.bat

# 2. Then double-click to start everything:
START_LOCAL.bat

# Done! All 3 servers running!
```

### Option B: macOS/Linux - Auto Setup + Start
```bash
# 1. Setup everything:
chmod +x LOCAL_SETUP.sh && ./LOCAL_SETUP.sh

# 2. Start all servers:
chmod +x START_LOCAL.sh && ./START_LOCAL.sh

# Done! All 3 servers running!
```

### Option C: Manual (If above don't work)

**Terminal 1 - Backend:**
```bash
cd backend
source venv/bin/activate  # or venv\Scripts\activate on Windows
python manage.py runserver
```

**Terminal 2 - Web:**
```bash
npm run dev
```

**Terminal 3 - Mobile:**
```bash
cd react-native-reference
npm start
```

---

## 🔗 Access Everything

Once running (give it 30 seconds):

| Service | URL |
|---------|-----|
| **Web App** | http://localhost:5173 |
| **Backend API** | http://localhost:8000 |
| **Admin Panel** | http://localhost:8000/admin |
| **API Docs** | http://localhost:8000/swagger |
| **Mobile** | Scan QR from Terminal 3 |

---

## 👤 Login Credentials

```
Username: admin
Password: admin123
```

---

## 📋 What to Test

### 1. Web App (http://localhost:5173)
- [ ] Register new account
- [ ] Login with email
- [ ] Login with phone
- [ ] Search for trips
- [ ] Select trip & seat
- [ ] Enter passenger info
- [ ] Pay & confirm
- [ ] View tickets
- [ ] Cancel booking
- [ ] Rebook ticket

### 2. Mobile App
- [ ] Same flow as web

### 3. Admin Panel (http://localhost:8000/admin)
- [ ] View users
- [ ] View bookings
- [ ] Create trip
- [ ] View bookings per trip

---

## ⚙️ Configuration Files Created

```
✅ backend/.env                  # Backend configuration
✅ .env.local                    # Web configuration
✅ react-native-reference/.env   # Mobile configuration
```

These are auto-created by setup scripts. No manual edits needed!

---

## 🎯 What's Configured

### Backend
- ✅ SQLite database (local file: db.sqlite3)
- ✅ CORS for web + mobile
- ✅ Email to console output
- ✅ Debug mode ON
- ✅ Admin user created (admin/admin123)

### Web
- ✅ API points to http://localhost:8000
- ✅ Runs on http://localhost:5173
- ✅ Hot reload enabled

### Mobile
- ✅ API points to http://10.0.2.2:8000 (Android emulator special address)
- ✅ Expo dev server ready

---

## ❓ Troubleshooting

### "Port 8000 already in use"
```bash
# Find and kill process on port 8000
# Windows:
netstat -ano | findstr :8000
taskkill /PID <number> /F

# Mac/Linux:
lsof -i :8000
kill -9 <number>
```

### "Backend says 'No database'"
```bash
cd backend
python manage.py migrate
```

### "Mobile can't connect"
- Make sure backend is running on :8000
- Try disabling firewall temporarily
- Or use your machine's IP instead of localhost

### "Can't login"
- Clear browser cache (Ctrl+Shift+Delete)
- Make sure backend is running
- Check browser console (F12) for errors

---

## 📱 Mobile Testing Tips

### On Android Emulator
- Backend URL is `http://10.0.2.2:8000` (special emulator address)
- Already configured in `.env`

### On Physical Phone
- Both phone and computer must be on same WiFi
- Get your PC's local IP: 
  - Windows: `ipconfig` → look for IPv4
  - Mac/Linux: `ifconfig` → look for inet
- Update `react-native-reference/.env`:
  ```
  EXPO_PUBLIC_API_BASE_URL=http://YOUR_IP:8000/api
  ```

---

## 🧪 Quick API Test

```bash
# Get all cities
curl http://localhost:8000/api/cities/

# Get admin token
curl -X POST http://localhost:8000/api/login/ \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"admin123"}'

# Should get token back!
```

---

## 📊 Database

All data stored in: `backend/db.sqlite3`

To reset everything:
```bash
cd backend
python manage.py flush --no-input
python manage.py shell << EOF
from django.contrib.auth.models import User
User.objects.create_superuser('admin', 'admin@test.com', 'admin123')
EOF
```

---

## 🎓 Key Points

1. **Backend must run first** - Web/Mobile depend on it
2. **Check backend is accessible** - `curl http://localhost:8000/api/cities/`
3. **Use admin/admin123 to test** - Or create your own user
4. **CORS is enabled** - No cross-origin issues
5. **Database is local** - All changes saved to `db.sqlite3`

---

## ✅ You're Ready!

- Run setup script (or manual steps)
- Start all 3 servers
- Open http://localhost:5173
- Test everything!

---

**Need help?** Check `LOCAL_DEVELOPMENT_SETUP.md` for full details.

**Ready?** Run `LOCAL_SETUP.bat` (Windows) or `./LOCAL_SETUP.sh` (Mac/Linux)!
