# Azure Deployment Guide for OHUA Backend

## 🚀 Complete Step-by-Step Azure Deployment Process

This guide shows you how to deploy your LINE-WeChat translation bot to Azure using **Application Settings** for secure credential management.

### Prerequisites
- Azure account with active subscription
- GitHub account (for CI/CD)
- Your LINE and WeChat API credentials
- OpenAI API key
- Azure CLI installed (optional, for command-line setup)

## Phase 1: Azure Resource Setup

### 1.1 Create Azure Resources

#### Option A: Azure CLI Setup (Recommended)
```bash
# Login to Azure
az login

# Create Resource Group
az group create --name rg-ohua-backend --location "East US"

# Create App Service Plan
az appservice plan create \
    --name asp-ohua-backend \
    --resource-group rg-ohua-backend \
    --sku B1 \
    --is-linux

# Create Web App
az webapp create \
    --name ohua-backend \
    --resource-group rg-ohua-backend \
    --plan asp-ohua-backend \
    --runtime "NODE:18-lts"
```

#### Option B: Azure Portal Setup
1. **Login to [Azure Portal](https://portal.azure.com)**

2. **Create Resource Group:**
   - Click "Resource groups" → "Create"
   - **Name**: `rg-ohua-backend`
   - **Region**: East US (or your preferred region)
   - Click "Review + create" → "Create"

3. **Create App Service Plan:**
   - Go to "App Service plans" → "Create"
   - **Resource Group**: `rg-ohua-backend`
   - **Name**: `asp-ohua-backend`
   - **Operating System**: Linux
   - **Pricing tier**: B1 Basic (~$13/month)
   - Click "Review + create" → "Create"

4. **Create Web App:**
   - Go to "App Services" → "Create" → "Web App"
   - **Resource Group**: `rg-ohua-backend`
   - **Name**: `ohua-backend` (must be globally unique)
   - **Runtime stack**: Node 18 LTS
   - **Operating System**: Linux
   - **App Service Plan**: `asp-ohua-backend`
   - Click "Review + create" → "Create"

### 1.2 Configure Application Settings (Your Secrets)

#### Option A: Azure Portal Method
1. **Navigate to your App Service** → **Configuration** → **Application settings**
2. **Click "New application setting"** for each variable below:

**Required Settings (Copy from your .env file):**
```
Name: LINE_CHANNEL_ID
Value: your_line_channel_id

Name: LINE_CHANNEL_SECRET  
Value: your_line_channel_secret

Name: LINE_CHANNEL_ACCESS_TOKEN
Value: your_line_channel_access_token

Name: OPENAI_API_KEY
Value: your_openai_api_key

Name: OPENAI_MODEL
Value: gpt-4o

Name: DISABLE_SIGNATURE_VALIDATION
Value: false
```

**Optional WeChat Settings (if using WeChat):**
```
Name: WECOM_CORP_ID
Value: your_wechat_corp_id

Name: WECOM_CORP_SECRET
Value: your_wechat_corp_secret

Name: WECOM_AGENT_ID
Value: your_wechat_agent_id
```

3. **Click "Save"** → **"Continue"** (app will restart automatically)

#### Option B: Azure CLI Method
```bash
# Set all application settings at once
az webapp config appsettings set \
    --resource-group rg-ohua-backend \
    --name ohua-backend \
    --settings \
        LINE_CHANNEL_ID="your_line_channel_id" \
        LINE_CHANNEL_SECRET="your_line_channel_secret" \
        LINE_CHANNEL_ACCESS_TOKEN="your_line_channel_access_token" \
        OPENAI_API_KEY="your_openai_api_key" \
        OPENAI_MODEL="gpt-4o" \
        DISABLE_SIGNATURE_VALIDATION="false" \
        NODE_ENV="production"
```

**⚠️ Important:** Azure automatically sets `PORT` - don't override it.

## Phase 2: Code Deployment Options

### Option A: GitHub Actions CI/CD (Recommended)

#### Step 1: Get Publish Profile
1. In your App Service → "Overview"
2. Click "Get publish profile"
3. Save the downloaded `.publishsettings` file content

#### Step 2: Configure GitHub Secrets
1. Go to your GitHub repository → "Settings" → "Secrets and variables" → "Actions"
2. Click "New repository secret"
3. **Name**: `AZURE_WEBAPP_PUBLISH_PROFILE`
4. **Value**: Paste the entire content of the publish profile file
5. Click "Add secret"

#### Step 3: Enable GitHub Actions
1. Push your code to GitHub (the workflow file is already created)
2. Go to "Actions" tab in your repository
3. The deployment will trigger automatically on push to main branch

### Option B: Direct Deployment from VS Code

#### Step 1: Install Azure Extension
1. Install "Azure App Service" extension in VS Code
2. Sign in to your Azure account

#### Step 2: Deploy
1. Right-click on your project folder
2. Select "Deploy to Web App..."
3. Choose your subscription and App Service
4. Confirm deployment

### Option C: ZIP Deployment

#### Step 1: Prepare Deployment Package
```bash
# Create deployment ZIP (exclude node_modules, tests, etc.)
npm run azure:deploy
zip -r deployment.zip . -x "node_modules/*" "tests/*" ".git/*" "*.md"
```

#### Step 2: Deploy via Azure CLI
```bash
az webapp deployment source config-zip \
    --resource-group rg-ohua-backend \
    --name your-app-name \
    --src deployment.zip
```

## Phase 3: Post-Deployment Configuration

### 3.1 Enable Logging
1. App Service → "App Service logs"
2. **Application logging**: File System
3. **Level**: Information
4. **Web server logging**: File System
5. **Retention Period**: 7 days
6. Click "Save"

### 3.2 Configure Custom Domain (Optional)
1. App Service → "Custom domains"
2. Click "Add custom domain"
3. Enter your domain name
4. Follow validation steps
5. Add SSL certificate if needed

### 3.3 Set up Application Insights (Monitoring)
1. App Service → "Application Insights"
2. Click "Turn on Application Insights"
3. Choose existing or create new
4. Click "Apply"

## Phase 4: Webhook Configuration

### 4.1 Get Your Webhook URLs
After deployment, your webhook URLs will be:
- **LINE Webhook**: `https://ohua-backend.azurewebsites.net/webhook/line`
- **WeChat Webhook**: `https://ohua-backend.azurewebsites.net/webhook/wechat`
- **Health Check**: `https://ohua-backend.azurewebsites.net/health`

### 4.2 Configure LINE Webhook
1. Go to [LINE Developers Console](https://developers.line.biz/)
2. Select your channel → **Messaging API**
3. **Webhook settings**:
   - **Webhook URL**: `https://ohua-backend.azurewebsites.net/webhook/line`
   - **Use webhook**: Enable
   - **Verify**: Click to test connection
4. **Response settings**:
   - **Auto-reply messages**: Disable
   - **Greeting messages**: Optional

### 4.3 Configure WeChat Work Webhook
1. Go to WeChat Work Admin Panel
2. **Applications** → Your App → **API Usage Permission**
3. **Callback URL**: `https://ohua-backend.azurewebsites.net/webhook/wechat`
4. **Token** and **EncodingAESKey**: Use values from your WECOM_* settings
5. **Save and verify**

## Phase 5: Testing & Verification

### 5.1 Test Application Health
```bash
# Test health endpoint
curl https://ohua-backend.azurewebsites.net/health
# Expected: {"status":"healthy","timestamp":"..."}
```

### 5.2 Test Environment Variables
```bash
# Test environment configuration endpoint (remove after testing)
curl https://ohua-backend.azurewebsites.net/env-check
# Should show: HAS_LINE_SECRET: true, HAS_OPENAI_KEY: true, etc.
```

### 5.3 Test Translation
1. **Send a message** to your LINE bot
2. **Check Azure logs** for translation activity
3. **Verify WeChat** receives translated message

### 5.4 Monitor Logs
```bash
# View live logs via Azure CLI
az webapp log tail --name ohua-backend --resource-group rg-ohua-backend
```

**Or via Azure Portal:**
1. App Service → **Log stream**
2. Watch real-time application logs

## 🛡️ Security Best Practices

### Application Settings Security
- ✅ **Encrypted at rest** and in transit
- ✅ **Access controlled** via Azure RBAC
- ✅ **Audit logging** available via Azure Monitor
- ✅ **No code exposure** - secrets never appear in source code

### SSL/TLS Configuration
1. **App Service** → **TLS/SSL settings**
2. **HTTPS Only**: Enable
3. **Minimum TLS Version**: 1.2
4. Azure provides **free SSL certificates** automatically

### CORS Configuration
1. **App Service** → **CORS**
2. **Add allowed origins** for your frontend applications
3. **Never use wildcard (*)** in production

### Network Security
- Consider **Azure Application Gateway** for advanced protection
- Use **Azure Front Door** for global load balancing and DDoS protection
- Enable **IP restrictions** if needed (App Service → Networking)

## 🔧 Troubleshooting

### Common Issues

#### 1. App Won't Start
- **Check logs**: App Service → Log stream
- **Verify Node version**: Should be 18.x
- **Check package.json**: Ensure "start" script exists

#### 2. Environment Variables Not Working
```bash
# Verify settings are configured
az webapp config appsettings list --name ohua-backend --resource-group rg-ohua-backend
```

#### 3. Webhook Not Receiving Messages
- **Test health endpoint**: `/health` should return 200
- **Check LINE webhook verification**: Must return 200 status
- **Verify webhook URLs**: Should use `https://` not `http://`

#### 4. Translation Not Working
- **Check OpenAI API key**: Verify it's set in Application Settings
- **Monitor logs**: Look for OpenAI API errors
- **Test with simple message**: Start with basic text

### Debugging Commands
```bash
# View application logs
az webapp log tail --name ohua-backend --resource-group rg-ohua-backend

# Check app status
az webapp show --name ohua-backend --resource-group rg-ohua-backend --query state

# Restart app
az webapp restart --name ohua-backend --resource-group rg-ohua-backend
```

## 💰 Cost Optimization

### Development Environment
- **B1 Basic plan**: ~$13/month
- **Free tier**: F1 (limited, good for testing)
- **Scale down**: Stop app during non-use periods

### Production Environment  
- **P1V3 Premium**: ~$73/month (recommended)
- **Auto-scaling**: Based on CPU/memory metrics
- **Reserved instances**: Save up to 72% with 1-3 year commitments

### Cost Monitoring
```bash
# Check current pricing tier
az appservice plan show --name asp-ohua-backend --resource-group rg-ohua-backend --query sku
```

## 🔄 Updates & Maintenance

### Automated Deployments (Recommended)
1. **Push to main branch** → Triggers GitHub Actions
2. **GitHub Actions runs**:
   - Installs dependencies (`npm ci`)
   - Runs tests (`npm test`)
   - Deploys to Azure if tests pass
3. **Monitor in GitHub**: Actions tab shows deployment status

### Manual Deployment Options
```bash
# Via Azure CLI
az webapp deployment source config-zip \
    --resource-group rg-ohua-backend \
    --name ohua-backend \
    --src deployment.zip

# Via VS Code Azure Extension
# Right-click project → Deploy to Web App
```

### Updating Application Settings
```bash
# Update a single setting
az webapp config appsettings set \
    --name ohua-backend \
    --resource-group rg-ohua-backend \
    --settings OPENAI_MODEL="gpt-4-turbo"
```

---

## 📋 Deployment Checklist

### ✅ Pre-Deployment
- [ ] Azure account with active subscription
- [ ] Resource Group created (`rg-ohua-backend`)
- [ ] App Service Plan created (`asp-ohua-backend`)
- [ ] Web App created (`ohua-backend`)
- [ ] All environment variables configured in Application Settings
- [ ] GitHub repository secrets configured (publish profile)

### ✅ Post-Deployment
- [ ] Health endpoint responds: `/health`
- [ ] Environment check endpoint works: `/env-check` (remove after testing)
- [ ] LINE webhook configured and verified
- [ ] WeChat webhook configured (if using)
- [ ] SSL/HTTPS enforced
- [ ] Application Insights enabled (optional)
- [ ] Log streaming configured

### ✅ Testing
- [ ] Send test message via LINE
- [ ] Verify translation functionality
- [ ] Check WeChat message delivery (if configured)
- [ ] Monitor Azure logs for errors
- [ ] Test webhook signature validation

## 🆘 Support Resources

- **Azure Documentation**: [docs.microsoft.com/azure](https://docs.microsoft.com/azure)
- **Azure Support**: Create support ticket in Azure Portal
- **LINE Developers**: [developers.line.biz](https://developers.line.biz)
- **OpenAI Support**: [help.openai.com](https://help.openai.com)

---

**🎉 Your LINE-WeChat Translation Bot is now deployed on Azure with secure Application Settings!**
- [ ] WeChat webhook configured and verified
- [ ] SSL enabled
- [ ] Monitoring set up
- [ ] Logs configured
- [ ] Performance metrics reviewed

## 🆘 Support Resources

- **Azure Documentation**: https://docs.microsoft.com/azure/app-service/
- **LINE Bot SDK**: https://developers.line.biz/
- **WeChat Work API**: https://work.weixin.qq.com/api/
- **GitHub Actions**: https://docs.github.com/actions