# Slack Integration - User Setup Guide

This guide explains how end users can connect their Slack workspace to Loopwell.

## For End Users

### Step 1: Go to Settings

1. Navigate to **Settings** (click the Settings icon in the header)
2. Click on the **Integrations** tab

### Step 2: Connect Slack

1. Find the **Slack** card in the integrations list
2. Click the **"Connect Slack"** button
3. You'll be redirected to Slack's authorization page
4. Select the Slack workspace you want to connect
5. Review the permissions (chat:write, channels:read, etc.)
6. Click **"Allow"** to authorize

### Step 3: Confirmation

- You'll be redirected back to Loopwell
- The Slack card will show **"Connected"** status
- Your Slack workspace name will be displayed
- You can now use Loopbrain to send messages to Slack!

## For Administrators

### Prerequisites

Before users can connect Slack, you need to set up a Slack App:

1. **Create a Slack App**:
   - Go to https://api.slack.com/apps
   - Click "Create New App" → "From scratch"
   - Name your app (e.g., "Loopwell")
   - Select your workspace

2. **Configure OAuth & Permissions**:
   - Go to "OAuth & Permissions" in the sidebar
   - Add the following **Bot Token Scopes**:
     - `chat:write` - Send messages
     - `channels:read` - List channels
     - `channels:history` - Read channel history
     - `users:read` - Read user information
   
   - Add **Redirect URL**:
     - Development: `http://localhost:3000/api/integrations/slack/callback`
     - Production: `https://yourdomain.com/api/integrations/slack/callback`

3. **Get Credentials**:
   - Copy your **Client ID** and **Client Secret**
   - Add them to your `.env` file:
     ```env
     SLACK_CLIENT_ID="your-client-id"
     SLACK_CLIENT_SECRET="your-client-secret"
     ```

4. **Install App to Workspace** (Optional):
   - You can install the app to your workspace for testing
   - Or let users install it when they connect

### Environment Variables

Add to `.env`:

```env
SLACK_CLIENT_ID="your-slack-client-id"
SLACK_CLIENT_SECRET="your-slack-client-secret"
NEXTAUTH_URL="http://localhost:3000"  # or your production URL
```

## How It Works

1. **User clicks "Connect Slack"** → Redirects to `/api/integrations/slack/connect`
2. **OAuth initiation** → User is sent to Slack's authorization page
3. **User authorizes** → Slack redirects back with authorization code
4. **Token exchange** → Backend exchanges code for access/refresh tokens
5. **Storage** → Tokens stored securely in database (workspace-scoped)
6. **Ready to use** → Loopbrain can now send messages!

## Features

- ✅ **Workspace-scoped**: Each workspace has its own Slack connection
- ✅ **Automatic token refresh**: Tokens refresh automatically when expired
- ✅ **Secure storage**: Credentials stored in database with workspace isolation
- ✅ **Role-based access**: Only ADMIN/OWNER can connect/disconnect
- ✅ **Loopbrain integration**: AI can send messages automatically

## Disconnecting

To disconnect Slack:

1. Go to **Settings** → **Integrations**
2. Find the **Slack** card
3. Click **"Disconnect"**
4. Confirm the action

This deactivates the integration but keeps the credentials (so you can reconnect later).

## Troubleshooting

### "Slack client ID not configured"
- Make sure `SLACK_CLIENT_ID` and `SLACK_CLIENT_SECRET` are set in `.env`
- Restart your development server after adding env vars

### "Failed to exchange token"
- Check that your redirect URL matches exactly in Slack app settings
- Verify your Client ID and Secret are correct
- Make sure the app is installed to the workspace

### "Unauthorized" error
- Only ADMIN/OWNER roles can connect integrations
- Check your user role in the workspace

## Next Steps

Once connected, you can:
- Ask Loopbrain to "Send a message to #general about the project status"
- Set up automatic notifications for task completions
- Integrate Slack with workflows (coming soon)


