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

async function createPayment(amount) {
  try {
    const isMobile = isMobileWebView();
    const submitButton = document.querySelector('.give-button');
    const originalText = submitButton.textContent;
    
    // Show loading state
    submitButton.textContent = 'Creating Payment...';
    submitButton.disabled = true;
    
    const response = await fetch('/create-payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        amount: amount,
        isMobile: isMobile
      })
    });

    const data = await response.json();
    
    if (data.success) {
      console.log('Payment link created for:', isMobile ? 'Mobile App' : 'Web Browser');
      
      // Show user instructions before redirect
      if (isMobile) {
        submitButton.textContent = 'Redirecting to Paynow...';
        // For mobile apps, show a brief instruction
        setTimeout(() => {
          alert('You will now be redirected to Paynow to complete your payment. After payment, please return to this app.');
        }, 500);
      } else {
        submitButton.textContent = 'Redirecting to Paynow...';
        // For web browsers, provide clear instructions  
        setTimeout(() => {
          if (confirm('You will now be redirected to Paynow to complete your payment.\n\nAfter payment, please return to this tab to see your confirmation.\n\nClick OK to continue.')) {
            window.location.href = data.redirectUrl;
          } else {
            // Reset if user cancels
            submitButton.textContent = originalText;
            submitButton.disabled = false;
          }
          return;
        }, 500);
        return; // Don't auto-redirect for web
      }
      
      // Auto-redirect for mobile after brief delay
      setTimeout(() => {
        window.location.href = data.redirectUrl;
      }, 2000);
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

document.addEventListener('DOMContentLoaded', () => {
  const amountInput = document.getElementById('amount');
  const note = document.getElementById('note');

  // Prefill amount if ?amount= is present (useful for mobile webview)
  const prefill = getQueryParam('amount');
  if (prefill) {
    amountInput.value = prefill;
    note.textContent = '✓ Amount prefilled from app';
    note.style.color = '#4F8FF7';
  }

  // Handle form submission
  document.getElementById('donation-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const amount = amountInput.value;
    
    // Validate amount
    if (!amount || Number(amount) <= 0) {
      alert('Please enter a valid amount');
      amountInput.focus();
      return;
    }

    // Validate reasonable amount (optional)
    if (Number(amount) > 10000) {
      const confirm = window.confirm(`You entered ${formatAmount(amount)}. Is this correct?`);
      if (!confirm) {
        amountInput.focus();
        return;
      }
    }

    // Create payment link and redirect to Paynow
    await createPayment(amount);
  });

  // Add some interactive feedback
  amountInput.addEventListener('focus', () => {
    amountInput.style.transform = 'scale(1.02)';
  });

  amountInput.addEventListener('blur', () => {
    amountInput.style.transform = 'scale(1)';
  });
});
