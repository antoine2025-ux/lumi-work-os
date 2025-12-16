# Org Center Performance Optimizations

This document summarizes the performance optimizations applied to the Org Center to make navigation between tabs feel instant and improve overall user experience.

## Overview

The Org Center was optimized to:
1. Avoid recalculating auth + permissions on every tab change
2. Make navigation between Org pages feel instant
3. Use loading states (Suspense + skeletons) instead of blocking the whole page
4. Reduce repeated fetches and re-renders

## Architecture

### 1. Centralized Auth & Permissions Loading

**Location:** `src/app/org/layout.tsx`

- The layout loads `getOrgPermissionContext()` once per request
- This function is wrapped with `React.cache()` to deduplicate calls within a single request
- All child pages reuse the cached result, avoiding duplicate database queries

**Key Files:**
- `src/lib/org/permissions.server.ts` - `getOrgPermissionContext` is cached
- `src/app/org/layout.tsx` - Loads context once and provides it to all pages

### 2. Request-Level Caching

**Location:** `src/lib/org/data.server.ts`

All heavy data loaders are wrapped with `React.cache()` to avoid duplicate queries:

- `getOrgOverviewStats` - Overview page metrics
- `getOrgPeople` - People directory
- `getOrgStructureLists` - Teams, departments, roles
- `getOrgChartData` - Org chart hierarchy
- `getOrgAdminActivity` - Activity feed
- `getOrgInsights` - Insights snapshot

**How it works:**
- `React.cache()` deduplicates function calls within a single request
- If the same function is called multiple times with the same arguments, it returns the cached result
- Cache is request-scoped (cleared after each request), so it's safe for auth/permissions

### 3. Suspense Boundaries & Progressive Loading

**Location:** Each page has a `*Content.tsx` component with Suspense

Pages are split into:
- **Page shell** (header, breadcrumb) - Renders immediately
- **Data-heavy content** - Wrapped in Suspense with skeleton fallbacks

**Skeleton Components:**
- `src/components/org/skeletons/OrgOverviewSkeleton.tsx`
- `src/components/org/skeletons/OrgInsightsSkeleton.tsx`
- `src/components/org/skeletons/OrgPeopleSkeleton.tsx`
- `src/components/org/skeletons/OrgActivitySkeleton.tsx`

**Page Structure:**
```
page.tsx (Server Component)
  ├─ OrgPageHeader (renders immediately)
  └─ *Content.tsx (Suspense boundary)
      └─ *DataLoader.tsx (async data loading)
          └─ *Client.tsx (renders with data)
```

**Pages with Suspense:**
- `/org` - `OrgOverviewContent`
- `/org/people` - `PeopleContent`
- `/org/structure` - `StructureContent`
- `/org/activity` - `ActivityContent`
- `/org/insights` - `OrgInsightsContent`

### 4. Instant Navigation with startTransition

**Location:** Client components with tab navigation

Tab switches use `startTransition` to keep the UI responsive:

- `src/app/org/activity/ActivityExportsClient.tsx`
- `src/app/org/structure/StructurePageClient.tsx`
- `src/app/org/settings/OrgSettingsClient.tsx`

**How it works:**
```typescript
const handleTabChange = (tabId: string) => {
  startTransition(() => {
    setActiveTab(tabId);
  });
};
```

This marks the state update as non-urgent, allowing React to keep the UI responsive while content updates.

### 5. Performance Instrumentation

**Location:** Data loaders in `*Content.tsx` components

Development-only performance logging:

```typescript
const startTime = process.env.NODE_ENV !== "production" ? Date.now() : 0;
// ... data loading ...
if (process.env.NODE_ENV !== "production" && startTime) {
  const duration = Date.now() - startTime;
  if (duration > 200) {
    console.log(`[ComponentName] Data loading took ${duration}ms`);
  }
}
```

Logs are only shown in development and only for operations taking >200ms.

## File Structure

```
src/
├── app/org/
│   ├── layout.tsx                    # Loads context once, provides to all pages
│   ├── page.tsx                      # Overview page (shell + Suspense)
│   ├── OrgOverviewContent.tsx        # Suspense boundary + data loader
│   ├── people/
│   │   ├── page.tsx                  # People page (shell + Suspense)
│   │   └── PeopleContent.tsx         # Suspense boundary + data loader
│   ├── structure/
│   │   ├── page.tsx                  # Structure page (shell + Suspense)
│   │   └── StructureContent.tsx      # Suspense boundary + data loader
│   ├── activity/
│   │   ├── page.tsx                  # Activity page (shell + Suspense)
│   │   └── ActivityContent.tsx       # Suspense boundary + data loader
│   └── insights/
│       ├── page.tsx                  # Insights page (shell + Suspense)
│       └── OrgInsightsContent.tsx    # Suspense boundary + data loader
├── lib/org/
│   ├── permissions.server.ts         # Cached permission context loader
│   └── data.server.ts                # Cached data loaders
└── components/org/
    └── skeletons/                    # Skeleton components for loading states
```

## Performance Characteristics

### Before Optimization
- Each page called `getOrgPermissionContext()` independently
- Data loaders were called multiple times per request
- Full page blocked until all data loaded
- Tab switches felt sluggish

### After Optimization
- Context loaded once in layout, cached per-request
- Data loaders cached per-request (no duplicate queries)
- Page shell renders immediately, data loads progressively
- Tab switches use `startTransition` for instant feedback

## Best Practices

1. **Always use cached loaders** - Wrap server data loaders with `React.cache()`
2. **Split pages into shell + content** - Keep headers/breadcrumbs outside Suspense
3. **Use skeletons, not spinners** - Skeletons prevent layout shift
4. **Use startTransition for tab switches** - Keeps UI responsive during state updates
5. **Log performance in dev only** - Use `NODE_ENV !== "production"` guards

## Future Improvements

- Consider adding React Query or SWR for client-side data caching
- Implement optimistic updates for mutations
- Add prefetching for adjacent pages on hover
- Consider streaming SSR for even faster initial renders

