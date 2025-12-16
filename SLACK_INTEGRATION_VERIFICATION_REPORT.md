# Slack Integration Verification Report

## 🔍 Issues Found

### Critical Issues (Must Fix)

1. **❌ SLACK_CLIENT_ID is not set in environment variables**
   - **Impact**: OAuth flow cannot be initiated
   - **Location**: `.env` or `.env.local` file
   - **Fix**: Add `SLACK_CLIENT_ID` with your Slack app's Client ID

2. **❌ SLACK_CLIENT_SECRET is not set in environment variables**
   - **Impact**: Cannot exchange OAuth code for tokens
   - **Location**: `.env` or `.env.local` file
   - **Fix**: Add `SLACK_CLIENT_SECRET` with your Slack app's Client Secret

3. **❌ No Slack integration records found in database**
   - **Impact**: No workspace has connected Slack yet
   - **Status**: Expected if OAuth hasn't been completed
   - **Fix**: Complete OAuth flow after fixing environment variables

## 📋 How to Fix

### Step 1: Get Slack App Credentials

1. Go to **https://api.slack.com/apps**
2. Select your app (or create a new one)
3. Go to **"OAuth & Permissions"** in the sidebar
4. Find **"App Credentials"** section:
   - **Client ID**: Copy this value (starts with numbers, e.g., `123456.789012`)
   - **Client Secret**: Click "Show" and copy the secret

### Step 2: Configure Redirect URL in Slack App

1. Still in **"OAuth & Permissions"**, scroll to **"Redirect URLs"**
2. Add the redirect URL:
   - **Development**: `http://localhost:3000/api/integrations/slack/callback`
   - **Production**: `https://yourdomain.com/api/integrations/slack/callback`
   - **If using ngrok**: `https://your-ngrok-url.ngrok-free.dev/api/integrations/slack/callback`
3. Click **"Save URLs"**

### Step 3: Set Bot Token Scopes

Still in **"OAuth & Permissions"**, scroll to **"Bot Token Scopes"** and add:
- ✅ `chat:write` - Send messages to channels
- ✅ `channels:read` - List public channels
- ✅ `channels:history` - Read channel history
- ✅ `users:read` - Read user information

### Step 4: Add Environment Variables

Add to your `.env` or `.env.local` file:

```env
SLACK_CLIENT_ID="your-client-id-here"
SLACK_CLIENT_SECRET="your-client-secret-here"
```

**Important Notes:**
- If using `.env.local`, it takes precedence over `.env`
- **Restart your dev server** after adding environment variables
- Never commit `.env.local` to git (it should be in `.gitignore`)

### Step 5: Verify Configuration

Run the verification script:

```bash
node scripts/verify-slack-integration.js
```

You should see:
- ✅ SLACK_CLIENT_ID: Set
- ✅ SLACK_CLIENT_SECRET: Set
- ⚠️ No Slack integration records (this is OK until you connect)

### Step 6: Test the Connection

1. Start your dev server: `npm run dev`
2. Go to: `http://localhost:3000/settings?tab=integrations`
3. Click **"Connect Slack"**
4. Authorize the app in Slack
5. You should be redirected back with a success message

## 🔧 Additional Configuration

### Custom Redirect URI (Optional)

If you're using ngrok or a custom domain, you can set:

```env
SLACK_REDIRECT_URI="https://your-custom-url.com/api/integrations/slack/callback"
```

If not set, it defaults to: `${NEXTAUTH_URL}/api/integrations/slack/callback`

### Testing API Access

After connecting, test API access with a workspace ID:

```bash
node scripts/verify-slack-integration.js <workspace-id>
```

This will:
- ✅ Test token validity
- ✅ Test channel listing
- ✅ Show team information

## 🐛 Common Issues

### Issue: "Slack integration is not configured"

**Cause**: Environment variables not set or server not restarted

**Fix**:
1. Verify `.env` or `.env.local` has `SLACK_CLIENT_ID` and `SLACK_CLIENT_SECRET`
2. Restart your dev server
3. Check that variables are loaded: `node scripts/verify-slack-integration.js`

### Issue: "invalid_redirect_uri" error

**Cause**: Redirect URL in Slack app doesn't match what's configured

**Fix**:
1. Check the redirect URL in your Slack app settings
2. It must match exactly (including http vs https, port, path)
3. For localhost, use `http://` not `https://`
4. No trailing slashes

### Issue: OAuth redirects but no integration saved

**Cause**: Database error or workspace context issue

**Fix**:
1. Check server logs for errors
2. Verify database connection
3. Check that workspace ID is valid
4. Run verification script to see database state

### Issue: Token expires quickly

**Cause**: Tokens expire after a certain time

**Fix**:
- The integration automatically refreshes tokens
- Make sure `SLACK_CLIENT_ID` and `SLACK_CLIENT_SECRET` are set for refresh to work
- If refresh fails, reconnect the integration

## 📊 Current Status

Based on the verification:

- ❌ **Environment Variables**: Not configured
- ❌ **Database Integrations**: None found
- ✅ **Code Implementation**: All routes and services are implemented correctly
- ✅ **OAuth Flow**: Code is correct, just needs credentials

## ✅ Next Steps

1. **Add environment variables** (Step 4 above)
2. **Restart dev server**
3. **Test connection** (Step 6 above)
4. **Verify with script**: `node scripts/verify-slack-integration.js <workspace-id>`

## 📝 Verification Script

The verification script (`scripts/verify-slack-integration.js`) checks:

- ✅ Environment variables (SLACK_CLIENT_ID, SLACK_CLIENT_SECRET)
- ✅ Database integration records
- ✅ OAuth redirect URI configuration
- ✅ Token validity (if workspace ID provided)
- ✅ API access (if workspace ID provided)

Run it anytime to check the integration status:

```bash
# Check all workspaces
node scripts/verify-slack-integration.js

# Check specific workspace
node scripts/verify-slack-integration.js <workspace-id>
```
