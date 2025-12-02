# Quick Slack Setup Guide

You have two options to connect Slack:

## Option 1: Direct Token Storage (Quick - if you already have tokens)

If you already have Slack access token and refresh token, you can store them directly:

### Using curl:

```bash
curl -X POST http://localhost:3000/api/integrations/slack \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{
    "accessToken": "xoxb-your-access-token",
    "refreshToken": "xoxe-your-refresh-token",
    "teamId": "T1234567890",
    "teamName": "Your Workspace Name"
  }'
```

### Or create a simple test script:

Create `test-slack-connect.js`:

```javascript
// Run with: node test-slack-connect.js
// Make sure you're logged in and copy your session cookie

fetch('http://localhost:3000/api/integrations/slack', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Cookie': 'your-session-cookie-here' // Copy from browser dev tools
  },
  body: JSON.stringify({
    accessToken: 'xoxb-your-access-token',
    refreshToken: 'xoxe-your-refresh-token',
    teamId: 'T1234567890', // Optional
    teamName: 'Your Workspace Name' // Optional
  })
})
.then(r => r.json())
.then(console.log)
```

## Option 2: Full OAuth Flow (Recommended for production)

This allows users to connect Slack through the UI without manual token entry.

### Step 1: Create Slack App

1. Go to https://api.slack.com/apps
2. Click "Create New App" → "From scratch"
3. Name: "Loopwell" (or your choice)
4. Select your workspace

### Step 2: Configure OAuth

1. Go to "OAuth & Permissions" in sidebar
2. Under "Redirect URLs", add:
   - `http://localhost:3000/api/integrations/slack/callback` (for dev)
   - `https://yourdomain.com/api/integrations/slack/callback` (for production)

3. Under "Bot Token Scopes", add:
   - `chat:write`
   - `channels:read`
   - `channels:history`
   - `users:read`

### Step 3: Get Credentials

1. In "Basic Information", find:
   - **Client ID** (under "App Credentials")
   - **Client Secret** (click "Show" to reveal)

2. Add to your `.env` file:

```env
SLACK_CLIENT_ID="your-client-id-here"
SLACK_CLIENT_SECRET="your-client-secret-here"
NEXTAUTH_URL="http://localhost:3000"
```

### Step 4: Restart Server

After adding env vars, restart your Next.js dev server:

```bash
# Stop the server (Ctrl+C)
# Then restart:
npm run dev
```

### Step 5: Test

1. Go to `/settings?tab=integrations`
2. Click "Connect Slack"
3. You should be redirected to Slack authorization
4. Authorize the app
5. You'll be redirected back with success message

## Which Option Should I Use?

- **Option 1 (Direct)**: If you're testing quickly and already have tokens
- **Option 2 (OAuth)**: If you want a proper user-facing integration (recommended)

## Troubleshooting

### "Slack client ID not configured"
- Make sure `SLACK_CLIENT_ID` is in `.env` (not `.env.local` or `.env.example`)
- Restart your dev server after adding env vars
- Check that there are no quotes around the values in `.env`

### "Invalid redirect URI"
- Make sure the redirect URL in Slack app settings matches exactly:
  - Development: `http://localhost:3000/api/integrations/slack/callback`
  - Production: `https://yourdomain.com/api/integrations/slack/callback`

### Environment variables not loading
- Make sure `.env` is in the project root (same level as `package.json`)
- Restart the dev server after adding env vars
- Check for typos: `SLACK_CLIENT_ID` (not `SLACK_CLIENT` or `SLACK_ID`)




