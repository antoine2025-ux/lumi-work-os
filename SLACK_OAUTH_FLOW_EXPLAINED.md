# Slack OAuth Flow - Expected Behavior

## Normal Flow (What Should Happen)

1. **User clicks "Connect Slack"** on `http://localhost:3000/settings?tab=integrations`
2. **Browser makes request** to `http://localhost:3000/api/integrations/slack/connect`
3. **Server redirects directly to Slack** with ngrok callback URL:
   - `https://slack.com/oauth/v2/authorize?...&redirect_uri=https://nonargentiferous-emelia-sufferingly.ngrok-free.dev/api/integrations/slack/callback`
4. **User authorizes on Slack**
5. **Slack redirects to ngrok callback**: `https://nonargentiferous-emelia-sufferingly.ngrok-free.dev/api/integrations/slack/callback?code=...`
6. **Server exchanges code for tokens** and stores them
7. **Server redirects to**: `https://nonargentiferous-emelia-sufferingly.ngrok-free.dev/settings?tab=integrations&success=slack_connected`

## If You See Double OAuth

If you're seeing OAuth start on localhost then redirect to ngrok, it might be because:

### Scenario 1: Not Logged In
- You click "Connect Slack" but aren't authenticated
- NextAuth redirects you to Google OAuth (which uses ngrok)
- After Google OAuth, you're redirected back
- Then Slack OAuth starts

**Solution**: Make sure you're logged in before clicking "Connect Slack"

### Scenario 2: Browser Address Bar Shows Localhost Briefly
- This is normal - the browser might show localhost in the address bar for a split second before redirecting to Slack
- The actual OAuth flow should go directly to Slack

**Solution**: This is expected behavior, not a problem

### Scenario 3: NextAuth Intercepting
- If NextAuth middleware is intercepting the request
- But our middleware excludes `/api` routes, so this shouldn't happen

## How to Verify It's Working Correctly

1. **Check the redirect URL**:
   - Open browser DevTools → Network tab
   - Click "Connect Slack"
   - Look for the redirect to `slack.com/oauth/v2/authorize`
   - Check the `redirect_uri` parameter - it should be the ngrok URL

2. **Check server logs**:
   - Look for: `Initiating Slack OAuth` log
   - It should show `redirectUri` as the ngrok URL

3. **Verify environment variables**:
   ```bash
   grep SLACK_REDIRECT_URI .env.local
   # Should show: SLACK_REDIRECT_URI="https://nonargentiferous-emelia-sufferingly.ngrok-free.dev/api/integrations/slack/callback"
   ```

## Current Configuration

After the fix:
- ✅ Removed duplicate `NEXTAUTH_URL` (only ngrok URL remains)
- ✅ `SLACK_REDIRECT_URI` is set to ngrok URL
- ✅ Callback redirects use `request.url` (which will be ngrok URL)

## Next Steps

1. **Restart your dev server** to pick up the cleaned `.env.local`:
   ```bash
   # Stop server (Ctrl+C)
   npm run dev
   ```

2. **Test the flow**:
   - Make sure you're logged in
   - Go to `http://localhost:3000/settings?tab=integrations`
   - Click "Connect Slack"
   - It should redirect directly to Slack (not through another OAuth)

3. **If you still see double OAuth**:
   - Check browser console for errors
   - Check server logs for the `Initiating Slack OAuth` message
   - Verify the `redirectUri` in the logs is the ngrok URL






