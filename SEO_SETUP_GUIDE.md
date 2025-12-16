# SEO Setup Guide for Vercel-Hosted Next.js App

This guide explains how to handle SEO, social media previews (Open Graph), favicons, and search engine optimization for your Loopwell site hosted on Vercel.

## Quick Start Checklist

### ✅ What's Already Done

1. ✅ **Root Layout Metadata** - Comprehensive SEO metadata added to `src/app/layout.tsx`
2. ✅ **Sitemap** - Auto-generated sitemap at `src/app/sitemap.ts`
3. ✅ **Robots.txt** - Created at `public/robots.txt`
4. ✅ **Manifest.json** - Web app manifest created
5. ✅ **Open Graph Tags** - Configured for social media previews
6. ✅ **Twitter Cards** - Configured for Twitter previews

### 🔧 What You Need to Do

1. **Set Environment Variable in Vercel**
   - Go to **Vercel Dashboard** → **Your Project** → **Settings** → **Environment Variables**
   - Add: `NEXT_PUBLIC_SITE_URL=https://your-domain.com`

2. **Create Favicon Files**
   - `favicon.ico` (16x16, 32x32)
   - `icon.png` (512x512)
   - `icon.svg`
   - `apple-icon.png` (180x180)
   - Add to `public/` folder
   - Tools: https://realfavicongenerator.net/ or https://favicon.io/

3. **Create Open Graph Image**
   - Size: 1200x630 pixels
   - Format: PNG or JPG
   - File: `public/og-image.png`
   - Include: Logo, tagline, brand colors

---

## Overview

In Next.js App Router (which you're using), SEO metadata is handled through:
1. **Root Layout** (`src/app/layout.tsx`) - Global metadata
2. **Page-level metadata** - Per-page metadata exports
3. **Public folder** (`public/`) - Static assets like favicons
4. **Next.js Metadata API** - Built-in SEO support

---

## 1. Root Layout Metadata (`src/app/layout.tsx`)

This is where you set **default metadata** for your entire site. I've updated your root layout with comprehensive SEO metadata including:

- **Title & Description** - Search engine snippets
- **Open Graph** - Facebook, LinkedIn previews
- **Twitter Cards** - Twitter previews
- **Icons** - Favicons for different devices
- **Robots** - Search engine crawling rules
- **Canonical URLs** - Prevent duplicate content

### What's Already Configured

✅ Basic title and description  
✅ Open Graph tags  
✅ Twitter Card tags  
✅ Favicon support  
✅ Robots meta  
✅ Canonical URLs  

---

## 2. Page-Level Metadata

Each page can override or extend the root metadata. For example:

### Landing Page (`src/app/landing/page.tsx`)

Since your landing page is a client component, create a separate metadata file or use Next.js 13+ metadata exports. I'll create a metadata file for you.

### Other Pages

Pages like `/about` already have metadata:
```typescript
export const metadata: Metadata = {
  title: "About | Loopwell",
  description: "...",
}
```

---

## 3. Favicons & Icons (`public/` folder)

### Required Favicon Files

Place these files in your `public/` folder:

```
public/
  ├── favicon.ico          # Main favicon (16x16, 32x32)
  ├── icon.png             # Apple touch icon (180x180)
  ├── icon.svg             # Modern SVG favicon
  ├── apple-icon.png       # Apple touch icon (180x180)
  ├── manifest.json        # Web app manifest
  └── robots.txt           # Search engine rules
```

### Favicon Sizes Needed

- **favicon.ico**: 16x16, 32x32 (multi-size ICO file)
- **icon.png**: 512x512 (for Android)
- **apple-icon.png**: 180x180 (for iOS)
- **icon.svg**: Scalable SVG (modern browsers)

### Generating Favicons

Use these tools:
- **Favicon Generator**: https://realfavicongenerator.net/
- **Favicon.io**: https://favicon.io/
- **Canva**: Design and export at correct sizes

---

## 4. Open Graph Images

### What Are Open Graph Images?

When someone shares your site on social media (Facebook, LinkedIn, Twitter), these images appear in the preview card.

### Creating OG Images

1. **Size**: 1200x630 pixels (recommended)
2. **Format**: PNG or JPG
3. **Content**: Your logo + tagline or key visual
4. **File**: Save as `og-image.png` in `public/`

### Tools for Creating OG Images

- **Canva**: Has OG image templates (1200x630)
- **Figma**: Design custom OG images
- **Next.js Image Generation**: Use `@vercel/og` for dynamic OG images

---

## 5. Robots.txt

Create `public/robots.txt` to control search engine crawling:

```
User-agent: *
Allow: /
Disallow: /api/
Disallow: /_next/
Disallow: /admin/

Sitemap: https://loopwell.io/sitemap.xml
```

---

## 6. Sitemap.xml

Next.js can auto-generate sitemaps. Create `src/app/sitemap.ts`:

```typescript
import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: 'https://loopwell.io',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 1,
    },
    {
      url: 'https://loopwell.io/about',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    // Add more pages...
  ]
}
```

---

## 7. Structured Data (JSON-LD)

Add structured data for better search results. Create a component:

```typescript
// src/components/seo/structured-data.tsx
export function StructuredData() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Loopwell',
    applicationCategory: 'BusinessApplication',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}
```

---

## 8. Testing Your SEO

### Tools to Test

1. **Google Rich Results Test**: https://search.google.com/test/rich-results
2. **Facebook Sharing Debugger**: https://developers.facebook.com/tools/debug/
3. **Twitter Card Validator**: https://cards-dev.twitter.com/validator
4. **LinkedIn Post Inspector**: https://www.linkedin.com/post-inspector/
5. **Google Search Console**: https://search.google.com/search-console

### Quick Tests

```bash
# Check meta tags
curl -s https://loopwell.io | grep -i "og:"

# Check robots.txt
curl https://loopwell.io/robots.txt

# Check sitemap
curl https://loopwell.io/sitemap.xml
```

---

## 9. Vercel-Specific SEO

### Environment Variables

Set these in Vercel dashboard:

```bash
NEXT_PUBLIC_SITE_URL=https://loopwell.io
NEXT_PUBLIC_SITE_NAME=Loopwell
```

### Vercel Analytics

You already have Vercel Analytics installed! It tracks:
- Page views
- Performance metrics
- Core Web Vitals

### Custom Domain

In Vercel:
1. Go to **Settings** → **Domains**
2. Add your custom domain (`loopwell.io`)
3. Vercel automatically handles SSL/HTTPS
4. Update DNS records as instructed

---

## 10. Per-Page SEO Examples

### Landing Page
```typescript
export const metadata: Metadata = {
  title: "Loopwell - The End of Disconnected Work",
  description: "Loopwell gives startups the structural intelligence of world-class organizations, without the bureaucracy.",
  openGraph: {
    title: "Loopwell - The End of Disconnected Work",
    description: "Loopwell gives startups the structural intelligence...",
    images: ['/og-image.png'],
  },
}
```

### Blog Post (if you add blog)
```typescript
export const metadata: Metadata = {
  title: "How to Build Better Teams | Loopwell Blog",
  description: "...",
  openGraph: {
    type: 'article',
    publishedTime: '2025-01-01',
    authors: ['Loopwell Team'],
  },
}
```

---

## 11. Common SEO Issues & Fixes

### Issue: Missing Favicon
**Fix**: Add favicon files to `public/` and reference in metadata

### Issue: Social Media Preview Not Working
**Fix**: 
1. Clear cache: https://developers.facebook.com/tools/debug/
2. Check OG image URL is absolute (https://loopwell.io/og-image.png)
3. Verify image is at least 200x200px

### Issue: Duplicate Content
**Fix**: Set canonical URLs in metadata

### Issue: Pages Not Indexed
**Fix**: 
1. Submit sitemap to Google Search Console
2. Check robots.txt isn't blocking pages
3. Verify pages have unique titles/descriptions

---

## 12. Checklist

- [ ] Update root layout metadata (✅ Done)
- [ ] Add favicon files to `public/`
- [ ] Create OG image (1200x630)
- [ ] Create `robots.txt`
- [ ] Create `sitemap.ts`
- [ ] Add page-specific metadata to key pages
- [ ] Test with Facebook/LinkedIn/Twitter validators
- [ ] Submit sitemap to Google Search Console
- [ ] Set up Google Search Console
- [ ] Monitor with Vercel Analytics

---

## 13. Quick Reference

### File Locations

```
src/app/
  ├── layout.tsx          # Root metadata
  ├── sitemap.ts          # Sitemap (create this)
  └── [page]/
      └── page.tsx        # Page metadata

public/
  ├── favicon.ico
  ├── icon.png
  ├── icon.svg
  ├── apple-icon.png
  ├── og-image.png
  ├── robots.txt
  └── manifest.json
```

### Key Metadata Fields

- `title` - Page title (shown in browser tab)
- `description` - Meta description (search snippets)
- `openGraph` - Facebook/LinkedIn previews
- `twitter` - Twitter card previews
- `icons` - Favicons
- `robots` - Search engine rules
- `alternates.canonical` - Canonical URL

---

## Next Steps

1. **Generate favicons** from your logo
2. **Create OG image** (1200x630)
3. **Add favicons to public folder**
4. **Create robots.txt**
5. **Create sitemap.ts**
6. **Test with social media validators**
7. **Submit to Google Search Console**

Need help? Check Next.js docs: https://nextjs.org/docs/app/building-your-application/optimizing/metadata

