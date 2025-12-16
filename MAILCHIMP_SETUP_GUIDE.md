# Mailchimp Setup Guide

Complete guide for setting up Mailchimp email subscriptions, welcome emails, and separate campaigns for waitlist vs early testers.

## Table of Contents

1. [Initial Setup](#initial-setup)
2. [Welcome Email Configuration](#welcome-email-configuration)
3. [Separate Campaigns for Waitlist vs Testers](#separate-campaigns-for-waitlist-vs-testers)
4. [Troubleshooting](#troubleshooting)
5. [Best Practices](#best-practices)

---

## Initial Setup

### Step 1: Get Your Mailchimp API Key

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

### Step 2: Get Your Mailchimp List ID

1. **Create or Select an Audience**
   - Go to **Audience** → **All contacts**
   - If you don't have an audience, click **Create Audience**
   - Fill in the required information and create it

2. **Get the List ID**
   - Go to **Audience** → **All contacts**
   - Click **Settings** → **Audience name and defaults**
   - Scroll down to find your **Audience ID** (it will look like: `a1b2c3d4e5`)
   - Copy this ID

### Step 3: Add Environment Variables

**For Local Development (`.env.local`):**
```bash
MAILCHIMP_API_KEY=your-api-key-here
MAILCHIMP_LIST_ID=your-list-id-here
```

**For Production (Vercel):**
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

### Step 4: Test the Integration

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

---

## Welcome Email Configuration

### Option 1: Welcome Email (Recommended - Easiest)

This sends an automatic welcome email to everyone who subscribes.

**Steps:**

1. **Log in to Mailchimp**
   - Go to https://mailchimp.com/
   - Sign in to your account

2. **Navigate to Automation**
   - Click **Create** (top right)
   - Select **Email** → **Welcome new subscribers**

3. **Configure Welcome Email**
   - **Name**: Give it a name like "Welcome New Subscribers"
   - **Audience**: Select your audience/list
   - **Trigger**: "When someone subscribes"
   - Click **Begin**

4. **Design Your Email**
   - Choose a template or start from scratch
   - Customize the content:
     - Welcome message
     - What to expect
     - Links to your product
     - Social media links
   - Preview on desktop and mobile

5. **Set Send Time**
   - **Immediately**: Send right when they subscribe (recommended)
   - **Delayed**: Send after X hours/days
   - Click **Save**

6. **Activate**
   - Click **Start Sending** or **Activate**
   - The automation is now live!

**What Happens:**
- ✅ User subscribes on your landing page
- ✅ Email appears in Mailchimp immediately
- ✅ Welcome email is sent automatically
- ✅ User receives confirmation they're subscribed

### Option 2: Double Opt-In (More Secure)

This requires users to confirm their email before being added to your list.

**Steps:**

1. **Enable Double Opt-In in Mailchimp**
   - Go to **Audience** → **All contacts**
   - Click **Settings** → **Audience name and defaults**
   - Scroll to **Form settings**
   - Enable **Require subscribers to confirm their email address (double opt-in)**
   - Click **Save**

2. **Update Your API Code**
   - Change the subscription status from `'subscribed'` to `'pending'`
   - File: `src/app/api/newsletter/subscribe/route.ts`
   ```typescript
   status: 'pending', // Instead of 'subscribed'
   ```

3. **Customize Confirmation Email**
   - Go to **Audience** → **All contacts**
   - Click **Signup forms** → **Form builder**
   - Select **Final welcome email** (this is the confirmation email)
   - Customize the email content
   - Click **Save**

**What Happens:**
- ✅ User subscribes on your landing page
- ✅ Status is set to "Pending" in Mailchimp
- ✅ Confirmation email is sent automatically
- ✅ User clicks confirmation link in email
- ✅ Status changes to "Subscribed"
- ✅ Welcome email is sent (if you set one up)

### Using HTML Templates

You can use the provided HTML templates:
- `mailchimp-welcome-email.html` - General welcome email
- `mailchimp-waitlist-welcome-email.html` - Waitlist-specific welcome
- `mailchimp-tester-welcome-email.html` - Early tester welcome

**To use:**
1. Open the HTML file in your editor
2. Copy all the HTML code
3. In Mailchimp email editor, click **Code** or **</>** button
4. Paste the HTML code
5. Customize links and content
6. Save and activate

---

## Separate Campaigns for Waitlist vs Testers

### How It Works

Your code automatically tags subscribers based on how they signed up:
- **Waitlist signups** → Tagged with `Waitlist`
- **Early Tester signups** → Tagged with `Early Tester`

You can then create separate email automations and campaigns in Mailchimp that target each tag.

### Step 1: Verify Tags Are Working

1. **Test both signup forms**:
   - Sign up via "Join the waitlist" button
   - Sign up via "Become a Tester" form

2. **Check tags in Mailchimp**:
   - Go to **Audience** → **All contacts**
   - Find the test contacts you just created
   - Click on a contact to view their details
   - Verify they have the correct tags:
     - Waitlist signups should have `Waitlist` tag
     - Tester signups should have `Early Tester` tag

### Step 2: Create Waitlist Welcome Email Campaign

**Using Tag-Based Automation (Recommended):**

1. **Go to Automations**:
   - Click **Create** (top right)
   - Select **Email** → **Custom**

2. **Name Your Automation**:
   - Name: "Waitlist Welcome Email"
   - Click **Begin**

3. **Set Trigger**:
   - Choose **Subscriber activity**
   - Select **Tag added**
   - Tag: `Waitlist` (must match exactly, case-sensitive)
   - Click **Next**

4. **Add Email**:
   - Click **Add email**
   - Choose **Design email**
   - Use the HTML template: `mailchimp-waitlist-welcome-email.html`
   - Or design your own welcome email for waitlist subscribers
   - Use merge tags like `*|FNAME|*` and `*|LNAME|*` for personalization

5. **Set Send Time**:
   - **Immediately** (recommended) or set a delay
   - Click **Save**

6. **Activate**:
   - Click **Start Sending** or **Activate**

### Step 3: Create Early Tester Welcome Email Campaign

Follow the same steps as Step 2, but:
- Name: "Early Tester Welcome Email"
- Trigger: Tag `Early Tester` (instead of `Waitlist`)
- Use HTML template: `mailchimp-tester-welcome-email.html`

### Step 4: Create Ongoing Campaigns

You can create separate ongoing campaigns for each group:

**Waitlist Campaigns:**
- Monthly updates about product development
- Feature announcements
- Beta access notifications

**Early Tester Campaigns:**
- More detailed technical updates
- Feedback requests
- Exclusive access to new features
- Community building

**How to Set Up:**

1. **Create Segments**:
   - Go to **Audience** → **All contacts** → **New Segment**
   - "Waitlist Subscribers" (tag: `Waitlist`)
   - "Early Testers" (tag: `Early Tester`)

2. **Create Recurring Automations**:
   - Go to **Automations** → **Create**
   - Choose **Email** → **Custom**
   - Trigger: **Date-based** → **Recurring**
   - Set frequency (e.g., monthly)
   - Select your segment as the audience
   - Design your email template
   - Activate

---

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

### Tags Not Appearing
1. **Check API Response**:
   - Look at your server logs when someone signs up
   - Verify the API call to Mailchimp is successful

2. **Check Mailchimp API**:
   - Tags are added via the `tags` field in the API
   - If a contact already exists, tags should still be added
   - Check Mailchimp's API documentation for tag updates

3. **Manual Tag Check**:
   - Go to a contact in Mailchimp
   - Check if tags appear in their profile
   - If not, you may need to update existing contacts manually

### Welcome Email Not Sending
**Check:**
- ✅ Automation is activated (not paused)
- ✅ Automation is set to "Start Sending"
- ✅ Email template is saved
- ✅ Audience is correct
- ✅ Check Mailchimp's activity logs

**Fix:**
- Go to **Automation** → Find your welcome email
- Check status (should be "Sending")
- Review activity logs for errors

### Email Going to Spam
**Common causes:**
- Sender reputation issues
- Email content triggers spam filters
- Missing SPF/DKIM records

**Fix:**
- Verify domain authentication in Mailchimp
- Use Mailchimp's built-in templates
- Avoid spam trigger words
- Ask users to whitelist your email

---

## Best Practices

### Email Content

**What to Include:**
1. **Welcome Message**
   - Thank them for subscribing
   - Set expectations for what they'll receive

2. **Product Information**
   - Link to your landing page
   - Key features/benefits
   - How to get started

3. **Social Proof**
   - Customer testimonials
   - Usage statistics
   - Success stories

4. **Call to Action**
   - "Get Started" button
   - "Learn More" link
   - "Follow us on social media"

5. **Unsubscribe Link**
   - Required by law
   - Mailchimp adds this automatically

**Email Design Tips:**
- ✅ Use your brand colors
- ✅ Include your logo
- ✅ Mobile-responsive design
- ✅ Clear, readable fonts
- ✅ Compelling subject line
- ✅ Personalize with merge tags (FNAME, etc.)

### Tag Management

1. **Consistent Tag Naming**:
   - Use consistent tag names (e.g., always `Waitlist`, not `waitlist` or `Wait List`)
   - Document your tag names for your team

2. **Regular Audits**:
   - Periodically check that tags are being applied correctly
   - Review segments to ensure they're capturing the right contacts

### Email Frequency

- **Waitlist**: Monthly updates are usually sufficient
- **Early Testers**: Can be more frequent (bi-weekly or weekly) since they're more engaged
- Don't over-email either group

---

## Quick Reference

### Tag Names Used in Code:
- `Waitlist` - Applied to waitlist signups
- `Early Tester` - Applied to early tester signups
- `Company: [CompanyName]` - Applied if company is provided

### API Endpoints:
- `/api/waitlist/subscribe` - Waitlist signups (tags: `Waitlist`)
- `/api/newsletter/subscribe` - Early tester signups (tags: `Early Tester`)

### Mailchimp Locations:
- **Tags**: Audience → All contacts → Click contact → Tags section
- **Segments**: Audience → All contacts → New Segment
- **Automations**: Automations → Create
- **Campaigns**: Campaigns → Create campaign

### HTML Templates:
- `mailchimp-welcome-email.html` - General welcome email
- `mailchimp-waitlist-welcome-email.html` - Waitlist welcome
- `mailchimp-tester-welcome-email.html` - Early tester welcome

---

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

---

## Next Steps

1. ✅ Set up your Mailchimp account
2. ✅ Get your API key and list ID
3. ✅ Add environment variables
4. ✅ Test the integration
5. ✅ Set up welcome emails
6. ✅ Configure separate campaigns for waitlist vs testers
7. ✅ Customize email templates
8. ✅ Test everything

---

## Additional Resources

- **Mailchimp Help Center**: https://mailchimp.com/help/
- **Automation Guide**: https://mailchimp.com/help/about-automation/
- **Email Design Tips**: https://mailchimp.com/help/email-design-guide/
- **Compliance Guide**: https://mailchimp.com/help/about-the-can-spam-act/
- **API Documentation**: https://mailchimp.com/developer/



