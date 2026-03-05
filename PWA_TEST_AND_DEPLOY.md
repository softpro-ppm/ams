# 📱 PWA Testing & Deployment Guide

## ✅ Step 1: Build PWA for Production

### Build Frontend with PWA Support

```bash
cd frontend
npm run build
```

**Expected Output:**
```
✓ built in X.XXs

PWA v1.2.0
mode      generateSW
precache  X entries (XXXX KiB)
files generated
  dist/sw.js
  dist/workbox-XXXXX.js
```

**Verify Files Created:**
```bash
ls -la dist/ | grep -E "(manifest|sw\.js|workbox)"
```

You should see:
- `manifest.webmanifest`
- `sw.js`
- `workbox-*.js`

---

## 🚀 Step 2: Deploy PWA to Production

### Option A: Using Git (Recommended)

**On your local machine:**
```bash
cd /Users/rajesh/Documents/GitHub/v2account
git add frontend/dist/
git commit -m "Deploy PWA build"
git push origin main
```

**On server (SSH):**
```bash
ssh -p 65002 u820431346@145.14.146.15
cd ~/domains/softpromis.com/public_html/v2account
git pull origin main
```

### Option B: Using SCP (Direct Upload)

```bash
cd /Users/rajesh/Documents/GitHub/v2account/frontend
scp -P 65002 -r dist/* u820431346@145.14.146.15:~/domains/softpromis.com/public_html/v2account/frontend/dist/
```

**Important:** Upload ALL files including:
- `manifest.webmanifest`
- `sw.js`
- `workbox-*.js`
- `assets/` folder
- `index.html`

---

## 🧪 Step 3: Test PWA Installation

### Desktop (Chrome/Edge)

1. **Visit:** `https://v2account.softpromis.com`
2. **Look for install icon** in address bar (usually a "+" or install icon)
3. **Click install icon** or look for "Install" button
4. **Follow installation prompt**
5. **Verify:** App opens in standalone window (no browser UI)

### Mobile (Android - Chrome)

1. **Open:** `https://v2account.softpromis.com` in Chrome
2. **Tap menu** (three dots) → **"Add to Home Screen"** or **"Install app"**
3. **Confirm installation**
4. **Verify:** App icon appears on home screen
5. **Tap icon** → App opens in standalone mode

### Mobile (iOS - Safari)

1. **Open:** `https://v2account.softpromis.com` in Safari
2. **Tap Share button** (square with arrow)
3. **Select "Add to Home Screen"**
4. **Customize name** (optional) → **"Add"**
5. **Verify:** App icon appears on home screen
6. **Tap icon** → App opens in standalone mode

---

## 🔍 Step 4: Verify PWA Files on Server

**SSH into server:**
```bash
ssh -p 65002 u820431346@145.14.146.15
cd ~/domains/softpromis.com/public_html/v2account/frontend/dist
ls -la | grep -E "(manifest|sw\.js|workbox)"
```

**Check manifest:**
```bash
cat manifest.webmanifest
```

**Check service worker:**
```bash
head -20 sw.js
```

---

## 🌐 Step 5: Test PWA Functionality

### Test 1: Service Worker Registration

1. **Open DevTools** (F12)
2. **Go to:** Application → Service Workers
3. **Verify:** Service worker is registered and "activated"
4. **Status:** Should show "activated and is running"

### Test 2: Manifest

1. **DevTools** → Application → Manifest
2. **Verify:**
   - Name: "SOFTPRO Finance"
   - Short name: "SoftPro"
   - Icons: 192x192 and 512x512
   - Display: "standalone"
   - Start URL: "/"

### Test 3: Offline Functionality

1. **Install the PWA** (if not already installed)
2. **Open DevTools** → Network tab
3. **Check "Offline" checkbox**
4. **Refresh the page**
5. **Verify:** App still loads (from cache)
6. **Navigate between pages**
7. **Verify:** Pages load from cache

### Test 4: Install Prompt

1. **Visit:** `https://v2account.softpromis.com`
2. **Wait a few seconds**
3. **Verify:** Install prompt dialog appears (if not already installed)
4. **Test:** Click "Install" and verify installation

### Test 5: Cache Storage

1. **DevTools** → Application → Cache Storage
2. **Verify:** Multiple caches exist:
   - `static-resources` (CSS, JS, images)
   - `api-cache` (API responses)
   - `google-fonts` (if using Google Fonts)
3. **Check:** Files are cached

---

## 🐛 Troubleshooting

### Service Worker Not Registering

**Check:**
1. HTTPS is enabled (required for PWA) ✅ You have this
2. Service worker file exists: `frontend/dist/sw.js`
3. Console for errors

**Fix:**
```bash
# On server, verify file exists
ls -la ~/domains/softpromis.com/public_html/v2account/frontend/dist/sw.js
```

### Install Prompt Not Showing

**Possible reasons:**
1. Already installed
2. Browser doesn't support PWA
3. Manifest errors

**Check:**
- DevTools → Application → Manifest (look for errors)
- Visit: `https://v2account.softpromis.com/manifest.webmanifest` (should show JSON)

### Offline Not Working

**Check:**
1. Service worker is registered
2. Cache Storage has files
3. Network tab shows "Service Worker" in source column

**Fix:**
- Clear cache and reinstall
- Check `.htaccess` serves `sw.js` correctly

### Blank Page After Install

**Check:**
1. `.htaccess` serves static files correctly
2. Root URL (`/`) serves `index.html`
3. Console for errors

---

## ✅ PWA Checklist

- [ ] Frontend built with PWA support
- [ ] `manifest.webmanifest` exists
- [ ] `sw.js` exists
- [ ] `workbox-*.js` exists
- [ ] Files uploaded to server
- [ ] `.htaccess` serves PWA files correctly
- [ ] Service worker registers
- [ ] Manifest loads without errors
- [ ] Install prompt appears
- [ ] App installs successfully
- [ ] App works offline
- [ ] Cache storage works

---

## 🎯 Quick Test Commands

**Check PWA files on server:**
```bash
ssh -p 65002 u820431346@145.14.146.15
cd ~/domains/softpromis.com/public_html/v2account/frontend/dist
ls -la manifest.webmanifest sw.js workbox-*.js
```

**Test manifest URL:**
Visit: `https://v2account.softpromis.com/manifest.webmanifest`

**Test service worker URL:**
Visit: `https://v2account.softpromis.com/sw.js`

Both should return content (not 404).

---

## 📱 PWA Features Working

Once deployed and tested, your PWA will have:

✅ **Installable** - Users can install on devices  
✅ **Offline Support** - Works without internet  
✅ **Fast Loading** - Cached assets  
✅ **App-like Experience** - Standalone mode  
✅ **Background Sync** - Syncs when online  
✅ **Push Notifications Ready** - Can add later  

---

**Ready to test! 🚀**

