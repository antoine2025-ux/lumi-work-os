#!/usr/bin/env node

/**
 * Verify OAuth Redirect URI Configuration
 * This script helps verify that the redirect URI matches between
 * your app and Google Cloud Console
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 OAuth Redirect URI Verification\n');
console.log('='.repeat(60));

// Load environment variables
const envFiles = ['.env.local', '.env', '.env.development'];
let envVars = {};

for (const envFile of envFiles) {
  const envPath = path.join(process.cwd(), envFile);
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8');
    const lines = content.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').replace(/^["']|["']$/g, '');
          envVars[key.trim()] = value;
        }
      }
    }
  }
}

// Get NEXTAUTH_URL
const nextAuthUrl = envVars.NEXTAUTH_URL || 'http://localhost:3000';

// Construct expected callback URL
const expectedCallbackUrl = `${nextAuthUrl}/api/auth/callback/google`;

console.log('\n📋 Configuration:');
console.log('-'.repeat(60));
console.log(`NEXTAUTH_URL: ${nextAuthUrl}`);
console.log(`Expected Callback URL: ${expectedCallbackUrl}`);

console.log('\n🔗 Google Cloud Console Configuration:');
console.log('-'.repeat(60));
console.log('1. Go to: https://console.cloud.google.com/apis/credentials');
console.log('2. Click on your OAuth 2.0 Client ID');
console.log('3. Under "Authorized redirect URIs", you MUST have:');
console.log(`   ${expectedCallbackUrl}`);
console.log('\n⚠️  IMPORTANT: The URI must match EXACTLY:');
console.log('   ✅ Correct format shown above');
console.log('   ❌ No trailing slash');
console.log('   ❌ No https (use http for localhost)');
console.log('   ❌ No 127.0.0.1 (use localhost)');

console.log('\n🧪 How to Verify:');
console.log('-'.repeat(60));
console.log('1. Start your dev server: npm run dev');
console.log('2. Go to: http://localhost:3000/login');
console.log('3. Click "Continue with Google"');
console.log('4. In the browser address bar, check the redirect_uri parameter');
console.log('5. It should be URL-encoded version of:');
console.log(`   ${expectedCallbackUrl}`);
console.log('\n   Example URL you might see:');
console.log('   https://accounts.google.com/o/oauth2/v2/auth?');
console.log('   client_id=...&');
console.log(`   redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fapi%2Fauth%2Fcallback%2Fgoogle&`);
console.log('   ...');

console.log('\n✅ Verification Checklist:');
console.log('-'.repeat(60));
const checks = [
  { name: 'NEXTAUTH_URL is set', value: !!envVars.NEXTAUTH_URL },
  { name: 'NEXTAUTH_URL uses http (not https)', value: nextAuthUrl.startsWith('http://') },
  { name: 'NEXTAUTH_URL uses localhost (not 127.0.0.1)', value: nextAuthUrl.includes('localhost') },
  { name: 'NEXTAUTH_URL has no trailing slash', value: !nextAuthUrl.endsWith('/') },
  { name: 'GOOGLE_CLIENT_ID is set', value: !!envVars.GOOGLE_CLIENT_ID },
  { name: 'GOOGLE_CLIENT_SECRET is set', value: !!envVars.GOOGLE_CLIENT_SECRET },
];

checks.forEach(check => {
  const icon = check.value ? '✅' : '❌';
  console.log(`${icon} ${check.name}`);
});

const allPassed = checks.every(c => c.value);

if (allPassed) {
  console.log('\n✅ All configuration checks passed!');
  console.log('\n💡 Next Steps:');
  console.log('   1. Verify the redirect URI in Google Cloud Console matches exactly');
  console.log('   2. Make sure your email is added as a test user in OAuth consent screen');
  console.log('   3. Restart your dev server');
  console.log('   4. Try logging in again');
} else {
  console.log('\n❌ Some configuration issues found');
  console.log('   Fix the issues marked with ❌ above');
}

console.log('\n');
