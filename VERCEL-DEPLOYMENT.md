# Vercel Deployment Guide - Development Dollar

## 🚀 Automatic Deployment Setup

This repository is connected to Vercel and will automatically deploy when you push to the `master` branch.

### Environment Variables Required on Vercel

Go to your Vercel dashboard → Project Settings → Environment Variables and add:

```
PAYNOW_INTEGRATION_ID=22255
PAYNOW_INTEGRATION_KEY=81a26a06-d5b2-4434-9c89-c34b97d374af
BASE_URL=https://your-vercel-domain.vercel.app
RESULT_URL=https://your-vercel-domain.vercel.app/paynow/result
RETURN_URL=https://your-vercel-domain.vercel.app/thankyou.html
MOBILE_APP_SCHEME=devdollar
NODE_ENV=production
```

### 📱 Update Mobile App

After deployment, update your mobile app to use the production URL:
```javascript
const webviewUrl = `https://your-vercel-domain.vercel.app/?amount=${amount}&mobile=true`;
```

### 🔐 Paynow Configuration

Update your Paynow merchant account with the production URLs:
- Result URL: `https://your-vercel-domain.vercel.app/paynow/result`
- Return URL: `https://your-vercel-domain.vercel.app/thankyou.html`

### ✅ Post-Deployment Testing

1. Visit your Vercel domain
2. Test small donation amounts ($1-$2)
3. Verify mobile webview integration
4. Check payment notifications

## 🎯 Features Deployed

- ✅ Live Paynow integration
- ✅ Mobile app webview support
- ✅ Secure server-side payment creation
- ✅ Development Dollar branding
- ✅ Responsive design
- ✅ Production-ready security