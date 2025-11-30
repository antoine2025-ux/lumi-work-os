# Slack Integration Architecture & Setup Guide

## 🏗️ Architecture Overview

### Two-Level Credential System

Loopwell's Slack integration uses a **two-level credential system**:

1. **App-Level Credentials** (One set for all users)
   - `SLACK_CLIENT_ID` - Your Slack app's public identifier
   - `SLACK_CLIENT_SECRET` - Your Slack app's secret key
   - **Where**: Stored in environment variables (`.env` file)
   - **Who sets it**: You (the Loopwell admin/developer)
   - **Purpose**: Used to initiate OAuth flow for any workspace

2. **Workspace-Level Tokens** (One set per workspace)
   - `accessToken` - Token to make API calls on behalf of a workspace
   - `refreshToken` - Token to refresh the access token when it expires
   - **Where**: Stored in database (`Integration` table, per workspace)
   - **Who sets it**: Each workspace admin (via OAuth flow)
   - **Purpose**: Used to send messages, read channels, etc. for that specific workspace

### How It Works

```
┌─────────────────────────────────────────────────────────────┐
│                    Loopwell Application                      │
│                                                              │
│  Environment Variables (.env):                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ SLACK_CLIENT_ID="123456.789012"                      │  │
│  │ SLACK_CLIENT_SECRET="abc123def456..."                 │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  Database (per workspace):                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Workspace A:                                          │  │
│  │   - accessToken: "xoxb-..."                          │  │
│  │   - refreshToken: "xoxe-..."                          │  │
│  │   - teamId: "T123456"                                 │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Workspace B:                                          │  │
│  │   - accessToken: "xoxb-..."                          │  │
│  │   - refreshToken: "xoxe-..."                         │  │
│  │   - teamId: "T789012"                                 │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## 🔑 Where to Get Slack Credentials

### Step 1: Create a Slack App

1. Go to **https://api.slack.com/apps**
2. Click **"Create New App"** → **"From scratch"**
3. Fill in:
   - **App Name**: `Loopwell` (or your choice)
   - **Pick a workspace**: Choose your development workspace
4. Click **"Create App"**

### Step 2: Configure OAuth & Permissions

1. In the left sidebar, click **"OAuth & Permissions"**
2. Scroll to **"Redirect URLs"** section
3. Click **"Add New Redirect URL"** and add:
   - **Development**: `http://localhost:3000/api/integrations/slack/callback`
   - **Production**: `https://yourdomain.com/api/integrations/slack/callback`
4. Click **"Save URLs"**

### Step 3: Set Bot Token Scopes

Still in **"OAuth & Permissions"**, scroll to **"Bot Token Scopes"** and add:
- ✅ `chat:write` - Send messages to channels
- ✅ `channels:read` - List public channels
- ✅ `channels:history` - Read channel history
- ✅ `users:read` - Read user information

### Step 4: Get Your Credentials

1. Scroll to the top of **"OAuth & Permissions"** page
2. Find **"App Credentials"** section:
   - **Client ID**: Copy this (starts with numbers, e.g., `123456.789012`)
   - **Client Secret**: Click **"Show"** and copy (long string)

### Step 5: Install App to Workspace (Optional for Testing)

1. Scroll to top of **"OAuth & Permissions"** page
2. Click **"Install to Workspace"** button
3. Authorize the app
4. This gives you a test token, but users will get their own via OAuth

## 📝 Configuration Steps

### For Development

1. **Add to `.env` file**:
   ```env
   SLACK_CLIENT_ID="123456.789012"
   SLACK_CLIENT_SECRET="abc123def456..."
   NEXTAUTH_URL="http://localhost:3000"
   ```

2. **Restart your dev server**:
   ```bash
   npm run dev
   ```

### For Production

1. **Add to your hosting platform's environment variables**:
   - Vercel: Project Settings → Environment Variables
   - Railway: Variables tab
   - Heroku: Settings → Config Vars

2. **Update Slack app redirect URLs** to include your production domain

3. **Redeploy your application**

## ✅ What's Already Built

The following components are **already implemented** in Loopwell:

### Backend Components

1. **OAuth Flow** (`/api/integrations/slack/connect`)
   - Initiates Slack OAuth
   - Redirects user to Slack authorization
   - Uses app-level credentials from env vars

2. **OAuth Callback** (`/api/integrations/slack/callback`)
   - Handles redirect from Slack
   - Exchanges code for tokens
   - Stores tokens in database (per workspace)

3. **Token Management** (`src/lib/integrations/slack-service.ts`)
   - Stores/updates tokens
   - Refreshes expired tokens automatically
   - Gets valid access token (refreshes if needed)

4. **Slack API Integration**
   - Send messages (`sendSlackMessage`)
   - List channels (`getSlackChannels`)
   - Deactivate integration

5. **Database Models**
   - `Integration` model with `workspaceId` scoping
   - Multi-tenant safe (each workspace has separate tokens)

### Frontend Components

1. **Settings Page Integration** (`/settings?tab=integrations`)
   - Shows connection status
   - "Connect Slack" button
   - "Disconnect" button
   - Success/error messages

2. **API Routes**
   - `GET /api/integrations/slack` - Get status
   - `POST /api/integrations/slack` - Store tokens (manual)
   - `DELETE /api/integrations/slack` - Disconnect
   - `POST /api/integrations/slack/send` - Send message
   - `GET /api/integrations/slack/channels` - List channels

## 🚀 How It Works for Multiple Users

### The Flow

1. **You (Admin)**: Set `SLACK_CLIENT_ID` and `SLACK_CLIENT_SECRET` in environment variables
   - These are **shared** by all workspaces
   - Only you need to set these once

2. **Workspace Admin A**: 
   - Goes to `/settings?tab=integrations`
   - Clicks "Connect Slack"
   - Authorizes Loopwell app in their Slack workspace
   - Their workspace's tokens are stored in database

3. **Workspace Admin B**:
   - Same process, but gets **their own** tokens
   - Stored separately in database
   - Can only access **their** Slack workspace

### Multi-Tenant Safety

- ✅ Each workspace has isolated tokens
- ✅ Workspace A cannot access Workspace B's Slack
- ✅ Database queries are scoped by `workspaceId`
- ✅ API routes verify workspace access

## 🔒 Security Considerations

### App-Level Credentials (SLACK_CLIENT_ID/SECRET)
- ✅ Stored in environment variables (never in code)
- ✅ Not exposed to client-side code
- ✅ Only used server-side for OAuth initiation
- ⚠️ **Keep these secret** - anyone with these can initiate OAuth for your app

### Workspace-Level Tokens
- ✅ Stored in database, encrypted at rest (if DB encryption enabled)
- ✅ Scoped by `workspaceId` (multi-tenant safe)
- ✅ Automatically refreshed when expired
- ✅ Can be revoked by workspace admin anytime

## 🧪 Testing the Integration

### Test OAuth Flow

1. Make sure `SLACK_CLIENT_ID` and `SLACK_CLIENT_SECRET` are in `.env`
2. Restart dev server
3. Go to `http://localhost:3000/settings?tab=integrations`
4. Click "Connect Slack"
5. You should be redirected to Slack authorization
6. After authorizing, you'll be redirected back with success message

### Test Sending Messages

Once connected, you can test via API:

```bash
curl -X POST http://localhost:3000/api/integrations/slack/send \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{
    "channel": "#general",
    "text": "Hello from Loopwell!"
  }'
```

Or use Loopbrain to send messages (if integrated).

## 📋 Checklist for Production

- [ ] Create Slack app at api.slack.com
- [ ] Configure OAuth redirect URLs (dev + production)
- [ ] Set bot token scopes
- [ ] Copy Client ID and Secret
- [ ] Add to environment variables (`.env` for dev, hosting platform for prod)
- [ ] Test OAuth flow in development
- [ ] Update production redirect URL in Slack app
- [ ] Deploy to production
- [ ] Test OAuth flow in production
- [ ] Document for workspace admins

## 🎯 Summary

**For You (Developer/Admin)**:
- Set `SLACK_CLIENT_ID` and `SLACK_CLIENT_SECRET` once in environment variables
- These credentials are shared by all workspaces
- You only need to do this once per environment (dev/prod)

**For Your Users (Workspace Admins)**:
- They click "Connect Slack" in settings
- They authorize Loopwell in their Slack workspace
- Their tokens are stored automatically
- Each workspace gets its own isolated tokens
- They can disconnect anytime

**The Code**:
- ✅ Already built and ready to use
- ✅ Multi-tenant safe
- ✅ Handles token refresh automatically
- ✅ Full OAuth flow implemented

You just need to **add the environment variables** and you're good to go! 🚀


