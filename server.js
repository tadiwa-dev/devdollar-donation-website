require('dotenv').config();
const express = require('express');
const path = require('path');
const { Paynow } = require('paynow');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Initialize Paynow
const paynow = new Paynow(
  process.env.PAYNOW_INTEGRATION_ID || 'INTEGRATION_ID',
  process.env.PAYNOW_INTEGRATION_KEY || 'INTEGRATION_KEY'
);

// Set result URL (this stays the same)
paynow.resultUrl = process.env.RESULT_URL || 'http://localhost:3000/paynow/result';
// Return URL will be set dynamically per payment

// Routes
app.get('/health', (req, res) => res.send('OK'));

// Mobile app redirect handler
app.get('/return/:type', (req, res) => {
  const { type } = req.params;
  const { reference, pollUrl } = req.query;
  
  if (type === 'mobile') {
    // For mobile apps, redirect to custom URL scheme
    const appScheme = process.env.MOBILE_APP_SCHEME || 'devdollar';
    const redirectUrl = `${appScheme}://payment-complete?reference=${reference}&status=returned`;
    
    // Create a page that attempts to redirect to the app, with fallback
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width,initial-scale=1">
        <title>Payment Complete</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 2rem; }
          .loading { margin: 2rem 0; }
        </style>
      </head>
      <body>
        <h2>Payment Processing Complete</h2>
        <div class="loading">Returning to app...</div>
        <p>If you're not redirected automatically, please close this window and return to the app.</p>
        
        <script>
          // Attempt to redirect to mobile app
          setTimeout(() => {
            window.location.href = '${redirectUrl}';
          }, 1000);
          
          // Close webview after redirect attempt
          setTimeout(() => {
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'PAYMENT_COMPLETE',
                reference: '${reference}',
                action: 'close'
              }));
            }
            // For other webview implementations
            try {
              window.close();
            } catch(e) {
              // Fallback: try to navigate back
              if (window.history.length > 1) {
                window.history.back();
              }
            }
          }, 2000);
        </script>
      </body>
      </html>
    `);
  } else {
    // For web browsers, show regular thank you page
    res.redirect('/thankyou.html');
  }
});

// Create Paynow Simple Payment Request Link
app.post('/create-payment', async (req, res) => {
  try {
    const { amount, isMobile } = req.body;
    
    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      return res.status(400).json({ error: 'Valid amount is required' });
    }

    // Generate unique reference
    const reference = `DEV_DOLLAR_${Date.now()}`;
    
    // Get merchant email from environment
    const merchantEmail = process.env.PAYNOW_MERCHANT_EMAIL || 'your-email@domain.com';
    
    // Set return URL based on whether this is a mobile request
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    let returnUrl;
    if (isMobile) {
      returnUrl = `${baseUrl}/return/mobile?reference=${reference}`;
    } else {
      returnUrl = `${baseUrl}/thankyou.html`;
    }
    
    // Build the Paynow Simple Payment Request URL
    const paynowUrl = generatePaynowLink(
      reference,
      Number(amount),
      merchantEmail,
      returnUrl,
      1 // locked = 1 (amount and reference cannot be changed)
    );

    res.json({
      success: true,
      redirectUrl: paynowUrl,
      reference: reference,
      returnUrl: returnUrl
    });

  } catch (error) {
    console.error('Payment creation error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Generate Paynow Simple Payment Request Link
function generatePaynowLink(reference, amount, merchantEmail, returnUrl, locked = 1) {
  // Build arguments string
  const args = [
    `search=${encodeURIComponent(merchantEmail)}`,
    `amount=${encodeURIComponent(amount.toFixed(2))}`,
    `reference=${encodeURIComponent(reference)}`,
    `returnurl=${encodeURIComponent(returnUrl)}`,
    `l=${locked}`
  ].join('&');
  
  console.log('Payment arguments:', args);
  
  // Base64 encode (URL-safe)
  const base64Args = Buffer.from(args, 'utf8').toString('base64');
  
  // URL encode the base64 string
  const encodedArgs = encodeURIComponent(base64Args);
  
  console.log('Encoded arguments:', encodedArgs);
  
  // Build final Paynow URL
  const finalUrl = `https://www.paynow.co.zw/payment/link/?q=${encodedArgs}`;
  console.log('Final Paynow URL:', finalUrl);
  
  return finalUrl;
}

// Handle Paynow result notifications (IPN) with hash verification
app.post('/paynow/result', (req, res) => {
  try {
    // Parse and verify the status update
    const statusResponse = paynow.parseStatusUpdate(req.body);
    
    // Verify hash for security
    if (!paynow.verifyHash(req.body)) {
      console.error('⚠️ Invalid hash in Paynow result notification');
      return res.status(400).send('Invalid hash');
    }
    
    console.log('✅ Paynow result verified:', {
      reference: statusResponse.reference,
      amount: statusResponse.amount,
      status: statusResponse.status,
      paynowReference: statusResponse.paynowreference,
      paymentChannel: statusResponse.paymentchannel || 'Unknown'
    });
    
    // Here you can update your database, send notifications, etc.
    // based on the payment status
    
  } catch (error) {
    console.error('Error processing Paynow result:', error);
  }
  
  // Always respond with "OK" to acknowledge receipt
  res.send('OK');
});

// Poll transaction status
app.get('/poll-status/:pollUrl(*)', async (req, res) => {
  try {
    const pollUrl = req.params.pollUrl;
    const status = await paynow.pollTransaction(pollUrl);
    
    res.json({
      paid: status.paid(),
      status: status.status,
      reference: status.reference
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to check status' });
  }
});

app.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}`));
