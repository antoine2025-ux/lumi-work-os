# Supabase Email Configuration Guide

## Problem
- Email invites come from Supabase (not Loopwell branding)
- Invite links point to localhost instead of production URL

## Solution: Configure Supabase Email Settings

### Step 1: Set Site URL in Supabase

1. Go to **Supabase Dashboard** → Your Project → **Authentication** → **URL Configuration**
2. Set **Site URL** to your production URL:
   ```
   https://your-app.vercel.app
   ```
   Or your custom domain:
   ```
   https://loopwell.com
   ```
3. Add **Redirect URLs** (add both):
   ```
   https://your-app.vercel.app/auth/callback
   https://your-app.vercel.app/**
   ```

### Step 2: Configure Custom Email Template

1. Go to **Supabase Dashboard** → **Authentication** → **Email Templates**
2. Select **Invite user** template
3. Replace the template with the custom HTML from `supabase-invite-email-template-simple.html`
4. Click **Save**

**Important Variables Available:**
- `{{ .ConfirmationURL }}` - The invite link
- `{{ .Email }}` - Recipient email
- `{{ .SiteURL }}` - Your site URL (from Step 1)
- `{{ .Token }}` - Auth token (usually not needed)

### Step 3: Configure Email Sender (Optional but Recommended)

#### Option A: Use Supabase Email (Free, but shows "Supabase" sender)

1. Go to **Supabase Dashboard** → **Settings** → **Auth**
2. Under **SMTP Settings**, you can configure custom SMTP (requires paid plan)

#### Option B: Use Custom SMTP (Recommended for Production)

1. Get SMTP credentials from your email provider:
   - **SendGrid** (recommended)
   - **Mailgun**
   - **AWS SES**
   - **Postmark**
   - **Resend** (great for transactional emails)

2. In **Supabase Dashboard** → **Settings** → **Auth** → **SMTP Settings**:
   - Enable **Enable Custom SMTP**
   - Enter your SMTP credentials:
     - **Host**: `smtp.sendgrid.net` (or your provider)
     - **Port**: `587` (or `465` for SSL)
     - **Username**: Your SMTP username
     - **Password**: Your SMTP password
     - **Sender email**: `noreply@loopwell.com` (or your domain)
     - **Sender name**: `Loopwell` (or your brand name)

3. **Verify your domain** (if using custom domain):
   - Add SPF, DKIM, and DMARC records to your DNS
   - Follow your email provider's instructions

### Step 4: Set Environment Variables

Add to your **Vercel Environment Variables**:

```bash
# Production URL (used for invite redirects)
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app

# Or use VERCEL_URL (automatically set by Vercel)
# No need to set manually - Vercel provides this
```

### Step 5: Test the Invite Flow

1. Send a test invite from your app
2. Check the email:
   - ✅ Should come from your custom sender (if SMTP configured)
   - ✅ Should use your custom template
   - ✅ Link should point to production URL, not localhost
   - ✅ Link should work when clicked

## Quick Fix for Redirect URL (Already Done)

The code has been updated to use:
1. `NEXT_PUBLIC_APP_URL` (if set)
2. `VERCEL_URL` (automatically set by Vercel)
3. `NEXTAUTH_URL` (fallback)
4. `localhost:3000` (development fallback)

**Action Required:**
- Add `NEXT_PUBLIC_APP_URL` to your Vercel environment variables with your production URL

## Troubleshooting

### Email still shows "Supabase" sender
- You need to configure custom SMTP (Step 3, Option B)
- Free Supabase plan uses their email service

### Links still point to localhost
- Check `NEXT_PUBLIC_APP_URL` is set in Vercel
- Verify Supabase Site URL is set correctly (Step 1)
- Check Vercel logs to see what URL is being used

### Email template not updating
- Make sure you saved the template in Supabase
- Check for syntax errors in the HTML
- Try sending a new invite (templates are cached)

### Invite link doesn't work
- Verify Redirect URLs are set in Supabase (Step 1)
- Check that `/auth/callback` route exists in your app
- Verify workspace ID is being passed correctly

