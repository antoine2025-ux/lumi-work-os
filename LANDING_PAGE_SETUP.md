# Landing Page Detachment - Setup Complete

## What Was Done

✅ **Standalone Landing Page Created**
- Located in `/landing-only/` directory
- Complete standalone Next.js app with static export
- No dependencies on main app
- Links to main app for authentication

✅ **Main App Updated**
- Root route (`/`) now redirects authenticated users to `/home`
- Unauthenticated users redirected to `/login`
- Landing page code removed from main app

## Architecture

```
loopwell.io (or your domain)
├── Landing Page (standalone) - /landing-only/
│   ├── Static export
│   ├── No auth dependencies
│   └── Links to main app for auth
│
└── Main App - /src/
    ├── /login - Login page
    ├── /home - Dashboard (requires auth)
    └── All other app features
```

## Deployment

### Landing Page
1. Navigate to `/landing-only` directory
2. Set `NEXT_PUBLIC_APP_URL` in `.env.local` to your main app URL
3. Build: `npm run build`
4. Deploy `out` directory to static hosting (Vercel, Netlify, etc.)

### Main App
1. Deploy as normal Next.js app
2. Ensure login page is accessible at `/login`
3. Dashboard accessible at `/home` (protected route)

## Configuration

### Landing Page Environment Variables

Create `.env.local` in `/landing-only/`:

```env
NEXT_PUBLIC_APP_URL=https://app.loopwell.io
```

Or for local development:
```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Testing

1. **Landing Page (Standalone)**
   ```bash
   cd landing-only
   npm install
   npm run dev
   ```
   Visit: `http://localhost:3001` (or next available port)

2. **Main App**
   ```bash
   npm run dev
   ```
   Visit: `http://localhost:3000`

3. **Test Flow**
   - Visit landing page
   - Click "Sign In" or "Sign Up"
   - Should redirect to main app's `/login`
   - After auth, should redirect to `/home`

## Next Steps

1. **Update Landing Page URL**
   - In production, set `NEXT_PUBLIC_APP_URL` to your production app URL
   
2. **Domain Configuration**
   - Option 1: `loopwell.io` → Landing page, `app.loopwell.io` → Main app
   - Option 2: `loopwell.io` → Landing page, `loopwell.io/app` → Main app (if using rewrites)

3. **CORS (if needed)**
   - If landing page and app are on different domains, you may need to configure CORS
   - Currently using `window.location.href` which doesn't require CORS

4. **OAuth Callback URLs**
   - Ensure your OAuth provider (Google) has both domains configured
   - Landing page domain (for redirects from landing)
   - Main app domain (for OAuth callbacks)

## Benefits

✅ **Separate Deployments**
- Landing page can be updated independently
- Faster landing page loads (static export)
- Main app can be updated without affecting landing

✅ **Better Performance**
- Landing page is lightweight static site
- No need to load full Next.js app bundle for landing
- Better SEO and faster initial load

✅ **Flexibility**
- Can use different hosting for landing vs app
- Landing page can be on CDN for maximum speed
- Main app can focus on dynamic features

