#!/bin/bash

# OHUA Backend - Azure Infrastructure Setup Script
# Run this script once to create all required Azure resources

set -e  # Exit on any error

echo "🚀 OHUA Backend - Azure Setup Starting..."
echo "======================================"

# Configuration
RESOURCE_GROUP="rg-ohua-backend"
APP_SERVICE_PLAN="asp-ohua-backend"
WEB_APP_NAME="ohua-backend"
LOCATION="eastus"
PRICING_TIER="B1"  # Basic tier - change to P1V3 for production

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
print_step() {
    echo -e "${BLUE}📋 Step $1: $2${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check prerequisites
print_step "1" "Checking Prerequisites"

# Check if Azure CLI is installed
if ! command -v az &> /dev/null; then
    print_error "Azure CLI is not installed. Please install it first:"
    echo "https://docs.microsoft.com/en-us/cli/azure/install-azure-cli"
    exit 1
fi

# Check if user is logged in
if ! az account show &> /dev/null; then
    print_warning "You are not logged in to Azure"
    echo "Please run: az login"
    exit 1
fi

print_success "Prerequisites checked"

# Get current subscription info
SUBSCRIPTION_NAME=$(az account show --query name -o tsv)
SUBSCRIPTION_ID=$(az account show --query id -o tsv)
echo "📋 Using subscription: $SUBSCRIPTION_NAME ($SUBSCRIPTION_ID)"

# Confirm before proceeding
echo ""
echo "This script will create the following resources:"
echo "  • Resource Group: $RESOURCE_GROUP"
echo "  • App Service Plan: $APP_SERVICE_PLAN ($PRICING_TIER)"
echo "  • Web App: $WEB_APP_NAME"
echo "  • Location: $LOCATION"
echo ""
read -p "Do you want to continue? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Setup cancelled."
    exit 0
fi

# Step 2: Create Resource Group
print_step "2" "Creating Resource Group"

if az group show --name $RESOURCE_GROUP &> /dev/null; then
    print_warning "Resource group '$RESOURCE_GROUP' already exists"
else
    az group create --name $RESOURCE_GROUP --location $LOCATION
    print_success "Resource group '$RESOURCE_GROUP' created"
fi

# Step 3: Create App Service Plan
print_step "3" "Creating App Service Plan"

if az appservice plan show --name $APP_SERVICE_PLAN --resource-group $RESOURCE_GROUP &> /dev/null; then
    print_warning "App Service Plan '$APP_SERVICE_PLAN' already exists"
else
    az appservice plan create \
        --name $APP_SERVICE_PLAN \
        --resource-group $RESOURCE_GROUP \
        --location $LOCATION \
        --sku $PRICING_TIER \
        --is-linux
    print_success "App Service Plan '$APP_SERVICE_PLAN' created"
fi

# Step 4: Create Web App
print_step "4" "Creating Web App"

if az webapp show --name $WEB_APP_NAME --resource-group $RESOURCE_GROUP &> /dev/null; then
    print_warning "Web App '$WEB_APP_NAME' already exists"
else
    az webapp create \
        --name $WEB_APP_NAME \
        --resource-group $RESOURCE_GROUP \
        --plan $APP_SERVICE_PLAN \
        --runtime "NODE:18-lts"
    print_success "Web App '$WEB_APP_NAME' created"
fi

# Step 5: Configure Application Settings
print_step "5" "Configuring Application Settings"

echo "Setting basic application configuration..."

az webapp config appsettings set \
    --resource-group $RESOURCE_GROUP \
    --name $WEB_APP_NAME \
    --settings \
        NODE_ENV="production" \
        DISABLE_SIGNATURE_VALIDATION="false" \
        WEBSITE_NODE_DEFAULT_VERSION="18-lts" \
        SCM_DO_BUILD_DURING_DEPLOYMENT="true"

print_success "Basic application settings configured"

# Step 6: Enable logging
print_step "6" "Enabling Application Logging"

az webapp log config \
    --resource-group $RESOURCE_GROUP \
    --name $WEB_APP_NAME \
    --application-logging filesystem \
    --level information \
    --web-server-logging filesystem

print_success "Application logging enabled"

# Step 7: Configure HTTPS
print_step "7" "Configuring HTTPS"

az webapp update \
    --resource-group $RESOURCE_GROUP \
    --name $WEB_APP_NAME \
    --https-only true

print_success "HTTPS-only enforced"

# Display results
echo ""
echo "🎉 Azure Infrastructure Setup Complete!"
echo "======================================"
echo ""
echo "📋 Created Resources:"
echo "  • Resource Group: $RESOURCE_GROUP"
echo "  • App Service Plan: $APP_SERVICE_PLAN"
echo "  • Web App: $WEB_APP_NAME"
echo ""
echo "🌐 Your application URLs:"
echo "  • App URL: https://$WEB_APP_NAME.azurewebsites.net"
echo "  • LINE Webhook: https://$WEB_APP_NAME.azurewebsites.net/webhook/line"
echo "  • WeChat Webhook: https://$WEB_APP_NAME.azurewebsites.net/webhook/wechat"
echo "  • Health Check: https://$WEB_APP_NAME.azurewebsites.net/health"
echo ""
echo "📋 Next Steps:"
echo "  1. Configure your application secrets:"
echo "     az webapp config appsettings set --resource-group $RESOURCE_GROUP --name $WEB_APP_NAME --settings \\"
echo "         LINE_CHANNEL_ID=\"your_line_channel_id\" \\"
echo "         LINE_CHANNEL_SECRET=\"your_line_channel_secret\" \\"
echo "         OPENAI_API_KEY=\"your_openai_api_key\""
echo ""
echo "  2. Get publish profile for GitHub Actions:"
echo "     az webapp deployment list-publishing-profiles --resource-group $RESOURCE_GROUP --name $WEB_APP_NAME --xml"
echo ""
echo "  3. Deploy your application using GitHub Actions or:"
echo "     npm run azure:deploy"
echo ""
echo "🔧 Useful commands:"
echo "  • View logs: npm run azure:logs"
echo "  • Restart app: npm run azure:restart"
echo "  • Open in browser: az webapp browse --resource-group $RESOURCE_GROUP --name $WEB_APP_NAME"
echo ""
print_success "Setup completed successfully! 🚀"