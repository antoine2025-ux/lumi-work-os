/**
 * Quick script to store Slack tokens directly
 * 
 * Usage:
 * 1. Update the tokens below
 * 2. Make sure you're logged in to Loopwell in your browser
 * 3. Copy your session cookie from browser dev tools (Application → Cookies)
 * 4. Run: node scripts/store-slack-tokens.js
 */

const SLACK_TOKENS = {
  accessToken: 'xoxb-your-access-token-here',
  refreshToken: 'xoxe-your-refresh-token-here',
  teamId: 'T1234567890', // Optional
  teamName: 'Your Workspace Name' // Optional
}

// Get session cookie from command line or use this placeholder
const SESSION_COOKIE = process.argv[2] || 'your-session-cookie-here'

async function storeSlackTokens() {
  try {
    console.log('📤 Storing Slack tokens...')
    
    const response = await fetch('http://localhost:3000/api/integrations/slack', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': SESSION_COOKIE
      },
      body: JSON.stringify(SLACK_TOKENS)
    })

    const data = await response.json()

    if (response.ok) {
      console.log('✅ Success!', data)
    } else {
      console.error('❌ Error:', data)
    }
  } catch (error) {
    console.error('❌ Failed:', error.message)
    console.log('\n💡 Make sure:')
    console.log('   1. Your dev server is running (npm run dev)')
    console.log('   2. You\'re logged in to Loopwell')
    console.log('   3. You\'ve copied your session cookie')
    console.log('   4. You\'ve updated the tokens in this script')
  }
}

storeSlackTokens()







