#!/bin/bash

# Build, Deploy & Clear Cache
# Usage: ./deploy-frontend.sh [full|frontend]
#   full     - Build + upload frontend + backend + clear cache (default)
#   frontend - Build + upload frontend only (faster for UI-only changes)

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Deploy mode: full or frontend
DEPLOY_MODE="${1:-full}"

# Configuration (Update these with your server details)
SERVER_USER="u820431346"
SERVER_HOST="us-imm-web1739.hstgr.io"
SERVER_PORT="65002"   # Hostinger uses 65002, not 22. Check hPanel → SSH Access for your port.
FRONTEND_PATH="~/domains/softpromis.com/public_html/ams/frontend/dist"
BACKEND_PATH="~/domains/softpromis.com/public_html/ams/backend"
LOCAL_DIST="frontend/dist"

# SSH connection reuse: first connection prompts for password, rest reuse it (1 prompt instead of 12+)
SSH_OPTS="-o ControlMaster=auto -o ControlPersist=60"

# Check if dist folder exists
if [ ! -d "$LOCAL_DIST" ]; then
    echo -e "${RED}Error: $LOCAL_DIST not found!${NC}"
    echo -e "${YELLOW}Building frontend first...${NC}"
    cd frontend
    npm run build
    cd ..
fi

echo -e "${BLUE}Step 1: Building frontend...${NC}"
cd frontend
npm run build
if [ $? -ne 0 ]; then
    echo -e "${RED}Build failed!${NC}"
    exit 1
fi
cd ..

echo -e "\n${BLUE}Step 2: Uploading frontend to server...${NC}"
echo -e "${YELLOW}Server: ${SERVER_USER}@${SERVER_HOST}${NC}"
echo -e "${YELLOW}Path: ${FRONTEND_PATH}${NC}\n"

scp ${SSH_OPTS} -P ${SERVER_PORT} -r frontend/dist/* ${SERVER_USER}@${SERVER_HOST}:${FRONTEND_PATH}/

if [ $? -ne 0 ]; then
    echo -e "\n${RED}✗ Frontend deployment failed!${NC}"
    exit 1
fi

if [ "$DEPLOY_MODE" = "frontend" ]; then
    echo -e "\n${GREEN}✓ Frontend-only deployment complete!${NC}"
    echo -e "${BLUE}Visit: https://ams.softpromis.com${NC}"
    echo -e "\n${YELLOW}Note: Clear browser cache and service worker to see changes${NC}"
    exit 0
fi

echo -e "\n${BLUE}Step 3: Uploading backend changes...${NC}"
# rsync keeps backend in sync with repo (controllers/routes/models/migrations). Partial scp breaks production.
RSYNC_EXCLUDES=(--exclude='vendor' --exclude='node_modules' --exclude='.env' --exclude='storage/logs/*' --exclude='storage/framework/cache/*' --exclude='storage/framework/sessions/*' --exclude='storage/framework/views/*')
RSYNC_SSH="ssh ${SSH_OPTS} -p ${SERVER_PORT}"

if command -v rsync >/dev/null 2>&1; then
    rsync -avz \
        "${RSYNC_EXCLUDES[@]}" \
        -e "${RSYNC_SSH}" \
        backend/app/ \
        "${SERVER_USER}@${SERVER_HOST}:${BACKEND_PATH}/app/" && \
    rsync -avz \
        "${RSYNC_EXCLUDES[@]}" \
        -e "${RSYNC_SSH}" \
        backend/routes/ \
        "${SERVER_USER}@${SERVER_HOST}:${BACKEND_PATH}/routes/" && \
    # Never sync bootstrap/cache/*.php from dev.
    rsync -avz \
        "${RSYNC_EXCLUDES[@]}" \
        --exclude='cache/*.php' \
        -e "${RSYNC_SSH}" \
        backend/bootstrap/ \
        "${SERVER_USER}@${SERVER_HOST}:${BACKEND_PATH}/bootstrap/" && \
    rsync -avz \
        "${RSYNC_EXCLUDES[@]}" \
        -e "${RSYNC_SSH}" \
        backend/config/ \
        "${SERVER_USER}@${SERVER_HOST}:${BACKEND_PATH}/config/" && \
    rsync -avz \
        "${RSYNC_EXCLUDES[@]}" \
        -e "${RSYNC_SSH}" \
        backend/database/migrations/ \
        "${SERVER_USER}@${SERVER_HOST}:${BACKEND_PATH}/database/migrations/" && \
    rsync -avz \
        "${RSYNC_EXCLUDES[@]}" \
        -e "${RSYNC_SSH}" \
        backend/resources/views/ \
        "${SERVER_USER}@${SERVER_HOST}:${BACKEND_PATH}/resources/views/"
    RSYNC_OK=$?
else
    echo -e "${YELLOW}rsync not found; install rsync or upload backend manually.${NC}"
    RSYNC_OK=1
fi

if [ $RSYNC_OK -ne 0 ]; then
    echo -e "\n${YELLOW}⚠ Backend rsync failed (frontend deployed).${NC}"
else
    echo -e "${GREEN}✓ Backend synced (app, routes, bootstrap, config, migrations, views)${NC}"
fi

echo -e "\n${BLUE}Step 4: Laravel migrate + clear caches on server...${NC}"
# Drop cached manifests that may reference dev-only packages, then rebuild from server's vendor/composer.
ssh ${SSH_OPTS} -p ${SERVER_PORT} ${SERVER_USER}@${SERVER_HOST} "cd ${BACKEND_PATH} && rm -f bootstrap/cache/packages.php bootstrap/cache/services.php bootstrap/cache/config.php 2>/dev/null; php artisan package:discover --ansi && php artisan migrate --force && php artisan optimize:clear"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Migrate + caches cleared${NC}"
else
    echo -e "${YELLOW}⚠ Step 4 failed. On the server run:${NC}"
    echo -e "  cd ${BACKEND_PATH} && rm -f bootstrap/cache/packages.php bootstrap/cache/services.php bootstrap/cache/config.php && php artisan package:discover && php artisan migrate --force && php artisan optimize:clear"
fi

echo -e "\n${BLUE}Step 5: Recent Laravel log (last 15 lines)...${NC}"
ssh ${SSH_OPTS} -p ${SERVER_PORT} ${SERVER_USER}@${SERVER_HOST} "cd ${BACKEND_PATH} && tail -15 storage/logs/laravel.log 2>/dev/null || echo '(no log file)'"

echo -e "\n${GREEN}✓ Deployment complete!${NC}"
echo -e "${BLUE}Visit: https://ams.softpromis.com${NC}"
echo -e "\n${YELLOW}Note: Clear browser cache and service worker to see changes${NC}"

