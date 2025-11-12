# Mailchimp Integration Setup Guide

This guide will help you set up Mailchimp email subscriptions for your landing page.

## Step 1: Get Your Mailchimp API Key

1. **Log in to Mailchimp**
   - Go to https://mailchimp.com/
   - Sign in to your account (or create one if you don't have it)

2. **Create an API Key**
   - Click on your profile icon (top right)
   - Go to **Account** → **Extras** → **API keys**
   - Click **Create A Key**
   - Give it a name (e.g., "Loopwell Landing Page")
   - Copy the API key (it will look like: `abc123def456-us1`)
   - ⚠️ **Important**: Save this key immediately - you won't be able to see it again!

## Step 2: Get Your Mailchimp List ID

1. **Create or Select an Audience**
   - Go to **Audience** → **All contacts**
   - If you don't have an audience, click **Create Audience**
   - Fill in the required information and create it

2. **Get the List ID**
   - Go to **Audience** → **All contacts**
   - Click **Settings** → **Audience name and defaults**
   - Scroll down to find your **Audience ID** (it will look like: `a1b2c3d4e5`)
   - Copy this ID

## Step 3: Add Environment Variables

Add these to your environment variables:

### For Local Development (`.env.local`):
```bash
MAILCHIMP_API_KEY=your-api-key-here
MAILCHIMP_LIST_ID=your-list-id-here
```

### For Production (Vercel):
1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add:
   - **Name**: `MAILCHIMP_API_KEY`
   - **Value**: Your Mailchimp API key
   - **Environment**: Production, Preview, Development (select all)
4. Add:
   - **Name**: `MAILCHIMP_LIST_ID`
   - **Value**: Your Mailchimp list ID
   - **Environment**: Production, Preview, Development (select all)
5. Click **Save**
6. **Redeploy** your application for changes to take effect

## Step 4: Test the Integration

1. **Start your development server**:
   ```bash
   npm run dev
   ```

2. **Visit your landing page**:
   - Go to `http://localhost:3000/landing` or `http://localhost:3000`
   - Scroll to the newsletter signup section (in CTA or footer)

3. **Test subscription**:
   - Enter a test email address
   - Click "Subscribe"
   - Check your Mailchimp audience to see if the email was added

## Step 5: Configure Mailchimp Settings (Optional)

### Double Opt-in
By default, the integration uses `status: 'subscribed'` which adds users directly. If you want double opt-in:

1. Change the status in `/src/app/api/newsletter/subscribe/route.ts`:
   ```typescript
   status: 'pending', // Instead of 'subscribed'
   ```

2. Users will receive a confirmation email from Mailchimp

### Custom Merge Fields
To collect additional information (like first name, last name), update the API route:

```typescript
body: JSON.stringify({
  email_address: email,
  status: 'subscribed',
  merge_fields: {
    FNAME: firstName, // If you collect first name
    LNAME: lastName,  // If you collect last name
  },
}),
```

## Troubleshooting

### "Newsletter service is not configured"
- Check that `MAILCHIMP_API_KEY` and `MAILCHIMP_LIST_ID` are set in your environment variables
- Restart your development server after adding environment variables
- For production, ensure variables are added to Vercel and the app is redeployed

### "Invalid Mailchimp API key format"
- Ensure your API key includes the server prefix (e.g., `-us1`, `-us2`, `-eu1`)
- The format should be: `xxxxxxxxxxxxx-us1`

### "Member Exists"
- This means the email is already in your Mailchimp list
- The API returns a success message in this case

### Email not appearing in Mailchimp
- Check your Mailchimp API key permissions
- Verify the list ID is correct
- Check Mailchimp's API status page for any outages
- Review server logs for detailed error messages

## Security Notes

- ⚠️ **Never commit API keys to git**
- ✅ Always use environment variables
- ✅ Add `.env.local` to your `.gitignore` file
- ✅ Use different API keys for development and production if needed

## API Rate Limits

Mailchimp has rate limits:
- **Free plan**: 10 requests per second
- **Paid plans**: Higher limits

The current implementation doesn't include rate limiting, but you can add it if needed.

## Next Steps

1. ✅ Set up your Mailchimp account
2. ✅ Get your API key and list ID
3. ✅ Add environment variables
4. ✅ Test the integration
5. ✅ Customize the subscription form (optional)
6. ✅ Configure double opt-in if desired (optional)

## Support

If you encounter issues:
1. Check the browser console for client-side errors
2. Check server logs for API errors
3. Verify Mailchimp API status: https://status.mailchimp.com/
4. Review Mailchimp API documentation: https://mailchimp.com/developer/

