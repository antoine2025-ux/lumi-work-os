# 🚀 Production Performance Estimation & Bottleneck Analysis

## Executive Summary

Based on codebase analysis, here are the estimated sources of speed issues in your production deployment, ranked by impact:

| Issue | Estimated Impact | Priority | Fix Complexity |
|-------|-----------------|----------|----------------|
| **Vercel Serverless Cold Starts** | 1-3s delay | 🔴 Critical | Medium |
| **Large Bundle Size (491KB)** | 500ms-1.5s | 🔴 Critical | Medium |
| **Authentication Query Chain** | 300-800ms | 🟠 High | Low |
| **Database Region Mismatch** | 200-500ms | 🟠 High | Low |
| **Sequential API Calls** | 200-400ms | 🟡 Medium | Low |
| **Missing Database Indexes** | 100-300ms | 🟡 Medium | Low |
| **Heavy Database Queries** | 100-200ms | 🟡 Medium | Medium |

---

## 🔴 Critical Issues (Highest Impact)

### 1. Vercel Serverless Cold Starts
**Estimated Impact**: 1-3 seconds added to TTFB (Time To First Byte)

**Problem**:
- Vercel serverless functions have cold start latency
- First request after inactivity takes 1-3 seconds to initialize
- Your TTFB is currently ~1.74s, which suggests cold starts are happening

**Evidence**:
- All API routes are serverless functions (marked with `ƒ` in build output)
- No keep-alive mechanism
- No scheduled warm-up pings

**Solutions** (in order of effectiveness):
1. **Upgrade to Vercel Pro** - Better cold start handling, faster initialization
2. **Implement Keep-Alive Pings** - Scheduled cron job to ping health endpoint every 5 minutes
3. **Use Edge Functions** - For non-database routes, move to Edge Runtime
4. **Optimize Function Size** - Smaller bundles = faster cold starts

**Expected Improvement**: 1-2 seconds faster TTFB

---

### 2. Large Bundle Size (491KB First Load JS)
**Estimated Impact**: 500ms-1.5s delay in Time to Interactive

**Problem**:
- Your First Load JS is **491KB**, which is quite large
- This blocks rendering and delays interactivity
- All pages share this large bundle

**Evidence from Build Output**:
```
Route (app)                                                Size  First Load JS
┌ ○ /                                                     216 B         491 kB
```

**Root Causes**:
1. **Heavy Dependencies**:
   - `@tiptap/react` + extensions (~150KB)
   - `recharts` (~80KB)
   - `react-d3-tree` (~60KB)
   - `@radix-ui/*` components (~100KB)
   - `framer-motion` (~50KB)
   - `socket.io-client` (~40KB)

2. **No Code Splitting**:
   - All components loaded upfront
   - No route-based splitting
   - Heavy components not lazy-loaded

**Solutions**:
1. **Lazy Load Heavy Components**:
   ```typescript
   // Already done for Header, but need more:
   const TipTapEditor = dynamic(() => import('./TipTapEditor'), { ssr: false })
   const Charts = dynamic(() => import('./Charts'), { ssr: false })
   const TreeView = dynamic(() => import('./TreeView'), { ssr: false })
   ```

2. **Route-Based Code Splitting**:
   - Use Next.js automatic code splitting
   - Ensure dynamic imports for non-critical routes

3. **Tree Shaking**:
   - Import only what you need from large libraries
   - Use `import { X } from 'library'` instead of `import *`

4. **Replace Heavy Libraries**:
   - Consider lighter alternatives for charts (e.g., `chart.js` instead of `recharts`)
   - Use native browser APIs where possible

**Expected Improvement**: 300-800ms faster Time to Interactive

---

## 🟠 High Priority Issues

### 3. Authentication Query Chain
**Estimated Impact**: 300-800ms per request

**Problem**:
Every API request calls `getUnifiedAuth()`, which executes:
1. `getServerSession()` - Session lookup
2. `prisma.user.findUnique()` - User lookup
3. `prisma.workspaceMember.findMany()` - Workspace membership lookup
4. Multiple `prisma.workspaceMember.findUnique()` calls for validation

**Evidence**:
```typescript
// src/lib/unified-auth.ts:29-107
// Called on EVERY API request
export async function getUnifiedAuth(request?: NextRequest): Promise<AuthContext> {
  // 1. Session lookup
  session = await getServerSession(authOptions)
  
  // 2. User lookup
  user = await prisma.user.findUnique({ where: { email: session.user.email } })
  
  // 3. Workspace resolution (multiple queries)
  const { workspaceId, workspaceMember } = await resolveActiveWorkspaceIdWithMember(user.id, request)
}
```

**Solutions**:
1. **Cache Authentication Results**:
   - Cache `getUnifiedAuth()` results for 30-60 seconds
   - Use session token as cache key
   - Already partially implemented in `/api/auth/user-status` but not in `getUnifiedAuth` itself

2. **Optimize Query Chain**:
   - Combine user + workspace lookup into single query with joins
   - Use `include` to get user + workspaceMember in one query

3. **Session-Based Caching**:
   - Store workspaceId in session/JWT to avoid database lookup
   - Only query database if session doesn't have workspaceId

**Expected Improvement**: 200-500ms faster per API request

---

### 4. Database Region Mismatch
**Estimated Impact**: 200-500ms latency per query

**Problem**:
If your Vercel deployment region doesn't match your Supabase database region, you get significant network latency.

**Check Required**:
1. **Vercel Region**: 
   - Go to Vercel Dashboard → Project → Settings → General
   - Check "Deployment Region"

2. **Supabase Region**:
   - Go to Supabase Dashboard → Project Settings → Infrastructure
   - Check "Database Region"

**If Mismatched**:
- **US → EU**: Adds ~150-200ms per query
- **EU → US**: Adds ~150-200ms per query
- **Asia → US/EU**: Adds ~300-500ms per query

**Solution**:
- Ensure both are in the same region (preferably closest to your users)
- If using Supabase pooler, ensure pooler region matches too

**Expected Improvement**: 200-500ms faster per database query

---

## 🟡 Medium Priority Issues

### 5. Sequential API Calls
**Estimated Impact**: 200-400ms delay on page load

**Status**: ✅ **Partially Fixed** - Some components already use `Promise.all()`

**Remaining Issues**:
- Some components may still have sequential calls
- Need to verify all data loading uses parallel fetching

**Already Fixed**:
- ✅ `wiki-layout.tsx` - Uses `Promise.all()` for parallel calls
- ✅ `home/page.tsx` - Uses `Promise.all()` for parallel calls
- ✅ Dashboard layout - Uses React Query (automatic deduplication)

**Check Needed**:
- Verify all wiki pages use parallel fetching
- Check if any components still have sequential `await` calls

**Expected Improvement**: 200-400ms faster page loads (if any remaining sequential calls are fixed)

---

### 6. Missing Database Indexes
**Estimated Impact**: 100-300ms per query

**Potential Missing Indexes**:
```sql
-- Check if these exist:
CREATE INDEX IF NOT EXISTS idx_workspace_members_user_workspace 
ON workspace_members(userId, workspaceId);

CREATE INDEX IF NOT EXISTS idx_wiki_pages_workspace_published 
ON wiki_pages(workspaceId, isPublished) WHERE isPublished = true;

CREATE INDEX IF NOT EXISTS idx_projects_workspace_created 
ON projects(workspaceId, createdAt DESC);

CREATE INDEX IF NOT EXISTS idx_tasks_workspace_status 
ON tasks(workspaceId, status);

CREATE INDEX IF NOT EXISTS idx_tasks_project_status 
ON tasks(projectId, status);
```

**Solution**:
- Run `EXPLAIN ANALYZE` on slow queries
- Add indexes for frequently queried columns
- Use composite indexes for multi-column queries

**Expected Improvement**: 100-300ms faster queries

---

### 7. Heavy Database Queries
**Estimated Impact**: 100-200ms per query

**Issues Found**:
1. **Projects API** (`/api/projects/route.ts`):
   - ✅ Already optimized with `select` instead of `include`
   - ✅ Limits tasks to 5 most recent
   - ✅ Limits members to 10

2. **Recent Pages API** (`/api/wiki/recent-pages/route.ts`):
   - ✅ Already optimized with `select` instead of `include`
   - ✅ Uses excerpt instead of full content
   - ✅ Caps at 100 items

3. **AI Chat API** (needs verification):
   - May be loading too much context data
   - Check if it's using optimized queries

**Status**: Most queries are already optimized, but verify AI routes

**Expected Improvement**: 50-100ms faster (if any remaining heavy queries are optimized)

---

## ✅ Already Optimized (Good Work!)

1. ✅ **Database Connection Limit** - Removed `connection_limit=1` (allows parallel queries)
2. ✅ **API Route Caching** - Redis/in-memory cache implemented
3. ✅ **HTTP Caching Headers** - Cache-Control headers added
4. ✅ **React Query** - Automatic request deduplication
5. ✅ **Parallel API Calls** - Most components use `Promise.all()`
6. ✅ **Query Optimization** - Using `select` instead of `include` where possible

---

## 📊 Performance Metrics Estimation

### Current State (Estimated):
| Metric | Current | Target | Gap |
|--------|---------|--------|-----|
| **TTFB** | 1.74s | <600ms | +1.1s |
| **LCP** | 8s | <2.5s | +5.5s |
| **FCP** | 2.11s | <1.8s | +0.3s |
| **Time to Interactive** | 6-8s | <3s | +3-5s |
| **API Response Time** | 800ms-2s | <500ms | +300ms-1.5s |

### After Fixes (Estimated):
| Metric | After Fixes | Improvement |
|--------|-------------|-------------|
| **TTFB** | 600-800ms | **~1s faster** |
| **LCP** | 2-3s | **~5s faster** |
| **FCP** | 1.5-1.8s | **~0.5s faster** |
| **Time to Interactive** | 2.5-3.5s | **~4s faster** |
| **API Response Time** | 400-600ms | **~500ms faster** |

---

## 🎯 Recommended Action Plan

### Phase 1: Quick Wins (1-2 hours)
1. ✅ **Check Database Region Match** (5 min)
   - Verify Vercel and Supabase regions match
   - Fix if mismatched

2. ✅ **Add Keep-Alive Pings** (30 min)
   - Create cron job to ping `/api/health` every 5 minutes
   - Prevents cold starts

3. ✅ **Add Missing Database Indexes** (15 min)
   - Run the SQL indexes listed above
   - Verify with `EXPLAIN ANALYZE`

### Phase 2: Medium Impact (2-4 hours)
4. ✅ **Cache Authentication Results** (1 hour)
   - Add caching to `getUnifiedAuth()` function
   - Use session token as cache key
   - 30-60 second TTL

5. ✅ **Lazy Load Heavy Components** (2 hours)
   - Lazy load TipTap editor
   - Lazy load charts
   - Lazy load tree view
   - Lazy load non-critical components

### Phase 3: High Impact (4-8 hours)
6. ✅ **Optimize Bundle Size** (4-6 hours)
   - Analyze bundle with `@next/bundle-analyzer`
   - Replace heavy libraries with lighter alternatives
   - Implement better code splitting
   - Tree shake unused code

7. ✅ **Consider Vercel Pro** (if budget allows)
   - Better cold start handling
   - Faster function initialization
   - Better performance monitoring

---

## 🔍 Diagnostic Commands

### Check Bundle Size:
```bash
npm run build
# Look for "First Load JS" sizes >300KB
```

### Analyze Bundle:
```bash
npm install @next/bundle-analyzer
# Add to next.config.ts and run build
```

### Check Database Performance:
```sql
-- Check slow queries
SELECT * FROM pg_stat_statements 
ORDER BY total_exec_time DESC 
LIMIT 10;

-- Check missing indexes
SELECT schemaname, tablename, attname, n_distinct, correlation
FROM pg_stats
WHERE schemaname = 'public'
ORDER BY abs(correlation) DESC;
```

### Check Vercel Function Performance:
- Go to Vercel Dashboard → Analytics → Functions
- Check "Cold Start" and "Duration" metrics
- Identify slow functions

---

## 📝 Notes

- **Cold Starts**: Most impactful issue, but hardest to fix without Vercel Pro
- **Bundle Size**: Second most impactful, but requires code changes
- **Authentication**: Already partially optimized, but can be improved further
- **Database**: Already well-optimized, but region matching is critical

**Estimated Total Improvement**: 4-6 seconds faster page loads, 1-2 seconds faster API responses

