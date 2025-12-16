# Slack Integration - Production Quick Start

## 🚀 Quick Checklist

### 1. Update Slack App (5 minutes)

Go to **https://api.slack.com/apps** → Your App → **OAuth & Permissions** → **Redirect URLs**

**Add:**
```
https://your-production-domain.com/api/integrations/slack/callback
```

**Keep or remove:**
```
https://nonargentiferous-emelia-sufferingly.ngrok-free.dev/api/integrations/slack/callback
```
(Keep for dev, remove if done with local testing)

Click **"Save URLs"**

### 2. Set Production Environment Variables

In your hosting platform (Vercel, Railway, etc.), add:

```env
SLACK_CLIENT_ID=9962468526503.10018235041922
SLACK_CLIENT_SECRET=c1c0abb19319a47dfff7c0b356347e55
NEXTAUTH_URL=https://your-production-domain.com
```

**Important:**
- ✅ Use `https://` (not `http://`)
- ✅ No trailing slash
- ❌ **Do NOT set `SLACK_REDIRECT_URI`** - it will auto-use `NEXTAUTH_URL`

### 3. Deploy

Push to production branch or deploy via your platform.

### 4. Test

1. Go to: `https://your-production-domain.com/settings?tab=integrations`
2. Click "Connect Slack"
3. Authorize
4. Should redirect back to production (not localhost/ngrok)

## ✅ That's It!

The code automatically handles production - no changes needed. Just configure the environment variables and Slack app redirect URL.

## 🔍 How Redirect URI Works

**Production:**
- If `SLACK_REDIRECT_URI` is NOT set → Uses: `${NEXTAUTH_URL}/api/integrations/slack/callback`
- If `SLACK_REDIRECT_URI` IS set → Uses that value

**So for production, just set `NEXTAUTH_URL` and you're done!**

## 📝 Example

If your production domain is `app.loopwell.io`:

**Environment Variables:**
```env
NEXTAUTH_URL=https://app.loopwell.io
SLACK_CLIENT_ID=9962468526503.10018235041922
SLACK_CLIENT_SECRET=c1c0abb19319a47dfff7c0b356347e55
```

**Slack App Redirect URL:**
```
https://app.loopwell.io/api/integrations/slack/callback
```

That's it! 🎉
