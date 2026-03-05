# 🏗️ Hostinger Specific Setup

## Directory Structure on Hostinger

```
~/public_html/v2account/
├── backend/
│   ├── app/
│   ├── public/          # API entry point
│   ├── .env            # Production config
│   └── ...
├── frontend/
│   ├── dist/           # Built frontend files
│   └── ...
└── .htaccess           # Root redirect rules
```

## Recommended Setup Options

### Option 1: Separate API and Frontend (Recommended)

**API**: `https://v2account.softpromis.com/api` → `/backend/public`
**Frontend**: `https://v2account.softpromis.com` → `/frontend/dist`

**Root .htaccess**:
```apache
# API Routes
RewriteEngine On
RewriteCond %{REQUEST_URI} ^/api
RewriteRule ^api/(.*)$ /backend/public/index.php [L]

# Frontend Routes
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(?!api)(.*)$ /frontend/dist/$1 [L]
RewriteRule ^$ /frontend/dist/index.html [L]
```

### Option 2: Subdomain for API (Alternative)

**API**: `https://api.v2account.softpromis.com` → `/backend/public`
**Frontend**: `https://v2account.softpromis.com` → `/frontend/dist`

**Benefits**: Cleaner separation, easier CORS management

## Hostinger hPanel Steps

### 1. Create Subdomain
- **Domains** → **Subdomains** → **Create Subdomain**
- Name: `v2account`
- Document Root: `/public_html/v2account`

### 2. Create Database
- **Databases** → **MySQL Databases** → **Create Database**
- Name: `v2account`
- Username: `v2account_user`
- Password: Generate strong password

### 3. Enable SSH (if needed)
- **Advanced** → **SSH Access** → **Enable**
- Note: Username, Port (usually 65002), and IP

### 4. Install SSL
- **SSL** → **Let's Encrypt** → **Install SSL**
- Domain: `v2account.softpromis.com`
- Wait 1-5 minutes

## PHP Configuration

Hostinger usually has PHP 8.1+ available. Verify:
```bash
php -v
```

If needed, change PHP version in hPanel:
- **Advanced** → **Select PHP Version** → Choose PHP 8.2+

## File Permissions

After deployment:
```bash
chmod -R 755 ~/public_html/v2account
chmod -R 775 ~/public_html/v2account/backend/storage
chmod -R 775 ~/public_html/v2account/backend/bootstrap/cache
```

## Common Hostinger Paths

- **Public HTML**: `~/public_html/` or `~/domains/softpromis.com/public_html/`
- **Subdomain**: `~/public_html/v2account/`
- **SSH Home**: `~/`
- **PHP**: Usually `/usr/bin/php` or `/opt/alt/php82/usr/bin/php`
- **Composer**: May need to install: `curl -sS https://getcomposer.org/installer | php`

## Troubleshooting Hostinger-Specific Issues

### Issue: Composer not found
```bash
# Install Composer globally
curl -sS https://getcomposer.org/installer | php
mv composer.phar ~/bin/composer
chmod +x ~/bin/composer
```

### Issue: Node.js/npm not available
- Hostinger may not have Node.js by default
- Options:
  1. Build locally and upload `dist/` folder
  2. Use Hostinger Node.js manager (if available)
  3. Request Node.js installation from support

### Issue: 403 Forbidden
- Check file permissions: `chmod 755` for directories, `chmod 644` for files
- Verify `.htaccess` is not blocking access
- Check directory index settings in hPanel

### Issue: Database connection refused
- Verify database host is `localhost` (not `127.0.0.1`)
- Check database user has proper permissions
- Ensure database exists in MySQL Databases section

## Quick Commands Reference

```bash
# Navigate to project
cd ~/public_html/v2account

# Pull latest changes
git pull origin main

# Backend updates
cd backend
composer install --optimize-autoloader --no-dev
php artisan migrate --force
php artisan config:cache
php artisan route:cache

# Frontend updates (if Node.js available)
cd ../frontend
npm install
npm run build

# Check logs
tail -f ~/public_html/v2account/backend/storage/logs/laravel.log

# Clear caches
php artisan config:clear
php artisan cache:clear
php artisan route:clear
php artisan view:clear
```

