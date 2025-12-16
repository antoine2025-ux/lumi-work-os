# Google Calendar Integration

This document explains how to set up and use the Google Calendar integration for the "Today's Meetings" feature on the main dashboard.

## Setup Instructions

### 1. Google Cloud Console Setup

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Calendar API:
   - Go to "APIs & Services" > "Library"
   - Search for "Google Calendar API"
   - Click on it and press "Enable"

### 2. OAuth 2.0 Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth 2.0 Client IDs"
3. Choose "Web application" as the application type
4. Add authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google` (for development)
   - `https://yourdomain.com/api/auth/callback/google` (for production)
5. Copy the Client ID and Client Secret

### 3. Environment Variables

Add the following to your `.env` file:

```env
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

### 4. Database Migration

The integration uses NextAuth's Prisma adapter to store OAuth tokens. Make sure your database schema includes the required tables:

```sql
-- These tables should already exist from NextAuth setup
CREATE TABLE "Account" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "providerAccountId" TEXT NOT NULL,
  "refresh_token" TEXT,
  "access_token" TEXT,
  "expires_at" INTEGER,
  "token_type" TEXT,
  "scope" TEXT,
  "id_token" TEXT,
  "session_state" TEXT,
  PRIMARY KEY ("id")
);
```

## Features

### Today's Meetings Card

The meetings card displays:
- **Real-time calendar events** from Google Calendar
- **Meeting details**: title, time, duration, attendees
- **Meeting type detection**: video calls vs phone calls
- **Priority indicators**: HIGH, MEDIUM, LOW based on event properties
- **Direct meeting links**: clickable links to join video meetings
- **Refresh functionality**: manual refresh button to update events

### Authentication Flow

1. User clicks "Connect Calendar" button
2. Redirected to Google OAuth consent screen
3. User grants calendar read permissions
4. Access token stored in database
5. Calendar events fetched and displayed

### API Endpoint

The integration provides a REST API endpoint:

```
GET /api/calendar/events
```

**Response:**
```json
{
  "events": [
    {
      "id": "event-id",
      "title": "Meeting Title",
      "time": "2:00 PM",
      "duration": "1h",
      "attendees": 3,
      "team": "Engineering",
      "priority": "HIGH",
      "type": "video",
      "meetingLink": "https://meet.google.com/..."
    }
  ]
}
```

## Usage

### For Users

1. **First Time Setup:**
   - Click "Connect Calendar" button on the dashboard
   - Sign in with Google account
   - Grant calendar permissions

2. **Viewing Meetings:**
   - Meetings automatically load on dashboard
   - Click refresh button to update
   - Click "Join Meeting" links to join video calls

### For Developers

#### Custom Hook

Use the `useCalendarEvents` hook in your components:

```tsx
import { useCalendarEvents } from '@/hooks/use-calendar-events'

function MyComponent() {
  const { events, isLoading, error, needsAuth, refetch } = useCalendarEvents()
  
  if (needsAuth) {
    return <ConnectCalendarButton />
  }
  
  if (isLoading) {
    return <LoadingSpinner />
  }
  
  return (
    <div>
      {events.map(event => (
        <MeetingCard key={event.id} event={event} />
      ))}
    </div>
  )
}
```

#### Meeting Component

Use the `MeetingsCard` component:

```tsx
import { MeetingsCard } from '@/components/dashboard/meetings-card'

function Dashboard() {
  return (
    <div className="grid grid-cols-3">
      <MeetingsCard className="col-span-1" />
      {/* Other dashboard components */}
    </div>
  )
}
```

## Troubleshooting

### Common Issues

1. **"Google Calendar not connected"**
   - User needs to authenticate with Google
   - Check if OAuth credentials are correct
   - Verify redirect URI matches Google Cloud Console

2. **"Failed to fetch calendar events"**
   - Check Google Calendar API is enabled
   - Verify access token is valid
   - Check network connectivity

3. **No events showing**
   - User might not have any events today
   - Check if calendar has events
   - Verify timezone settings

### Testing

Run the test script to verify the integration:

```bash
node test-calendar.js
```

This will test the API endpoint and show the response.

## Security Considerations

- **Read-only access**: Only requests calendar read permissions
- **Token storage**: Access tokens stored securely in database
- **Scope limitation**: Limited to calendar.readonly scope
- **User consent**: Users must explicitly grant permissions

## Future Enhancements

- **Multiple calendars**: Support for multiple Google accounts
- **Event creation**: Allow creating events from the dashboard
- **Meeting preparation**: Show meeting agendas and documents
- **Time zone support**: Better timezone handling
- **Recurring events**: Handle recurring meeting series
