import { NextRequest, NextResponse } from 'next/server'

/**
 * Mailchimp Newsletter Subscription API
 * 
 * Environment variables required:
 * - MAILCHIMP_API_KEY: Your Mailchimp API key (e.g., "abc123def456-us1")
 * - MAILCHIMP_LIST_ID: Your Mailchimp audience/list ID (e.g., "a1b2c3d4e5")
 * 
 * To get these:
 * 1. Go to https://mailchimp.com/developer/
 * 2. Create an API key: Account → Extras → API keys
 * 3. Get your list ID: Audience → All contacts → Settings → Audience name and defaults
 */

interface SubscribeRequest {
  email: string
  name?: string
  companyName?: string
}

export async function POST(request: NextRequest) {
  try {
    const body: SubscribeRequest = await request.json()
    const { email, name, companyName } = body

    // Validate email
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: 'Please provide a valid email address' },
        { status: 400 }
      )
    }

    // Get Mailchimp credentials from environment
    const apiKey = process.env.MAILCHIMP_API_KEY
    const listId = process.env.MAILCHIMP_LIST_ID

    if (!apiKey || !listId) {
      console.error('Mailchimp credentials not configured')
      return NextResponse.json(
        { error: 'Newsletter service is not configured. Please contact support.' },
        { status: 500 }
      )
    }

    // Extract server prefix from API key (e.g., "abc123-us1" -> "us1")
    const serverPrefix = apiKey.split('-').pop()
    if (!serverPrefix) {
      return NextResponse.json(
        { error: 'Invalid Mailchimp API key format' },
        { status: 500 }
      )
    }

    const mailchimpUrl = `https://${serverPrefix}.api.mailchimp.com/3.0/lists/${listId}/members`

    // Subscribe user to Mailchimp list
    const response = await fetch(mailchimpUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email_address: email,
        status: 'subscribed', // 'subscribed', 'unsubscribed', 'cleaned', 'pending', 'transactional'
        merge_fields: {
          FNAME: name || '',
          // Use COMPANY or a custom field for company name
          // If you have a custom field in Mailchimp, use that field name
          // Otherwise, we can store it in a note or tag
        },
        tags: companyName ? [`Company: ${companyName}`] : [],
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      // Handle Mailchimp errors
      if (data.title === 'Member Exists') {
        return NextResponse.json(
          { 
            message: 'This email is already subscribed to our newsletter.',
            error: 'Email already exists'
          },
          { status: 200 } // Return 200 since user is already subscribed
        )
      }

      console.error('Mailchimp API error:', data)
      return NextResponse.json(
        { error: data.detail || 'Failed to subscribe. Please try again later.' },
        { status: response.status }
      )
    }

    return NextResponse.json({
      message: 'Successfully subscribed! Check your email for a confirmation message.',
      success: true,
    })
  } catch (error) {
    console.error('Newsletter subscription error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again later.' },
      { status: 500 }
    )
  }
}

