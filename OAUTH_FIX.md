# OAuth Account Selection Fix

## Problem
After logging out, users were automatically logged in with the same Google account they previously used, even when trying to select a different account.

## Root Cause
1. Google OAuth maintains its own session in the user's browser
2. Our app's logout wasn't properly clearing NextAuth session
3. Google's account picker wasn't being forced to show

## Solution

### 1. Enhanced Logout (`src/components/layout/header.tsx`)
- Sign out from NextAuth **first** (clears server-side session)
- Clear all cookies including NextAuth and Google-related cookies
- Clear localStorage and sessionStorage
- Clear IndexedDB (used by NextAuth for session storage)
- Add small delay before redirect to ensure cleanup completes

### 2. Forced Account Selection (`src/lib/auth.ts`)
- Added `prompt: 'consent select_account'` to force Google to:
  - Show account picker (`select_account`)
  - Show consent screen (`consent`) which also shows account selection
- Set `allowDangerousEmailAccountLinking: false` to prevent automatic account linking

### 3. Login Page Improvements (`src/app/login/page.tsx`)
- Attempts to clear Google-related cookies before sign-in
- Note: This may not work for cross-domain cookies, but helps with same-domain cookies

## Testing

1. **Log in with Account A**
   - Click "Sign In with Google"
   - Select Account A
   - Should log in successfully

2. **Log out**
   - Click user menu → "Log out"
   - Should redirect to login page
   - Session should be cleared

3. **Log in with Account B**
   - Click "Sign In with Google"
   - Google should show account picker
   - Select Account B
   - Should log in with Account B

## Important Notes

### Browser Limitations
- **Google's Session**: We cannot clear Google's own session cookies due to cross-domain restrictions
- **Account Picker**: The `prompt: 'consent select_account'` parameter should force Google to show the account picker
- **If Account Picker Doesn't Show**: Users can manually:
  1. Go to Google's account settings
  2. Sign out of Google entirely
  3. Or use Google's account switcher in the OAuth flow (if shown)

### Alternative Solutions (if issue persists)

1. **Add Account Selection UI**: Create a pre-login page where users can select which Google account to use
2. **Use Google's Account Switcher**: Google's OAuth flow includes an account switcher - users can click "Use another account" if needed
3. **Clear Browser Data**: Users can clear browser cookies/cache for Google domains

## Current Configuration

The OAuth flow is now configured with:
- `prompt: 'consent select_account'` - Forces account selection
- `access_type: 'offline'` - Requests refresh token
- `allowDangerousEmailAccountLinking: false` - Prevents automatic account linking

This should ensure Google always shows the account picker, allowing users to select a different account even after logging out.

