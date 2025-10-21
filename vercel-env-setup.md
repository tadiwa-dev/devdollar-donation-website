# Vercel Environment Variables Setup

## 🔧 Required Environment Variables

Copy these exact values to your Vercel project settings:

### Environment Variables
```
PAYNOW_INTEGRATION_ID
Value: 22255

PAYNOW_INTEGRATION_KEY  
Value: 81a26a06-d5b2-4434-9c89-c34b97d374af

NODE_ENV
Value: production

MOBILE_APP_SCHEME
Value: devdollar

BASE_URL
Value: https://[YOUR-VERCEL-DOMAIN].vercel.app

RESULT_URL
Value: https://[YOUR-VERCEL-DOMAIN].vercel.app/paynow/result

RETURN_URL
Value: https://[YOUR-VERCEL-DOMAIN].vercel.app/thankyou.html
```

## 📋 Setup Steps

1. **Go to Vercel Dashboard**
   - Visit: https://vercel.com/dashboard
   - Find your devdollar-donation-website project

2. **Open Project Settings**
   - Click on your project
   - Go to "Settings" tab
   - Click "Environment Variables"

3. **Add Each Variable**
   - Click "Add New"
   - Enter name and value
   - Set Environment: "Production, Preview, Development"
   - Click "Save"

4. **Redeploy**
   - Go to "Deployments" tab
   - Click "..." on latest deployment
   - Click "Redeploy"

## ✅ After Deployment

Your site will be live at: `https://[YOUR-VERCEL-DOMAIN].vercel.app`

Test URLs:
- Main site: `https://[YOUR-VERCEL-DOMAIN].vercel.app`
- Mobile test: `https://[YOUR-VERCEL-DOMAIN].vercel.app/?amount=5&mobile=true`
- Health check: `https://[YOUR-VERCEL-DOMAIN].vercel.app/health`