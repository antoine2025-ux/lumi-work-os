# Early Tester Welcome Email Setup Guide

## Overview

This HTML email template is designed for welcoming early testers to Loopwell. It includes personalized greetings, benefits, and next steps.

## File Location

`mailchimp-tester-welcome-email.html`

## How to Use in Mailchimp

### Step 1: Create an Automation

1. **Log in to Mailchimp**
   - Go to https://mailchimp.com/
   - Sign in to your account

2. **Create Automation**
   - Click **Create** (top right)
   - Select **Email** → **Custom**
   - Give it a name: "Early Tester Welcome Email"

3. **Set Trigger**
   - Choose **Subscriber activity**
   - Select **Subscribes to audience**
   - Select your audience/list
   - **OR** use a tag-based trigger (e.g., when someone gets tagged "Early Tester")

4. **Add Email**
   - Click **Add email**
   - Choose **Design email**

### Step 2: Paste HTML Code

1. **Open HTML View**
   - In the email editor, click **Code** or **</>** button
   - This opens the HTML code view

2. **Paste Code**
   - Open `mailchimp-tester-welcome-email.html`
   - Select all (Cmd+A / Ctrl+A)
   - Copy (Cmd+C / Ctrl+C)
   - Delete any existing code in Mailchimp
   - Paste your HTML code (Cmd+V / Ctrl+V)
   - Click **Save** or **Done**

3. **Preview**
   - Click **Preview** to see how it looks
   - Test on desktop and mobile views
   - Verify merge tags work (e.g., *|FNAME|*)

### Step 3: Configure Send Time

- **Immediately**: Send right when they subscribe/get tagged (recommended)
- **Delayed**: Send after X hours/days

### Step 4: Activate

- Click **Start Sending** or **Activate**
- Your automation is now live!

---

## Using Tags to Trigger This Email

Since early testers sign up through your landing page form, you can:

### Option 1: Tag-Based Automation (Recommended)

1. **Update Your API** to add a tag when early testers subscribe:
   ```typescript
   // In /api/newsletter/subscribe/route.ts
   tags: ['Early Tester', `Company: ${companyName}`]
   ```

2. **Create Automation** triggered by tag:
   - Trigger: **Tag added**
   - Tag: "Early Tester"
   - Send: This welcome email

### Option 2: Segment-Based Automation

1. **Create a Segment** in Mailchimp:
   - Audience → Segments → Create segment
   - Condition: Tag contains "Early Tester"

2. **Create Automation** for this segment:
   - Trigger: **Added to segment**
   - Segment: "Early Tester"
   - Send: This welcome email

---

## Customization

### Update Links

**Access Your Workspace Button:**
```html
<a href="https://loopwell.io/login" ...>
```
Change `https://loopwell.io/login` to your actual login URL

**Social Media Links:**
```html
<a href="#" ...>Twitter</a>
<a href="#" ...>LinkedIn</a>
<a href="#" ...>Website</a>
```
Replace `#` with your actual social media URLs

### Personalize with Merge Tags

The email uses Mailchimp merge tags:

- **`*|FNAME|*`** - First name (from form)
- **`*|LNAME|*`** - Last name (if collected)
- **`*|EMAIL|*`** - Email address
- **`*|COMPANY|*`** - Company name (if you set up a custom field)

### Add Your Logo

Replace the text logo in the footer with an image:

```html
<!-- Replace this: -->
<p style="...">Loopwell</p>

<!-- With this: -->
<img src="https://your-domain.com/logo.png" alt="Loopwell" style="max-width: 150px; height: auto;" />
```

---

## Testing

### Before Activating:

1. **Preview in Mailchimp**
   - Check desktop view
   - Check mobile view
   - Verify merge tags display correctly

2. **Send Test Email**
   - Click **Send Test Email**
   - Enter your email address
   - Check your inbox
   - Test on different email clients

3. **Verify Merge Tags**
   - Make sure `*|FNAME|*` shows the actual name
   - Check that all links work

### After Activating:

1. **Test with Real Subscription**
   - Sign up as an early tester through your landing page
   - Check that the email is sent
   - Verify all content displays correctly

---

## Email Features

✅ **Personalized Greeting** - Uses `*|FNAME|*` merge tag
✅ **Professional Layout** - Clean, modern design
✅ **Brand Colors** - Matches Loopwell blue/purple gradient
✅ **Clear Benefits** - Highlights early tester perks
✅ **Next Steps** - Sets expectations for what's coming
✅ **CTA Button** - Direct link to workspace
✅ **Responsive Design** - Works on mobile and desktop
✅ **Email-Safe HTML** - Compatible with all major email clients

---

## Troubleshooting

### Merge Tag Not Working

**Issue:** `*|FNAME|*` shows as literal text instead of name
**Fix:**
- Ensure the name field is being sent to Mailchimp
- Check that Mailchimp has the FNAME field populated
- Verify merge tag syntax is correct (`*|FNAME|*`)

### Email Not Sending

**Issue:** Automation not triggering
**Fix:**
- Check trigger conditions (tag, segment, etc.)
- Verify automation is activated
- Check Mailchimp activity logs

### Formatting Issues

**Issue:** Email looks broken in some clients
**Fix:**
- Use inline styles (already done)
- Test in multiple email clients
- Avoid complex CSS

---

## Next Steps

1. ✅ Copy HTML code from `mailchimp-tester-welcome-email.html`
2. ✅ Create automation in Mailchimp
3. ✅ Paste HTML code
4. ✅ Set up trigger (tag or segment)
5. ✅ Customize links and content
6. ✅ Preview and test
7. ✅ Activate automation
8. ✅ Test with real subscription

---

## Support

If you need help:
- **Mailchimp Help**: https://mailchimp.com/help/
- **Automation Guide**: https://mailchimp.com/help/about-automation/
- **Merge Tags**: https://mailchimp.com/help/about-merge-tags/

