# SSH Deployment Guide - Build Locally & Deploy to Server

This guide shows how to build the frontend locally and deploy to Hostinger server via SSH/SCP.

## Prerequisites

- SSH access to your Hostinger server
- Server path: `~/domains/softpromis.com/public_html/v2account`
- Local build ready in `frontend/dist/`

---

## Step 1: Build Frontend Locally

```bash
cd frontend
npm run build
```

This creates production files in `frontend/dist/` directory.

---

## Step 2: Deploy via SSH/SCP

### Option A: Deploy Frontend Only (Recommended for Quick Updates)

**Upload frontend/dist files to server:**

```bash
# From project root
scp -r frontend/dist/* u820431346@us-imm-web1739.hstgr.io:~/domains/softpromis.com/public_html/v2account/frontend/dist/
```

**Or upload entire dist folder:**

```bash
scp -r frontend/dist u820431346@us-imm-web1739.hstgr.io:~/domains/softpromis.com/public_html/v2account/frontend/
```

### Option B: Deploy Backend Changes

**Upload backend files:**

```bash
# Upload backend directory (excluding vendor, node_modules)
rsync -avz --exclude 'vendor' --exclude 'node_modules' --exclude '.env' \
  backend/ u820431346@us-imm-web1739.hstgr.io:~/domains/softpromis.com/public_html/v2account/backend/
```

### Option C: Deploy Everything (Full Deployment)

**Upload entire project:**

```bash
# Upload frontend dist
scp -r frontend/dist/* u820431346@us-imm-web1739.hstgr.io:~/domains/softpromis.com/public_html/v2account/frontend/dist/

# Upload backend (excluding large directories)
rsync -avz --exclude 'vendor' --exclude 'node_modules' --exclude '.env' --exclude 'storage/logs/*' \
  backend/ u820431346@us-imm-web1739.hstgr.io:~/domains/softpromis.com/public_html/v2account/backend/

# Upload root files
scp .htaccess u820431346@us-imm-web1739.hstgr.io:~/domains/softpromis.com/public_html/v2account/
```

---

## Step 3: SSH into Server & Run Commands

**Connect to server:**

```bash
ssh u820431346@us-imm-web1739.hstgr.io
```

**After connecting, navigate to project:**

```bash
cd ~/domains/softpromis.com/public_html/v2account
```

**Run backend commands (if needed):**

```bash
cd backend

# Install/update dependencies
composer install --optimize-autoloader --no-dev --no-interaction

# Run migrations (if needed)
php artisan migrate --force

# Clear and cache config
php artisan config:clear
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Set permissions
chmod -R 775 storage bootstrap/cache
```

---

## Step 4: Verify Deployment

1. **Check files uploaded:**
   ```bash
   ls -la frontend/dist/
   ```

2. **Test the application:**
   - Visit: `https://v2account.softpromis.com`
   - Check browser console for errors
   - Verify theme is correct

3. **Clear server cache (if needed):**
   ```bash
   cd backend
   php artisan cache:clear
   php artisan config:clear
   php artisan route:clear
   php artisan view:clear
   ```

---

## Quick Deployment Script

Create a file `deploy.sh` in project root:

```bash
#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Building frontend...${NC}"
cd frontend
npm run build
cd ..

echo -e "${BLUE}Uploading frontend files...${NC}"
scp -r frontend/dist/* u820431346@us-imm-web1739.hstgr.io:~/domains/softpromis.com/public_html/v2account/frontend/dist/

echo -e "${GREEN}Deployment complete!${NC}"
echo -e "${BLUE}Visit: https://v2account.softpromis.com${NC}"
```

**Make it executable and run:**

```bash
chmod +x deploy.sh
./deploy.sh
```

---

## Troubleshooting

### Permission Denied
```bash
# Set correct permissions on server
ssh u820431346@us-imm-web1739.hstgr.io
chmod -R 755 ~/domains/softpromis.com/public_html/v2account/frontend/dist
```

### Files Not Updating
- Clear browser cache
- Unregister service worker
- Check file timestamps on server: `ls -lt frontend/dist/assets/`

### SCP Connection Issues
- Verify SSH key is set up: `ssh-copy-id u820431346@us-imm-web1739.hstgr.io`
- Or use password authentication (will prompt)

---

## Server Paths Reference

- **Frontend dist:** `~/domains/softpromis.com/public_html/v2account/frontend/dist/`
- **Backend:** `~/domains/softpromis.com/public_html/v2account/backend/`
- **Root .htaccess:** `~/domains/softpromis.com/public_html/v2account/.htaccess`

---

## Recommended Workflow

1. **Make changes locally**
2. **Test locally** (`npm run dev` + `php artisan serve`)
3. **Build frontend** (`npm run build`)
4. **Deploy via SCP** (upload `frontend/dist/*`)
5. **SSH to server** (run backend commands if needed)
6. **Verify on production**

---

**Note:** Always test locally before deploying to production!

