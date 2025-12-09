# Slack Integration - Quick Start Guide

## 🎯 What You Need to Know

### The Short Answer

**You need ONE set of Slack credentials (Client ID + Secret) that ALL workspaces will use.**

Each workspace will get their OWN tokens when they connect, but they all use YOUR app credentials to initiate the connection.

### Architecture in 30 Seconds

```
┌─────────────────────────────────────────┐
│  Your .env file (ONE set for everyone) │
│  SLACK_CLIENT_ID="123456.789012"        │
│  SLACK_CLIENT_SECRET="abc123..."        │
└─────────────────────────────────────────┘
                    │
                    │ Used by all workspaces
                    │ to start OAuth
                    ▼
┌─────────────────────────────────────────┐
│  Database (separate tokens per workspace)│
│  Workspace A: tokens for their Slack    │
│  Workspace B: tokens for their Slack    │
│  Workspace C: tokens for their Slack    │
└─────────────────────────────────────────┘
```

## 📋 Setup Checklist

### Step 1: Create Slack App (5 minutes)

1. Go to **https://api.slack.com/apps**
2. Click **"Create New App"** → **"From scratch"**
3. Name it "Loopwell" and select a workspace
4. Click **"Create App"**

### Step 2: Configure OAuth (2 minutes)

1. Click **"OAuth & Permissions"** in sidebar
2. Under **"Redirect URLs"**, add:
   - `http://localhost:3000/api/integrations/slack/callback` (dev)
   - `https://yourdomain.com/api/integrations/slack/callback` (prod)
3. Click **"Save URLs"**

### Step 3: Set Permissions (1 minute)

Still in **"OAuth & Permissions"**, scroll to **"Bot Token Scopes"** and add:
- `chat:write`
- `channels:read`
- `channels:history`
- `users:read`

### Step 4: Get Credentials (30 seconds)

1. Scroll to top of **"OAuth & Permissions"** page
2. Find **"App Credentials"**:
   - Copy **Client ID** (looks like: `123456.789012`)
   - Click **"Show"** and copy **Client Secret** (long string)

### Step 5: Add to Environment (1 minute)

Add to your `.env` file:

```env
SLACK_CLIENT_ID="123456.789012"
SLACK_CLIENT_SECRET="your-secret-here"
NEXTAUTH_URL="http://localhost:3000"
```

### Step 6: Restart Server

```bash
# Stop server (Ctrl+C)
npm run dev
```

### Step 7: Test It!

1. Go to `http://localhost:3000/settings?tab=integrations`
2. Click **"Connect Slack"**
3. Authorize the app
4. You should see "Slack connected successfully!"

## ✅ What's Already Built

Everything! The code is complete:

- ✅ OAuth flow (`/api/integrations/slack/connect`)
- ✅ OAuth callback (`/api/integrations/slack/callback`)
- ✅ Token storage & refresh
- ✅ Settings UI
- ✅ Send messages API
- ✅ List channels API
- ✅ Multi-tenant safety

**You just need to add the environment variables!**

## 🔄 How It Works for Multiple Users

1. **You (once)**: Add `SLACK_CLIENT_ID` and `SLACK_CLIENT_SECRET` to `.env`
2. **User A**: Clicks "Connect Slack" → Gets their own tokens → Stored in DB
3. **User B**: Clicks "Connect Slack" → Gets their own tokens → Stored separately
4. **User C**: Same process...

Each workspace has **isolated tokens** - they can't access each other's Slack.

## 🚨 Common Issues

### "Slack client ID not configured"
- ✅ Make sure `SLACK_CLIENT_ID` is in `.env` (not `.env.local`)
- ✅ Restart your dev server after adding
- ✅ Check for typos (no quotes around values in `.env`)

### "Invalid redirect URI"
- ✅ Make sure redirect URL in Slack app matches exactly:
  - Dev: `http://localhost:3000/api/integrations/slack/callback`
  - Prod: `https://yourdomain.com/api/integrations/slack/callback`

### Environment variables not loading
- ✅ `.env` file must be in project root (same level as `package.json`)
- ✅ Restart server after adding env vars
- ✅ Check for typos: `SLACK_CLIENT_ID` (not `SLACK_ID`)

## 📚 More Details

See `SLACK_INTEGRATION_ARCHITECTURE.md` for full architecture explanation.

## 🎉 That's It!

Once you add the environment variables, any workspace admin can connect Slack through the UI. No code changes needed!






