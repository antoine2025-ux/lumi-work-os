# Fix Slack Redirect URLs

## Current Issues

1. ❌ **Incorrect localhost URL**: `https://localhost:3000/api/integrations/slack/callback`
   - Problem: localhost can't use HTTPS
   - Solution: Remove this URL (we use ngrok for OAuth)

2. ⚠️ **Truncated ngrok URL**: `https://nonargentiferous-emelia-sufferingly.ngrok-free.dev/api/in`
   - Problem: URL is cut off
   - Solution: Make sure it's the complete URL

## Correct Redirect URL

The **only** redirect URL you need (for development):

```
https://nonargentiferous-emelia-sufferingly.ngrok-free.dev/api/integrations/slack/callback
```

## Steps to Fix

1. **Delete the incorrect localhost URL**:
   - Click the trash icon next to `https://localhost:3000/api/integrations/slack/callback`
   - Confirm deletion

2. **Fix the ngrok URL**:
   - Click the edit icon (pencil) next to the truncated ngrok URL
   - Make sure it's exactly:
     ```
     https://nonargentiferous-emelia-sufferingly.ngrok-free.dev/api/integrations/slack/callback
     ```
   - Click "Save" or "Update"

3. **If the ngrok URL doesn't exist, add it**:
   - Click "Add New Redirect URL"
   - Enter: `https://nonargentiferous-emelia-sufferingly.ngrok-free.dev/api/integrations/slack/callback`
   - Click "Add"

4. **Click "Save URLs"** at the bottom

## Next Steps

After fixing redirect URLs:

1. **Add Bot User** (if not done):
   - Go to "Bot Users" in sidebar
   - Add bot user

2. **Configure Bot Token Scopes**:
   - In "OAuth & Permissions", scroll to "Bot Token Scopes"
   - Add: `chat:write`, `channels:read`, `channels:history`, `users:read`

3. **Test the connection**:
   - Go to Loopwell settings
   - Click "Connect Slack"




