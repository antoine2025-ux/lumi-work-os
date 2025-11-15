# Supabase Auth Setup Guide for User Invitations

This guide will walk you through setting up Supabase Auth to enable user invitations in your Loopwell application.

## Prerequisites

- A Supabase account (sign up at https://supabase.com if you don't have one)
- Your Supabase project created

---

## Step 1: Get Your Supabase Credentials

1. **Go to your Supabase Dashboard**
   - Navigate to https://app.supabase.com
   - Select your project (or create a new one)

2. **Get Your Project URL**
   - Go to **Settings** → **API** (in the left sidebar)
   - Copy the **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - This is your `NEXT_PUBLIC_SUPABASE_URL`

3. **Get Your Service Role Key**
   - Still in **Settings** → **API**
   - Scroll down to **Project API keys**
   - Copy the **`service_role`** key (⚠️ Keep this secret! Never expose it in client-side code)
   - This is your `SUPABASE_SERVICE_ROLE_KEY`

4. **Get Your Anon Key** (Optional, for client-side operations)
   - In the same section, copy the **`anon`** key
   - This is your `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## Step 2: Configure Environment Variables

Add these to your `.env.local` file (or `.env`):

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

**Important:** 
- Never commit `.env.local` to git
- The `service_role` key has admin access - keep it secure
- Restart your Next.js dev server after adding these variables

---

## Step 3: Configure Email Templates

1. **Go to Authentication → Emails** in your Supabase dashboard

2. **Configure Invite Email Template**
   - Click on **"Invite user"** template
   - Customize the email subject and body if desired
   - The default template includes:
     - `{{ .ConfirmationURL }}` - The invitation link
     - `{{ .Email }}` - The invited user's email
     - `{{ .Token }}` - The invitation token (if needed)

3. **Configure Redirect URL**
   - In the same **Emails** section, scroll to **"Redirect URLs"**
   - Add your application URLs:
     - For development: `http://localhost:3000/auth/callback`
     - For production: `https://yourdomain.com/auth/callback`
   - You can also use wildcards: `http://localhost:3000/**`

---

## Step 4: Set Up Auth Callback Route (Optional but Recommended)

If you want to handle the invitation acceptance in your app:

1. **Create the callback route** (if it doesn't exist):
   - File: `src/app/auth/callback/route.ts`
   - This route will handle users after they click the invite link

2. **Example callback handler:**

```typescript
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const workspaceId = requestUrl.searchParams.get('workspace')

  if (code) {
    const supabase = createRouteHandlerClient({ cookies })
    await supabase.auth.exchangeCodeForSession(code)
    
    // Redirect to workspace or dashboard
    if (workspaceId) {
      return NextResponse.redirect(`${requestUrl.origin}/org?workspace=${workspaceId}`)
    }
    return NextResponse.redirect(`${requestUrl.origin}/dashboard`)
  }

  return NextResponse.redirect(`${requestUrl.origin}/auth/error`)
}
```

---

## Step 5: Configure Auth Providers (If Needed)

1. **Go to Authentication → Providers** in Supabase dashboard

2. **Enable Email Provider** (should be enabled by default)
   - Make sure **"Enable email provider"** is turned ON
   - Configure email settings:
     - **Confirm email**: You can disable this for invitations (since invite = confirmation)
     - **Secure email change**: Recommended to keep ON

3. **Optional: Enable other providers** (Google, GitHub, etc.)
   - Click on the provider you want
   - Follow the setup instructions
   - Add OAuth credentials

---

## Step 6: Configure URL Configuration

1. **Go to Authentication → URL Configuration**

2. **Set Site URL**
   - Development: `http://localhost:3000`
   - Production: `https://yourdomain.com`

3. **Add Redirect URLs**
   - Add the same URLs you added in Step 3:
     - `http://localhost:3000/auth/callback`
     - `https://yourdomain.com/auth/callback`

---

## Step 7: Test the Invite Flow

1. **Start your Next.js app:**
   ```bash
   npm run dev
   ```

2. **Navigate to Org Chart page:**
   - Go to `/org` in your app
   - Click the **"Add User"** button

3. **Send a test invitation:**
   - Enter a test email address
   - Select a role (Member or Admin)
   - Click **"Send Invitation"**

4. **Check the email:**
   - The invited user should receive an email from Supabase
   - The email contains a link to accept the invitation

5. **Accept the invitation:**
   - Click the link in the email
   - User will be redirected to sign up/sign in
   - After authentication, they'll be added to your workspace

---

## Step 8: Monitor Invitations

1. **Check Supabase Auth Logs:**
   - Go to **Authentication → Users** in Supabase dashboard
   - You should see invited users appear here

2. **Check Application Logs:**
   - Monitor your Next.js console for any errors
   - Check browser console for client-side errors

---

## Troubleshooting

### Issue: "Missing NEXT_PUBLIC_SUPABASE_URL"
- **Solution:** Make sure you've added the environment variable and restarted your dev server

### Issue: "Failed to send invitation"
- **Solution:** 
  - Check that your Service Role Key is correct
  - Verify email provider is enabled in Supabase
  - Check Supabase dashboard logs for errors

### Issue: "User already exists"
- **Solution:** This is handled in the code - existing users will be added to the workspace without sending a new invite

### Issue: Email not received
- **Solution:**
  - Check spam folder
  - Verify email template is configured correctly
  - Check Supabase email logs in dashboard
  - Make sure email provider is enabled

### Issue: Redirect URL mismatch
- **Solution:**
  - Add your callback URL to Supabase redirect URLs
  - Make sure the URL matches exactly (including http/https, port, path)

---

## Security Best Practices

1. **Never expose Service Role Key**
   - Only use it in server-side code (API routes)
   - Never include it in client-side JavaScript

2. **Use Environment Variables**
   - Store keys in `.env.local` (not committed to git)
   - Use different keys for development and production

3. **Restrict Redirect URLs**
   - Only add trusted domains to redirect URLs
   - Don't use wildcards in production

4. **Monitor Auth Logs**
   - Regularly check Supabase Auth logs for suspicious activity
   - Set up alerts for failed authentication attempts

---

## Additional Resources

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Supabase Admin API](https://supabase.com/docs/reference/javascript/auth-admin-inviteuserbyemail)
- [Email Templates Guide](https://supabase.com/docs/guides/auth/auth-email-templates)

---

## Quick Checklist

- [ ] Supabase project created
- [ ] Project URL copied to `.env.local`
- [ ] Service Role Key copied to `.env.local`
- [ ] Anon Key copied to `.env.local` (optional)
- [ ] Email provider enabled
- [ ] Email template configured
- [ ] Redirect URLs added
- [ ] Site URL configured
- [ ] Dev server restarted
- [ ] Test invitation sent
- [ ] Email received and link clicked
- [ ] User successfully added to workspace

---

## Need Help?

If you encounter issues:
1. Check Supabase dashboard logs
2. Check browser console for errors
3. Check Next.js server logs
4. Verify all environment variables are set correctly
5. Ensure Supabase project is active and not paused

