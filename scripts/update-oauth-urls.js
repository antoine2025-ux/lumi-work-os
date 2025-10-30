#!/usr/bin/env node

/**
 * Script to update Google OAuth URLs based on environment
 * Run this after each deployment to update OAuth settings
 */

const { execSync } = require('child_process');

// Get current deployment URL from Vercel
function getCurrentDeploymentUrl() {
  try {
    // Get the latest deployment URL
    const output = execSync('vercel ls --json', { encoding: 'utf8' });
    const deployments = JSON.parse(output);
    
    if (deployments.length > 0) {
      const latestDeployment = deployments[0];
      return latestDeployment.url;
    }
  } catch (error) {
    console.error('Error getting deployment URL:', error.message);
  }
  
  return null;
}

// Update Google Cloud Console OAuth settings
function updateGoogleOAuth(deploymentUrl) {
  console.log('🔧 OAuth URL Update Required');
  console.log('================================');
  console.log(`Current Deployment URL: ${deploymentUrl}`);
  console.log('');
  console.log('📋 Update these URLs in Google Cloud Console:');
  console.log('   https://console.cloud.google.com/apis/credentials');
  console.log('');
  console.log('🔗 Authorized JavaScript Origins:');
  console.log(`   ${deploymentUrl}`);
  console.log('');
  console.log('🔄 Authorized Redirect URIs:');
  console.log(`   ${deploymentUrl}/api/auth/callback/google`);
  console.log('');
  console.log('⚙️  Update Vercel Environment Variable:');
  console.log(`   NEXTAUTH_URL=${deploymentUrl}`);
  console.log('');
  console.log('💡 For permanent solution, consider:');
  console.log('   1. Setting up a custom domain');
  console.log('   2. Using Vercel production domain');
  console.log('   3. Automating this process with GitHub Actions');
}

// Main execution
function main() {
  const deploymentUrl = getCurrentDeploymentUrl();
  
  if (deploymentUrl) {
    updateGoogleOAuth(deploymentUrl);
  } else {
    console.error('❌ Could not determine deployment URL');
    console.log('💡 Manual steps:');
    console.log('   1. Check Vercel dashboard for current URL');
    console.log('   2. Update Google Cloud Console OAuth settings');
    console.log('   3. Update NEXTAUTH_URL environment variable');
  }
}

if (require.main === module) {
  main();
}

module.exports = { getCurrentDeploymentUrl, updateGoogleOAuth };

