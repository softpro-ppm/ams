# Debugging Blank Screen Issue

## Steps to Debug

1. **Open Browser Developer Tools**
   - Press `F12` or `Cmd+Option+I` (Mac)
   - Go to the **Console** tab

2. **Check for Errors**
   - Look for any red error messages
   - Common errors:
     - "Failed to fetch" - Backend not running
     - "Cannot read property" - Missing component
     - "Module not found" - Import error

3. **Check Network Tab**
   - Go to **Network** tab
   - Refresh the page
   - Check if `main.tsx` and other files are loading (status 200)
   - Check if API calls are being made

4. **Check if React is Mounting**
   - In Console, type: `document.getElementById('root')`
   - Should return the root div element
   - If null, HTML isn't loading

5. **Check Backend Connection**
   - In Console, type: `fetch('http://localhost:8000/api/me')`
   - Should return a response (even if 401 is OK)

## Quick Fixes to Try

1. **Hard Refresh**
   - `Ctrl+Shift+R` (Windows/Linux)
   - `Cmd+Shift+R` (Mac)

2. **Clear Browser Cache**
   - Open DevTools → Application → Clear Storage → Clear site data

3. **Check if Servers are Running**
   ```bash
   # Terminal 1 - Backend
   cd backend
   php artisan serve
   
   # Terminal 2 - Frontend  
   cd frontend
   npm run dev
   ```

4. **Check Ports**
   - Backend should be on: http://localhost:8000
   - Frontend should be on: http://localhost:5173

5. **Check API URL**
   - Open `frontend/src/lib/api-client.ts`
   - Should be: `http://localhost:8000` (not 8001)

## Common Issues

- **CORS Error**: Backend CORS not configured properly
- **401 Error**: Normal if not logged in, should show login page
- **Network Error**: Backend not running or wrong port
- **Module Error**: Missing dependencies, run `npm install`

