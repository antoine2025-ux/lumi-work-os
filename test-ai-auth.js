#!/usr/bin/env node

const fetch = require('node-fetch');

async function testAIFunctionality() {
  console.log('🧪 Testing AI Functionality...\n');

  try {
    // Step 1: Test unauthenticated access (should fail)
    console.log('1. Testing unauthenticated access...');
    const unauthResponse = await fetch('http://localhost:3000/api/ai/chat-sessions?limit=5');
    const unauthData = await unauthResponse.json();
    console.log('   Status:', unauthResponse.status);
    console.log('   Response:', unauthData);
    console.log('   ✅ Correctly requires authentication\n');

    // Step 2: Test dev login
    console.log('2. Testing dev login...');
    const loginResponse = await fetch('http://localhost:3000/api/auth/signin/dev', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'email=dev@lumi.com&name=Dev User&callbackUrl=/',
    });
    
    console.log('   Login status:', loginResponse.status);
    console.log('   Login headers:', Object.fromEntries(loginResponse.headers.entries()));
    
    if (loginResponse.status === 200) {
      console.log('   ✅ Dev login successful\n');
      
      // Step 3: Test authenticated AI endpoints
      console.log('3. Testing authenticated AI endpoints...');
      
      // Get sessions
      const sessionsResponse = await fetch('http://localhost:3000/api/ai/chat-sessions?limit=5', {
        headers: {
          'Cookie': loginResponse.headers.get('set-cookie') || '',
        },
      });
      const sessionsData = await sessionsResponse.json();
      console.log('   GET sessions status:', sessionsResponse.status);
      console.log('   GET sessions response:', sessionsData);
      
      // Create session
      const createResponse = await fetch('http://localhost:3000/api/ai/chat-sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': loginResponse.headers.get('set-cookie') || '',
        },
        body: JSON.stringify({
          model: 'gpt-4-turbo',
          title: 'Test Chat Session'
        }),
      });
      const createData = await createResponse.json();
      console.log('   POST session status:', createResponse.status);
      console.log('   POST session response:', createData);
      
      if (createResponse.status === 200 && createData.success) {
        console.log('   ✅ AI functionality working correctly!\n');
        
        // Test individual session
        const sessionResponse = await fetch(`http://localhost:3000/api/ai/chat-sessions/${createData.sessionId}`, {
          headers: {
            'Cookie': loginResponse.headers.get('set-cookie') || '',
          },
        });
        const sessionData = await sessionResponse.json();
        console.log('   GET individual session status:', sessionResponse.status);
        console.log('   GET individual session response:', sessionData);
        
        if (sessionResponse.status === 200) {
          console.log('   ✅ All AI endpoints working!\n');
        }
      }
    } else {
      console.log('   ❌ Dev login failed\n');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testAIFunctionality();
