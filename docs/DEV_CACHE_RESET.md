# Dev Cache Reset Guide

This guide explains how to reset all caches in development mode.

## Available Methods

### 1. UI Button (Easiest)

In development mode, a **"Clear Cache"** button appears in the bottom-right corner of the screen. Click it to clear all caches instantly.

### 2. Browser Console

Open the browser console and run:

```javascript
// Clear all caches (requires queryClient)
await window.__clearAllCaches(window.__queryClient)
```

Or clear them individually:

```javascript
// Clear React Query cache only
window.__queryClient.clear()

// Clear server-side cache via API
await fetch('/api/dev/clear-cache', { method: 'POST' })
```

### 3. Terminal Command

Clear the Next.js build cache:

```bash
npm run dev:clear-cache
```

This removes the `.next` directory which contains:
- Build artifacts
- Compiled pages
- Static assets cache

### 4. API Endpoint

Call the dev-only API endpoint:

```bash
curl -X POST http://localhost:3000/api/dev/clear-cache
```

## What Gets Cleared

### Client-Side (React Query)
- All query cache
- All mutation cache
- All prefetched data

### Server-Side
- Redis cache (if configured)
- In-memory cache fallback
- Auth request cache
- All cache patterns

### Build Cache
- `.next` directory (via npm script)

## Important Notes

⚠️ **These utilities only work in development mode** (`NODE_ENV=development`)

⚠️ **Do not use in production** - These endpoints and utilities are disabled in production builds

## Troubleshooting

If caches aren't clearing:

1. **Check environment**: Ensure you're in development mode
2. **Check console**: Look for error messages in the browser console
3. **Manual clear**: Try clearing browser localStorage/sessionStorage manually
4. **Restart dev server**: Sometimes a full restart is needed

## Global Variables (Dev Only)

In development mode, these are available on `window`:

- `window.__queryClient` - React Query client instance
- `window.__clearAllCaches(queryClient)` - Function to clear all caches

