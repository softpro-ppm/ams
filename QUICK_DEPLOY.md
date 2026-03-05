# ⚡ Quick Deployment Checklist

## Pre-Deployment (5 minutes)

- [ ] Create GitHub repository
- [ ] Push code to GitHub
- [ ] Create subdomain `v2account.softpromis.com` in Hostinger
- [ ] Create MySQL database in Hostinger
- [ ] Note database credentials

## Deployment Steps

### 1. SSH into Hostinger
```bash
ssh u123456789@v2account.softpromis.com -p 65002
```

### 2. Clone Repository
```bash
cd ~/public_html/v2account
git clone https://github.com/YOUR_USERNAME/v2account.git .
```

### 3. Setup Backend
```bash
cd backend
composer install --optimize-autoloader --no-dev
cp .env.example .env
php artisan key:generate
# Edit .env with database credentials
php artisan migrate --force
php artisan config:cache
php artisan route:cache
chmod -R 775 storage bootstrap/cache
```

### 4. Setup Frontend
```bash
cd ../frontend
npm install
echo "VITE_API_URL=https://v2account.softpromis.com/api" > .env.production
npm run build
```

### 5. Configure Subdomain
- Point subdomain to: `/public_html/v2account/backend/public` (for API)
- OR use .htaccess redirect (see DEPLOYMENT_GUIDE.md)

### 6. Install SSL
- hPanel → SSL → Let's Encrypt → Install for `v2account.softpromis.com`

### 7. Create Admin User
```bash
cd ~/public_html/v2account/backend
php artisan tinker
# Then: (see DEPLOYMENT_GUIDE.md Step 12.3)
```

## Post-Deployment

- [ ] Test: https://v2account.softpromis.com
- [ ] Test API: https://v2account.softpromis.com/api/me
- [ ] Login with admin account
- [ ] Verify PWA works

---

**Full details**: See `DEPLOYMENT_GUIDE.md`

