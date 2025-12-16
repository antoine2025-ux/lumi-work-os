#!/usr/bin/env node

/**
 * Test OAuth Configuration
 * Verifies that all OAuth settings are correct for dev mode
 */

const http = require('http');
const https = require('https');

console.log('🧪 Testing OAuth Configuration\n');
console.log('='.repeat(60));

// Test 1: Check if dev server is running
console.log('\n1️⃣  Testing Dev Server Connection...');
testDevServer();

// Test 2: Check NextAuth providers endpoint
console.log('\n2️⃣  Testing NextAuth Providers Endpoint...');
testProvidersEndpoint();

// Test 3: Check callback endpoint exists
console.log('\n3️⃣  Testing Callback Endpoint...');
testCallbackEndpoint();

function testDevServer() {
  return new Promise((resolve) => {
    const req = http.get('http://localhost:3000', (res) => {
      if (res.statusCode === 200 || res.statusCode === 307 || res.statusCode === 308) {
        console.log('   ✅ Dev server is running on port 3000');
        resolve(true);
      } else {
        console.log(`   ⚠️  Dev server responded with status: ${res.statusCode}`);
        resolve(false);
      }
    });

    req.on('error', (err) => {
      console.log('   ❌ Dev server is NOT running');
      console.log(`   Error: ${err.message}`);
      console.log('   💡 Start dev server with: npm run dev');
      resolve(false);
    });

    req.setTimeout(3000, () => {
      req.destroy();
      console.log('   ❌ Connection timeout - dev server may not be running');
      resolve(false);
    });
  });
}

function testProvidersEndpoint() {
  return new Promise((resolve) => {
    const req = http.get('http://localhost:3000/api/auth/providers', (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const providers = JSON.parse(data);
          if (providers.google) {
            console.log('   ✅ Google OAuth provider is configured');
            console.log(`   Provider ID: ${providers.google.id}`);
            console.log(`   Provider Name: ${providers.google.name}`);
            resolve(true);
          } else {
            console.log('   ❌ Google OAuth provider is NOT configured');
            console.log('   Available providers:', Object.keys(providers));
            console.log('   💡 Check GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env');
            resolve(false);
          }
        } catch (err) {
          console.log('   ⚠️  Could not parse providers response');
          console.log('   Response:', data.substring(0, 100));
          resolve(false);
        }
      });
    });

    req.on('error', (err) => {
      console.log('   ❌ Could not connect to providers endpoint');
      console.log(`   Error: ${err.message}`);
      resolve(false);
    });

    req.setTimeout(3000, () => {
      req.destroy();
      console.log('   ❌ Connection timeout');
      resolve(false);
    });
  });
}

function testCallbackEndpoint() {
  return new Promise((resolve) => {
    // Test with a dummy state parameter (NextAuth will handle it)
    const req = http.get('http://localhost:3000/api/auth/callback/google?error=test', (res) => {
      // NextAuth callback should handle errors gracefully
      if (res.statusCode === 302 || res.statusCode === 307 || res.statusCode === 308 || res.statusCode === 200) {
        console.log('   ✅ Callback endpoint exists and responds');
        console.log(`   Status: ${res.statusCode}`);
        resolve(true);
      } else {
        console.log(`   ⚠️  Unexpected status: ${res.statusCode}`);
        resolve(false);
      }
    });

    req.on('error', (err) => {
      console.log('   ❌ Callback endpoint error');
      console.log(`   Error: ${err.message}`);
      resolve(false);
    });

    req.setTimeout(3000, () => {
      req.destroy();
      console.log('   ❌ Connection timeout');
      resolve(false);
    });
  });
}

// Run all tests
async function runTests() {
  const results = await Promise.all([
    testDevServer(),
    testProvidersEndpoint(),
    testCallbackEndpoint()
  ]);

  console.log('\n\n📊 Test Summary:');
  console.log('='.repeat(60));
  
  const allPassed = results.every(r => r);
  
  if (allPassed) {
    console.log('✅ All tests passed!');
    console.log('\n💡 Next Steps:');
    console.log('   1. Verify redirect URI in Google Cloud Console:');
    console.log('      http://localhost:3000/api/auth/callback/google');
    console.log('   2. Make sure your email is added as a test user in Google OAuth consent screen');
    console.log('   3. Try logging in at: http://localhost:3000/login');
  } else {
    console.log('❌ Some tests failed');
    console.log('\n💡 Fix the issues above and run this script again');
  }
  
  console.log('\n');
}

runTests();
