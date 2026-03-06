/**
 * Verify OAuth scopes after Google sign-in
 * 
 * Usage: npx tsx scripts/verify-oauth-after-signin.ts <email>
 */

// Load environment variables from .env.local
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

import { prismaUnscoped } from '../src/lib/db';

async function main() {
  const email = process.argv[2];
  
  if (!email) {
    console.log('\n📋 All Google OAuth accounts in database:\n');
    const accounts = await prismaUnscoped.account.findMany({
      where: { provider: 'google' },
      select: {
        userId: true,
        scope: true,
        access_token: true,
        refresh_token: true,
        expires_at: true,
        user: {
          select: { email: true, name: true },
        },
      },
    });
    
    if (accounts.length === 0) {
      console.log('  ❌ No Google OAuth accounts found');
      console.log('\n  💡 Sign in with Google at: http://localhost:3000/login');
    } else {
      accounts.forEach(a => {
        const scopes = a.scope?.split(' ') || [];
        const hasCalendar = scopes.some(s => s.includes('calendar'));
        const hasRefreshToken = !!a.refresh_token;
        const icon = hasCalendar && hasRefreshToken ? '✅' : '⚠️';
        
        console.log(`  ${icon} ${a.user.email}`);
        console.log(`     Scopes: ${scopes.length} granted`);
        scopes.forEach(s => {
          const isCalendar = s.includes('calendar');
          console.log(`       ${isCalendar ? '📅' : '  '} ${s}`);
        });
        console.log(`     Refresh token: ${hasRefreshToken ? '✅ Yes' : '❌ No'}`);
        console.log(`     Access token: ${a.access_token ? '✅ Yes' : '❌ No'}`);
        console.log(`     Expires: ${a.expires_at ? new Date(a.expires_at * 1000).toISOString() : 'unknown'}`);
        console.log('');
      });
    }
    
    console.log('\nUsage: npx tsx scripts/verify-oauth-after-signin.ts <email>');
    process.exit(0);
  }

  console.log(`\n🔍 Verifying OAuth for: ${email}\n`);

  // Find user
  const user = await prismaUnscoped.user.findUnique({
    where: { email },
    select: { id: true, name: true, email: true },
  });

  if (!user) {
    console.error('❌ User not found');
    process.exit(1);
  }

  console.log(`✅ User: ${user.name} (${user.id})\n`);

  // Find Google account
  const account = await prismaUnscoped.account.findFirst({
    where: { userId: user.id, provider: 'google' },
    select: {
      access_token: true,
      refresh_token: true,
      expires_at: true,
      scope: true,
      token_type: true,
    },
  });

  if (!account) {
    console.error('❌ No Google account connected\n');
    console.log('💡 Next steps:');
    console.log('   1. Go to: http://localhost:3000/login');
    console.log('   2. Click "Continue with Google"');
    console.log('   3. Grant all permissions when prompted');
    console.log('   4. Run this script again\n');
    process.exit(1);
  }

  console.log('📊 OAuth Status:\n');
  
  // Parse scopes
  const scopes = account.scope?.split(' ') || [];
  const hasCalendarScope = scopes.some(s => s.includes('calendar'));
  const hasRefreshToken = !!account.refresh_token;
  const hasAccessToken = !!account.access_token;
  
  // Check token expiry
  const isExpired = account.expires_at 
    ? account.expires_at * 1000 < Date.now()
    : true;
  
  console.log(`  Access Token: ${hasAccessToken ? '✅ Present' : '❌ Missing'}`);
  console.log(`  Refresh Token: ${hasRefreshToken ? '✅ Present' : '❌ Missing'}`);
  console.log(`  Token Expires: ${account.expires_at ? new Date(account.expires_at * 1000).toISOString() : '❌ Unknown'}`);
  console.log(`  Token Status: ${isExpired ? '⚠️ Expired' : '✅ Valid'}`);
  console.log(`  Token Type: ${account.token_type || 'unknown'}\n`);
  
  console.log('🔐 OAuth Scopes:\n');
  if (scopes.length === 0) {
    console.log('  ❌ No scopes recorded\n');
  } else {
    scopes.forEach(scope => {
      const isCalendar = scope.includes('calendar');
      const icon = isCalendar ? '📅' : '  ';
      console.log(`  ${icon} ${scope}`);
    });
    console.log('');
  }
  
  // Final verdict
  console.log('🎯 Calendar Integration Status:\n');
  
  if (!hasCalendarScope) {
    console.log('  ❌ PROBLEM: Calendar scope not granted\n');
    console.log('  💡 Solution:');
    console.log('     1. Sign out of Loopwell');
    console.log('     2. Sign in again with Google');
    console.log('     3. Make sure to grant calendar permissions\n');
    console.log('  Expected scope: https://www.googleapis.com/auth/calendar.events\n');
  } else if (!hasRefreshToken) {
    console.log('  ⚠️  WARNING: Calendar scope granted but no refresh token\n');
    console.log('  💡 Solution:');
    console.log('     1. Sign out of Loopwell');
    console.log('     2. Sign in again with Google');
    console.log('     3. This will get a new refresh token\n');
  } else if (isExpired && !hasRefreshToken) {
    console.log('  ⚠️  WARNING: Access token expired and no refresh token\n');
    console.log('  💡 Solution: Sign out and sign in again with Google\n');
  } else {
    console.log('  ✅ Calendar integration is properly configured!\n');
    console.log('  🎉 You should be able to query your calendar in Loopbrain\n');
  }
}

main()
  .catch(console.error)
  .finally(() => prismaUnscoped.$disconnect());
