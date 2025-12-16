#!/usr/bin/env node

/**
 * Authentication Configuration Diagnostic Script
 * Checks all necessary configuration for Google OAuth in dev mode
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Authentication Configuration Diagnostic\n');
console.log('='.repeat(60));

// Check environment files
const envFiles = ['.env.local', '.env', '.env.development'];
let envVars = {};

for (const envFile of envFiles) {
  const envPath = path.join(process.cwd(), envFile);
  if (fs.existsSync(envPath)) {
    console.log(`\n✅ Found ${envFile}`);
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
  } else {
    console.log(`\n❌ ${envFile} not found`);
  }
}

// Required variables for Google OAuth
const requiredVars = {
  'NEXTAUTH_URL': {
    required: true,
    description: 'Base URL for NextAuth (should be http://localhost:3000 for dev)',
    devValue: 'http://localhost:3000'
  },
  'NEXTAUTH_SECRET': {
    required: true,
    description: 'Secret key for NextAuth (min 32 characters)',
    minLength: 32
  },
  'GOOGLE_CLIENT_ID': {
    required: true,
    description: 'Google OAuth Client ID from Google Cloud Console',
    pattern: /^[\d\w-]+\.apps\.googleusercontent\.com$/
  },
  'GOOGLE_CLIENT_SECRET': {
    required: true,
    description: 'Google OAuth Client Secret from Google Cloud Console',
    minLength: 20
  }
};

console.log('\n📋 Environment Variable Check:');
console.log('-'.repeat(60));

let allValid = true;
const issues = [];

for (const [varName, config] of Object.entries(requiredVars)) {
  const value = envVars[varName];
  const isSet = value !== undefined && value !== '';
  const isPlaceholder = value && (
    value.includes('your-') || 
    value.includes('YOUR_') ||
    value === 'your-google-client-id' ||
    value === 'your-google-client-secret'
  );

  if (!isSet) {
    console.log(`\n❌ ${varName}: NOT SET`);
    if (config.required) {
      allValid = false;
      issues.push(`${varName} is required but not set`);
    }
  } else if (isPlaceholder) {
    console.log(`\n⚠️  ${varName}: SET BUT PLACEHOLDER VALUE`);
    console.log(`   Current: ${value.substring(0, 20)}...`);
    allValid = false;
    issues.push(`${varName} contains placeholder value`);
  } else {
    // Validate value
    let isValid = true;
    let validationError = '';

    if (config.minLength && value.length < config.minLength) {
      isValid = false;
      validationError = `Must be at least ${config.minLength} characters (current: ${value.length})`;
    }

    if (config.pattern && !config.pattern.test(value)) {
      isValid = false;
      validationError = `Does not match expected pattern`;
    }

    if (config.devValue && value !== config.devValue && process.env.NODE_ENV !== 'production') {
      console.log(`\n⚠️  ${varName}: SET BUT MAY BE INCORRECT FOR DEV`);
      console.log(`   Current: ${value}`);
      console.log(`   Expected for dev: ${config.devValue}`);
    } else if (isValid) {
      console.log(`\n✅ ${varName}: SET`);
      if (varName.includes('SECRET') || varName.includes('CLIENT_SECRET')) {
        console.log(`   Value: ${'*'.repeat(Math.min(value.length, 20))}... (${value.length} chars)`);
      } else {
        console.log(`   Value: ${value}`);
      }
    } else {
      console.log(`\n❌ ${varName}: INVALID`);
      console.log(`   Value: ${value.substring(0, 30)}...`);
      console.log(`   Error: ${validationError}`);
      allValid = false;
      issues.push(`${varName}: ${validationError}`);
    }
  }

  console.log(`   Description: ${config.description}`);
}

// Check NextAuth callback route
console.log('\n\n📁 NextAuth Route Check:');
console.log('-'.repeat(60));

const nextAuthRoute = path.join(process.cwd(), 'src/app/api/auth/[...nextauth]/route.ts');
if (fs.existsSync(nextAuthRoute)) {
  console.log('✅ NextAuth route exists: src/app/api/auth/[...nextauth]/route.ts');
} else {
  console.log('❌ NextAuth route missing!');
  allValid = false;
  issues.push('NextAuth route file not found');
}

// Expected callback URL
const expectedCallbackUrl = envVars.NEXTAUTH_URL 
  ? `${envVars.NEXTAUTH_URL}/api/auth/callback/google`
  : 'http://localhost:3000/api/auth/callback/google';

console.log('\n\n🔗 OAuth Configuration:');
console.log('-'.repeat(60));
console.log(`Expected NextAuth Callback URL: ${expectedCallbackUrl}`);
console.log('\n⚠️  IMPORTANT: Make sure this URL is added to Google Cloud Console:');
console.log('   1. Go to https://console.cloud.google.com/apis/credentials');
console.log('   2. Click on your OAuth 2.0 Client ID');
console.log('   3. Under "Authorized redirect URIs", add:');
console.log(`      ${expectedCallbackUrl}`);

// Summary
console.log('\n\n📊 Summary:');
console.log('='.repeat(60));

if (allValid && issues.length === 0) {
  console.log('✅ All checks passed! Authentication should work.');
} else {
  console.log('❌ Issues found:');
  issues.forEach((issue, index) => {
    console.log(`   ${index + 1}. ${issue}`);
  });
  console.log('\n💡 Next Steps:');
  console.log('   1. Create or update .env.local file with required variables');
  console.log('   2. Get Google OAuth credentials from Google Cloud Console');
  console.log('   3. Add redirect URI to Google Cloud Console');
  console.log('   4. Restart your dev server after updating .env.local');
}

console.log('\n');
