# Waitlist Welcome Email Setup Guide

This guide explains how to set up the waitlist welcome email in Mailchimp using the HTML template.

## File Location

`mailchimp-waitlist-welcome-email.html`

## What This Email Does

This email is automatically sent to users who join the waitlist via the "Join the waitlist" button on your landing page. It:

- Welcomes them to the waitlist
- Explains what being on the waitlist means
- Sets expectations about access and updates
- Highlights benefits and perks
- Provides information about Loopwell

## How to Set Up in Mailchimp

### Step 1: Create an Automation

1. **Log in to Mailchimp**
   - Go to https://mailchimp.com/
   - Sign in to your account

2. **Create Automation**
   - Click **Create** (top right)
   - Select **Email** → **Custom**
   - Give it a name: "Waitlist Welcome Email"
   - Click **Begin**

### Step 2: Set Trigger

1. **Choose Trigger Type**:
   - Select **Subscriber activity**
   - Choose **Tag added**
   - Tag: `Waitlist` (must match exactly, case-sensitive)
   - Click **Next**

### Step 3: Add Email

1. **Add Email Step**:
   - Click **Add email**
   - Choose **Design email**

2. **Switch to HTML View**:
   - In the email editor, look for **Code** or **</>** button
   - Click it to open HTML code view

3. **Paste HTML Template**:
   - Open `mailchimp-waitlist-welcome-email.html`
   - Select all (Cmd+A / Ctrl+A)
   - Copy (Cmd+C / Ctrl+C)
   - Delete any existing code in Mailchimp
   - Paste your HTML code (Cmd+V / Ctrl+V)
   - Click **Save** or **Done**

4. **Preview**:
   - Click **Preview** to see how it looks
   - Test on desktop and mobile views
   - Verify merge tags work (e.g., `*|FNAME|*` should show the first name)

### Step 4: Configure Send Time

- **Immediately**: Send right when someone joins the waitlist (recommended)
- **Delayed**: Send after X hours/days (not recommended for welcome emails)

Click **Save** after setting the time.

### Step 5: Activate

- Click **Start Sending** or **Activate**
- Your automation is now live!

---

## Testing

### Test the Flow

1. **Sign up via waitlist form**:
   - Go to your landing page
   - Click "Join the waitlist"
   - Fill out the form with a test email
   - Submit

2. **Check Mailchimp**:
   - Go to **Audience** → **All contacts**
   - Find your test contact
   - Verify they have the `Waitlist` tag
   - Check if the welcome email was sent (may take a few minutes)

3. **Check Email**:
   - Check the inbox of your test email
   - Verify the email was received
   - Check that merge tags are working (name appears correctly)

---

## Merge Tags Used

This email uses the following Mailchimp merge tags:

- `*|FNAME|*` - First name (from waitlist form)
- `*|LNAME|*` - Last name (from waitlist form)
- `*|UNSUB|*` - Unsubscribe link
- `*|UPDATE_PROFILE|*` - Update preferences link

These are automatically populated by Mailchimp based on the data submitted through your waitlist form.

---

## Customization

### Update Content

You can customize the email by editing the HTML file:

1. **Change Text**: Edit any paragraph or heading text directly in the HTML
2. **Update Links**: Replace URLs with your actual links
3. **Modify Colors**: Change color codes (e.g., `#3b82f6` for blue)
4. **Add Sections**: Copy existing sections and modify as needed

### Brand Colors

Current color scheme:
- Primary Blue: `#3b82f6`
- Purple: `#8b5cf6`
- Dark Text: `#1e293b`
- Light Text: `#64748b`

### Important Links to Update

Before using, update these links in the HTML:

- `https://loopwell.io` - Your website URL
- `https://www.linkedin.com/company/loopwellworks` - Your LinkedIn page
- Any other social media or external links

---

## Troubleshooting

### Email Not Sending

1. **Check Automation Status**:
   - Go to **Automations**
   - Verify your automation is **Active** (not paused)

2. **Check Trigger**:
   - Verify the tag name matches exactly: `Waitlist` (case-sensitive)
   - Check that contacts are getting tagged correctly

3. **Check Contact Status**:
   - Contacts must be "Subscribed" status
   - Go to contact details and verify status

### Merge Tags Not Working

1. **Verify Merge Fields**:
   - Go to **Audience** → **All contacts** → **Settings** → **Audience fields and |MERGE| tags**
   - Ensure `FNAME` and `LNAME` fields exist
   - If not, add them

2. **Check Contact Data**:
   - Open a contact's details
   - Verify first name and last name are populated
   - If empty, merge tags will be blank

### Tags Not Appearing

1. **Check API Integration**:
   - Verify your `/api/waitlist/subscribe` endpoint is working
   - Check server logs for errors
   - Verify `MAILCHIMP_API_KEY` and `MAILCHIMP_LIST_ID` are set

2. **Manual Tag Check**:
   - Go to a contact in Mailchimp
   - Check if `Waitlist` tag appears
   - If not, tags may not be added via API (check API code)

---

## Best Practices

1. **Send Immediately**: Welcome emails should be sent immediately after signup for best engagement

2. **Test First**: Always test with a real email address before going live

3. **Monitor Performance**: Check open rates and engagement after sending

4. **Keep Updated**: Update the email content as your product evolves

5. **Mobile-Friendly**: The template is mobile-responsive, but always preview on mobile devices

---

## Next Steps

After setting up the welcome email:

1. ✅ Set up the automation (Steps 1-5)
2. ✅ Test the flow (Testing section)
3. ✅ Customize content if needed (Customization section)
4. ✅ Monitor performance in Mailchimp analytics

You can also create follow-up emails:
- Monthly product update emails
- Beta access invitations
- Feature announcements

---

## Related Files

- `mailchimp-waitlist-welcome-email.html` - The HTML email template
- `MAILCHIMP_WAITLIST_VS_TESTER_SETUP.md` - Guide for separating waitlist vs tester campaigns
- `src/app/api/waitlist/subscribe/route.ts` - API endpoint that tags waitlist subscribers

---

Need help? Check Mailchimp's documentation or contact support.

