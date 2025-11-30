# Slack Integration - Verification & Testing Guide

## ✅ Verify Connection

### Method 1: Check Settings Page

1. Go to: `http://localhost:3000/settings?tab=integrations`
2. Look at the **Slack card**:
   - ✅ **"Connected"** badge = Success!
   - ✅ **Team name** displayed = Working!
   - ❌ **"Not Connected"** = Need to reconnect

### Method 2: Check API Directly

Open browser console and run:
```javascript
fetch('/api/integrations/slack')
  .then(r => r.json())
  .then(console.log)
```

Should show:
```json
{
  "connected": true,
  "teamName": "Your Slack Workspace",
  "teamId": "T1234567890",
  "hasAccessToken": true,
  "hasRefreshToken": true
}
```

## 🧪 Test Through Loopbrain Assistant

### How It Works

I've integrated Slack into Loopbrain! Now when you ask Loopbrain to send messages to Slack, it can do it automatically.

### Test Queries

Try asking Loopbrain these questions:

1. **Simple message:**
   ```
   "Send a message to #general saying 'Hello from Loopwell!'"
   ```

2. **Project update:**
   ```
   "Notify the team in Slack that the project is complete"
   ```

3. **Task notification:**
   ```
   "Send a Slack message to #updates about the new feature we just launched"
   ```

### How Loopbrain Sends Messages

Loopbrain will:
1. Detect your request mentions Slack
2. Parse the channel and message
3. Automatically send it via the Slack integration
4. Confirm in the response

### Example Flow

**You ask:**
> "Send a message to #general saying 'Project Alpha is complete!'"

**Loopbrain will:**
1. Understand you want to send to Slack
2. Extract channel: `#general`
3. Extract message: `Project Alpha is complete!`
4. Send via Slack API
5. Respond: "✅ Message sent to #general in Slack!"

## 📋 Current Integration Status

### What's Integrated

✅ **Slack Helper Functions** (`src/lib/loopbrain/slack-helper.ts`)
- `loopbrainSendSlackMessage()` - Send messages
- `isSlackAvailable()` - Check if Slack is connected

✅ **Orchestrator Integration** (`src/lib/loopbrain/orchestrator.ts`)
- Checks Slack availability before processing
- Includes Slack info in prompts
- Parses and executes Slack actions from LLM responses
- Adds "Send to Slack" suggestion when available

### How to Test Right Now

1. **Open Loopbrain Assistant** (click the AI button in bottom-right)
2. **Try a Slack query:**
   ```
   "Can you send a test message to #general saying 'Hello from Loopbrain!'?"
   ```
3. **Check your Slack workspace** - you should see the message!

## 🔍 Troubleshooting

### "Slack integration not configured"
- Go to Settings → Integrations
- Make sure Slack shows "Connected"
- If not, click "Connect Slack" again

### "Failed to send message"
- Check server logs for error details
- Verify bot has `chat:write` scope in Slack app
- Make sure the channel exists and bot is in it

### Message not appearing in Slack
- Check if bot is added to the channel
- Verify channel name is correct (include # for public channels)
- Check Slack app logs in Slack workspace

## 🎯 Next Steps

Once verified, you can:
- Ask Loopbrain to send project updates to Slack
- Have Loopbrain notify teams about task completions
- Automate Slack notifications based on workspace activity

Try it out and let me know if it works! 🚀


