# SOFTPRO FINANCE

A world-class finance Progressive Web Application (PWA) built with Laravel 11 API backend and React + TypeScript frontend. Fast, lightweight, responsive, and fully offline-ready.

## 🚀 Features

### Core Modules
- **Dashboard** - Real-time KPIs, charts, and financial overview
- **Transactions** - Complete transaction management with advanced filtering and pagination
- **Loans** - Loan portfolio management with payment tracking
- **Reports** - Comprehensive reports with charts and CSV/PDF exports
- **Projects** - Project organization and tracking
- **Categories & Subcategories** - Flexible categorization system
- **Settings** - User preferences and configuration

### Key Features
- ✅ **PWA Ready** - Installable, works offline, fast loading
- ✅ **Modern UI** - Beautiful, responsive design with dark/light theme
- ✅ **Advanced Filtering** - Powerful filters across all modules
- ✅ **Data Visualization** - Interactive charts and graphs
- ✅ **Export Capabilities** - CSV and PDF exports
- ✅ **Real-time Updates** - Live data synchronization
- ✅ **Type-safe** - Full TypeScript coverage
- ✅ **Fast & Lightweight** - Optimized for performance

## 🛠 Tech Stack

### Backend
- Laravel 11 (API only)
- Laravel Sanctum (SPA cookie authentication)
- SQLite (development) / MySQL (production)
- barryvdh/laravel-dompdf (PDF exports)

### Frontend
- React 19 + TypeScript
- Vite
- TanStack Query (server state management)
- TanStack Table (data tables)
- Recharts (charts & visualizations)
- Tailwind CSS + shadcn/ui
- React Router
- Axios
- vite-plugin-pwa (PWA support)

## 📦 Installation

### Prerequisites
- PHP 8.2+
- Composer
- Node.js 18+
- npm or yarn
- SQLite (development) or MySQL (production)

### Backend Setup

1. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Install dependencies:**
   ```bash
   composer install
   ```

3. **Copy environment file:**
   ```bash
   cp .env.example .env
   ```

4. **Generate application key:**
   ```bash
   php artisan key:generate
   ```

5. **Configure database (SQLite for development):**
   - For SQLite (default), ensure `database/database.sqlite` exists:
     ```bash
     touch database/database.sqlite
     ```
   - Or update `.env` for MySQL:
     ```env
     DB_CONNECTION=mysql
     DB_HOST=127.0.0.1
     DB_PORT=3306
     DB_DATABASE=softpro_finance
     DB_USERNAME=your_username
     DB_PASSWORD=your_password
     ```

6. **Run migrations:**
   ```bash
   php artisan migrate
   ```

7. **Seed demo data:**
   ```bash
   php artisan db:seed
   ```

   Default credentials:
   - Email: `admin@softpro.com`
   - Password: `password`

8. **Configure CORS and Sanctum:**
   - Update `.env`:
     ```env
     SANCTUM_STATEFUL_DOMAINS=localhost:5173,127.0.0.1:5173
     FRONTEND_URL=http://localhost:5173
     ```
   - CORS is already configured in `config/cors.php`

9. **Start development server:**
   ```bash
   php artisan serve
   ```
   Server will run on `http://localhost:8000` (or next available port)

### Frontend Setup

1. **Navigate to frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure API endpoint:**
   - Update `src/lib/api-client.ts` if backend runs on different port:
     ```typescript
     baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
     ```
   - Or create `.env`:
     ```env
     VITE_API_URL=http://localhost:8000/api
     ```

4. **Start development server:**
   ```bash
   npm run dev
   ```
   Frontend will run on `http://localhost:5173`

5. **Build for production:**
   ```bash
   npm run build
   ```
   Output will be in `dist/` directory

## 🚀 Deployment (Hostinger Cloud Startup)

### Backend Deployment

1. **Upload backend files** to your server (e.g., `/public_html/api`)

2. **Set up environment:**
   ```bash
   cd /path/to/backend
   cp .env.example .env
   php artisan key:generate
   ```

3. **Update `.env` for production:**
   ```env
   APP_ENV=production
   APP_DEBUG=false
   APP_URL=https://yourdomain.com
   
   DB_CONNECTION=mysql
   DB_HOST=localhost
   DB_DATABASE=your_database
   DB_USERNAME=your_username
   DB_PASSWORD=your_password
   
   SANCTUM_STATEFUL_DOMAINS=yourdomain.com,www.yourdomain.com
   FRONTEND_URL=https://yourdomain.com
   
   SESSION_DOMAIN=.yourdomain.com
   ```

4. **Install dependencies and setup:**
   ```bash
   composer install --optimize-autoloader --no-dev
   php artisan migrate --force
   php artisan config:cache
   php artisan route:cache
   php artisan view:cache
   ```

5. **Configure web server (Nginx example):**
   ```nginx
   server {
       listen 80;
       server_name api.yourdomain.com;
       root /path/to/backend/public;
       
       add_header X-Frame-Options "SAMEORIGIN";
       add_header X-Content-Type-Options "nosniff";
       
       index index.php;
       
       charset utf-8;
       
       location / {
           try_files $uri $uri/ /index.php?$query_string;
       }
       
       location = /favicon.ico { access_log off; log_not_found off; }
       location = /robots.txt  { access_log off; log_not_found off; }
       
       error_page 404 /index.php;
       
       location ~ \.php$ {
           fastcgi_pass unix:/var/run/php/php8.2-fpm.sock;
           fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
           include fastcgi_params;
       }
       
       location ~ /\.(?!well-known).* {
           deny all;
       }
   }
   ```

### Frontend Deployment

1. **Build the application:**
   ```bash
   cd frontend
   npm run build
   ```

2. **Upload `dist/` contents** to your web server root (e.g., `/public_html`)

3. **Configure web server (Nginx example):**
   ```nginx
   server {
       listen 80;
       server_name yourdomain.com www.yourdomain.com;
       root /path/to/frontend/dist;
       index index.html;
       
       # PWA support
       location ~* \.(?:manifest|json)$ {
           add_header Cache-Control "public, max-age=0";
       }
       
       location / {
           try_files $uri $uri/ /index.html;
       }
       
       # Cache static assets
       location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
           expires 1y;
           add_header Cache-Control "public, immutable";
       }
   }
   ```

4. **Update API URL in production:**
   - Build with environment variable:
     ```bash
     VITE_API_URL=https://api.yourdomain.com/api npm run build
     ```
   - Or update `src/lib/api-client.ts` before building

5. **Enable HTTPS** (required for PWA):
   - Use Let's Encrypt or your hosting provider's SSL
   - Update `APP_URL` and `FRONTEND_URL` in backend `.env` to use `https://`

## 📱 PWA Installation

The application is fully PWA-ready. Users can install it on their devices:

### Desktop (Chrome/Edge)
1. Visit the application URL
2. Click the install icon in the address bar
3. Follow the installation prompt

### Mobile (iOS)
1. Open in Safari
2. Tap Share button
3. Select "Add to Home Screen"

### Mobile (Android)
1. Open in Chrome
2. Tap menu (three dots)
3. Select "Add to Home Screen" or "Install app"

## 🔧 Development

### Running Both Servers

**Terminal 1 (Backend):**
```bash
cd backend
php artisan serve
```

**Terminal 2 (Frontend):**
```bash
cd frontend
npm run dev
```

### Database Commands

```bash
# Create new migration
php artisan make:migration create_table_name

# Run migrations
php artisan migrate

# Rollback last migration
php artisan migrate:rollback

# Seed database
php artisan db:seed

# Fresh migration (drops all tables)
php artisan migrate:fresh --seed
```

### Code Quality

```bash
# Frontend linting
cd frontend
npm run lint

# Type checking
npm run type-check  # if configured
```

## 📝 API Documentation

### Authentication
- `POST /api/login` - Login
- `POST /api/logout` - Logout
- `GET /api/me` - Get current user

### Transactions
- `GET /api/transactions` - List transactions (paginated)
- `POST /api/transactions` - Create transaction
- `GET /api/transactions/{id}` - Get transaction
- `PUT /api/transactions/{id}` - Update transaction
- `DELETE /api/transactions/{id}` - Delete transaction

### Loans
- `GET /api/loans` - List loans (paginated)
- `POST /api/loans` - Create loan
- `GET /api/loans/{id}` - Get loan
- `PUT /api/loans/{id}` - Update loan
- `DELETE /api/loans/{id}` - Delete loan
- `POST /api/loans/{id}/payments` - Add payment
- `PUT /api/loans/{id}/payments/{payment}` - Update payment
- `DELETE /api/loans/{id}/payments/{payment}` - Delete payment

### Reports
- `GET /api/reports/summary` - Get report summary
- `GET /api/reports/export/csv` - Export CSV
- `GET /api/reports/export/pdf` - Export PDF

All endpoints require authentication via Laravel Sanctum.

## 🐛 Troubleshooting

### CORS Issues
- Ensure `SANCTUM_STATEFUL_DOMAINS` includes your frontend URL
- Check `config/cors.php` settings
- Verify frontend sends credentials: `withCredentials: true`

### Authentication Issues
- Clear browser cookies
- Check session configuration in `.env`
- Verify `SESSION_DOMAIN` matches your domain

### PWA Not Working
- Ensure HTTPS is enabled (required for PWA)
- Check browser console for service worker errors
- Clear service worker cache in DevTools
- Verify manifest.json is accessible

### Database Issues
- Check database file permissions (SQLite)
- Verify database credentials (MySQL)
- Run `php artisan migrate:fresh` if needed

## 📄 License

This project is proprietary software.

## 👥 Support

For issues and questions, please contact the development team.

---

Built with ❤️ for finance operators

