/**
 * Test script for Loopbrain Slack integration improvements
 * 
 * This script tests various Slack message patterns to verify
 * that the improved detection logic works correctly.
 * 
 * Usage:
 *   node scripts/test-loopbrain-slack.js
 * 
 * Note: This requires a valid session cookie and workspace with Slack connected.
 * For manual testing, use the Loopbrain assistant in the UI.
 */

const testCases = [
  {
    name: 'Simple message with say',
    query: 'send a message to #general saying hello',
    expectedChannel: '#general',
    expectedMessage: 'hello'
  },
  {
    name: 'Message with colon',
    query: 'send to #dev saying: "Project is complete"',
    expectedChannel: '#dev',
    expectedMessage: 'Project is complete'
  },
  {
    name: 'Notify pattern',
    query: 'notify #team about project completion',
    expectedChannel: '#team',
    expectedMessage: 'project completion'
  },
  {
    name: 'Quoted message',
    query: 'post to slack channel #announcements "Meeting at 3pm"',
    expectedChannel: '#announcements',
    expectedMessage: 'Meeting at 3pm'
  },
  {
    name: 'Tell pattern',
    query: 'tell #general that we are done',
    expectedChannel: '#general',
    expectedMessage: 'we are done'
  },
  {
    name: 'Message without # prefix',
    query: 'send hello world to general',
    expectedChannel: '#general',
    expectedMessage: 'hello world'
  },
  {
    name: 'Complex message',
    query: 'send a message to #updates saying "The new feature has been launched successfully!"',
    expectedChannel: '#updates',
    expectedMessage: 'The new feature has been launched successfully!'
  }
]

console.log('🧪 Loopbrain Slack Integration Test Cases\n')
console.log('These are the test patterns that should now be detected:\n')

testCases.forEach((testCase, index) => {
  console.log(`${index + 1}. ${testCase.name}`)
  console.log(`   Query: "${testCase.query}"`)
  console.log(`   Expected Channel: ${testCase.expectedChannel}`)
  console.log(`   Expected Message: "${testCase.expectedMessage}"`)
  console.log('')
})

console.log('📝 Manual Testing Instructions:\n')
console.log('1. Open the Loopbrain assistant in your workspace')
console.log('2. Make sure Slack is connected (check Settings → Integrations)')
console.log('3. Try each of the test queries above')
console.log('4. Verify that messages are sent to the correct Slack channels')
console.log('5. Check that the assistant confirms the message was sent\n')

console.log('🔍 What to Check:\n')
console.log('✅ Pre-processing should detect and send messages immediately')
console.log('✅ LLM should use [SLACK_SEND:...] format when pre-processing fails')
console.log('✅ Fallback detection should catch messages even without exact format')
console.log('✅ Messages should appear in the correct Slack channels')
console.log('✅ Assistant should confirm successful sends\n')

console.log('💡 Tips:\n')
console.log('- If a message pattern doesn\'t work, check the server logs')
console.log('- Look for "Pre-processing Slack request" or "Loopbrain executing Slack send action"')
console.log('- Verify the channel exists and the bot is a member')
console.log('- Check that the Slack integration has chat:write scope\n')




