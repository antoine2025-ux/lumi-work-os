import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { google } from 'googleapis'

// Helper function to extract meeting links from description or location
function extractMeetingLink(description: string, location: string): string | null {
  // Common meeting platform patterns
  const patterns = [
    // Google Meet
    /https?:\/\/meet\.google\.com\/[a-z0-9-]+/gi,
    // Zoom
    /https?:\/\/[a-z0-9.-]*zoom\.us\/j\/[0-9]+/gi,
    /https?:\/\/[a-z0-9.-]*zoom\.us\/my\/[a-z0-9.-]+/gi,
    // Microsoft Teams
    /https?:\/\/teams\.microsoft\.com\/l\/meetup-join\/[a-z0-9-]+/gi,
    // Webex
    /https?:\/\/[a-z0-9.-]*webex\.com\/meet\/[a-z0-9.-]+/gi,
    // GoToMeeting
    /https?:\/\/[a-z0-9.-]*gotomeeting\.com\/join\/[0-9]+/gi,
    // Generic meeting links
    /https?:\/\/[^\s]+(?:meet|join|conference|webinar)[^\s]*/gi
  ]

  // Search in description first
  for (const pattern of patterns) {
    const match = description.match(pattern)
    if (match) {
      return match[0]
    }
  }

  // Search in location
  for (const pattern of patterns) {
    const match = location.match(pattern)
    if (match) {
      return match[0]
    }
  }

  // Fallback: look for any https link
  const fallbackPattern = /https?:\/\/[^\s]+/gi
  const descMatch = description.match(fallbackPattern)
  if (descMatch) {
    return descMatch[0]
  }
  
  const locMatch = location.match(fallbackPattern)
  if (locMatch) {
    return locMatch[0]
  }

  return null
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

        // Check if we have an access token
        if (!session.accessToken) {
          console.log('No access token found in session')
          return NextResponse.json({ 
            error: 'Google Calendar not connected',
            needsAuth: true 
          }, { status: 403 })
        }

        console.log('Session data:', {
          hasAccessToken: !!session.accessToken,
          hasRefreshToken: !!session.refreshToken,
          expiresAt: session.expiresAt,
          isExpired: session.expiresAt ? Date.now() > session.expiresAt * 1000 : 'unknown'
        })

    // Create OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.NEXTAUTH_URL + '/api/auth/callback/google'
    )

    // Set credentials
    oauth2Client.setCredentials({
      access_token: session.accessToken,
      refresh_token: session.refreshToken,
    })

    // Create Calendar API instance
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

    // Get today's date range
    const today = new Date()
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)

        // Fetch today's events
        console.log('Fetching calendar events...')
        const response = await calendar.events.list({
          calendarId: 'primary',
          timeMin: startOfDay.toISOString(),
          timeMax: endOfDay.toISOString(),
          singleEvents: true,
          orderBy: 'startTime',
        })
        
        console.log('Calendar API response:', {
          status: response.status,
          dataLength: response.data.items?.length || 0,
          hasItems: !!response.data.items
        })

    const events = response.data.items || []

        // Transform events to match our interface
        const transformedEvents = events.map((event) => {
          // Debug logging for meeting link detection
          console.log('Processing event:', {
            title: event.summary,
            description: event.description,
            location: event.location,
            hasVideoLink: event.description?.includes('meet.google.com') || 
                         event.description?.includes('zoom.us') || 
                         event.description?.includes('teams.microsoft.com') ||
                         event.description?.includes('webex.com') ||
                         event.description?.includes('gotomeeting.com') ||
                         event.location?.includes('meet.google.com') ||
                         event.location?.includes('zoom.us') ||
                         event.location?.includes('teams.microsoft.com') ||
                         event.location?.includes('webex.com') ||
                         event.location?.includes('gotomeeting.com')
          })
      const start = event.start?.dateTime || event.start?.date
      const end = event.end?.dateTime || event.end?.date
      
      // Parse start time to get time string
      let timeString = 'All day'
      if (start) {
        const startDate = new Date(start)
        timeString = startDate.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        })
      }

      // Calculate duration
      let duration = 'Unknown'
      if (start && end) {
        const startDate = new Date(start)
        const endDate = new Date(end)
        const diffMs = endDate.getTime() - startDate.getTime()
        const diffMins = Math.round(diffMs / (1000 * 60))
        
        if (diffMins < 60) {
          duration = `${diffMins}m`
        } else {
          const hours = Math.floor(diffMins / 60)
          const mins = diffMins % 60
          duration = mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
        }
      }

      // Determine meeting type based on description or location
      const description = event.description || ''
      const location = event.location || ''
      const hasVideoLink = description.includes('meet.google.com') || 
                          description.includes('zoom.us') || 
                          description.includes('teams.microsoft.com') ||
                          description.includes('webex.com') ||
                          description.includes('gotomeeting.com') ||
                          location.includes('meet.google.com') ||
                          location.includes('zoom.us') ||
                          location.includes('teams.microsoft.com') ||
                          location.includes('webex.com') ||
                          location.includes('gotomeeting.com')
      
      const type = hasVideoLink ? 'video' : 'phone'

      // Get attendees count
      const attendees = event.attendees?.length || 0

      // Determine priority based on event properties
      let priority = 'MEDIUM'
      if (event.summary?.toLowerCase().includes('urgent') || 
          event.summary?.toLowerCase().includes('important')) {
        priority = 'HIGH'
      } else if (event.summary?.toLowerCase().includes('casual') ||
                 event.summary?.toLowerCase().includes('optional')) {
        priority = 'LOW'
      }

      return {
        id: event.id || Math.random().toString(),
        title: event.summary || 'Untitled Event',
        time: timeString,
        duration: duration,
        attendees: attendees,
        team: event.organizer?.displayName || 'Unknown',
        priority: priority,
        type: type,
        description: description,
        location: location,
        startTime: start,
        endTime: end,
        meetingLink: hasVideoLink ? (() => {
          const link = extractMeetingLink(description, location)
          console.log('Extracted meeting link:', { title: event.summary, link })
          return link
        })() : null
      }
    })

    return NextResponse.json({ events: transformedEvents })

  } catch (error) {
    console.error('Error fetching calendar events:', error)
    
    // Handle token refresh if needed
    if (error instanceof Error && error.message.includes('invalid_grant')) {
      return NextResponse.json({ 
        error: 'Google Calendar token expired',
        needsAuth: true 
      }, { status: 403 })
    }

    return NextResponse.json({ 
      error: 'Failed to fetch calendar events' 
    }, { status: 500 })
  }
}
