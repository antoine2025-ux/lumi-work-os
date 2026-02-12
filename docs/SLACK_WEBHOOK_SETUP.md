# Slack Bidirectional Integration Setup

This guide walks you through configuring your Slack app to receive events and button clicks.

## Prerequisites

- Existing Slack app with OAuth configured
- Admin access to the Slack app at https://api.slack.com/apps
- Deployed webhook endpoint (production or ngrok for local testing)

## Step 1: Configure Event Subscriptions

Event subscriptions allow your app to receive real-time notifications when events happen in Slack (messages, mentions, etc.).

1. Go to https://api.slack.com/apps/YOUR_APP_ID/event-subscriptions
2. **Enable Events**: Toggle "Enable Events" to ON
3. **Request URL**: Enter your webhook endpoint
   - Production: `https://your-domain.com/api/integrations/slack/webhook`
   - Local testing: `https://your-ngrok-url.ngrok.io/api/integrations/slack/webhook`
4. **URL Verification**: Slack will send a challenge request. Your endpoint will respond automatically.
5. **Subscribe to bot events**:
   - Click "Subscribe to bot events"
   - Add these events:
     - `message.im` - Direct messages to your bot
     - `app_mention` - When your bot is @mentioned
6. **Save Changes**: Click "Save Changes" at the bottom

## Step 2: Configure Interactive Components

Interactive components allow your app to receive button clicks, menu selections, and other interactive actions.

1. Go to https://api.slack.com/apps/YOUR_APP_ID/interactive-messages
2. **Enable Interactivity**: Toggle ON
3. **Request URL**: Enter the SAME webhook endpoint
   - `https://your-domain.com/api/integrations/slack/webhook`
   - Must be the same URL as event subscriptions
4. **Save Changes**

## Step 3: Update OAuth Scopes

Your app needs additional permissions to handle events properly.

### Current Scopes
- `chat:write` - Send messages
- `channels:read` - List channels
- `channels:history` - Read channel messages
- `users:read` - Get user information

### Add These Scopes

1. Go to https://api.slack.com/apps/YOUR_APP_ID/oauth
2. Scroll to "Scopes" → "Bot Token Scopes"
3. Click "Add an OAuth Scope" and add:
   - `im:history` - Read direct messages (for conversation context)
   - `app_mentions:read` - Detect when your bot is mentioned

### Important: Reinstall App

After adding new scopes, you MUST reinstall the app:
1. At the top of the OAuth page, you'll see a yellow banner
2. Click "reinstall your app" or go to "Install App"
3. Click "Reinstall to Workspace"
4. Review and approve the new permissions

## Step 4: Test the Webhook

### Local Testing with ngrok

If testing locally, you need ngrok to expose your local server:

```bash
# Start your dev server
npm run dev

# In another terminal, start ngrok
ngrok http 3000

# Use the ngrok URL in Slack app config
# Example: https://abc123.ngrok.io/api/integrations/slack/webhook
```

### Verify Webhook is Working

1. Check your server logs for:
   ```
   [Slack Webhook] URL verification challenge
   ```

2. In Slack app dashboard, the Request URL should show:
   - ✅ Verified

3. If you see errors:
   - Check server logs for details
   - Ensure endpoint is publicly accessible
   - Verify ngrok is running (for local testing)

## Step 5: Test Interactive Messages

### Using the Test Endpoint

1. **Get your Slack user ID**:
   - Open Slack
   - Click your profile → More → Copy member ID
   - Example: `U0123456789`

2. **Send test message**:
   ```bash
   curl -X POST "http://localhost:3000/api/integrations/slack/test-interactive?slackUserId=U0123456789" \
     -H "Cookie: your-auth-cookie"
   ```

3. **Check Slack**:
   - You should receive a DM from your bot
   - Message contains "Approve" and "Deny" buttons

4. **Click a button**:
   - Server logs should show:
     ```
     [Slack Webhook] Received event
     [Slack Interactive] Button click
     [Slack Interactive] Processing time off approval
     ```

5. **Verify database**:
   ```sql
   SELECT * FROM loopbrain_pending_actions 
   WHERE status = 'COMPLETED' 
   ORDER BY created_at DESC 
   LIMIT 1;
   ```

## Troubleshooting

### Webhook Not Receiving Events

**Problem**: No events showing in logs after configuring

**Solutions**:
- Verify Request URL is "Verified" in Slack dashboard
- Check server is running and accessible
- For ngrok: Ensure tunnel hasn't expired (free tier has 2-hour limit)
- Check firewall rules aren't blocking Slack's IP ranges

### Button Clicks Not Working

**Problem**: Clicking buttons does nothing

**Solutions**:
- Check Interactive Components is enabled
- Verify Request URL matches Event Subscriptions URL
- Check server logs for errors
- Ensure pending action was created (check database)

### "Slack not connected" Error

**Problem**: Test endpoint returns this error

**Solutions**:
- Complete OAuth flow first: `/api/integrations/slack/connect`
- Check `integrations` table has active Slack integration
- Verify access token hasn't expired

### Missing Permissions

**Problem**: Slack returns "missing_scope" error

**Solutions**:
- Add required OAuth scopes (see Step 3)
- Reinstall app after adding scopes
- Check Slack app dashboard shows all scopes

## Architecture Overview

```
Slack User Action → Slack API → Webhook Handler → Database
                                       ↓
                              Route to Action Handler
                                       ↓
                              Execute Business Logic
                                       ↓
                              Update Pending Action
```

### Event Flow

1. **User clicks button in Slack**
2. **Slack sends POST to webhook** with payload containing:
   - `message.ts` - Message timestamp (unique ID)
   - `user.id` - Slack user who clicked
   - `actions[0].value` - Button value ("approve" or "deny")
3. **Webhook handler**:
   - Parses payload
   - Looks up `LoopbrainPendingAction` by `slackMessageTs`
   - Routes to appropriate handler
4. **Action handler**:
   - Executes business logic (e.g., approve time off)
   - Updates pending action to COMPLETED
5. **Response sent to Slack**
   - HTTP 200 OK (Slack requires response within 3 seconds)

## Security Considerations

### Request Verification (Optional but Recommended)

Slack signs all requests. You can verify authenticity:

```typescript
import crypto from 'crypto'

function verifySlackRequest(request: NextRequest): boolean {
  const timestamp = request.headers.get('x-slack-request-timestamp')
  const signature = request.headers.get('x-slack-signature')
  const body = await request.text()
  
  // Check timestamp is recent (prevents replay attacks)
  const now = Math.floor(Date.now() / 1000)
  if (Math.abs(now - parseInt(timestamp)) > 60 * 5) {
    return false
  }
  
  // Verify signature
  const sigBasestring = `v0:${timestamp}:${body}`
  const mySignature = 'v0=' + crypto
    .createHmac('sha256', process.env.SLACK_SIGNING_SECRET!)
    .update(sigBasestring)
    .digest('hex')
  
  return crypto.timingSafeEqual(
    Buffer.from(mySignature),
    Buffer.from(signature)
  )
}
```

### Environment Variables

Required:
- `SLACK_CLIENT_ID` - From Slack app dashboard
- `SLACK_CLIENT_SECRET` - From Slack app dashboard
- `SLACK_SIGNING_SECRET` - For request verification (optional)

## Production Checklist

Before deploying to production:

- [ ] Webhook endpoint is publicly accessible
- [ ] SSL certificate is valid (required by Slack)
- [ ] All OAuth scopes are configured
- [ ] Event subscriptions are enabled
- [ ] Interactive components are enabled
- [ ] Request URL is verified in Slack dashboard
- [ ] App is reinstalled after scope changes
- [ ] Test message sends successfully
- [ ] Button clicks are processed correctly
- [ ] Database records pending actions
- [ ] Completed actions are marked properly
- [ ] Error handling is robust
- [ ] Logging is comprehensive
- [ ] Request verification is enabled (recommended)

## Next Steps

With bidirectional integration complete, you can now:

1. **Send approval requests to managers via Slack**
2. **Receive button click events from Slack**
3. **Track pending actions in database**
4. **Execute business logic based on responses**

This foundation enables Week 3 features:
- Natural language commands via DMs
- Proactive notifications for blockers
- Conversational approval workflows
- Smart routing of questions
- Thread-based conversation state

## Resources

- [Slack Events API](https://api.slack.com/events-api)
- [Slack Interactive Messages](https://api.slack.com/interactivity)
- [Slack Block Kit](https://api.slack.com/block-kit)
- [Request Verification](https://api.slack.com/authentication/verifying-requests-from-slack)
