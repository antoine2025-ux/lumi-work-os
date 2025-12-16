# Workspace URL Slugs and Middleware

## Overview

This document describes the workspace slug-based URL structure and middleware consistency implementation for Loopwell 2.0.

## URL Structure

All workspace-specific pages now use slug-based URLs:

- **Dashboard**: `/w/[workspaceSlug]` or `/w/[workspaceSlug]/`
- **Projects**: `/w/[workspaceSlug]/projects`
- **Project Detail**: `/w/[workspaceSlug]/projects/[id]`
- **Settings**: `/w/[workspaceSlug]/settings`
- **Org Chart**: `/w/[workspaceSlug]/org`
- **LoopBrain**: `/w/[workspaceSlug]/ask`
- **Wiki**: `/w/[workspaceSlug]/wiki` (when implemented)

### Slug Format

- Workspace slugs are unique identifiers stored in the `Workspace.slug` field
- Format: lowercase alphanumeric with hyphens (e.g., `my-workspace`, `team-alpha-2024`)
- Validated via regex: `/^[a-z0-9-]+$/`

## Slug Resolution Priority

The `getUnifiedAuth` function resolves workspace context with the following priority:

1. **URL Path Slug** (`/w/[workspaceSlug]/...`) - **Highest Priority**
   - Extracted from the URL path
   - Validates workspace exists and user has membership
   - Throws error if workspace not found or user lacks access

2. **URL Query Params** (`?workspaceId=...` or `?projectId=...`)
   - Falls back to query parameters if no slug in path
   - Validates membership before returning

3. **Header** (`x-workspace-id`)
   - Checks header for workspace ID
   - Validates membership

4. **Default Workspace**
   - Uses user's first workspace membership
   - Falls back to creating default workspace if none exists

## Middleware

### Location
`src/middleware.ts`

### Responsibilities

1. **Slug Validation**
   - Validates slug format (alphanumeric + hyphens)
   - Returns 404 for invalid slug formats

2. **Authentication Check**
   - Verifies user is authenticated via NextAuth token
   - Redirects to `/login` with callback URL if not authenticated

3. **Request Logging**
   - Logs all requests with context
   - Adds request ID for tracing

4. **Header Setting**
   - Sets `x-workspace-slug` header for optimization (optional)
   - Sets `x-request-id` for tracing

### Matcher Configuration

The middleware matches all routes except:
- `/api/*` (API routes)
- `/_next/static/*` (static files)
- `/_next/image/*` (image optimization)
- `/favicon.ico`

## Legacy URL Compatibility

Legacy non-slug URLs are temporarily supported via redirects:

- `/projects` → `/w/[workspaceSlug]/projects`
- `/settings` → `/w/[workspaceSlug]/settings`
- `/org` → `/w/[workspaceSlug]/org`
- `/ask` → `/w/[workspaceSlug]/ask`

These redirect pages:
- Use `useWorkspace()` to get current workspace slug
- Redirect to slug-based URL
- Show loading state during redirect
- Include TODO comments for future removal

**Note**: Legacy routes should be removed once all internal links are updated to use slug URLs.

## Workspace Context

### Layout
`src/app/(dashboard)/w/[workspaceSlug]/layout.tsx`

- Validates workspace access on client-side
- Ensures workspace context matches URL slug
- Redirects if workspace not accessible
- Shows loading state during validation

### Workspace Provider
`src/lib/workspace-context.tsx`

- Manages current workspace state
- Provides `useWorkspace()` hook
- Handles workspace switching
- Persists workspace selection in localStorage

## Navigation Updates

### Header Navigation
`src/components/layout/header.tsx`

- All navigation links are now slug-aware
- Links automatically prefix with `/w/[workspaceSlug]`
- Falls back to legacy URLs if no workspace available
- Prefetches slug-based routes

### Workspace Switcher
`src/components/layout/workspace-switcher.tsx`

- Navigates to slug-based URLs when switching workspaces
- Uses `router.push(/w/${workspace.slug})` for navigation
- Updates workspace context and localStorage

## Implementation Details

### getUnifiedAuth Changes

**File**: `src/lib/unified-auth.ts`

**Key Changes**:
- Added slug extraction from URL path (`/w/[workspaceSlug]/...`)
- Validates workspace exists and user has membership
- Returns workspace ID and member info in one query
- Throws descriptive errors for unauthorized access

**Error Handling**:
- `Forbidden: You do not have access to workspace "[slug]"` - User not a member
- `Not found: Workspace "[slug]" does not exist` - Workspace doesn't exist

### Prisma Scoping

When `PRISMA_WORKSPACE_SCOPING_ENABLED` is enabled:
- `setWorkspaceContext(workspaceId)` must be called before queries
- Automatically scopes queries to the current workspace
- Prevents cross-workspace data leaks

**Note**: API routes should call `setWorkspaceContext(auth.workspaceId)` after `getUnifiedAuth()`.

## Testing

### Manual Test Checklist

1. **Slug-based Navigation**
   - [ ] Visit `/w/[workspaceSlug]` - should load dashboard
   - [ ] Visit `/w/[workspaceSlug]/projects` - should load projects
   - [ ] Visit `/w/[workspaceSlug]/settings` - should load settings
   - [ ] Visit `/w/[workspaceSlug]/org` - should load org chart
   - [ ] Visit `/w/[workspaceSlug]/ask` - should load LoopBrain

2. **Workspace Switching**
   - [ ] Use WorkspaceSwitcher to switch workspaces
   - [ ] Verify URL changes to `/w/[new-slug]`
   - [ ] Verify data (projects, wiki, org) matches selected workspace
   - [ ] Verify workspace context updates correctly

3. **Access Control**
   - [ ] Visit `/w/[slug-you-dont-have-access-to]` - should get 403/404 or redirect
   - [ ] Visit `/w/[non-existent-slug]` - should get 404
   - [ ] Verify middleware blocks invalid slug formats

4. **Legacy URL Redirects**
   - [ ] Visit `/projects` - should redirect to `/w/[slug]/projects`
   - [ ] Visit `/settings` - should redirect to `/w/[slug]/settings`
   - [ ] Visit `/org` - should redirect to `/w/[slug]/org`
   - [ ] Visit `/ask` - should redirect to `/w/[slug]/ask`

5. **Navigation Links**
   - [ ] Click header navigation links - should use slug URLs
   - [ ] Verify all internal links use slug format
   - [ ] Check that breadcrumbs work correctly

6. **API Routes**
   - [ ] Verify API routes resolve workspace from slug
   - [ ] Test that `getUnifiedAuth` returns correct workspaceId
   - [ ] Verify Prisma scoping works when flag is enabled

### Automated Tests

See `tests/workspace-scoping.sanity.test.ts` for existing workspace scoping tests.

**Recommended additions**:
- Test slug resolution in `getUnifiedAuth`
- Test middleware slug validation
- Test workspace access denial
- Test legacy URL redirects

## Migration Notes

### For Developers

1. **Updating Links**
   - Replace hardcoded paths like `/projects` with slug-aware paths
   - Use `useWorkspace()` to get current workspace slug
   - Build URLs as `/w/${currentWorkspace.slug}/path`

2. **API Routes**
   - `getUnifiedAuth(request)` automatically resolves slug from URL
   - No need to manually extract slug in API routes
   - Call `setWorkspaceContext(auth.workspaceId)` after auth

3. **Page Components**
   - Pages under `/w/[workspaceSlug]/` automatically have slug in params
   - Use `useParams()` to access `workspaceSlug` if needed
   - Workspace context is set automatically via layout

### Breaking Changes

- Legacy non-slug URLs will eventually be removed
- All internal navigation should use slug URLs
- External bookmarks may break (users should update them)

## Future Improvements

1. **Remove Legacy Routes**
   - Once all internal links are updated, remove legacy redirect pages
   - Update any external integrations to use slug URLs

2. **Wiki Pages**
   - Move wiki pages under `/w/[workspaceSlug]/wiki`
   - Update wiki navigation to use slugs

3. **Project Routes**
   - Ensure all project sub-routes use slug URLs
   - Update project navigation components

4. **Analytics**
   - Track workspace slug usage
   - Monitor legacy URL redirects for migration progress

## Related Documentation

- `docs/MULTI_WORKSPACE_UX.md` - Multi-workspace UX patterns
- `docs/PRISMA_SCOPING_FEATURE_FLAG.md` - Prisma scoping details
- `docs/MULTI_TENANT_ROLLOUT_CHECKLIST.md` - Rollout checklist
