#!/bin/bash

# Frontend Deployment Script
# Usage: ./deploy-frontend.sh

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== SOFTPRO Finance - Frontend Deployment ===${NC}\n"

# Configuration (Update these with your server details)
SERVER_USER="u820431346"
SERVER_HOST="us-imm-web1739.hstgr.io"
SERVER_PATH="~/domains/softpromis.com/public_html/ams/frontend/dist"
LOCAL_DIST="frontend/dist"

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

echo -e "\n${BLUE}Step 2: Uploading files to server...${NC}"
echo -e "${YELLOW}Server: ${SERVER_USER}@${SERVER_HOST}${NC}"
echo -e "${YELLOW}Path: ${SERVER_PATH}${NC}\n"

# Upload files
scp -r frontend/dist/* ${SERVER_USER}@${SERVER_HOST}:${SERVER_PATH}/

if [ $? -eq 0 ]; then
    echo -e "\n${GREEN}✓ Deployment successful!${NC}"
    echo -e "${BLUE}Visit: https://ams.softpromis.com${NC}"
    echo -e "\n${YELLOW}Note: Clear browser cache and service worker to see changes${NC}"
else
    echo -e "\n${RED}✗ Deployment failed!${NC}"
    echo -e "${YELLOW}Possible issues:${NC}"
    echo "  1. SSH connection timeout - check server hostname/IP"
    echo "  2. Wrong credentials - verify SSH key or password"
    echo "  3. Server path incorrect - verify path on server"
    echo "  4. Firewall blocking - check Hostinger firewall settings"
    exit 1
fi

