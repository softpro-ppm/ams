# Build & Deploy Guide

Clear step-by-step guide for building locally and deploying AMS.

---

## Part 1: Build & Run Locally

### Prerequisites
- PHP 8.2+
- Composer
- Node.js 18+
- npm

### One-time setup (first time only)

```bash
# 1. Go to project root
cd /Users/rajesh/Documents/projects/ams

# 2. Backend setup
cd backend
composer install
cp .env.example .env          # Skip if .env already exists
php artisan key:generate
touch database/database.sqlite # For SQLite
php artisan migrate
php artisan db:seed
cd ..

# 3. Frontend setup
cd frontend
npm install
cd ..
```

### Run locally (every time)

From project root:

```bash
npm run dev
```

This starts:
- **Backend**: http://localhost:8000
- **Frontend**: http://localhost:5173

**Login:** `admin@softpro.com` / `password`

---

## Part 2: Build for Production

Build the frontend (creates `frontend/dist/`):

```bash
# From project root
npm run build
```

For production, the build uses `frontend/.env.production` which sets:
- `VITE_API_URL=https://ams.softpromis.com/api`

To build with a different API URL:
```bash
cd frontend
VITE_API_URL=https://your-api-url.com/api npm run build
```

---

## Part 3: Deploy

### Option A: Automatic (GitHub Actions)

1. **One-time:** Add GitHub Secrets (Settings → Secrets and variables → Actions):
   - `HOSTINGER_HOST` = `us-imm-web1739.hstgr.io`
   - `HOSTINGER_USERNAME` = `u820431346`
   - `HOSTINGER_SSH_KEY` = Your SSH private key (full contents)

2. **Deploy:**
   ```bash
   git add .
   git commit -m "Your message"
   git push origin main
   ```
   Push to `main` triggers automatic deployment.

### Option B: Manual (deploy script)

```bash
# Full deploy (frontend + backend + cache clear) - use when backend changed
npm run deploy

# Frontend only - use for UI-only changes (e.g. branding, styles)
npm run deploy:frontend
```

**Full deploy** does:
1. Build frontend
2. Upload frontend to server
3. Upload backend files (IMS/SMS controllers, routes, etc.)
4. Clear Laravel cache
5. Show recent log

**Frontend-only** does steps 1–2 only (faster, 1 password prompt).

**Password prompts:** The script uses SSH connection reuse — you enter the password once per deploy instead of 12+ times. For zero prompts, set up [SSH key auth](#server-error-on-login-production).

---

## Quick Reference

| Action | Command |
|--------|---------|
| Run locally | `npm run dev` |
| Build frontend | `npm run build` |
| Deploy (full) | `npm run deploy` |
| Deploy (frontend only) | `npm run deploy:frontend` |
| Deploy (auto) | Push to `main` branch |

---

## Production URL

**https://ams.softpromis.com**

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Build fails | Run `npm install` in `frontend/` |
| Backend not starting | Run `composer install` in `backend/` |
| Database errors | `cd backend && php artisan migrate:fresh --seed` |
| Deploy script fails | Check SSH: `ssh -p 65002 u820431346@us-imm-web1739.hstgr.io` |
| Changes not visible after deploy | Clear browser cache and service worker |
| **Server Error on login** | See below |

### Server Error on login (production)

1. **Check Laravel logs** (via SSH):
   ```bash
   ssh -p 65002 u820431346@us-imm-web1739.hstgr.io
   tail -50 ~/domains/softpromis.com/public_html/ams/backend/storage/logs/laravel.log
   ```

2. **Verify production `.env`** on the server has:
   - `APP_DEBUG=false` (use `true` temporarily only to see errors)
   - `FRONTEND_URL=https://ams.softpromis.com` (for CORS)
   - `SESSION_SECURE_COOKIE=true` (required for HTTPS)
   - `SESSION_DOMAIN=.softpromis.com` or `null` (so cookies work)
   - Correct `DB_*` values if using MySQL

3. **Ensure sessions table exists**:
   ```bash
   cd ~/domains/softpromis.com/public_html/ams/backend
   php artisan migrate
   ```

4. **Clear cache after .env changes**:
   ```bash
   php artisan config:clear && php artisan cache:clear
   ```
