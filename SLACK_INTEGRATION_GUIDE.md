# Slack Integration Guide

This guide explains how to set up and use the Slack integration in Loopwell, allowing Loopbrain to send messages and notifications to Slack.

## Overview

The Slack integration allows:
- **Loopbrain** to send messages to Slack channels or DMs
- **Automatic token refresh** when access tokens expire
- **Workspace-scoped** integration (each workspace has its own Slack connection)
- **Secure credential storage** in the database

## Setup

### 1. Environment Variables

Add these to your `.env` file (for OAuth token refresh):

```env
SLACK_CLIENT_ID=your-slack-client-id
SLACK_CLIENT_SECRET=your-slack-client-secret
```

**Note:** These are only needed if you want to use the automatic token refresh feature. If you're manually managing tokens, you can skip this.

### 2. Store Slack Credentials

Once you have the access token and refresh token from Slack OAuth, store them via the API:

```bash
POST /api/integrations/slack
Content-Type: application/json
Authorization: Bearer <your-auth-token>

{
  "accessToken": "xoxb-your-access-token",
  "refreshToken": "xoxe-your-refresh-token",
  "expiresAt": 1234567890,  // Optional: Unix timestamp
  "teamId": "T1234567890",  // Optional: Slack team ID
  "teamName": "My Workspace", // Optional: Team name
  "botUserId": "U1234567890", // Optional: Bot user ID
  "scopes": ["chat:write", "channels:read"] // Optional: Granted scopes
}
```

**Required fields:**
- `accessToken`: Your Slack bot access token (starts with `xoxb-`)
- `refreshToken`: Your Slack refresh token (starts with `xoxe-`)

**Optional fields:**
- `expiresAt`: Unix timestamp when the access token expires
- `teamId`: Slack team/workspace ID
- `teamName`: Human-readable team name
- `botUserId`: Bot user ID
- `scopes`: Array of granted OAuth scopes

### 3. Check Integration Status

```bash
GET /api/integrations/slack
Authorization: Bearer <your-auth-token>
```

Response:
```json
{
  "connected": true,
  "teamId": "T1234567890",
  "teamName": "My Workspace",
  "lastSyncAt": "2024-01-01T00:00:00Z",
  "hasAccessToken": true,
  "hasRefreshToken": true
}
```

## Usage

### Send a Message via API

```bash
POST /api/integrations/slack/send
Content-Type: application/json
Authorization: Bearer <your-auth-token>

{
  "channel": "#general",  // or channel ID like "C1234567890"
  "text": "Hello from Loopwell!",
  "threadTs": "1234567890.123456"  // Optional: reply to thread
}
```

Response:
```json
{
  "success": true,
  "ts": "1234567890.123456",
  "message": "Message sent successfully"
}
```

### Get Available Channels

```bash
GET /api/integrations/slack/channels
Authorization: Bearer <your-auth-token>
```

Response:
```json
{
  "channels": [
    { "id": "C1234567890", "name": "general" },
    { "id": "C0987654321", "name": "random" }
  ]
}
```

## Loopbrain Integration

Loopbrain can automatically send Slack messages when:
- User requests it (e.g., "Send a message to #general about the project status")
- Loopbrain decides to send notifications (e.g., task completion, project updates)

### Using in Loopbrain Orchestrator

The Slack helper is available in the Loopbrain orchestrator:

```typescript
import { loopbrainSendSlackMessage, isSlackAvailable } from '@/lib/loopbrain/slack-helper'

// Check if Slack is available
const slackAvailable = await isSlackAvailable(workspaceId)

if (slackAvailable) {
  // Send a message
  const result = await loopbrainSendSlackMessage({
    workspaceId,
    channel: '#general',
    text: 'Project status update: All tasks completed!'
  })
  
  if (result.success) {
    console.log('Message sent:', result.ts)
  }
}
```

### Example: Loopbrain Suggestion

When Loopbrain generates a suggestion like "Send update to Slack", you can:

1. Detect the suggestion in the frontend
2. Call the Slack send API with the message content
3. Or let Loopbrain handle it automatically in the orchestrator

## Token Refresh

The integration automatically refreshes access tokens when they expire:

1. When `expiresAt` is reached (with 5-minute buffer)
2. When a Slack API call returns an authentication error
3. Uses the refresh token to get a new access token
4. Updates the stored credentials automatically

**Note:** Make sure `SLACK_CLIENT_ID` and `SLACK_CLIENT_SECRET` are set for token refresh to work.

## Deactivate Integration

```bash
DELETE /api/integrations/slack
Authorization: Bearer <your-auth-token>
```

This deactivates the integration but doesn't delete the credentials (so you can reactivate later).

## Security

- **Workspace scoping**: Each workspace has its own Slack integration
- **Role-based access**: Only ADMIN/OWNER can configure integrations
- **Token encryption**: Consider encrypting tokens at rest (future enhancement)
- **Secure storage**: Tokens are stored in the database `integrations` table

## Next Steps

1. **Store your credentials** using the POST endpoint above
2. **Test sending a message** to verify the integration works
3. **Integrate with Loopbrain** to enable automatic Slack notifications
4. **Set up webhooks** (future) to receive Slack events in Loopwell

## Troubleshooting

### "Slack integration not found"
- Make sure you've stored the credentials via POST `/api/integrations/slack`
- Check that `isActive: true` in the database

### "Token refresh failed"
- Verify `SLACK_CLIENT_ID` and `SLACK_CLIENT_SECRET` are set
- Check that the refresh token is still valid
- Re-authenticate with Slack if needed

### "Failed to send message"
- Check that the bot has `chat:write` scope
- Verify the channel ID/name is correct
- Ensure the bot is a member of the channel (for private channels)


