# 🟢 READY TO TEST - EXECUTE THESE COMMANDS

**Status: ✅ ALL FIXES COMPLETE AND READY**

Below are the exact commands to run everything. Copy & paste them.

---

## 🪟 FOR WINDOWS USERS

### OPTION 1: AUTOMATIC SETUP (RECOMMENDED)

#### Step 1: Setup (one-time, 15 minutes)
```bash
LOCAL_SETUP.bat
```
This will:
- ✅ Create virtual environments
- ✅ Install dependencies
- ✅ Create database
- ✅ Create admin user (admin/admin123)
- ✅ Create config files

**Wait for: "Setup complete!" message**

#### Step 2: Start All Servers
```bash
START_LOCAL.bat
```
This will open 3 terminals (one per server):
- ✅ Backend at http://localhost:8000
- ✅ Web at http://localhost:5173
- ✅ Mobile ready (Expo)

**Wait for "Listening on" messages in each terminal**

#### Step 3: Open in Browser
```
http://localhost:5173
```

#### Step 4: Login
```
Username: admin
Password: admin123
```

#### Step 5: Test
- Search for a trip
- Select a seat
- Book and pay
- View your tickets
- ✅ Done!

---

### OPTION 2: MANUAL SETUP (IF AUTOMATIC FAILS)

#### Backend Setup
```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser --username admin --email admin@local.com --no-input
echo from django.contrib.auth.models import User; User.objects.filter(username="admin").update(is_active=True) | python manage.py shell
```

#### Web Setup
```bash
npm install
```

#### Mobile Setup
```bash
cd react-native-reference
npm install
```

#### Start Backend
```bash
cd backend
venv\Scripts\activate
python manage.py runserver
```
**Terminal 1: Backend running on http://localhost:8000**

#### Start Web (NEW TERMINAL)
```bash
npm run dev
```
**Terminal 2: Web running on http://localhost:5173**

#### Start Mobile (NEW TERMINAL)
```bash
cd react-native-reference
npm start
```
**Terminal 3: Expo ready for QR scan**

---

## 🍎 FOR MAC/LINUX USERS

### OPTION 1: AUTOMATIC SETUP (RECOMMENDED)

#### Step 1: Make scripts executable
```bash
chmod +x LOCAL_SETUP.sh START_LOCAL.sh
```

#### Step 2: Setup (one-time, 15 minutes)
```bash
./LOCAL_SETUP.sh
```
This will:
- ✅ Create virtual environments
- ✅ Install dependencies
- ✅ Create database
- ✅ Create admin user (admin/admin123)
- ✅ Create config files

**Wait for: "Setup complete!" message**

#### Step 3: Start All Servers
```bash
./START_LOCAL.sh
```
This will open 3 terminals (or tabs):
- ✅ Backend at http://localhost:8000
- ✅ Web at http://localhost:5173
- ✅ Mobile ready (Expo)

**Wait for "Listening on" messages in each terminal**

#### Step 4: Open in Browser
```
http://localhost:5173
```

#### Step 5: Login
```
Username: admin
Password: admin123
```

#### Step 6: Test
- Search for a trip
- Select a seat
- Book and pay
- View your tickets
- ✅ Done!

---

### OPTION 2: MANUAL SETUP (IF AUTOMATIC FAILS)

#### Backend Setup
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser --username admin --email admin@local.com --no-input
python manage.py shell -c "from django.contrib.auth.models import User; User.objects.filter(username='admin').update(is_active=True)"
```

#### Web Setup
```bash
npm install
```

#### Mobile Setup
```bash
cd react-native-reference
npm install
```

#### Start Backend
```bash
cd backend
source venv/bin/activate
python manage.py runserver
```
**Terminal 1: Backend running on http://localhost:8000**

#### Start Web (NEW TERMINAL)
```bash
npm run dev
```
**Terminal 2: Web running on http://localhost:5173**

#### Start Mobile (NEW TERMINAL)
```bash
cd react-native-reference
npm start
```
**Terminal 3: Expo ready for QR scan**

---

## ✅ VERIFY EVERYTHING IS WORKING

### Backend Check
```bash
curl http://localhost:8000/api/trips/
```
Expected: JSON response with trip list

### Admin Check
```bash
curl -u admin:admin123 http://localhost:8000/admin/
```
Expected: 200 OK response

### Web Check
Open browser: http://localhost:5173
Expected: Login page appears

### Mobile Check
Run: npm start (in react-native-reference)
Expected: QR code appears in terminal

---

## 🧪 TEST ALL 14 FIXES (OPTIONAL BUT RECOMMENDED)

After everything is running, run these tests:

### Test 1: Admin Dashboard Permission
```bash
curl -H "Authorization: Token YOUR_TOKEN" http://localhost:8000/api/dashboard/stats/
```
Expected: 200 if token is admin, 403 if user is regular user

### Test 2: Phone Login
```bash
curl -X POST http://localhost:8000/api/auth/phone/ \
  -H "Content-Type: application/json" \
  -d '{"phone":"+22812345678","password":"pass"}'
```
Expected: Token returned

### Test 3: Email Login
```bash
curl -X POST http://localhost:8000/api/auth/token/ \
  -d "username=admin&password=admin123"
```
Expected: Token returned

### Test 4: Token Refresh
```bash
curl -X POST http://localhost:8000/api/token/refresh/ \
  -H "Content-Type: application/json" \
  -d '{"token":"YOUR_TOKEN"}'
```
Expected: New token returned

### Test 5: Search Trips
```bash
curl "http://localhost:8000/api/trips/?from_city=Lome&to_city=Accra&travel_date=2024-12-25"
```
Expected: Trip list

### Test 6: Book Seat
```bash
curl -X POST http://localhost:8000/api/bookings/ \
  -H "Authorization: Token YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "trip": 1,
    "seat_number": 5,
    "user": 1,
    "travel_date": "2024-12-25",
    "passenger_data": {"first_name":"John","last_name":"Doe"}
  }'
```
Expected: Booking created with ID

### Test 7: View My Bookings
```bash
curl -H "Authorization: Token YOUR_TOKEN" \
  http://localhost:8000/api/bookings/
```
Expected: Your bookings listed

---

## 🐛 TROUBLESHOOTING

### Backend won't start
```bash
# Check port 8000 is free
netstat -an | findstr :8000  (Windows)
lsof -i :8000               (Mac/Linux)

# If occupied, kill it
taskkill /PID <PID> /F      (Windows)
kill -9 <PID>               (Mac/Linux)

# Then try again
python manage.py runserver
```

### Web won't start
```bash
# Check port 5173 is free
netstat -an | findstr :5173  (Windows)
lsof -i :5173               (Mac/Linux)

# Make sure you're in root directory (not backend or react-native-reference)
cd /path/to/Evexticket
npm run dev
```

### Database errors
```bash
# Reset database
cd backend
rm db.sqlite3                          (remove old db)
python manage.py migrate              (create new db)
python manage.py createsuperuser ...  (create user)
```

### Module not found
```bash
# Reinstall dependencies
npm install
cd backend && pip install -r requirements.txt
```

### Admin/admin123 doesn't work
```bash
# Create new admin user
cd backend
python manage.py shell
>>> from django.contrib.auth.models import User
>>> User.objects.create_superuser('admin', 'admin@local.com', 'admin123')
>>> exit()
```

---

## 📊 ENDPOINTS TO TEST MANUALLY

### No Auth Required
```
GET  http://localhost:8000/api/trips/
GET  http://localhost:8000/api/trips/1/
GET  http://localhost:8000/api/companies/
```

### Auth Required (add header: Authorization: Token YOUR_TOKEN)
```
POST http://localhost:8000/api/bookings/
GET  http://localhost:8000/api/bookings/
GET  http://localhost:8000/api/users/me/
POST http://localhost:8000/api/auth/logout/
```

### Admin Only
```
GET  http://localhost:8000/api/dashboard/stats/
GET  http://localhost:8000/api/admin/users/
```

---

## 🎯 EXPECTED BEHAVIOR AFTER SETUP

✅ Backend starts without errors
✅ Web loads on http://localhost:5173
✅ Can login with admin/admin123
✅ Can see trips list
✅ Can select seat
✅ Can create booking
✅ Can view my bookings
✅ Mobile app can connect (if testing mobile)
✅ All 14 fixes working

---

## 📝 NEXT STEPS

1. ✅ Run setup (LOCAL_SETUP.bat/sh)
2. ✅ Start servers (START_LOCAL.bat/sh)
3. ✅ Login (admin/admin123)
4. ✅ Test booking flow
5. ✅ Run TEST_ALL_14_FIXES.md if full validation needed
6. ✅ Deploy to production when ready

---

## 💡 PRO TIPS

- **Setup taking too long?** Manual setup might be faster on your machine
- **Something crashing?** Check terminal output for error messages
- **Port conflicts?** Use different ports or kill existing processes
- **Database locked?** Try deleting db.sqlite3 and re-running migrations
- **Need to reset everything?** Delete venv, db.sqlite3, node_modules and start fresh

---

## ✨ YOU'RE READY!

Everything is configured and ready to test. Pick your platform (Windows or Mac/Linux) and run the commands above.

**Total time to get running: 20 minutes (with automatic setup)**

**Questions?** See NAVIGATION_GUIDE.md for all documentation

**Ready to test?** → [Start with Step 1 above](#-for-windows-users)

---

**Happy testing! 🚀**
