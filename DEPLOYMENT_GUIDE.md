# 🚀 Complete Deployment Guide - Hostinger

Step-by-step guide to deploy SOFTPRO Finance to Hostinger via GitHub.

## 📋 Prerequisites

- GitHub account
- GitHub Desktop installed
- Hostinger hosting account
- Access to Hostinger hPanel
- Domain: `softpromis.com` (for subdomain `v2account.softpromis.com`)

---

## Step 1: Prepare Local Git Repository

### 1.1 Initialize Git Repository (if not already done)

```bash
cd /Users/rajesh/Documents/GitHub/v2account
git init
```

### 1.2 Create Root .gitignore

Create a `.gitignore` file in the root directory:

```bash
# Root .gitignore
.DS_Store
*.log
.env
.env.local
.env.production

# IDE
.vscode/
.idea/
*.swp
*.swo

# Dependencies
node_modules/
vendor/

# Build outputs
dist/
build/
```

### 1.3 Stage All Files

```bash
git add .
git commit -m "Initial commit: SOFTPRO Finance application"
```

---

## Step 2: Create GitHub Repository

### 2.1 Create Repository on GitHub

1. Go to [GitHub.com](https://github.com)
2. Click **"+"** → **"New repository"**
3. Repository name: `v2account` (or `softpro-finance`)
4. Description: "SOFTPRO Finance - Finance Management PWA"
5. Visibility: **Private** (recommended) or Public
6. **DO NOT** initialize with README, .gitignore, or license
7. Click **"Create repository"**

### 2.2 Connect Local Repository to GitHub

**Option A: Using GitHub Desktop**

1. Open **GitHub Desktop**
2. Click **"File"** → **"Add Local Repository"**
3. Browse to: `/Users/rajesh/Documents/GitHub/v2account`
4. Click **"Add Repository"**
5. Click **"Publish repository"** (top bar)
6. Select your GitHub account
7. Repository name: `v2account`
8. **Uncheck** "Keep this code private" if you want it public
9. Click **"Publish Repository"**

**Option B: Using Command Line**

```bash
cd /Users/rajesh/Documents/GitHub/v2account
git remote add origin https://github.com/YOUR_USERNAME/v2account.git
git branch -M main
git push -u origin main
```

---

## Step 3: Set Up Subdomain on Hostinger

### 3.1 Access Hostinger hPanel

1. Log in to [Hostinger hPanel](https://hpanel.hostinger.com)
2. Navigate to **"Domains"** → **"Manage"**

### 3.2 Create Subdomain

1. Find your domain: `softpromis.com`
2. Click **"Manage"** or **"DNS Zone Editor"**
3. Click **"Add Record"** or **"Create Subdomain"**
4. Fill in:
   - **Type**: `A` (or use Subdomain option if available)
   - **Name**: `v2account`
   - **Points to**: Your server IP (or use `@` for same IP as main domain)
   - **TTL**: `3600` (or default)
5. Click **"Add Record"** or **"Create"**

**Alternative: Using Subdomain Manager**

1. Go to **"Subdomains"** in hPanel
2. Click **"Create Subdomain"**
3. Subdomain: `v2account`
4. Document Root: `/public_html/v2account` (or `/domains/softpromis.com/public_html/v2account`)
5. Click **"Create"**

### 3.3 Wait for DNS Propagation

- DNS changes can take 5 minutes to 48 hours
- Check propagation: [whatsmydns.net](https://www.whatsmydns.net)
- Search for: `v2account.softpromis.com`

---

## Step 4: Prepare Backend for Production

### 4.1 Create Production Environment File

Create `backend/.env.production`:

```env
APP_NAME="SOFTPRO Finance"
APP_ENV=production
APP_KEY=
APP_DEBUG=false
APP_URL=https://v2account.softpromis.com

LOG_CHANNEL=stack
LOG_DEPRECATIONS_CHANNEL=null
LOG_LEVEL=error

DB_CONNECTION=mysql
DB_HOST=localhost
DB_PORT=3306
DB_DATABASE=u123456789_v2account
DB_USERNAME=u123456789_v2account
DB_PASSWORD=your_secure_password

BROADCAST_DRIVER=log
CACHE_DRIVER=file
FILESYSTEM_DISK=local
QUEUE_CONNECTION=sync
SESSION_DRIVER=file
SESSION_LIFETIME=120

MEMCACHED_HOST=127.0.0.1

REDIS_HOST=127.0.0.1
REDIS_PASSWORD=null
REDIS_PORT=6379

MAIL_MAILER=smtp
MAIL_HOST=mailpit
MAIL_PORT=1025
MAIL_USERNAME=null
MAIL_PASSWORD=null
MAIL_ENCRYPTION=null
MAIL_FROM_ADDRESS="hello@example.com"
MAIL_FROM_NAME="${APP_NAME}"

AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_DEFAULT_REGION=us-east-1
AWS_BUCKET=
AWS_USE_PATH_STYLE_ENDPOINT=false

VITE_APP_NAME="${APP_NAME}"

# Sanctum Configuration
SANCTUM_STATEFUL_DOMAINS=v2account.softpromis.com,www.v2account.softpromis.com
FRONTEND_URL=https://v2account.softpromis.com
SESSION_DOMAIN=.softpromis.com
```

### 4.2 Update Backend .gitignore

Ensure `backend/.gitignore` includes:

```
.env
.env.backup
.env.production
.env.local
```

---

## Step 5: Prepare Frontend for Production

### 5.1 Create Production Environment File

Create `frontend/.env.production`:

```env
VITE_API_URL=https://v2account.softpromis.com/api
```

### 5.2 Update API Client (if needed)

Check `frontend/src/lib/api-client.ts` - it should use:

```typescript
baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
```

---

## Step 6: Create Database on Hostinger

### 6.1 Access MySQL Databases

1. In hPanel, go to **"Databases"** → **"MySQL Databases"**
2. Click **"Create Database"**

### 6.2 Create Database

1. **Database Name**: `v2account` (or `u123456789_v2account` - Hostinger adds prefix)
2. **Username**: `v2account_user` (or auto-generated)
3. **Password**: Generate strong password (save it!)
4. Click **"Create"**

### 6.3 Note Database Credentials

Save these for Step 7:
- Database Name: `u123456789_v2account`
- Database Username: `u123456789_v2account`
- Database Password: `your_password`
- Database Host: `localhost` (usually)

---

## Step 7: Deploy Backend to Hostinger

### 7.1 Access File Manager or SSH

**Option A: File Manager (Easier)**

1. In hPanel, go to **"Files"** → **"File Manager"**
2. Navigate to: `/public_html/v2account` (or your subdomain directory)

**Option B: SSH (Recommended)**

1. In hPanel, go to **"Advanced"** → **"SSH Access"**
2. Enable SSH if not already enabled
3. Note your SSH credentials

### 7.2 Clone Repository via SSH

```bash
# Connect to Hostinger via SSH
ssh u123456789@v2account.softpromis.com -p 65002

# Navigate to public_html
cd ~/domains/softpromis.com/public_html/v2account
# OR
cd ~/public_html/v2account

# Clone repository
git clone https://github.com/YOUR_USERNAME/v2account.git .

# Or if using SSH key:
git clone git@github.com:YOUR_USERNAME/v2account.git .
```

### 7.3 Set Up Backend

```bash
# Navigate to backend
cd backend

# Install Composer dependencies (production)
composer install --optimize-autoloader --no-dev --no-interaction

# Copy environment file
cp .env.example .env

# Generate application key
php artisan key:generate

# Edit .env file with your database credentials
nano .env
# Or use File Manager to edit
```

### 7.4 Configure .env File

Update `.env` with your Hostinger database credentials:

```env
APP_ENV=production
APP_DEBUG=false
APP_URL=https://v2account.softpromis.com

DB_CONNECTION=mysql
DB_HOST=localhost
DB_PORT=3306
DB_DATABASE=u123456789_v2account
DB_USERNAME=u123456789_v2account
DB_PASSWORD=your_actual_password

SANCTUM_STATEFUL_DOMAINS=v2account.softpromis.com
FRONTEND_URL=https://v2account.softpromis.com
SESSION_DOMAIN=.softpromis.com
```

### 7.5 Run Migrations

```bash
php artisan migrate --force
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

### 7.6 Set Permissions

```bash
# Set storage permissions
chmod -R 775 storage bootstrap/cache
chown -R u123456789:u123456789 storage bootstrap/cache
```

---

## Step 8: Configure Web Server (Hostinger)

### 8.1 Create .htaccess for Backend

Create `backend/public/.htaccess`:

```apache
<IfModule mod_rewrite.c>
    <IfModule mod_negotiation.c>
        Options -MultiViews -Indexes
    </IfModule>

    RewriteEngine On

    # Handle Authorization Header
    RewriteCond %{HTTP:Authorization} .
    RewriteRule .* - [E=HTTP_AUTHORIZATION:%{HTTP:Authorization}]

    # Redirect Trailing Slashes If Not A Folder...
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteCond %{REQUEST_URI} (.+)/$
    RewriteRule ^ %1 [L,R=301]

    # Send Requests To Front Controller...
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteRule ^ index.php [L]
</IfModule>
```

### 8.2 Configure Subdomain to Point to Backend API

**Option A: Using hPanel (Easier)**

1. Go to **"Domains"** → **"Subdomains"**
2. Find `v2account.softpromis.com`
3. Edit Document Root to: `/public_html/v2account/backend/public`
4. Save

**Option B: Using .htaccess Redirect**

Create `/public_html/v2account/.htaccess`:

```apache
# Redirect API calls to backend
RewriteEngine On
RewriteCond %{REQUEST_URI} ^/api
RewriteRule ^api/(.*)$ /backend/public/index.php [L]

# Serve frontend for all other requests
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(?!api)(.*)$ /frontend/dist/$1 [L]
```

---

## Step 9: Build and Deploy Frontend

### 9.1 Build Frontend Locally

```bash
cd frontend
npm install
npm run build
```

This creates `frontend/dist/` folder.

### 9.2 Upload Frontend Build

**Option A: Using File Manager**

1. Upload contents of `frontend/dist/` to `/public_html/v2account/frontend/dist/`

**Option B: Using Git (Recommended)**

1. Commit the build (or use GitHub Actions for auto-build)
2. Pull on server:

```bash
# On server
cd ~/public_html/v2account
git pull origin main
cd frontend
npm install
npm run build
```

**Option C: Using SCP**

```bash
# From local machine
scp -r frontend/dist/* u123456789@v2account.softpromis.com:~/public_html/v2account/frontend/dist/
```

---

## Step 10: Configure Frontend API URL

### 10.1 Update Frontend Build

Before building, ensure `.env.production` exists:

```bash
cd frontend
echo "VITE_API_URL=https://v2account.softpromis.com/api" > .env.production
npm run build
```

### 10.2 Or Update After Build

Edit `frontend/dist/assets/*.js` files (not recommended - rebuild instead)

---

## Step 11: Enable SSL/HTTPS

### 11.1 Install SSL Certificate

1. In hPanel, go to **"SSL"** → **"Let's Encrypt"**
2. Select domain: `v2account.softpromis.com`
3. Click **"Install SSL"**
4. Wait for installation (usually 1-5 minutes)

### 11.2 Force HTTPS

Update backend `.env`:

```env
APP_URL=https://v2account.softpromis.com
```

Add to `backend/public/.htaccess`:

```apache
# Force HTTPS
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
```

---

## Step 12: Final Configuration

### 12.1 Test Backend API

Visit: `https://v2account.softpromis.com/api/me`

Should return 401 (unauthorized) - this is correct!

### 12.2 Test Frontend

Visit: `https://v2account.softpromis.com`

Should load the login page.

### 12.3 Create Admin User

```bash
# Via SSH
cd ~/public_html/v2account/backend
php artisan tinker

# In tinker:
$user = new App\Models\User();
$user->name = 'Admin';
$user->email = 'admin@softpromis.com';
$user->password = Hash::make('your_secure_password');
$user->save();
```

---

## Step 13: Set Up Auto-Deployment (Optional)

### 13.1 GitHub Actions (Recommended)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Hostinger

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy via SSH
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.HOSTINGER_HOST }}
          username: ${{ secrets.HOSTINGER_USERNAME }}
          key: ${{ secrets.HOSTINGER_SSH_KEY }}
          script: |
            cd ~/public_html/v2account
            git pull origin main
            cd backend
            composer install --optimize-autoloader --no-dev
            php artisan migrate --force
            php artisan config:cache
            php artisan route:cache
            cd ../frontend
            npm install
            npm run build
```

### 13.2 Add GitHub Secrets

1. Go to GitHub repository → **Settings** → **Secrets and variables** → **Actions**
2. Add secrets:
   - `HOSTINGER_HOST`: Your server IP or domain
   - `HOSTINGER_USERNAME`: Your Hostinger username
   - `HOSTINGER_SSH_KEY`: Your SSH private key

---

## Step 14: Post-Deployment Checklist

- [ ] SSL certificate installed and working
- [ ] Backend API accessible at `/api`
- [ ] Frontend loads correctly
- [ ] Database connected and migrations run
- [ ] Admin user created
- [ ] Can login successfully
- [ ] PWA manifest accessible
- [ ] Service worker registered
- [ ] CORS configured correctly
- [ ] Environment variables set
- [ ] File permissions correct
- [ ] Logs directory writable

---

## 🔧 Troubleshooting

### Issue: 500 Internal Server Error

**Solution:**
```bash
# Check Laravel logs
tail -f ~/public_html/v2account/backend/storage/logs/laravel.log

# Clear caches
php artisan config:clear
php artisan cache:clear
php artisan route:clear
php artisan view:clear
```

### Issue: Database Connection Error

**Solution:**
- Verify database credentials in `.env`
- Check database exists in Hostinger MySQL Databases
- Ensure database user has proper permissions

### Issue: Frontend Shows Blank Page

**Solution:**
- Check browser console for errors
- Verify `VITE_API_URL` is set correctly
- Ensure frontend build completed successfully
- Check file permissions on `dist/` folder

### Issue: CORS Errors

**Solution:**
- Verify `SANCTUM_STATEFUL_DOMAINS` includes your domain
- Check `config/cors.php` settings
- Ensure frontend sends credentials

### Issue: PWA Not Working

**Solution:**
- Ensure HTTPS is enabled (required for PWA)
- Check `manifest.json` is accessible
- Verify service worker is registered
- Clear browser cache and service worker

---

## 📞 Support

If you encounter issues:
1. Check Hostinger documentation
2. Review Laravel logs
3. Check browser console for frontend errors
4. Verify all environment variables are set correctly

---

## 🎉 Success!

Your application should now be live at:
- **Frontend**: https://v2account.softpromis.com
- **API**: https://v2account.softpromis.com/api

Happy deploying! 🚀

