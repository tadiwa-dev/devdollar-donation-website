# Development Dollar - Donation Site

This is a donation website for the East Zimbabwe Conference (Seventh-Day Adventist Church) Development Dollar campaign with **server-side Paynow integration**.

## Features
- Simple donation form asking for amount
- Prefill amount from query parameter `amount` (useful for mobile app webview)
- **Secure server-side Paynow integration** using official Node.js library
- Payment status polling and result handling
- Environment-based configuration

## Setup

### 1. Get Paynow credentials
1. Sign up for a Paynow merchant account
2. Get your Integration ID and Integration Key from your Paynow dashboard
3. Set up result/return URLs in your Paynow account

### 2. Configure environment
Copy the example environment file and add your credentials:

```powershell
copy .env.example .env
```

Edit `.env` with your actual Paynow credentials:
```
PAYNOW_INTEGRATION_ID=your_actual_integration_id
PAYNOW_INTEGRATION_KEY=your_actual_integration_key
RESULT_URL=http://localhost:3000/paynow/result
RETURN_URL=http://localhost:3000/thankyou.html
```

### 3. Install and run

```powershell
npm install
npm start
```

### 4. Test the application
- Visit: http://localhost:3000
- To prefill amount (for mobile webview): http://localhost:3000/?amount=10

## API Endpoints

- `GET /` - Donation form
- `POST /create-payment` - Create secure Paynow payment (expects `{amount: number}`)
- `POST /paynow/result` - Paynow result notifications (IPN)
- `GET /poll-status/:pollUrl` - Check payment status
- `GET /health` - Health check

## Mobile App Integration

### How It Works
The donation site automatically detects when it's running in a mobile app webview and handles the return flow appropriately:

- **Web browsers**: Users are redirected to a thank you page
- **Mobile webviews**: Users are redirected back to the mobile app

### Setup Your Mobile App

1. **Configure Custom URL Scheme**
   
   Add a custom URL scheme to your mobile app (e.g., `devdollar://`):
   
   ```javascript
   // React Native example - add to your app's deep linking configuration
   const linking = {
     prefixes: ['devdollar://'],
     config: {
       screens: {
         PaymentComplete: 'payment-complete',
       },
     },
   };
   ```

2. **Open WebView with Mobile Detection**
   
   ```javascript
   // Option 1: Manual flag (recommended)
   const webviewUrl = `https://yoursite.com/?amount=${amount}&mobile=true`;
   
   // Option 2: Automatic detection (works with most webviews)
   const webviewUrl = `https://yoursite.com/?amount=${amount}`;
   ```

3. **Handle Return from Payment**
   
   ```javascript
   // React Native - listen for deep link
   useEffect(() => {
     const handleDeepLink = (url) => {
       if (url.includes('payment-complete')) {
         const urlParams = new URLSearchParams(url.split('?')[1]);
         const reference = urlParams.get('reference');
         const status = urlParams.get('status');
         
         // Handle payment completion
         console.log('Payment completed:', { reference, status });
         // Navigate to success screen, refresh data, etc.
       }
     };
     
     Linking.addEventListener('url', handleDeepLink);
     return () => Linking.removeEventListener('url', handleDeepLink);
   }, []);
   ```

### WebView Communication

The site also supports WebView message passing for frameworks like React Native:

```javascript
// In your React Native WebView component
<WebView
  source={{ uri: webviewUrl }}
  onMessage={(event) => {
    const message = JSON.parse(event.nativeEvent.data);
    if (message.type === 'PAYMENT_COMPLETE') {
      // Close webview and handle completion
      navigation.goBack();
    }
  }}
/>
```

### Testing Mobile Integration

1. **Test with mobile flag:**
   ```
   http://localhost:3000/?amount=10&mobile=true
   ```

2. **Complete a test payment** - you'll see the mobile return handler instead of the web thank you page

3. **Verify URL scheme redirect** - check that the custom URL scheme attempt works

### Production Configuration

Update your `.env` file for production:

```env
BASE_URL=https://yourdomain.com
MOBILE_APP_SCHEME=yourapp
```

## Security Notes

✅ **What this implementation does:**
- Keeps Paynow credentials on server-side only
- Uses official Paynow Node.js library
- Validates amounts server-side
- Handles payment notifications securely

⚠️ **For production:**
- Use HTTPS (required by Paynow)
- Set up proper result URL in your domain
- Configure Paynow webhooks correctly
- Use environment variables for all secrets
- Test in Paynow sandbox first

## File Structure
```
├── server.js              # Express server with Paynow integration
├── public/
│   ├── index.html         # Donation form
│   ├── app.js             # Client-side logic
│   └── thankyou.html      # Thank you page
├── .env.example           # Environment template
├── package.json           # Dependencies
└── README.md             # This file
```

## Testing

### Test Mode Information
Your integration is currently in **test mode**. This means:

- **No real money is moved** during transactions
- Only the merchant account used to create the integration can complete test payments
- You can simulate various payment scenarios using special test data

### Testing the Donation Flow

1. **Web Browser Testing:**
   - Visit: http://localhost:3000
   - Enter any amount (e.g., $5, $10, $25)
   - Click "Donate with Paynow"
   - **Important**: Login with your merchant account email to complete the test payment
   - Select **[TESTING: Faked Success]** and click **[Make Payment]**

2. **Mobile Webview Testing:**
   - Test prefilled amounts: http://localhost:3000/?amount=15
   - The amount will be automatically filled in the form

### Test Data for Express Checkout (Mobile Money)

For testing mobile money (EcoCash/OneMoney), use these special test numbers:

- **Success**: `0771111111` - Success after 5 seconds
- **Delayed Success**: `0772222222` - Success after 30 seconds  
- **User Cancelled**: `0773333333` - Failure after 30 seconds
- **Insufficient Balance**: `0774444444` - Immediate failure

### Going Live

1. **Complete Integration Testing:**
   - Perform at least one successful test transaction
   - Test both web and mobile scenarios if needed

2. **Request Live Status:**
   - Go to Integration Keys section in your Paynow dashboard
   - Click **[Request to be Set Live]**
   - Paynow support will verify your testing and activate live payments

3. **Update for Production:**
   - Change `NODE_ENV=production` in your `.env`
   - Update result/return URLs to your production domain
   - Configure proper HTTPS

## Deployment

Popular hosting options:
- **Heroku**: Add environment variables in dashboard
- **Vercel**: Add environment variables in project settings  
- **Railway**: Configure environment variables
- **Azure App Service**: Set application settings

Remember to:
1. Set all environment variables on your hosting platform
2. Update result/return URLs to your domain
3. Configure your Paynow account with the correct URLs
4. Test thoroughly before going live
