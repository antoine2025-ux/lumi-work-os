# Landing Page Architecture Options

## Current Issue: Flashing
The landing page was flashing because:
1. Client-side auth check happens after page renders
2. Redirect happens after initial render, causing flash
3. AuthWrapper wraps everything, including landing page

## Fixed Approach (Current)
- Added loading state while session checks
- Wait for session to fully load before redirecting
- Use `router.replace()` to avoid back button issues
- Sign In/Sign Up buttons in top right navigation

## Architecture Options

### Option 1: Single App (Current - Fixed)
**Pros:**
- Single codebase to maintain
- Shared components and styles
- Easy to update
- Single deployment

**Cons:**
- Landing page loads Next.js app bundle (larger initial load)
- Auth checks happen client-side (can cause flash if not handled properly)

**Best for:** Most use cases, especially if you want to keep it simple

### Option 2: Separate Landing Page Deployment
**Pros:**
- Minimal landing page (faster load)
- Can use static site generator (Next.js static export, Gatsby, etc.)
- Completely separate from app
- Can deploy to different domain/subdomain

**Cons:**
- Two codebases to maintain
- Need to sync branding/styles
- More complex deployment
- Need to handle auth flow between sites

**Best for:** If landing page needs to be ultra-fast or if you want completely separate deployments

### Option 3: Subdomain Approach
**example.com** → Landing page (static)
**app.example.com** → Application

**Pros:**
- Clean separation
- Landing page can be completely static
- App can be fully dynamic

**Cons:**
- Need to handle CORS/cookies between domains
- More complex auth flow
- Two deployments

### Option 4: Route-Based (Current - Recommended)
**example.com/** → Landing page
**example.com/home** → Dashboard
**example.com/login** → Login page

**Pros:**
- Single codebase
- Easy auth flow (same domain)
- Can optimize landing page route separately
- Flexible routing

**Cons:**
- Need to ensure landing page doesn't load app bundle unnecessarily

## Recommendation: Option 4 (Current - Improved)

The current approach with the fixes applied should work well:

1. **Landing page at `/`** - Public, no auth required
2. **Sign In/Sign Up in top right** - Easy access
3. **Auth flow** - Redirects to `/home` after login
4. **Dashboard at `/home`** - Protected route

### Optimizations to Consider:

1. **Code Splitting**: Use dynamic imports to reduce initial bundle size
2. **Static Export for Landing**: Consider making landing page a static export if it doesn't need React features
3. **Middleware Redirect**: Use Next.js middleware for server-side redirects (no flash)

### If You Want to Separate:

If you want to go with Option 2 (separate deployment), you would:

1. Create a separate Next.js app for landing page
2. Deploy landing to `loopwell.io`
3. Deploy app to `app.loopwell.io` or `loopwell.io/app`
4. Handle auth redirects between domains
5. Use OAuth callback URLs that point to app domain

Would you like me to:
- A) Keep current approach and optimize it further?
- B) Set up a completely separate landing page deployment?
- C) Implement middleware-based redirects for zero flash?

