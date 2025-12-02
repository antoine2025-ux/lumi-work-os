# Slack Integration - Local Development with HTTPS

Slack requires HTTPS for OAuth redirect URLs. Here are your options for local development:

## Option 1: Use ngrok (Recommended - Easiest)

ngrok creates a secure HTTPS tunnel to your localhost.

### Setup Steps:

1. **Install ngrok**:
   ```bash
   # macOS
   brew install ngrok
   
   # Or download from https://ngrok.com/download
   ```

2. **Start your Next.js dev server**:
   ```bash
   npm run dev
   ```

3. **In a new terminal, start ngrok**:
   ```bash
   ngrok http 3000
   ```

4. **Copy the HTTPS URL** (looks like: `https://abc123.ngrok.io`)

5. **Add to Slack App Settings**:
   - Go to https://api.slack.com/apps → Your App → OAuth & Permissions
   - Under "Redirect URLs", add:
     - `https://abc123.ngrok.io/api/integrations/slack/callback`
   - Click "Save URLs"

6. **Add to your `.env.local`**:
   ```env
   SLACK_CLIENT_ID="your-client-id"
   SLACK_CLIENT_SECRET="your-client-secret"
   SLACK_REDIRECT_URI="https://abc123.ngrok.io/api/integrations/slack/callback"
   NEXTAUTH_URL="https://abc123.ngrok.io"
   ```

7. **Restart your dev server** and test!

### Note:
- The ngrok URL changes each time you restart ngrok (unless you have a paid plan)
- Update both Slack app settings and `.env.local` when the URL changes
- Free ngrok URLs are public - don't use for production data

## Option 2: Use a Development Domain with HTTPS

If you have a development domain with SSL certificate:

1. **Add to `.env.local`**:
   ```env
   SLACK_CLIENT_ID="your-client-id"
   SLACK_CLIENT_SECRET="your-client-secret"
   SLACK_REDIRECT_URI="https://dev.yourdomain.com/api/integrations/slack/callback"
   NEXTAUTH_URL="https://dev.yourdomain.com"
   ```

2. **Add redirect URL to Slack app**:
   - `https://dev.yourdomain.com/api/integrations/slack/callback`

## Option 3: Use Cloudflare Tunnel (Alternative to ngrok)

Similar to ngrok but free and more stable:

1. **Install cloudflared**:
   ```bash
   brew install cloudflared
   ```

2. **Start tunnel**:
   ```bash
   cloudflared tunnel --url http://localhost:3000
   ```

3. **Use the provided HTTPS URL** (similar to ngrok setup)

## Quick Reference

### Environment Variables for Local Dev with ngrok:

```env
# Slack Integration
SLACK_CLIENT_ID="9962468526503.10018235041922"
SLACK_CLIENT_SECRET="c1c0abb19319a47dfff7c0b356347e55"

# ngrok HTTPS URL (update when ngrok restarts)
SLACK_REDIRECT_URI="https://your-ngrok-url.ngrok.io/api/integrations/slack/callback"
NEXTAUTH_URL="https://your-ngrok-url.ngrok.io"
```

### Slack App Redirect URLs:

Add both (for flexibility):
- `https://your-ngrok-url.ngrok.io/api/integrations/slack/callback` (current ngrok URL)
- `https://your-production-domain.com/api/integrations/slack/callback` (production)

## Troubleshooting

### "Invalid redirect URI" error
- Make sure the redirect URI in Slack app settings **exactly matches** `SLACK_REDIRECT_URI` in `.env.local`
- Check for trailing slashes or typos
- Make sure you're using HTTPS (not HTTP)

### ngrok URL changed
- Update `SLACK_REDIRECT_URI` in `.env.local`
- Update redirect URL in Slack app settings
- Restart your dev server

### Still getting HTTP errors
- Make sure `SLACK_REDIRECT_URI` is set in `.env.local`
- Make sure it starts with `https://`
- Restart your dev server after changing env vars




