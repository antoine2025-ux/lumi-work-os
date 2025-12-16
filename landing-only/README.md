# Loopwell Landing Page

This is a standalone landing page for Loopwell that is completely detached from the main application.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.local.example .env.local
```

Edit `.env.local` and set `NEXT_PUBLIC_APP_URL` to your main app URL (e.g., `https://app.loopwell.io`)

## Development

```bash
npm run dev
```

## Build for Production

```bash
npm run build
```

This will create a static export in the `out` directory that can be deployed to any static hosting service.

## Deployment

This landing page is configured for static export and can be deployed to:
- Vercel
- Netlify
- GitHub Pages
- Any static hosting service

The landing page links to the main app for authentication. When users click "Sign In" or "Sign Up", they'll be redirected to the main app's login page.

## Configuration

Update `NEXT_PUBLIC_APP_URL` in your environment variables to point to your main application URL.

