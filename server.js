const express = require('express');
const cors = require('cors');
const crypto = require('crypto');

// Load environment variables
require('dotenv').config();

// Handle HTTP parser issue for Pesepay API
process.env.NODE_OPTIONS = '--insecure-http-parser';

// Import fetch for Node.js
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

// For production deployment
if (process.env.NODE_ENV === 'production') {
  console.log('🚀 Running in production mode');
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Function to encrypt payload for Pesepay
function encryptPayload(data, encryptionKey) {
  try {
    const iv = crypto.randomBytes(16);
    const key = Buffer.from(encryptionKey, 'utf8').slice(0, 32); // Use UTF-8 and ensure 32 bytes
    const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
    
    let encrypted = cipher.update(JSON.stringify(data), "utf8", "base64");
    encrypted += cipher.final("base64");
    
    return {
      payload: encrypted,
      iv: iv.toString("base64")
    };
  } catch (error) {
    console.error('Encryption error:', error);
    throw error;
  }
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'DevDollar Donation Server',
    version: '1.0.0'
  });
});

// Routes
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

app.get('/success', (req, res) => {
  res.sendFile(__dirname + '/public/success.html');
});

app.get('/failure', (req, res) => {
  res.sendFile(__dirname + '/public/failure.html');
});

// Function to check payment status with Pesepay
async function checkPaymentStatus(referenceNumber) {
  try {
    const response = await fetch(`https://api.pesepay.com/api/payments-engine/v1/payments/check-payment?referenceNumber=${referenceNumber}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": process.env.PESEPAY_INTEGRATION_KEY
      }
    });

    const data = await response.json();
    console.log('Payment status check response:', data);
    return data;
  } catch (error) {
    console.error('Error checking payment status:', error);
    return null;
  }
}

// Handle return from Pesepay payment
app.get('/success', async (req, res) => {
  // Extract query parameters from Pesepay return
  const { name, amount, ref, transactionId, status, referenceNumber, demo } = req.query;
  
  console.log('Payment return from Pesepay:', { name, amount, ref, transactionId, status, referenceNumber, demo });
  
  // If this is a demo payment (due to Pesepay API parsing issues)
  if (demo === 'true') {
    console.log('Demo mode: Pesepay API had parsing issues, but payment was successful');
  }
  
  // If we have a reference number, check the payment status
  if (referenceNumber && demo !== 'true') {
    try {
      const paymentStatus = await checkPaymentStatus(referenceNumber);
      console.log('Payment status:', paymentStatus);
      
      // You could store this status in a database or session
      // For now, we'll just log it and show the success page
    } catch (error) {
      console.error('Failed to check payment status:', error);
    }
  }
  
  // Show the success page
  res.sendFile(__dirname + '/public/success.html');
});

// Create payment endpoint - Seamless Integration
app.post('/create-payment', async (req, res) => {
  const { amount, name, email, phoneNumber, creditCardNumber, creditCardExpiryDate, creditCardSecurityNumber } = req.body;

  // Validate input
  if (!amount || !name || !email || !phoneNumber || !creditCardNumber || !creditCardExpiryDate || !creditCardSecurityNumber) {
    console.error('Missing required fields:', { amount, name, email, phoneNumber, creditCardNumber, creditCardExpiryDate, creditCardSecurityNumber });
    return res.redirect('/failure');
  }

  if (isNaN(amount) || parseFloat(amount) <= 0) {
    console.error('Invalid amount:', amount);
    return res.redirect('/failure');
  }

  try {
    // Generate a unique reference number for this transaction
    const referenceNumber = `DON-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
            // 1. Prepare transaction payload for seamless integration
        const transactionPayload = {
          amountDetails: {
            amount: parseFloat(amount),
            currencyCode: "USD"
          },
          reasonForPayment: "Development Dollar Donation",
          resultUrl: "https://devdollar.org/failure",
          returnUrl: "https://devdollar.org/success",
      merchantReference: referenceNumber,
      customer: {
        email: email,
        phoneNumber: phoneNumber,
        name: name
      },
      paymentMethodCode: "PZW204", // Default payment method
      paymentMethodRequiredFields: {
        creditCardNumber: creditCardNumber,
        creditCardSecurityNumber: creditCardSecurityNumber,
        creditCardExpiryDate: creditCardExpiryDate
      }
    };

    console.log('📤 Transaction Payload:', transactionPayload);

    // 2. Encrypt the payload
    const encryptedPayload = encryptPayload(transactionPayload, process.env.PESEPAY_ENCRYPTION_KEY);
    
    // 3. Prepare the request body for seamless integration
    const requestBody = {
      payload: encryptedPayload.payload,
      iv: encryptedPayload.iv
    };

    console.log('🔐 Encrypted Payload Length:', encryptedPayload.payload.length);
    console.log('🔐 IV:', encryptedPayload.iv);
    
    // 4. Call Pesepay Seamless API
    const response = await fetch("https://api.pesepay.com/api/payments-engine/v2/payments/make-payment", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "authorization": process.env.PESEPAY_INTEGRATION_KEY
      },
      body: JSON.stringify(requestBody)
    });

    console.log('Pesepay API Response Status:', response.status, response.statusText);
    
    const data = await response.json();
    console.log('✅ Pesepay Response:', data);

    if (response.status === 200 && data.payload) {
      console.log('🎉 Payment processed successfully!');
      // For seamless integration, we can redirect to success page directly
      return res.redirect(`/success?name=${encodeURIComponent(name)}&amount=${encodeURIComponent(amount)}&ref=${referenceNumber}&status=success`);
    } else {
      console.error('❌ Pesepay Error Response:', data);
      return res.redirect("/failure");
    }
  } catch (error) {
    console.error('🚨 Payment creation error:', error);
    return res.redirect("/failure");
  }
});

// Endpoint to check payment status manually
app.get('/check-payment/:referenceNumber', async (req, res) => {
  try {
    const { referenceNumber } = req.params;
    
    if (!referenceNumber) {
      return res.status(400).json({ error: 'Reference number is required' });
    }
    
    const paymentStatus = await checkPaymentStatus(referenceNumber);
    
    if (paymentStatus) {
      res.json({
        success: true,
        referenceNumber,
        status: paymentStatus
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Payment status not found'
      });
    }
  } catch (error) {
    console.error('Error in check-payment endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check payment status'
    });
  }
});

// Handle Pesepay webhook for payment status updates
app.post('/webhook', (req, res) => {
  try {
    const webhookData = req.body;
    console.log('Pesepay Webhook received:', webhookData);
    
    // Extract payment information
    const { 
      merchantReference, 
      status, 
      amount, 
      currencyCode,
      transactionId 
    } = webhookData;
    
    // Log payment status
    console.log(`Payment ${merchantReference}: ${status} - ${amount} ${currencyCode}`);
    
    // Here you could:
    // - Update database with payment status
    // - Send confirmation emails
    // - Update donor records
    // - Trigger other business logic
    
    res.status(200).json({ 
      success: true, 
      message: 'Webhook processed successfully' 
    });
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Webhook processing failed' 
    });
  }
});

app.listen(PORT, () => {
  console.log(`🎉 DevDollar Donation Server running on port ${PORT}`);
  console.log(`📱 Visit: http://localhost:${PORT}`);
});
