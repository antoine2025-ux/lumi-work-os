# Finding Bot User Settings in Slack App

## If "Bot Users" is Not Visible

Slack has updated their interface. Try these locations:

### Option 1: Check "Agents & AI Apps" (New Interface)

Since "Agents & AI Apps" is highlighted in your sidebar:

1. Click **"Agents & AI Apps"** in the sidebar
2. Look for bot configuration options
3. You might need to create an "Agent" which acts as the bot

### Option 2: Check "Basic Information"

1. Click **"Basic Information"** in the sidebar
2. Scroll down and look for:
   - "Bot User" section
   - "App Credentials" section
   - Any mention of bot configuration

### Option 3: Check "OAuth & Permissions"

1. Click **"OAuth & Permissions"** in the sidebar
2. Look for:
   - "Bot Token Scopes" section (if this exists, bot user might be auto-created)
   - Any "Add Bot User" button or link

### Option 4: Use App Manifest (New Method)

1. Click **"App Manifest"** in the sidebar
2. This might show bot configuration in YAML format
3. Look for `bot_user:` or similar configuration

## Alternative: Check if Bot is Auto-Created

If you're using **OAuth v2** with bot scopes, Slack might automatically create a bot user when you install the app.

### Try This:

1. Go to **"OAuth & Permissions"**
2. Scroll to **"Bot Token Scopes"**
3. If you see scopes listed there, the bot might already be configured
4. Try clicking **"Install to Loopwell"** button
5. Complete the installation
6. After installation, check if bot tokens are generated

## What to Look For

You need to find where to configure:
- **Bot Display Name**: `LoopBot` or `Loopwell Bot`
- **Bot Username**: `loopbot` or `loopwellbot`
- **Bot Token Scopes**: `chat:write`, `channels:read`, etc.

## If Still Can't Find It

1. Check Slack's help: https://api.slack.com/authentication/basics
2. The app might be using the newer "Agents" model instead of traditional bots
3. You might need to create an "Agent" in "Agents & AI Apps" instead

Let me know what you see in "Agents & AI Apps" or "Basic Information"!


