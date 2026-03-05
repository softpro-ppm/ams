# 📱 PWA Deployment Guide

## ✅ PWA Setup Complete!

Your SOFTPRO Finance application is now a fully functional Progressive Web App (PWA) with:

- ✅ Service Worker registration
- ✅ Offline support
- ✅ Install prompt
- ✅ App manifest
- ✅ Caching strategies
- ✅ Background sync support

---

## 🚀 Deploy PWA to Production

### Step 1: Build Frontend with PWA

```bash
cd frontend
npm run build
```

This will generate:
- `dist/manifest.webmanifest` - PWA manifest file
- `dist/sw.js` - Service worker file
- `dist/workbox-*.js` - Workbox runtime files
- All PWA icons and assets

---

### Step 2: Verify PWA Files

After building, verify these files exist in `frontend/dist/`:

```bash
ls -la frontend/dist/ | grep -E "(manifest|sw\.js|workbox)"
```

You should see:
- `manifest.webmanifest`
- `sw.js`
- `workbox-*.js` files

---

### Step 3: Upload to Server

Upload the entire `frontend/dist/` folder to your server:

```bash
# From your local machine
cd frontend
scp -P 65002 -r dist/* u820431346@145.14.146.15:~/domains/softpromis.com/public_html/v2account/frontend/dist/
```

Or use Git:

```bash
# On server
cd ~/domains/softpromis.com/public_html/v2account
git pull origin main
cd frontend
npm install
npm run build
```

---

### Step 4: Verify .htaccess Supports PWA

Ensure your root `.htaccess` serves PWA files correctly:

```apache
RewriteEngine On

# API Routes - Pass to Laravel backend
RewriteCond %{REQUEST_URI} ^/api
RewriteRule ^api/(.*)$ backend/public/index.php [L]

# PWA Files - Serve manifest and service worker
RewriteCond %{REQUEST_URI} ^/(manifest\.webmanifest|sw\.js|workbox-.*\.js)$
RewriteRule ^(.*)$ frontend/dist/$1 [L]

# Frontend Routes - Serve static files first
RewriteCond %{REQUEST_FILENAME} -f
RewriteCond %{REQUEST_URI} !^/api
RewriteRule ^(.*)$ - [L]

# Frontend Routes - Serve index.html for all non-API routes (SPA routing)
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteCond %{REQUEST_URI} !^/api
RewriteRule ^(.*)$ frontend/dist/index.html [L]
```

---

### Step 5: Test PWA Installation

#### Desktop (Chrome/Edge):
1. Visit `https://v2account.softpromis.com`
2. Look for install icon in address bar
3. Click to install
4. App should open in standalone window

#### Mobile (Android):
1. Open in Chrome
2. Tap menu (three dots)
3. Select "Add to Home Screen" or "Install app"
4. App icon appears on home screen

#### Mobile (iOS):
1. Open in Safari
2. Tap Share button
3. Select "Add to Home Screen"
4. App icon appears on home screen

---

### Step 6: Test Offline Functionality

1. Install the PWA
2. Open the installed app
3. Turn off WiFi/Mobile data
4. App should still work (cached pages)
5. Try navigating between pages
6. Data should load from cache

---

## 🔧 PWA Features

### 1. Install Prompt
- Automatically shows when app is installable
- Users can dismiss or install
- Remembers user choice

### 2. Offline Support
- Static assets cached for 30 days
- API calls cached for 5 minutes
- Works offline with cached data

### 3. Background Sync
- Pending actions sync when online
- Automatic retry for failed requests
- Queue management for offline actions

### 4. Push Notifications
- Ready for push notifications
- Requires backend implementation
- User permission required

---

## 🐛 Troubleshooting

### Service Worker Not Registering

1. **Check HTTPS**: PWA requires HTTPS (you have this ✅)
2. **Check Console**: Look for service worker errors
3. **Clear Cache**: Hard refresh (Ctrl+Shift+R)
4. **Unregister Old SW**: 
   ```javascript
   navigator.serviceWorker.getRegistrations().then(registrations => {
     registrations.forEach(reg => reg.unregister());
   });
   ```

### Install Prompt Not Showing

1. **Check if already installed**: `window.matchMedia("(display-mode: standalone)").matches`
2. **Check manifest**: Visit `https://v2account.softpromis.com/manifest.webmanifest`
3. **Check icons**: Verify icons exist at `/pwa-192x192.png` and `/pwa-512x512.png`
4. **Check console**: Look for errors

### Offline Not Working

1. **Check service worker**: DevTools → Application → Service Workers
2. **Check cache**: DevTools → Application → Cache Storage
3. **Verify workbox**: Check if workbox files are loaded
4. **Check network**: Ensure API routes are excluded from cache

---

## 📊 PWA Checklist

- [x] Service worker registered
- [x] Manifest file generated
- [x] Icons configured (192x192, 512x512)
- [x] Install prompt component
- [x] Offline support
- [x] Caching strategies configured
- [x] HTTPS enabled (required)
- [x] Meta tags in HTML
- [ ] Test on mobile devices
- [ ] Test offline functionality
- [ ] Verify install prompt works

---

## 🎯 Next Steps

1. **Build and deploy** the updated frontend
2. **Test installation** on different devices
3. **Test offline** functionality
4. **Fine-tune** caching strategies if needed
5. **Add push notifications** (optional)

---

## 📱 PWA Best Practices

1. **Keep manifest updated** when changing app name/icon
2. **Version service worker** when making changes
3. **Test offline** regularly
4. **Monitor cache** size
5. **Update prompt** when new version available

---

## 🔗 Resources

- [PWA Documentation](https://web.dev/progressive-web-apps/)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Web App Manifest](https://developer.mozilla.org/en-US/docs/Web/Manifest)
- [Vite PWA Plugin](https://vite-pwa-org.netlify.app/)

---

**Your PWA is ready! 🎉**

Build and deploy to see it in action!

