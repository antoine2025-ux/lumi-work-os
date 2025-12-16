#!/usr/bin/env node

/**
 * Debug OAuth Callback Issues
 * Helps identify what's happening after Google redirects back
 */

const http = require('http');

console.log('🔍 OAuth Callback Debugging Guide\n');
console.log('='.repeat(60));

console.log('\n📋 What to Check When OAuth Stops at Authorization Screen:\n');

console.log('1️⃣  CHECK BROWSER CONSOLE');
console.log('-'.repeat(60));
console.log('   a. Open DevTools (F12) → Console tab');
console.log('   b. Try the OAuth flow');
console.log('   c. Look for:');
console.log('      - CORS errors');
console.log('      - Network errors');
console.log('      - Redirect errors');
console.log('      - Cookie errors');

console.log('\n2️⃣  CHECK NETWORK TAB');
console.log('-'.repeat(60));
console.log('   a. Open DevTools (F12) → Network tab');
console.log('   b. Try the OAuth flow');
console.log('   c. Look for request to: /api/auth/callback/google');
console.log('   d. Check:');
console.log('      - Status code (should be 200, 302, or 307)');
console.log('      - Response headers');
console.log('      - Set-Cookie headers (should have next-auth.* cookies)');
console.log('      - Redirect location');

console.log('\n3️⃣  CHECK SERVER LOGS');
console.log('-'.repeat(60));
console.log('   In your terminal running `npm run dev`, look for:');
console.log('   ✅ Should see: "🔐 Creating/updating user: am@loopwell.io"');
console.log('   ✅ Should see: "✅ User created/updated successfully: ..."');
console.log('   ❌ If you see errors, note them down');

console.log('\n4️⃣  CHECK DATABASE CONNECTION');
console.log('-'.repeat(60));
console.log('   The signIn callback tries to create/update user in database.');
console.log('   If database is down or unreachable, auth might fail silently.');
console.log('   Check:');
console.log('   - Is your database running?');
console.log('   - Is DATABASE_URL correct in .env?');
console.log('   - Can you connect to the database?');

console.log('\n5️⃣  CHECK COOKIES');
console.log('-'.repeat(60));
console.log('   After clicking "Allow" and being redirected back:');
console.log('   a. Open DevTools → Application tab → Cookies → http://localhost:3000');
console.log('   b. Look for cookies starting with:');
console.log('      - next-auth.session-token');
console.log('      - next-auth.csrf-token');
console.log('      - next-auth.callback-url');
console.log('   c. If these cookies are missing, session isn\'t being created');

console.log('\n6️⃣  CHECK THE ACTUAL REDIRECT');
console.log('-'.repeat(60));
console.log('   When you click "Allow" on Google\'s consent screen:');
console.log('   a. Does the browser redirect at all?');
console.log('   b. What URL does it redirect to?');
console.log('   c. Does it show an error page?');
console.log('   d. Does it redirect back to /login?');
console.log('   e. Does it stay on Google\'s page?');

console.log('\n7️⃣  TEST CALLBACK ENDPOINT DIRECTLY');
console.log('-'.repeat(60));
console.log('   Try accessing the callback with a test error:');
console.log('   http://localhost:3000/api/auth/callback/google?error=test');
console.log('   This should redirect you (even if with an error)');
console.log('   If it doesn\'t respond, the route might not be working');

console.log('\n8️⃣  CHECK PROMPT PARAMETER');
console.log('-'.repeat(60));
console.log('   Your auth config uses: prompt: "consent select_account"');
console.log('   This forces Google to show consent screen every time.');
console.log('   If you\'ve already authorized, try changing to:');
console.log('   prompt: "select_account" (only show account picker)');
console.log('   Or remove prompt entirely to use cached consent');

console.log('\n9️⃣  CHECK NEXTAUTH_SECRET');
console.log('-'.repeat(60));
console.log('   NextAuth needs NEXTAUTH_SECRET to encrypt session tokens.');
console.log('   If it\'s missing or changed, sessions won\'t work.');
console.log('   Verify it\'s set and hasn\'t changed recently.');

console.log('\n🔟  CHECK FOR MULTIPLE DEV SERVERS');
console.log('-'.repeat(60));
console.log('   You might have multiple Next.js dev servers running.');
console.log('   Check:');
console.log('   - lsof -ti:3000');
console.log('   - Kill all but one dev server');
console.log('   - Restart fresh');

console.log('\n\n💡 MOST COMMON ISSUES (when redirect URI is correct):');
console.log('='.repeat(60));
console.log('1. Database connection failure during user creation');
console.log('2. Cookies not being set (CORS, SameSite, Secure flags)');
console.log('3. Session token encryption failing (NEXTAUTH_SECRET issue)');
console.log('4. Browser blocking cookies (privacy settings, extensions)');
console.log('5. Multiple dev servers causing port conflicts');

console.log('\n📝 WHAT TO REPORT:');
console.log('-'.repeat(60));
console.log('If you\'re still stuck, provide:');
console.log('1. What happens when you click "Allow" (does it redirect? where?)');
console.log('2. Browser console errors (copy/paste)');
console.log('3. Server logs (copy/paste, especially around callback time)');
console.log('4. Network tab - /api/auth/callback/google request details');
console.log('5. Cookies present after callback (list them)');

console.log('\n');
