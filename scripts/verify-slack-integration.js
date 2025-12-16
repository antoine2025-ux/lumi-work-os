/**
 * Slack Integration Verification Script
 * 
 * This script checks all aspects of the Slack integration to identify issues:
 * - Environment variables
 * - Database integration records
 * - API endpoint availability
 * - OAuth configuration
 * - Token validity
 * 
 * Usage:
 *   node scripts/verify-slack-integration.js [workspaceId]
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkEnvironmentVariables() {
  console.log('\n📋 Checking Environment Variables...\n')
  
  const slackClientId = process.env.SLACK_CLIENT_ID
  const slackClientSecret = process.env.SLACK_CLIENT_SECRET
  const nextAuthUrl = process.env.NEXTAUTH_URL
  const slackRedirectUri = process.env.SLACK_REDIRECT_URI
  
  console.log(`SLACK_CLIENT_ID: ${slackClientId ? '✅ Set' : '❌ Missing'}`)
  if (slackClientId) {
    console.log(`  Value: ${slackClientId.substring(0, 20)}...`)
  }
  
  console.log(`SLACK_CLIENT_SECRET: ${slackClientSecret ? '✅ Set' : '❌ Missing'}`)
  if (slackClientSecret) {
    console.log(`  Value: ${slackClientSecret.substring(0, 10)}...`)
  }
  
  console.log(`NEXTAUTH_URL: ${nextAuthUrl ? '✅ Set' : '⚠️  Not set (defaults to http://localhost:3000)'}`)
  if (nextAuthUrl) {
    console.log(`  Value: ${nextAuthUrl}`)
  }
  
  console.log(`SLACK_REDIRECT_URI: ${slackRedirectUri ? '✅ Set (custom)' : '⚠️  Not set (using default)'}`)
  if (slackRedirectUri) {
    console.log(`  Value: ${slackRedirectUri}`)
  } else {
    const defaultRedirect = `${nextAuthUrl || 'http://localhost:3000'}/api/integrations/slack/callback`
    console.log(`  Default: ${defaultRedirect}`)
  }
  
  const issues = []
  if (!slackClientId) {
    issues.push('SLACK_CLIENT_ID is not set in environment variables')
  }
  if (!slackClientSecret) {
    issues.push('SLACK_CLIENT_SECRET is not set in environment variables')
  }
  
  return { hasIssues: issues.length > 0, issues }
}

async function checkDatabaseIntegrations(workspaceId = null) {
  console.log('\n📊 Checking Database Integration Records...\n')
  
  try {
    const where = {
      type: 'SLACK',
      ...(workspaceId ? { workspaceId } : {})
    }
    
    const integrations = await prisma.integration.findMany({
      where,
      include: {
        workspace: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
    
    if (integrations.length === 0) {
      console.log('❌ No Slack integrations found in database')
      if (workspaceId) {
        console.log(`   (for workspace: ${workspaceId})`)
      }
      return { hasIssues: true, issues: ['No Slack integration records found'], integrations: [] }
    }
    
    console.log(`✅ Found ${integrations.length} Slack integration(s):\n`)
    
    const issues = []
    
    for (const integration of integrations) {
      console.log(`Workspace: ${integration.workspace?.name || 'Unknown'} (${integration.workspaceId})`)
      console.log(`  ID: ${integration.id}`)
      console.log(`  Active: ${integration.isActive ? '✅ Yes' : '❌ No'}`)
      console.log(`  Created: ${integration.createdAt}`)
      console.log(`  Updated: ${integration.updatedAt}`)
      console.log(`  Last Sync: ${integration.lastSyncAt || 'Never'}`)
      
      const config = integration.config
      if (config) {
        console.log(`  Access Token: ${config.accessToken ? '✅ Present' : '❌ Missing'}`)
        if (config.accessToken) {
          console.log(`    Type: ${config.accessToken.startsWith('xoxb-') ? 'Bot Token ✅' : '⚠️  Unknown format'}`)
        }
        console.log(`  Refresh Token: ${config.refreshToken ? '✅ Present' : '❌ Missing'}`)
        if (config.refreshToken) {
          console.log(`    Type: ${config.refreshToken.startsWith('xoxe-') ? 'Refresh Token ✅' : '⚠️  Unknown format'}`)
        }
        console.log(`  Team ID: ${config.teamId || 'Not set'}`)
        console.log(`  Team Name: ${config.teamName || 'Not set'}`)
        console.log(`  Expires At: ${config.expiresAt ? new Date(config.expiresAt).toISOString() : 'Not set'}`)
        if (config.expiresAt) {
          const isExpired = config.expiresAt < Date.now()
          console.log(`    Status: ${isExpired ? '❌ Expired' : '✅ Valid'}`)
          if (isExpired) {
            issues.push(`Integration for workspace ${integration.workspaceId} has expired token`)
          }
        }
        console.log(`  Scopes: ${config.scopes ? config.scopes.join(', ') : 'Not set'}`)
      } else {
        console.log(`  Config: ❌ Missing or invalid`)
        issues.push(`Integration ${integration.id} has missing or invalid config`)
      }
      
      if (!integration.isActive) {
        issues.push(`Integration for workspace ${integration.workspaceId} is not active`)
      }
      
      console.log('')
    }
    
    return { hasIssues: issues.length > 0, issues, integrations }
  } catch (error) {
    console.error('❌ Error checking database:', error.message)
    return { hasIssues: true, issues: [`Database error: ${error.message}`], integrations: [] }
  }
}

async function testSlackAPI(workspaceId) {
  console.log('\n🧪 Testing Slack API Access...\n')
  
  try {
    const integration = await prisma.integration.findFirst({
      where: {
        workspaceId,
        type: 'SLACK',
        isActive: true
      }
    })
    
    if (!integration) {
      console.log('❌ No active Slack integration found for this workspace')
      return { hasIssues: true, issues: ['No active integration found'] }
    }
    
    const config = integration.config
    if (!config?.accessToken) {
      console.log('❌ No access token found')
      return { hasIssues: true, issues: ['No access token in integration config'] }
    }
    
    // Test auth.test endpoint
    console.log('Testing auth.test endpoint...')
    const authTestResponse = await fetch('https://slack.com/api/auth.test', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json'
      }
    })
    
    const authTestData = await authTestResponse.json()
    
    if (authTestData.ok) {
      console.log('✅ Token is valid')
      console.log(`  Team: ${authTestData.team} (${authTestData.team_id})`)
      console.log(`  User: ${authTestData.user} (${authTestData.user_id})`)
      console.log(`  URL: ${authTestData.url}`)
    } else {
      console.log(`❌ Token validation failed: ${authTestData.error}`)
      return { hasIssues: true, issues: [`Token validation failed: ${authTestData.error}`] }
    }
    
    // Test conversations.list endpoint
    console.log('\nTesting conversations.list endpoint...')
    const channelsResponse = await fetch('https://slack.com/api/conversations.list', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${config.accessToken}`
      }
    })
    
    const channelsData = await channelsResponse.json()
    
    if (channelsData.ok) {
      console.log(`✅ Can list channels (${channelsData.channels?.length || 0} channels found)`)
    } else {
      console.log(`⚠️  Cannot list channels: ${channelsData.error}`)
      console.log(`   This might be a scope issue`)
    }
    
    return { hasIssues: false, issues: [] }
  } catch (error) {
    console.error('❌ Error testing Slack API:', error.message)
    return { hasIssues: true, issues: [`API test error: ${error.message}`] }
  }
}

async function checkOAuthConfiguration() {
  console.log('\n🔐 Checking OAuth Configuration...\n')
  
  const slackClientId = process.env.SLACK_CLIENT_ID
  const nextAuthUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
  const slackRedirectUri = process.env.SLACK_REDIRECT_URI || 
    `${nextAuthUrl}/api/integrations/slack/callback`
  
  console.log('Expected OAuth redirect URI:')
  console.log(`  ${slackRedirectUri}\n`)
  
  console.log('⚠️  IMPORTANT: Make sure this exact URL is configured in your Slack app:')
  console.log('   1. Go to https://api.slack.com/apps')
  console.log('   2. Select your app')
  console.log('   3. Go to "OAuth & Permissions"')
  console.log('   4. Under "Redirect URLs", ensure this URL is listed:')
  console.log(`      ${slackRedirectUri}\n`)
  
  const issues = []
  
  // Check if redirect URI uses HTTPS in production
  if (process.env.NODE_ENV === 'production' && !slackRedirectUri.startsWith('https://')) {
    issues.push('Production redirect URI should use HTTPS')
  }
  
  // Check if localhost uses HTTP (not HTTPS)
  if (slackRedirectUri.includes('localhost') && slackRedirectUri.startsWith('https://')) {
    issues.push('Localhost redirect URI should use HTTP, not HTTPS')
  }
  
  return { hasIssues: issues.length > 0, issues }
}

async function main() {
  const workspaceId = process.argv[2] || null
  
  console.log('🔍 Slack Integration Verification\n')
  console.log('=' .repeat(50))
  
  if (workspaceId) {
    console.log(`Checking workspace: ${workspaceId}\n`)
  } else {
    console.log('Checking all workspaces\n')
  }
  
  // Check environment variables
  const envCheck = await checkEnvironmentVariables()
  
  // Check database
  const dbCheck = await checkDatabaseIntegrations(workspaceId)
  
  // Check OAuth configuration
  const oauthCheck = await checkOAuthConfiguration()
  
  // Test API if we have a workspace ID and integration
  let apiCheck = { hasIssues: false, issues: [] }
  if (workspaceId) {
    apiCheck = await testSlackAPI(workspaceId)
  } else if (dbCheck.integrations && dbCheck.integrations.length > 0) {
    console.log('\n💡 Tip: Run with a workspace ID to test API access:')
    console.log(`   node scripts/verify-slack-integration.js ${dbCheck.integrations[0].workspaceId}`)
  }
  
  // Summary
  console.log('\n' + '='.repeat(50))
  console.log('📊 SUMMARY\n')
  
  const allIssues = [
    ...envCheck.issues,
    ...dbCheck.issues,
    ...oauthCheck.issues,
    ...apiCheck.issues
  ]
  
  if (allIssues.length === 0) {
    console.log('✅ All checks passed! Slack integration should be working.\n')
  } else {
    console.log(`❌ Found ${allIssues.length} issue(s):\n`)
    allIssues.forEach((issue, index) => {
      console.log(`${index + 1}. ${issue}`)
    })
    console.log('\n💡 Fix the issues above and run this script again.\n')
  }
  
  await prisma.$disconnect()
}

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
