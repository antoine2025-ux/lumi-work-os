/**
 * Diagnostic script to check Google Calendar OAuth scopes
 * 
 * Usage: npx tsx scripts/check-google-calendar-scope.ts <email>
 */

// Load environment variables from .env.local
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

import { prismaUnscoped } from '../src/lib/db';

async function main() {
  const email = process.argv[2];
  
  if (!email) {
    // List all users with Google accounts
    console.log('\n📋 Users with Google OAuth connected:\n');
    const accounts = await prismaUnscoped.account.findMany({
      where: { provider: 'google' },
      select: {
        userId: true,
        scope: true,
        user: {
          select: { email: true, name: true },
        },
      },
      take: 20,
    });
    
    if (accounts.length === 0) {
      console.log('  ❌ No users have Google OAuth connected');
      console.log('\n  All users in database:');
      const users = await prismaUnscoped.user.findMany({
        select: { email: true, name: true },
        take: 10,
      });
      users.forEach(u => {
        console.log(`    • ${u.email} (${u.name || 'no name'})`);
      });
    } else {
      accounts.forEach(a => {
        const hasCalendar = a.scope?.includes('calendar') ? '✅' : '❌';
        console.log(`  ${hasCalendar} ${a.user.email} (${a.user.name || 'no name'})`);
      });
      console.log('\n✅ = Has calendar scope, ❌ = Missing calendar scope');
    }
    console.log('\nUsage: npx tsx scripts/check-google-calendar-scope.ts <email>');
    process.exit(0);
  }

  console.log(`\n🔍 Checking Google Calendar setup for: ${email}\n`);

  // Find user
  const user = await prismaUnscoped.user.findUnique({
    where: { email },
    select: { id: true, name: true, email: true },
  });

  if (!user) {
    console.error('❌ User not found');
    console.log('\nTry running without email to see available users:');
    console.log('  npx tsx scripts/check-google-calendar-scope.ts');
    process.exit(1);
  }

  console.log(`✅ User found: ${user.name} (${user.id})`);

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
    console.error('❌ No Google account connected');
    console.log('\n💡 Solution: Sign in with Google at /login');
    process.exit(1);
  }

  console.log('\n📊 Google Account Status:');
  console.log(`  • Has access token: ${!!account.access_token}`);
  console.log(`  • Has refresh token: ${!!account.refresh_token}`);
  console.log(`  • Token expires at: ${account.expires_at ? new Date(account.expires_at * 1000).toISOString() : 'unknown'}`);
  console.log(`  • Token type: ${account.token_type || 'unknown'}`);
  
  console.log('\n🔐 OAuth Scopes:');
  if (account.scope) {
    const scopes = account.scope.split(' ');
    scopes.forEach(scope => {
      const isCalendar = scope.includes('calendar');
      const icon = isCalendar ? '✅' : '  ';
      console.log(`  ${icon} ${scope}`);
    });
    
    const hasCalendarScope = scopes.some(s => s.includes('calendar'));
    
    if (!hasCalendarScope) {
      console.log('\n❌ PROBLEM: No calendar scope found!');
      console.log('\n💡 Solution:');
      console.log('  1. Sign out of Loopwell');
      console.log('  2. Sign in again with Google');
      console.log('  3. Grant calendar permissions when prompted');
    } else {
      console.log('\n✅ Calendar scope is present!');
      
      if (!account.refresh_token) {
        console.log('\n⚠️  WARNING: No refresh token (calendar access will expire)');
        console.log('\n💡 Solution: Sign out and sign in again to get a refresh token');
      } else {
        console.log('\n🎉 Everything looks good! Calendar should work.');
      }
    }
  } else {
    console.log('  ❌ No scopes recorded in database');
    console.log('\n💡 Solution: Sign out and sign in again');
  }

  console.log('');
}

main()
  .catch(console.error)
  .finally(() => prismaUnscoped.$disconnect());
