const http = require('http');
const assert = require('assert');

const BASE_URL = 'http://localhost:3000';

function makeRequest(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {}
    };

    if (data) {
      const jsonData = JSON.stringify(data);
      options.headers['Content-Type'] = 'application/json';
      options.headers['Content-Length'] = Buffer.byteLength(jsonData);
    }

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: body
        });
      });
    });

    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function runTests() {
  console.log('Running basic server tests...\n');

  try {
    // Test 1: Health endpoint
    console.log('✓ Testing /health endpoint...');
    const healthResponse = await makeRequest('/health');
    assert.strictEqual(healthResponse.statusCode, 200);
    assert.strictEqual(healthResponse.body, 'OK');
    console.log('  ✓ Health check passed');

    // Test 2: Root page serves HTML
    console.log('✓ Testing root page...');
    const rootResponse = await makeRequest('/');
    assert.strictEqual(rootResponse.statusCode, 200);
    assert(rootResponse.body.includes('<title>Development Dollar'));
    console.log('  ✓ Root page serves HTML with correct title');

    // Test 3: Query parameter prefill (just check page loads)
    console.log('✓ Testing prefill query parameter...');
    const prefillResponse = await makeRequest('/?amount=25');
    assert.strictEqual(prefillResponse.statusCode, 200);
    assert(prefillResponse.body.includes('<title>Development Dollar'));
    console.log('  ✓ Page loads with amount query parameter');

    // Test 4: Payment creation endpoint (will fail without real credentials but should return proper error)
    console.log('✓ Testing /create-payment endpoint...');
    const paymentResponse = await makeRequest('/create-payment', 'POST', { amount: 10 });
    // Should return 400 or 500 with proper error handling (since no real Paynow credentials)
    assert(paymentResponse.statusCode === 400 || paymentResponse.statusCode === 500);
    const paymentData = JSON.parse(paymentResponse.body);
    assert.strictEqual(paymentData.success, false);
    assert(paymentData.error);
    console.log('  ✓ Payment endpoint returns proper error without credentials');

    // Test 5: Invalid amount handling
    console.log('✓ Testing invalid amount handling...');
    const invalidResponse = await makeRequest('/create-payment', 'POST', { amount: -5 });
    assert.strictEqual(invalidResponse.statusCode, 400);
    const invalidData = JSON.parse(invalidResponse.body);
    assert.strictEqual(invalidData.success, false);
    assert(invalidData.error.includes('Valid amount is required'));
    console.log('  ✓ Invalid amounts are properly rejected');

    console.log('\n🎉 All tests passed!');
    console.log('\nTo test with real Paynow credentials:');
    console.log('1. Copy .env.example to .env');
    console.log('2. Add your real Paynow Integration ID and Key');
    console.log('3. Test payment creation manually in browser');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run tests if server is running
runTests().catch(err => {
  console.error('❌ Test suite failed:', err.message);
  console.log('\nMake sure the server is running: npm start');
  process.exit(1);
});