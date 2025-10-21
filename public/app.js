// Client logic to prefill amount from query param and create secure Paynow payments

function getQueryParam(name) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(name);
}

function isMobileWebView() {
  // Detect if running in mobile app webview
  const userAgent = navigator.userAgent.toLowerCase();
  return !!(
    window.ReactNativeWebView || // React Native WebView
    userAgent.includes('wv') || // Android WebView
    userAgent.includes('webview') || // Generic WebView
    window.flutter_inappwebview || // Flutter WebView
    getQueryParam('mobile') === 'true' // Manual flag
  );
}

function formatAmount(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(amount);
}

async function createPayment(amount, paymentMethod, phone = null, mobileMethod = null) {
  try {
    const isMobile = isMobileWebView();
    const submitButton = document.querySelector('.give-button');
    const originalText = submitButton.textContent;
    
    // Show loading state
    submitButton.textContent = 'Processing...';
    submitButton.disabled = true;
    
    let endpoint, requestBody;
    
    if (paymentMethod === 'mobile') {
      // Use mobile money express checkout
      endpoint = '/create-mobile-payment';
      requestBody = { 
        amount: amount,
        phone: phone,
        method: mobileMethod
      };
    } else {
      // Use traditional Paynow redirect
      endpoint = '/create-payment';
      requestBody = { 
        amount: amount,
        isMobile: isMobile
      };
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    const data = await response.json();
    
    if (data.success) {
      if (paymentMethod === 'mobile') {
        // Handle mobile money express checkout
        console.log('Mobile payment created:', data.method);
        
        // Show instructions to user
        submitButton.textContent = 'Check Your Phone';
        alert(`Payment request sent!\n\n${data.instructions}\n\nPlease check your ${data.method.toUpperCase()} for the payment prompt.`);
        
        // Start polling for payment status
        startStatusPolling(data.pollUrl, data.reference);
        
      } else {
        // Handle traditional Paynow redirect
        console.log('Payment created for:', isMobile ? 'Mobile App' : 'Web Browser');
        console.log('Return URL:', data.returnUrl);
        
        // Show success message briefly before redirect
        submitButton.textContent = 'Redirecting to Paynow...';
        
        // Redirect to Paynow for payment
        setTimeout(() => {
          window.location.href = data.redirectUrl;
        }, 1000);
      }
    } else {
      // Reset button state
      submitButton.textContent = originalText;
      submitButton.disabled = false;
      
      alert('Payment creation failed: ' + (data.error || 'Unknown error'));
    }
  } catch (error) {
    // Reset button state
    const submitButton = document.querySelector('.give-button');
    submitButton.textContent = 'Give Now';
    submitButton.disabled = false;
    
    alert('Network error: ' + error.message);
  }
}

async function startStatusPolling(pollUrl, reference) {
  const maxAttempts = 60; // Poll for up to 5 minutes
  let attempts = 0;
  
  const pollInterval = setInterval(async () => {
    attempts++;
    
    try {
      const response = await fetch(`/poll-status/${encodeURIComponent(pollUrl)}`);
      const status = await response.json();
      
      if (status.paid) {
        clearInterval(pollInterval);
        
        // Payment successful
        const submitButton = document.querySelector('.give-button');
        submitButton.textContent = 'Payment Successful! ✅';
        submitButton.style.background = '#10B981';
        
        // Show success message
        setTimeout(() => {
          alert('Thank you for your donation! Your payment has been received.');
          
          // Redirect based on context
          if (isMobileWebView()) {
            // For mobile app
            const appScheme = 'devdollar';
            const redirectUrl = `${appScheme}://payment-complete?reference=${reference}&status=paid`;
            window.location.href = redirectUrl;
          } else {
            // For web browser
            window.location.href = '/thankyou.html';
          }
        }, 2000);
        
      } else if (attempts >= maxAttempts) {
        clearInterval(pollInterval);
        
        // Timeout
        const submitButton = document.querySelector('.give-button');
        submitButton.textContent = 'Payment Timeout';
        submitButton.disabled = false;
        
        alert('Payment verification timed out. Please try again or contact support if you completed the payment.');
      }
      
    } catch (error) {
      console.error('Status polling error:', error);
      
      if (attempts >= maxAttempts) {
        clearInterval(pollInterval);
        
        const submitButton = document.querySelector('.give-button');
        submitButton.textContent = 'Check Failed';
        submitButton.disabled = false;
        
        alert('Unable to verify payment status. Please contact support if you completed the payment.');
      }
    }
  }, 5000); // Check every 5 seconds
}

document.addEventListener('DOMContentLoaded', () => {
  const amountInput = document.getElementById('amount');
  const phoneInput = document.getElementById('phone');
  const mobileFields = document.getElementById('mobile-fields');
  const note = document.getElementById('note');

  // Prefill amount if ?amount= is present (useful for mobile webview)
  const prefill = getQueryParam('amount');
  if (prefill) {
    amountInput.value = prefill;
    note.textContent = '✓ Amount prefilled from app';
    note.style.color = '#4F8FF7';
  }

  // Handle payment method switching
  const paymentOptions = document.querySelectorAll('.payment-option');
  const paymentRadios = document.querySelectorAll('input[name="paymentMethod"]');
  
  paymentOptions.forEach(option => {
    option.addEventListener('click', () => {
      // Remove active class from all options
      paymentOptions.forEach(opt => opt.classList.remove('active'));
      // Add active class to clicked option
      option.classList.add('active');
      
      // Check the radio button
      const radio = option.querySelector('input[type="radio"]');
      radio.checked = true;
      
      // Show/hide mobile fields
      const method = radio.value;
      if (method === 'mobile') {
        mobileFields.style.display = 'block';
        phoneInput.required = true;
      } else {
        mobileFields.style.display = 'none';
        phoneInput.required = false;
      }
    });
  });

  // Handle form submission
  document.getElementById('donation-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const amount = amountInput.value;
    const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked').value;
    const phone = phoneInput.value;
    const mobileMethod = document.getElementById('mobileMethod').value;
    
    // Validate amount
    if (!amount || Number(amount) <= 0) {
      alert('Please enter a valid amount');
      amountInput.focus();
      return;
    }

    // Validate mobile fields if mobile payment selected
    if (paymentMethod === 'mobile') {
      if (!phone || phone.trim() === '') {
        alert('Please enter your mobile number');
        phoneInput.focus();
        return;
      }
      
      // Basic phone number validation for Zimbabwe
      const cleanPhone = phone.replace(/\s+/g, '');
      if (!/^(07[0-9]{8}|263[0-9]{9}|\+263[0-9]{9})$/.test(cleanPhone)) {
        alert('Please enter a valid Zimbabwean mobile number (e.g., 0771234567)');
        phoneInput.focus();
        return;
      }
    }

    // Validate reasonable amount (optional)
    if (Number(amount) > 10000) {
      const confirm = window.confirm(`You entered ${formatAmount(amount)}. Is this correct?`);
      if (!confirm) {
        amountInput.focus();
        return;
      }
    }

    // Create payment with appropriate method
    await createPayment(amount, paymentMethod, phone, mobileMethod);
  });

  // Add some interactive feedback
  amountInput.addEventListener('focus', () => {
    amountInput.style.transform = 'scale(1.02)';
  });

  amountInput.addEventListener('blur', () => {
    amountInput.style.transform = 'scale(1)';
  });
  
  // Format phone number as user types
  phoneInput.addEventListener('input', (e) => {
    let value = e.target.value.replace(/\D/g, ''); // Remove non-digits
    
    // Format as 077 123 4567
    if (value.length > 3 && value.length <= 6) {
      value = value.replace(/(\d{3})(\d+)/, '$1 $2');
    } else if (value.length > 6) {
      value = value.replace(/(\d{3})(\d{3})(\d+)/, '$1 $2 $3');
    }
    
    e.target.value = value;
  });
});
