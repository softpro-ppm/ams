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
# Ensure Income request dir exists on server
ssh ${SSH_OPTS} -p ${SERVER_PORT} ${SERVER_USER}@${SERVER_HOST} "mkdir -p ${BACKEND_PATH}/app/Http/Requests/Income ${BACKEND_PATH}/resources/views/reports" 2>/dev/null
# Deploy IMS + SMS + dashboard timezone/quarter fixes (controllers, config, middleware, requests, routes, bootstrap)
scp ${SSH_OPTS} -P ${SERVER_PORT} backend/app/Http/Controllers/Api/DashboardController.php \
    ${SERVER_USER}@${SERVER_HOST}:${BACKEND_PATH}/app/Http/Controllers/Api/ && \
scp ${SSH_OPTS} -P ${SERVER_PORT} backend/config/app.php \
    ${SERVER_USER}@${SERVER_HOST}:${BACKEND_PATH}/config/ && \
scp ${SSH_OPTS} -P ${SERVER_PORT} backend/app/Http/Controllers/Api/IncomeFromImsController.php \
    ${SERVER_USER}@${SERVER_HOST}:${BACKEND_PATH}/app/Http/Controllers/Api/ && \
scp ${SSH_OPTS} -P ${SERVER_PORT} backend/app/Http/Controllers/Api/ReportController.php \
    ${SERVER_USER}@${SERVER_HOST}:${BACKEND_PATH}/app/Http/Controllers/Api/ && \
scp ${SSH_OPTS} -P ${SERVER_PORT} backend/app/Http/Controllers/Api/IncomeFromSmsController.php \
    ${SERVER_USER}@${SERVER_HOST}:${BACKEND_PATH}/app/Http/Controllers/Api/ && \
scp ${SSH_OPTS} -P ${SERVER_PORT} backend/app/Http/Middleware/ValidateImsApiKey.php \
    ${SERVER_USER}@${SERVER_HOST}:${BACKEND_PATH}/app/Http/Middleware/ && \
scp ${SSH_OPTS} -P ${SERVER_PORT} backend/app/Http/Middleware/ValidateSmsApiKey.php \
    ${SERVER_USER}@${SERVER_HOST}:${BACKEND_PATH}/app/Http/Middleware/ && \
scp ${SSH_OPTS} -P ${SERVER_PORT} backend/app/Http/Requests/Income/IncomeFromImsRequest.php \
    ${SERVER_USER}@${SERVER_HOST}:${BACKEND_PATH}/app/Http/Requests/Income/ && \
scp ${SSH_OPTS} -P ${SERVER_PORT} backend/app/Http/Requests/Income/IncomeFromSmsRequest.php \
    ${SERVER_USER}@${SERVER_HOST}:${BACKEND_PATH}/app/Http/Requests/Income/ && \
scp ${SSH_OPTS} -P ${SERVER_PORT} backend/routes/api.php \
    ${SERVER_USER}@${SERVER_HOST}:${BACKEND_PATH}/routes/ && \
scp ${SSH_OPTS} -P ${SERVER_PORT} backend/bootstrap/app.php \
    ${SERVER_USER}@${SERVER_HOST}:${BACKEND_PATH}/bootstrap/ && \
scp ${SSH_OPTS} -P ${SERVER_PORT} backend/config/services.php \
    ${SERVER_USER}@${SERVER_HOST}:${BACKEND_PATH}/config/ && \
scp ${SSH_OPTS} -P ${SERVER_PORT} backend/resources/views/reports/statement.blade.php \
    ${SERVER_USER}@${SERVER_HOST}:${BACKEND_PATH}/resources/views/reports/

if [ $? -ne 0 ]; then
    echo -e "\n${YELLOW}⚠ Backend upload failed (frontend deployed). Check backend path.${NC}"
else
    echo -e "${GREEN}✓ Backend uploaded (dashboard + config timezone, IMS/SMS, reports, routes, bootstrap)${NC}"
fi

echo -e "\n${BLUE}Step 4: Clearing Laravel cache on server...${NC}"
ssh ${SSH_OPTS} -p ${SERVER_PORT} ${SERVER_USER}@${SERVER_HOST} "cd ${BACKEND_PATH} && php artisan cache:clear && php artisan config:clear && php artisan route:clear"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Cache cleared${NC}"
else
    echo -e "${YELLOW}⚠ Cache clear failed. You may need to run manually: php artisan cache:clear${NC}"
fi

echo -e "\n${BLUE}Step 5: Recent Laravel log (last 15 lines)...${NC}"
ssh ${SSH_OPTS} -p ${SERVER_PORT} ${SERVER_USER}@${SERVER_HOST} "cd ${BACKEND_PATH} && tail -15 storage/logs/laravel.log 2>/dev/null || echo '(no log file)'"

echo -e "\n${GREEN}✓ Deployment complete!${NC}"
echo -e "${BLUE}Visit: https://ams.softpromis.com${NC}"
echo -e "\n${YELLOW}Note: Clear browser cache and service worker to see changes${NC}"

