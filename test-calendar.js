// Test script for Google Calendar integration
// Run this with: node test-calendar.js

const testCalendarAPI = async () => {
  try {
    console.log('Testing Google Calendar API endpoint...')
    
    const response = await fetch('http://localhost:3000/api/calendar/events', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
    const data = await response.json()
    
    console.log('Response status:', response.status)
    console.log('Response data:', JSON.stringify(data, null, 2))
    
    if (response.ok) {
      console.log('✅ Calendar API endpoint is working!')
      console.log(`Found ${data.events?.length || 0} events for today`)
    } else {
      console.log('❌ Calendar API endpoint returned an error')
      if (data.needsAuth) {
        console.log('🔐 User needs to authenticate with Google Calendar')
      }
    }
  } catch (error) {
    console.error('❌ Error testing calendar API:', error.message)
  }
}

// Run the test
testCalendarAPI()
