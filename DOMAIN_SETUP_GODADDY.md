# Setting Up loopwell.io with GoDaddy and Vercel

## Important: DNS Records vs Domain Forwarding

**Domain forwarding** (what you might have set up) is different from **DNS configuration**. For Vercel to work properly with your custom domain, you need to configure DNS records, not forwarding.

## Step-by-Step Setup

### 1. Configure Domain in Vercel

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Domains**
3. Click **Add Domain**
4. Enter `loopwell.io`
5. Vercel will show you the DNS records you need to configure

### 2. Configure DNS in GoDaddy

#### Option A: Using A Record (Recommended for root domain)

1. Log into [GoDaddy](https://www.godaddy.com)
2. Go to **My Products** → **Domains**
3. Click **DNS** next to `loopwell.io`
4. Find the **A Record** section
5. Add/Edit the A record:
   - **Type**: A
   - **Name**: @ (or leave blank for root domain)
   - **Value**: `76.76.21.21` (Vercel's IP - this is the standard IP, but Vercel will show you the exact one)
   - **TTL**: 600 (or default)

#### Option B: Using CNAME (For subdomains like www)

1. In the same DNS settings page
2. Add/Edit CNAME record:
   - **Type**: CNAME
   - **Name**: www
   - **Value**: `cname.vercel-dns.com`
   - **TTL**: 600

#### Option C: Using Vercel's Nameservers (Easiest - Recommended)

1. In Vercel, when you add the domain, you'll see nameservers like:
   - `ns1.vercel-dns.com`
   - `ns2.vercel-dns.com`

2. In GoDaddy:
   - Go to **DNS** settings for `loopwell.io`
   - Scroll to **Nameservers** section
   - Click **Change**
   - Select **Custom**
   - Enter the nameservers Vercel provided
   - Save

**Note**: This method gives Vercel full control over DNS, which is easier and recommended.

### 3. Remove Domain Forwarding (If Enabled)

If you previously set up domain forwarding in GoDaddy:

1. Go to **My Products** → **Domains**
2. Click **DNS** next to `loopwell.io`
3. Look for any **Forwarding** or **Redirect** settings
4. **Disable or Remove** any forwarding rules
5. Make sure DNS records are properly configured instead

### 4. Verify DNS Propagation

After making changes, DNS can take a few minutes to hours to propagate:

1. Check DNS propagation: [whatsmydns.net](https://www.whatsmydns.net)
2. Enter `loopwell.io` and check A/CNAME records
3. Wait for propagation (usually 5-30 minutes, can take up to 48 hours)

### 5. Verify SSL Certificate

Once DNS is configured:
1. Vercel will automatically provision an SSL certificate
2. This usually takes 1-5 minutes after DNS is configured
3. Check in Vercel dashboard under **Settings** → **Domains** → `loopwell.io`
4. You should see "Valid" or "Configured" status

## Troubleshooting

### Issue: Domain forwarding is still active

**Solution**: 
- GoDaddy sometimes has forwarding settings separate from DNS
- Check **Domain Settings** → **Forwarding** and disable it
- Ensure DNS records are set up instead

### Issue: Can't see DNS changes in GoDaddy

**Possible causes**:
1. Changes haven't propagated yet (wait 5-30 minutes)
2. You're looking at the wrong section (make sure it's DNS, not Forwarding)
3. DNS cache - try clearing browser cache or using incognito mode

### Issue: Vercel shows "Invalid Configuration"

**Solutions**:
1. Make sure forwarding is disabled in GoDaddy
2. Verify DNS records match what Vercel expects
3. Check that nameservers are correct (if using Vercel nameservers)
4. Wait for DNS propagation

### Issue: SSL certificate not provisioning

**Solutions**:
1. Ensure DNS records are correctly configured
2. Wait 5-10 minutes after DNS is set up
3. Check Vercel dashboard for any error messages
4. Try removing and re-adding the domain in Vercel

## Quick Checklist

- [ ] Removed domain forwarding in GoDaddy
- [ ] Configured DNS records (A record or CNAME) OR switched to Vercel nameservers
- [ ] Added domain in Vercel dashboard
- [ ] Waited for DNS propagation (check with whatsmydns.net)
- [ ] Verified SSL certificate is active in Vercel
- [ ] Tested `loopwell.io` in browser

## Current GoDaddy DNS Configuration

To check what's currently configured:

1. Go to GoDaddy → **My Products** → **Domains** → **DNS**
2. Look for:
   - **A Records**: Should point to Vercel IP or be removed if using nameservers
   - **CNAME Records**: Should point to `cname.vercel-dns.com` for www
   - **Forwarding/Redirect**: Should be disabled
   - **Nameservers**: Should be GoDaddy default OR Vercel nameservers

## Recommended Setup

**For root domain (loopwell.io):**
- Use Vercel nameservers (easiest) OR
- A record pointing to Vercel IP

**For www (www.loopwell.io):**
- CNAME record pointing to `cname.vercel-dns.com`

## Next Steps

1. Disable forwarding in GoDaddy
2. Configure proper DNS records
3. Add domain in Vercel if not already added
4. Wait for DNS propagation
5. Test the domain


