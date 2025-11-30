# ngrok Setup for Slack Integration

## Step 1: Get Your Authtoken

1. Go to **https://dashboard.ngrok.com/get-started/your-authtoken**
2. Sign up or log in (it's free)
3. Copy your authtoken (looks like: `2abc123def456ghi789jkl012mno345pq_6rst7uvw8xyz9`)

## Step 2: Configure ngrok

Run this command (replace with your actual authtoken):

```bash
ngrok config add-authtoken YOUR_AUTHTOKEN_HERE
```

For example:
```bash
ngrok config add-authtoken 2abc123def456ghi789jkl012mno345pq_6rst7uvw8xyz9
```

## Step 3: Start ngrok

Once configured, start ngrok:

```bash
ngrok http 3000
```

You'll see output like:
```
Forwarding   https://abc123.ngrok.io -> http://localhost:3000
```

Copy the HTTPS URL (the one starting with `https://`).

## Step 4: Configure Slack

1. Go to https://api.slack.com/apps → Your App → OAuth & Permissions
2. Under "Redirect URLs", add:
   - `https://abc123.ngrok.io/api/integrations/slack/callback`
   - (Replace `abc123.ngrok.io` with your actual ngrok URL)
3. Click "Save URLs"

## Step 5: Update Environment Variables

Add to your `.env.local`:

```env
SLACK_CLIENT_ID="9962468526503.10018235041922"
SLACK_CLIENT_SECRET="c1c0abb19319a47dfff7c0b356347e55"
SLACK_REDIRECT_URI="https://abc123.ngrok.io/api/integrations/slack/callback"
NEXTAUTH_URL="https://abc123.ngrok.io"
```

(Replace `abc123.ngrok.io` with your actual ngrok URL)

## Step 6: Restart Dev Server

```bash
# Stop your dev server (Ctrl+C)
npm run dev
```

## Step 7: Test

1. Go to `https://abc123.ngrok.io/settings?tab=integrations`
2. Click "Connect Slack"
3. You should be redirected to Slack authorization!

## Important Notes

- **Free ngrok URLs change** each time you restart ngrok
- When the URL changes, update:
  1. Slack app redirect URL
  2. `SLACK_REDIRECT_URI` in `.env.local`
  3. `NEXTAUTH_URL` in `.env.local`
- **Paid ngrok plans** offer static domains (optional)

## Alternative: Use Cloudflare Tunnel (Free & Stable)

If you want a more stable URL, use Cloudflare Tunnel:

```bash
# Install
brew install cloudflared

# Start tunnel
cloudflared tunnel --url http://localhost:3000
```

This gives you a stable HTTPS URL that doesn't change as often.


