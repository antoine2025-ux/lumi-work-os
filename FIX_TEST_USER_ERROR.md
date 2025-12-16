# Fix "Ineligible accounts not added" Error

## Issue
Google Cloud Console says the email `skvortsovaleksei@gmail.com` is not eligible as a test user.

## Solutions

### Option 1: Verify the Email is a Valid Google Account

1. Go to https://accounts.google.com/
2. Try signing in with `skvortsovaleksei@gmail.com`
3. If it doesn't work, the email might not be a valid Google account
4. Use a different Google account that you can verify works

### Option 2: Check OAuth Consent Screen Settings

1. Go to **Google Cloud Console** → **APIs & Services** → **OAuth consent screen**
2. Check **User type**:
   - If it's set to **"Internal"** (for Google Workspace), you can only add users from your organization
   - Change it to **"External"** if you want to use any Google account
3. Check **Publishing status**:
   - If it's **"In production"**, you don't need test users (but you need to verify the app)
   - If it's **"Testing"**, you need test users

### Option 3: Change User Type to External (Recommended for Development)

1. Go to **OAuth consent screen**
2. Click **EDIT APP**
3. Under **User type**, select **"External"**
4. Click **SAVE AND CONTINUE**
5. Fill in required fields:
   - **App name**: Loopwell (or your app name)
   - **User support email**: Your email
   - **Developer contact information**: Your email
6. Click through the rest of the setup
7. Go back to **Test users** section
8. Try adding your email again

### Option 4: Use a Different Google Account

If the email isn't working, try:
1. Use a different Google account (like a personal Gmail)
2. Add that email as a test user
3. Sign in with that account

### Option 5: Publish the App (Not Recommended for Development)

If you publish the app, you don't need test users, but:
- You'll need to verify your app with Google
- This takes time and requires more setup
- Not recommended for local development

## Recommended Solution

**For local development, use Option 3:**
1. Set User type to **"External"**
2. Keep Publishing status as **"Testing"**
3. Add your Google account email as a test user
4. This allows you to test with any Google account

## After Fixing

1. Wait 1-2 minutes for changes to propagate
2. Try signing in again at `http://localhost:3000/login`
3. Use the Google account you added as a test user

