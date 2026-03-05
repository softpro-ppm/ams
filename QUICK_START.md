# 🚀 Quick Start Guide

## Access the Application

### Frontend (Main Application)
**URL:** http://localhost:5173

Open this in your browser to access the SOFTPRO Finance application.

### Backend API
**URL:** http://localhost:8000/api (or http://localhost:8001/api if port 8000 is busy)

The backend API is automatically used by the frontend.

---

## Login Credentials

**Email:** `admin@softpro.com`  
**Password:** `password`

---

## If Servers Are Not Running

### Start Backend (Terminal 1)
```bash
cd backend
php artisan serve
```

### Start Frontend (Terminal 2)
```bash
cd frontend
npm run dev
```

---

## Troubleshooting

- **Can't access the site?** Make sure both servers are running (check the terminal windows)
- **Login not working?** Check browser console for errors, ensure backend is running on port 8000 or 8001
- **Database errors?** Run `php artisan migrate:fresh --seed` in the backend directory

---

**Enjoy using SOFTPRO Finance! 🎉**

