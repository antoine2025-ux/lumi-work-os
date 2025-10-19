// Test script for Anthropic API integration
const { generateAIResponse } = require('./src/lib/ai/providers.ts')

async function testAnthropicAPI() {
  console.log('🧪 Testing Anthropic API integration...\n')

  try {
    // Test 1: Check if Anthropic API key is configured
    console.log('1. Checking environment variables...')
    const anthropicKey = process.env.ANTHROPIC_API_KEY
    if (!anthropicKey || anthropicKey === 'your-anthropic-api-key') {
      console.log('❌ Anthropic API key not configured in .env.local')
      console.log('   Please add your actual Anthropic API key to .env.local')
      return
    }
    console.log('✅ Anthropic API key found')

    // Test 2: Test Claude model directly
    console.log('\n2. Testing Claude 3.5 Sonnet...')
    const response = await generateAIResponse(
      'Write a short haiku about artificial intelligence',
      'claude-3-5-sonnet',
      {
        systemPrompt: 'You are a helpful AI assistant that writes creative poetry.',
        temperature: 0.8,
        maxTokens: 100
      }
    )

    console.log('✅ Claude response received:')
    console.log('   Model:', response.model)
    console.log('   Content:', response.content)
    if (response.usage) {
      console.log('   Tokens used:', response.usage.totalTokens)
    }

    console.log('\n🎉 Anthropic API test completed successfully!')

  } catch (error) {
    console.error('❌ Test failed:', error.message)
    
    if (error.message.includes('API key not configured')) {
      console.log('\n💡 To fix this:')
      console.log('   1. Get your API key from https://console.anthropic.com/')
      console.log('   2. Add it to .env.local: ANTHROPIC_API_KEY="sk-ant-your-key-here"')
      console.log('   3. Restart the development server')
    }
  }
}

// Run the test
testAnthropicAPI()
