# 🚀 Next Deployment Steps - Hostinger Server

Based on your current progress, here are the next steps to complete the deployment:

## ✅ Completed Steps
- [x] Cloned repository from GitHub
- [x] Installed Composer dependencies (with PHP 8.2 compatibility fix)
- [x] Created `.env` file
- [x] Generated application key

## 📋 Next Steps (Run on Server)

### Step 1: Configure Database in .env

```bash
cd ~/domains/softpromis.com/public_html/v2account/backend
nano .env
```

Update these values with your Hostinger database credentials:
```env
APP_ENV=production
APP_DEBUG=false
APP_URL=https://v2account.softpromis.com

DB_CONNECTION=mysql
DB_HOST=localhost
DB_PORT=3306
DB_DATABASE=u820431346_v2account  # Replace with your actual database name
DB_USERNAME=u820431346_v2account  # Replace with your actual username
DB_PASSWORD=your_actual_password  # Replace with your actual password

SANCTUM_STATEFUL_DOMAINS=v2account.softpromis.com
FRONTEND_URL=https://v2account.softpromis.com
SESSION_DOMAIN=.softpromis.com
```

**Save and exit**: Press `Ctrl+X`, then `Y`, then `Enter`

### Step 2: Run Database Migrations

```bash
php artisan migrate --force
```

### Step 3: Cache Configuration

```bash
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

### Step 4: Set File Permissions

```bash
chmod -R 775 storage bootstrap/cache
chown -R u820431346:u820431346 storage bootstrap/cache
```

### Step 5: Build Frontend

```bash
cd ../frontend
npm install
echo "VITE_API_URL=https://v2account.softpromis.com/api" > .env.production
npm run build
```

**Note**: If Node.js/npm is not available on Hostinger, you'll need to:
- Build locally: `cd frontend && npm run build`
- Upload the `frontend/dist/` folder via File Manager or SCP

### Step 6: Configure Web Server

Create or update the root `.htaccess` file:

```bash
cd ~/domains/softpromis.com/public_html/v2account
nano .htaccess
```

Add this content:
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

**Alternative**: Configure subdomain in hPanel to point to `/backend/public` for API

### Step 7: Install SSL Certificate

1. Go to Hostinger hPanel
2. Navigate to **SSL** → **Let's Encrypt**
3. Select domain: `v2account.softpromis.com`
4. Click **Install SSL**
5. Wait 1-5 minutes for installation

### Step 8: Create Admin User

```bash
cd ~/domains/softpromis.com/public_html/v2account/backend
php artisan tinker
```

Then in tinker, run:
```php
$user = new App\Models\User();
$user->name = 'Admin';
$user->email = 'admin@softpromis.com';
$user->password = Hash::make('your_secure_password');
$user->save();
exit
```

### Step 9: Test Deployment

1. **Test API**: Visit `https://v2account.softpromis.com/api/me`
   - Should return 401 (unauthorized) - this is correct!

2. **Test Frontend**: Visit `https://v2account.softpromis.com`
   - Should load the login page

3. **Test Login**: Use the admin credentials you created

## ⚠️ Important Notes

### PHP Version Compatibility
Your server has PHP 8.2.28, and `composer update` downgraded some packages to be compatible. The `composer.lock` on the server is now different from the repository.

**Options**:
1. **Keep as-is** (recommended for now): The server will work fine
2. **Update PHP** (if possible): Upgrade server to PHP 8.3+ to match your local development
3. **Commit updated lock** (not recommended): Would break local development if you use PHP 8.3+

### Troubleshooting

**Check Laravel logs**:
```bash
tail -f ~/domains/softpromis.com/public_html/v2account/backend/storage/logs/laravel.log
```

**Clear caches if needed**:
```bash
cd ~/domains/softpromis.com/public_html/v2account/backend
php artisan config:clear
php artisan cache:clear
php artisan route:clear
php artisan view:clear
```

**Check file permissions**:
```bash
ls -la ~/domains/softpromis.com/public_html/v2account/backend/storage
ls -la ~/domains/softpromis.com/public_html/v2account/backend/bootstrap/cache
```

## 🎉 After Completion

Your application should be live at:
- **Frontend**: https://v2account.softpromis.com
- **API**: https://v2account.softpromis.com/api

