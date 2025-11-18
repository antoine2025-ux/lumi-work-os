# Mailchimp Setup: Separate Campaigns for Waitlist vs Early Testers

This guide explains how to configure Mailchimp to send different email campaigns to waitlist subscribers vs early testers.

## How It Works

Your code automatically tags subscribers based on how they signed up:
- **Waitlist signups** → Tagged with `Waitlist`
- **Early Tester signups** → Tagged with `Early Tester`

You can then create separate email automations and campaigns in Mailchimp that target each tag.

---

## Step 1: Verify Tags Are Working

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

---

## Step 2: Create Waitlist Welcome Email Campaign

### Option A: Tag-Based Automation (Recommended)

1. **Go to Automations**:
   - Click **Create** (top right)
   - Select **Email** → **Custom**

2. **Name Your Automation**:
   - Name: "Waitlist Welcome Email"
   - Click **Begin**

3. **Set Trigger**:
   - Choose **Subscriber activity**
   - Select **Tag added**
   - Tag: `Waitlist`
   - Click **Next**

4. **Add Email**:
   - Click **Add email**
   - Choose **Design email**
   - Design your welcome email for waitlist subscribers
   - Use merge tags like `*|FNAME|*` and `*|LNAME|*` for personalization

5. **Set Send Time**:
   - **Immediately** (recommended) or set a delay
   - Click **Save**

6. **Activate**:
   - Click **Start Sending** or **Activate**

### Option B: Segment-Based Campaign

1. **Create a Segment**:
   - Go to **Audience** → **All contacts**
   - Click **New Segment** (top right)
   - Name: "Waitlist Subscribers"
   - Condition: **Tag** → **is** → `Waitlist`
   - Click **Preview Segment** to see matching contacts
   - Click **Save Segment**

2. **Create Campaign**:
   - Go to **Campaigns** → **Create campaign**
   - Choose **Regular campaign** or **Automated email**
   - Select your segment as the audience
   - Design and send your email

---

## Step 3: Create Early Tester Welcome Email Campaign

Follow the same steps as Step 2, but:

1. **For Automation**:
   - Name: "Early Tester Welcome Email"
   - Trigger: Tag `Early Tester` (instead of `Waitlist`)

2. **For Segment**:
   - Name: "Early Testers"
   - Condition: Tag `Early Tester`

---

## Step 4: Create Ongoing Campaigns

You can create separate ongoing campaigns for each group:

### Waitlist Campaigns
- **Monthly Updates**: Send monthly updates about product development
- **Feature Announcements**: Announce new features as they're built
- **Beta Access**: Notify when beta access becomes available

### Early Tester Campaigns
- **Product Updates**: More detailed technical updates
- **Feedback Requests**: Ask for specific feedback on features
- **Exclusive Access**: Give early access to new features
- **Community Building**: Invite to exclusive tester community

### How to Set Up Ongoing Campaigns:

1. **Create Segments** (if you haven't already):
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

## Step 5: Advanced: Conditional Logic

You can create more sophisticated automations:

### Example: Send Different Emails Based on Signup Date

1. **Create Automation**:
   - Trigger: Tag added (`Waitlist` or `Early Tester`)
   - Add **Conditional Split**:
     - If signed up in last 7 days → Send "Welcome" email
     - If signed up more than 7 days ago → Send "Update" email

### Example: Company-Specific Campaigns

Since both forms collect company information (stored in tags like `Company: Acme Inc`):

1. **Create Segments**:
   - "Waitlist - Enterprise" (Tag: `Waitlist` AND Tag contains `Company:`)
   - "Waitlist - Startup" (Tag: `Waitlist` AND Tag does NOT contain `Company:`)

2. **Send Targeted Emails**:
   - Enterprise-focused messaging for enterprise companies
   - Startup-focused messaging for startups

---

## Step 6: Testing Your Setup

1. **Test Waitlist Flow**:
   - Sign up via "Join the waitlist"
   - Check Mailchimp to verify tag is added
   - Verify waitlist welcome email is sent

2. **Test Early Tester Flow**:
   - Sign up via "Become a Tester"
   - Check Mailchimp to verify tag is added
   - Verify early tester welcome email is sent

3. **Test Segments**:
   - Go to **Audience** → **All contacts**
   - Use the filter/search to find contacts with each tag
   - Verify segments show correct contacts

---

## Troubleshooting

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

### Existing Contacts Not Getting Tagged

If someone already exists in Mailchimp and signs up again:

1. **The API handles this**: Your code returns success even if the member exists
2. **Tags should still be added**: Mailchimp should add new tags to existing members
3. **If tags aren't added**: You may need to use Mailchimp's tag update endpoint separately

### Emails Not Sending

1. **Check Automation Status**:
   - Go to **Automations**
   - Verify your automation is **Active** (not paused)

2. **Check Trigger**:
   - Verify the trigger is set correctly (tag name matches exactly)
   - Tag names are case-sensitive: `Waitlist` ≠ `waitlist`

3. **Check Audience**:
   - Verify contacts are in the correct audience/list
   - Verify contacts have the correct tags

---

## Best Practices

1. **Consistent Tag Naming**:
   - Use consistent tag names (e.g., always `Waitlist`, not `waitlist` or `Wait List`)
   - Document your tag names for your team

2. **Regular Audits**:
   - Periodically check that tags are being applied correctly
   - Review segments to ensure they're capturing the right contacts

3. **Email Content**:
   - Keep waitlist emails focused on product updates and beta access
   - Keep tester emails focused on feedback and exclusive access
   - Don't overlap content too much to maintain exclusivity

4. **Frequency**:
   - Don't over-email either group
   - Waitlist: Monthly updates are usually sufficient
   - Early Testers: Can be more frequent (bi-weekly or weekly) since they're more engaged

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

---

## Next Steps

1. ✅ Verify tags are working (Step 1)
2. ✅ Set up waitlist welcome email (Step 2)
3. ✅ Set up early tester welcome email (Step 3)
4. ✅ Create ongoing campaigns (Step 4)
5. ✅ Test everything (Step 6)

Need help? Check Mailchimp's documentation or contact support.

