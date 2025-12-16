import { NextRequest, NextResponse } from 'next/server'

/**
 * Mailchimp Waitlist Subscription API
 * 
 * Environment variables required:
 * - MAILCHIMP_API_KEY: Your Mailchimp API key (e.g., "abc123def456-us1")
 * - MAILCHIMP_LIST_ID: Your Mailchimp audience/list ID (e.g., "a1b2c3d4e5")
 * 
 * This endpoint subscribes users to the waitlist with additional fields:
 * - First Name (required)
 * - Last Name (required)
 * - Email (required)
 * - LinkedIn (optional)
 * - Company (optional)
 */

interface WaitlistSubscribeRequest {
  firstName: string
  lastName: string
  email: string
  linkedin?: string
  company?: string
}

export async function POST(request: NextRequest) {
  try {
    const body: WaitlistSubscribeRequest = await request.json()
    const { firstName, lastName, email, linkedin, company } = body

    // Validate required fields
    if (!firstName || !lastName) {
      return NextResponse.json(
        { error: 'First name and last name are required' },
        { status: 400 }
      )
    }

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
        { error: 'Waitlist service is not configured. Please contact support.' },
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

    // Prepare merge fields and tags
    const mergeFields: Record<string, string> = {
      FNAME: firstName,
      LNAME: lastName,
    }

    // Add company to merge fields if available (assuming COMPANY merge field exists)
    // If not, we'll use tags
    if (company) {
      mergeFields.COMPANY = company
    }

    const tags: string[] = ['Waitlist']
    if (company) {
      tags.push(`Company: ${company}`)
    }
    if (linkedin) {
      tags.push(`LinkedIn: ${linkedin}`)
    }

    // Subscribe user to Mailchimp list
    const response = await fetch(mailchimpUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email_address: email,
        status: 'subscribed',
        merge_fields: mergeFields,
        tags: tags,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      // Handle Mailchimp errors
      if (data.title === 'Member Exists') {
        return NextResponse.json(
          { 
            message: 'This email is already on the waitlist. We\'ll be in touch soon!',
            error: 'Email already exists'
          },
          { status: 200 } // Return 200 since user is already subscribed
        )
      }

      console.error('Mailchimp API error:', data)
      return NextResponse.json(
        { error: data.detail || 'Failed to join waitlist. Please try again later.' },
        { status: response.status }
      )
    }

    return NextResponse.json({
      message: 'Successfully joined the waitlist! We\'ll be in touch soon.',
      success: true,
    })
  } catch (error) {
    console.error('Waitlist subscription error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again later.' },
      { status: 500 }
    )
  }
}

