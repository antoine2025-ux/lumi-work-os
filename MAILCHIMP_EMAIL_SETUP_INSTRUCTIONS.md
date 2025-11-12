# How to Use the HTML Welcome Email in Mailchimp

## Quick Setup Guide

### Step 1: Open the HTML File
1. Open `mailchimp-welcome-email.html` in your code editor or browser
2. Select all the HTML code (Cmd+A / Ctrl+A)
3. Copy it (Cmd+C / Ctrl+C)

### Step 2: Create Welcome Email in Mailchimp

1. **Log in to Mailchimp**
   - Go to https://mailchimp.com/
   - Sign in to your account

2. **Create Welcome Email**
   - Click **Create** (top right)
   - Select **Email** → **Welcome new subscribers**
   - Give it a name: "Welcome New Subscribers"
   - Select your audience/list
   - Click **Begin**

3. **Paste HTML Code**
   - In the email editor, click **Code** or **</>** button (usually in the toolbar)
   - This opens the HTML code view
   - Delete any existing code
   - Paste your HTML code (Cmd+V / Ctrl+V)
   - Click **Save** or **Done**

4. **Preview**
   - Click **Preview** to see how it looks
   - Test on desktop and mobile views
   - Make sure all links work

5. **Customize (Optional)**
   - Update the "Get Started" button link to your actual URL
   - Update social media links (Twitter, LinkedIn, Website)
   - Adjust colors if needed
   - Add your logo if desired

6. **Set Send Time**
   - Choose **Immediately** (recommended)
   - Or set a delay (e.g., 1 hour after subscription)

7. **Activate**
   - Click **Start Sending** or **Activate**
   - Your welcome email is now live!

---

## Customization Tips

### Update Links

**Get Started Button:**
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

### Update Colors

The email uses your brand colors (blue/purple gradient). To change:

**Header Gradient:**
```html
background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
```
- `#3b82f6` = Blue
- `#8b5cf6` = Purple

**Button Gradient:**
Same gradient as header - update both for consistency

### Add Your Logo

Replace the text logo in the footer with an image:

```html
<!-- Replace this: -->
<p style="...">Loopwell</p>

<!-- With this: -->
<img src="https://your-domain.com/logo.png" alt="Loopwell" style="max-width: 150px; height: auto;" />
```

### Personalize with Merge Tags

Mailchimp supports merge tags for personalization:

**Add First Name:**
```html
Hi *|FNAME|*,
```

**Add Last Name:**
```html
Hi *|FNAME|* *|LNAME|*,
```

**Add Email:**
```html
Hi *|EMAIL|*,
```

---

## Testing Your Email

### Before Activating:

1. **Preview in Mailchimp**
   - Check desktop view
   - Check mobile view
   - Verify all links work

2. **Send Test Email**
   - Click **Send Test Email**
   - Enter your email address
   - Check your inbox
   - Test on different email clients (Gmail, Outlook, Apple Mail)

3. **Check Links**
   - Click all buttons and links
   - Verify they go to correct pages
   - Test unsubscribe link

### After Activating:

1. **Subscribe with Test Email**
   - Use your own email
   - Subscribe through your landing page
   - Check inbox for welcome email

2. **Verify Timing**
   - Should arrive immediately (if set to immediate)
   - Or after your specified delay

3. **Check Formatting**
   - Open on desktop
   - Open on mobile
   - Check different email clients

---

## Email Client Compatibility

The HTML template is designed to work with:
- ✅ Gmail (web, iOS, Android)
- ✅ Outlook (web, desktop, mobile)
- ✅ Apple Mail (macOS, iOS)
- ✅ Yahoo Mail
- ✅ Most modern email clients

**Note:** Some email clients don't support:
- CSS gradients (fallback to solid color)
- Advanced CSS (uses inline styles for compatibility)
- Custom fonts (uses system fonts)

The template uses email-safe HTML and inline styles for maximum compatibility.

---

## Troubleshooting

### Email Looks Broken

**Issue:** Layout is broken or colors are wrong
**Fix:** 
- Make sure you pasted the complete HTML
- Check that you're in HTML code view (not visual editor)
- Preview in Mailchimp before activating

### Links Don't Work

**Issue:** Buttons or links don't work
**Fix:**
- Verify URLs are correct (include `https://`)
- Test links in preview mode
- Check that links aren't being blocked

### Images Not Showing

**Issue:** Logo or images don't appear
**Fix:**
- Use absolute URLs (https://your-domain.com/image.png)
- Host images on your server or CDN
- Check image file size (keep under 1MB)

### Email Goes to Spam

**Issue:** Welcome emails go to spam folder
**Fix:**
- Verify domain authentication in Mailchimp
- Use Mailchimp's built-in unsubscribe links
- Avoid spam trigger words
- Ask users to whitelist your email

---

## Advanced Customization

### Add More Features

You can add:
- Product screenshots
- Customer testimonials
- Video embeds (use hosted video)
- Animated GIFs
- Interactive elements

### A/B Testing

Test different versions:
- Different subject lines
- Different CTA buttons
- Different content layouts
- Different send times

### Segmentation

Send different emails based on:
- Source (where they subscribed)
- Location
- Tags
- Custom fields

---

## Next Steps

1. ✅ Copy HTML code from `mailchimp-welcome-email.html`
2. ✅ Create welcome email in Mailchimp
3. ✅ Paste HTML code
4. ✅ Customize links and content
5. ✅ Preview and test
6. ✅ Activate automation
7. ✅ Test with your email
8. ✅ Monitor performance

---

## Support

If you need help:
- **Mailchimp Help**: https://mailchimp.com/help/
- **Email Design Guide**: https://mailchimp.com/help/email-design-guide/
- **Automation Help**: https://mailchimp.com/help/about-automation/

---

## Template Features

✅ **Responsive Design** - Works on desktop and mobile
✅ **Email-Safe HTML** - Compatible with all major email clients
✅ **Brand Colors** - Matches your Loopwell branding
✅ **Clear CTA** - Prominent "Get Started" button
✅ **Feature Highlights** - Shows key Loopwell features
✅ **Professional Layout** - Clean, modern design
✅ **Unsubscribe Link** - Compliant with email regulations
✅ **Social Links** - Easy to add your social media

