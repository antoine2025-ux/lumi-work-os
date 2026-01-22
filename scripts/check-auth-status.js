#!/usr/bin/env node

/**
 * Diagnostic script to check authentication status
 * Run: node scripts/check-auth-status.js
 */

const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/auth/session',
  method: 'GET',
  headers: {
    'Cookie': process.argv[2] || '', // Pass cookie as argument if needed
  }
};

const req = http.request(options, (res) => {
  console.log(`\n📊 Auth Status Check`);
  console.log(`Status Code: ${res.statusCode}`);
  console.log(`Headers:`, res.headers);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log(`\n📦 Response Body:`);
    try {
      const json = JSON.parse(data);
      console.log(JSON.stringify(json, null, 2));
      
      if (Object.keys(json).length === 0) {
        console.log(`\n❌ Session is empty - user is NOT authenticated`);
        console.log(`\n💡 To fix:`);
        console.log(`1. Go to http://localhost:3000/login`);
        console.log(`2. Sign in with Google OAuth`);
        console.log(`3. Check if NEXTAUTH_SECRET is set in .env`);
        console.log(`4. Check if GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are set`);
      } else {
        console.log(`\n✅ Session exists - user IS authenticated`);
        console.log(`User:`, json.user?.email || 'N/A');
        console.log(`WorkspaceId:`, json.user?.workspaceId || 'N/A');
      }
    } catch (e) {
      console.log(`Raw response:`, data);
    }
  });
});

req.on('error', (e) => {
  console.error(`❌ Error: ${e.message}`);
  console.log(`\n💡 Make sure the dev server is running: npm run dev`);
});

req.end();
