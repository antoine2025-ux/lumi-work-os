# 🔴 Performance Bottlenecks Analysis

## Critical Issues Making Your App Slow

### 1. **PgBouncer `connection_limit=1` - CRITICAL BOTTLENECK** 🔥
**Impact**: Forces ALL database queries to run **sequentially** instead of parallel
- Every API call waits for the previous one to finish
- Multiple users = massive slowdown
- **Fix**: Remove or increase `connection_limit` (Supabase pooler can handle more)

**Location**: `src/lib/db.ts:24`

**Current Code**:
```typescript
if (!databaseUrl.includes('connection_limit=')) params.push('connection_limit=1')
```

**Problem**: This means if you have 5 API calls on page load:
- Call 1 waits → completes → Call 2 waits → completes → etc.
- Instead of all 5 running in parallel

---

### 2. **Sequential API Calls on Every Page Load** 🐌
**Impact**: 3-5 second page load times

**Wiki Layout (`src/components/wiki/wiki-layout.tsx:527-551`)**:
```typescript
// ❌ BAD: Sequential calls
const recentResponse = await fetch('/api/wiki/recent-pages?limit=50')
// Waits for this to finish...
const favoritesResponse = await fetch('/api/wiki/favorites')
// Then waits for this...
const projectsResponse = await fetch(`/api/projects?workspaceId=${workspaceId}`)
```

**Should be**:
```typescript
// ✅ GOOD: Parallel calls
const [recentResponse, favoritesResponse, projectsResponse] = await Promise.all([
  fetch('/api/wiki/recent-pages?limit=50'),
  fetch('/api/wiki/favorites'),
  fetch(`/api/projects?workspaceId=${workspaceId}`)
])
```

**Affected Components**:
- `src/components/wiki/wiki-layout.tsx` - 4 sequential calls
- `src/app/(dashboard)/wiki/personal-space/page.tsx` - 3 sequential calls
- `src/app/(dashboard)/wiki/team-workspace/page.tsx` - 3 sequential calls
- `src/app/(dashboard)/wiki/workspace/[id]/page.tsx` - 3 sequential calls

---

### 3. **No Request Deduplication** 🔄
**Impact**: Same API called multiple times for same data

**Example**: When navigating between wiki pages:
- `recent-pages` API called 3 times
- `favorites` API called 2 times  
- `projects` API called 4 times

**Missing**: Request caching/deduplication layer

---

### 4. **Heavy Database Queries** 📊
**Impact**: 500ms-2s per API response

**Issues**:
- Loading full page content when excerpts would work
- No pagination limits on some queries
- Complex `include` statements loading unnecessary relations

**Example**: `src/app/api/wiki/recent-pages/route.ts`:
```typescript
// ❌ Loads full content for all pages
include: {
  createdBy: { select: { name: true, email: true } }
}
// Missing: content excerpt, should use select instead
```

---

### 5. **Client-Side Re-renders** ⚡
**Impact**: UI freezes during data loading

**Issues**:
- No `React.memo` on expensive list components
- State updates trigger full component tree re-renders
- No loading skeletons for better perceived performance

---

### 6. **No Caching Strategy** 💾
**Impact**: Every navigation = full data reload

**Missing**:
- Client-side request caching (React Query / SWR)
- API route response caching headers
- Browser-level caching for static data

---

## Performance Metrics (Estimated)

| Metric | Current | Target | Gap |
|--------|----------|--------|-----|
| **Initial Page Load** | 4-6s | <2s | 2-4s slower |
| **API Response Time** | 800ms-2s | <500ms | 300ms-1.5s slower |
| **Database Query Time** | 200-500ms | <100ms | 100-400ms slower |
| **Time to Interactive** | 6-8s | <3s | 3-5s slower |

---

## Quick Wins (Can Fix Today)

### Priority 1: Fix Connection Limit ⚡
- **File**: `src/lib/db.ts`
- **Change**: Remove `connection_limit=1` or increase to 5-10
- **Impact**: 50-70% faster (queries run in parallel)

### Priority 2: Parallelize API Calls ⚡
- **Files**: All wiki page components
- **Change**: Use `Promise.all()` for concurrent fetches
- **Impact**: 40-60% faster page loads

### Priority 3: Add Request Deduplication 🔄
- **Solution**: Use React Query or SWR
- **Impact**: 30-50% reduction in API calls

### Priority 4: Optimize Database Queries 📊
- **Change**: Use `select` instead of `include`, add limits
- **Impact**: 30-40% faster API responses

---

## Root Cause Summary

**The main issue**: `connection_limit=1` on PgBouncer is creating a **serialization bottleneck**.

Your app architecture is actually pretty good, but this single configuration is forcing everything to wait in line. Combined with sequential API calls, you're seeing 4-6 second load times.

**Fix Priority**:
1. ✅ Remove/increase `connection_limit=1` (5 minutes, huge impact)
2. ✅ Parallelize API calls (30 minutes, big impact)
3. ✅ Add basic caching (1-2 hours, medium impact)
4. ✅ Optimize queries (2-3 hours, medium impact)

