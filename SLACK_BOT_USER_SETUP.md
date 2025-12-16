# Slack Bot User Setup - Fix "doesn't have a bot user to install"

## The Problem

Slack is showing: "LoopBot doesn't have a bot user to install"

This means your Slack app needs a **Bot User** configured before it can be installed.

## Solution: Add Bot User to Your Slack App

### Step 1: Go to Your Slack App Settings

1. Go to **https://api.slack.com/apps**
2. Click on your app (the one with Client ID: `9962468526503.10018235041922`)

### Step 2: Add Bot User

1. In the left sidebar, click **"Bot Users"** (under "Features")
2. Click **"Add a Bot User"** button
3. Fill in:
   - **Display Name**: `LoopBot` (or `Loopwell Bot`)
   - **Default Username**: `loopbot` (or `loopwellbot`)
   - **Always Show My Bot as Online**: ✅ (recommended)
4. Click **"Add Bot User"**

### Step 3: Verify Bot Token Scopes

1. Go to **"OAuth & Permissions"** in the sidebar
2. Under **"Bot Token Scopes"**, make sure you have:
   - ✅ `chat:write` - Send messages
   - ✅ `channels:read` - List channels
   - ✅ `channels:history` - Read channel history
   - ✅ `users:read` - Read user information

### Step 4: Reinstall App (If Already Installed)

If you already installed the app to a workspace:

1. Go to **"OAuth & Permissions"**
2. Scroll to **"Reinstall App"** section
3. Click **"Reinstall to Workspace"**
4. Authorize the app again

### Step 5: Test Again

1. Go back to Loopwell: `http://localhost:3000/settings?tab=integrations`
2. Click **"Connect Slack"**
3. You should now see the bot installation screen instead of the error

## Why This Happens

Slack OAuth v2 requires:
1. **Bot User** - A bot identity for the app
2. **Bot Token Scopes** - Permissions for what the bot can do
3. **User Token Scopes** (optional) - Permissions for the installing user

Without a bot user, Slack can't install the app because there's no bot identity to add to the workspace.

## Quick Checklist

- [ ] Bot User added in Slack app settings
- [ ] Bot Token Scopes configured (`chat:write`, `channels:read`, etc.)
- [ ] App reinstalled to workspace (if previously installed)
- [ ] Test connection from Loopwell settings page

## After Setup

Once the bot user is configured, the OAuth flow will:
1. Show bot installation screen (not error)
2. Ask for workspace permissions
3. Install bot to workspace
4. Return to Loopwell with tokens






