# OHUA Backend - Azure Infrastructure Setup Script (PowerShell)
# Run this script once to create all required Azure resources

param(
    [string]$ResourceGroup = "rg-ohua-backend",
    [string]$AppServicePlan = "asp-ohua-backend", 
    [string]$WebAppName = "ohua-backend",
    [string]$Location = "eastus",
    [string]$PricingTier = "B1"
)

# Color functions
function Write-Step {
    param([int]$Step, [string]$Message)
    Write-Host "📋 Step $Step`: $Message" -ForegroundColor Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "✅ $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "⚠️ $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "❌ $Message" -ForegroundColor Red
}

Write-Host "🚀 OHUA Backend - Azure Setup Starting..." -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan

# Check prerequisites
Write-Step 1 "Checking Prerequisites"

# Check if Azure CLI is installed
try {
    az --version | Out-Null
} catch {
    Write-Error "Azure CLI is not installed. Please install it first:"
    Write-Host "https://docs.microsoft.com/en-us/cli/azure/install-azure-cli"
    exit 1
}

# Check if user is logged in
try {
    $null = az account show 2>$null
} catch {
    Write-Warning "You are not logged in to Azure"
    Write-Host "Please run: az login"
    exit 1
}

Write-Success "Prerequisites checked"

# Get current subscription info
$subscriptionName = az account show --query name -o tsv
$subscriptionId = az account show --query id -o tsv
Write-Host "📋 Using subscription: $subscriptionName ($subscriptionId)"

# Confirm before proceeding
Write-Host ""
Write-Host "This script will create the following resources:"
Write-Host "  • Resource Group: $ResourceGroup"
Write-Host "  • App Service Plan: $AppServicePlan ($PricingTier)"
Write-Host "  • Web App: $WebAppName"
Write-Host "  • Location: $Location"
Write-Host ""

$confirmation = Read-Host "Do you want to continue? (y/N)"
if ($confirmation -ne 'y' -and $confirmation -ne 'Y') {
    Write-Host "Setup cancelled."
    exit 0
}

# Step 2: Create Resource Group
Write-Step 2 "Creating Resource Group"

$existingRG = az group show --name $ResourceGroup 2>$null
if ($existingRG) {
    Write-Warning "Resource group '$ResourceGroup' already exists"
} else {
    az group create --name $ResourceGroup --location $Location
    Write-Success "Resource group '$ResourceGroup' created"
}

# Step 3: Create App Service Plan
Write-Step 3 "Creating App Service Plan"

$existingPlan = az appservice plan show --name $AppServicePlan --resource-group $ResourceGroup 2>$null
if ($existingPlan) {
    Write-Warning "App Service Plan '$AppServicePlan' already exists"
} else {
    az appservice plan create `
        --name $AppServicePlan `
        --resource-group $ResourceGroup `
        --location $Location `
        --sku $PricingTier `
        --is-linux
    Write-Success "App Service Plan '$AppServicePlan' created"
}

# Step 4: Create Web App
Write-Step 4 "Creating Web App"

$existingApp = az webapp show --name $WebAppName --resource-group $ResourceGroup 2>$null
if ($existingApp) {
    Write-Warning "Web App '$WebAppName' already exists"
} else {
    az webapp create `
        --name $WebAppName `
        --resource-group $ResourceGroup `
        --plan $AppServicePlan `
        --runtime "NODE:18-lts"
    Write-Success "Web App '$WebAppName' created"
}

# Step 5: Configure Application Settings
Write-Step 5 "Configuring Application Settings"

Write-Host "Setting basic application configuration..."

az webapp config appsettings set `
    --resource-group $ResourceGroup `
    --name $WebAppName `
    --settings `
        NODE_ENV="production" `
        DISABLE_SIGNATURE_VALIDATION="false" `
        WEBSITE_NODE_DEFAULT_VERSION="18-lts" `
        SCM_DO_BUILD_DURING_DEPLOYMENT="true"

Write-Success "Basic application settings configured"

# Step 6: Enable logging
Write-Step 6 "Enabling Application Logging"

az webapp log config `
    --resource-group $ResourceGroup `
    --name $WebAppName `
    --application-logging filesystem `
    --level information `
    --web-server-logging filesystem

Write-Success "Application logging enabled"

# Step 7: Configure HTTPS
Write-Step 7 "Configuring HTTPS"

az webapp update `
    --resource-group $ResourceGroup `
    --name $WebAppName `
    --https-only true

Write-Success "HTTPS-only enforced"

# Display results
Write-Host ""
Write-Host "🎉 Azure Infrastructure Setup Complete!" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Created Resources:"
Write-Host "  • Resource Group: $ResourceGroup"
Write-Host "  • App Service Plan: $AppServicePlan"
Write-Host "  • Web App: $WebAppName"
Write-Host ""
Write-Host "🌐 Your application URLs:"
Write-Host "  • App URL: https://$WebAppName.azurewebsites.net"
Write-Host "  • LINE Webhook: https://$WebAppName.azurewebsites.net/webhook/line"
Write-Host "  • WeChat Webhook: https://$WebAppName.azurewebsites.net/webhook/wechat"
Write-Host "  • Health Check: https://$WebAppName.azurewebsites.net/health"
Write-Host ""
Write-Host "📋 Next Steps:"
Write-Host "  1. Configure your application secrets in Azure Portal or run:"
Write-Host "     az webapp config appsettings set --resource-group $ResourceGroup --name $WebAppName --settings \"
Write-Host "         LINE_CHANNEL_ID=`"your_line_channel_id`" \"
Write-Host "         LINE_CHANNEL_SECRET=`"your_line_channel_secret`" \"
Write-Host "         OPENAI_API_KEY=`"your_openai_api_key`""
Write-Host ""
Write-Host "  2. Get publish profile for GitHub Actions:"
Write-Host "     az webapp deployment list-publishing-profiles --resource-group $ResourceGroup --name $WebAppName --xml"
Write-Host ""
Write-Host "  3. Deploy your application using GitHub Actions"
Write-Host ""
Write-Host "🔧 Useful commands:"
Write-Host "  • View logs: npm run azure:logs"
Write-Host "  • Restart app: npm run azure:restart"
Write-Host "  • Open in browser: az webapp browse --resource-group $ResourceGroup --name $WebAppName"
Write-Host ""
Write-Success "Setup completed successfully! 🚀"