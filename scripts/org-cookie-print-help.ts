#!/usr/bin/env node
/**
 * Org MVP Pressure Test - Quick Help
 * 
 * Prints step-by-step guidance for running pressure tests
 */

console.log('');
console.log('🚀 Org MVP Pressure Test - Quick Start');
console.log('=' .repeat(60));
console.log('');

console.log('STEP 1: Start Server');
console.log('  → npm run dev');
console.log('');

console.log('STEP 2: Log In');
console.log('  → Open http://localhost:3000 in browser');
console.log('  → Complete login flow');
console.log('  → Navigate to /org (to ensure session is active)');
console.log('');

console.log('STEP 3: Capture Cookie');
console.log('  → Open Chrome DevTools (F12)');
console.log('  → Application tab → Cookies → http://localhost:3000');
console.log('  → Find: __Secure-next-auth.session-token (or next-auth.session-token)');
console.log('  → Copy the Value');
console.log('');

console.log('STEP 4: Create Cookie File');
console.log('  → mkdir -p tmp');
console.log('  → echo "name=value" > tmp/org-cookie.txt');
console.log('  → (Replace "name=value" with your actual cookie)');
console.log('');

console.log('STEP 5: Run Smoke Test (Safe - No Data Writes)');
console.log('  → export ORG_TEST_COOKIE_FILE="./tmp/org-cookie.txt"');
console.log('  → npm run org:mvp:smoke');
console.log('');

console.log('STEP 6: Check Results');
console.log('  → Open: docs/org/MVP_READINESS_SCORECARD.md');
console.log('  → Look for ❌ FAIL steps');
console.log('  → Follow hints to fix issues');
console.log('');

console.log('STEP 7: Run Full Test (Optional - Creates Data)');
console.log('  → npm run org:mvp:pressure-test');
console.log('');

console.log('📚 For detailed help:');
console.log('  → docs/org/MVP_PRESSURE_TEST_HOWTO.md');
console.log('  → scripts/org-cookie-help.md');
console.log('');

console.log('💡 Quick Commands:');
console.log('  → npm run org:mvp:help          # Show this help');
console.log('  → npm run org:mvp:smoke         # Safe smoke test');
console.log('  → npm run org:mvp:pressure-test # Full test (creates data)');
console.log('');

