# 🚨 Critical Performance Fixes for 8s LCP

## Immediate Actions Required

### 1. **Check Vercel DATABASE_URL** (CRITICAL - Do This First!)
The `connection_limit=1` in your Vercel environment variable is likely causing sequential database queries.

**Steps:**
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Find `DATABASE_URL`
3. Check if it contains `connection_limit=1`
4. If yes, remove `&connection_limit=1` from the URL
5. Save and redeploy

**Expected Impact**: 50-70% faster database queries

---

### 2. **Convert to React Query Hooks** (High Priority)
Replace raw `fetch` calls with React Query hooks for automatic caching and deduplication.

**Files to update:**
- `src/app/home/page.tsx` - Use `useQuery` for pages and projects
- `src/app/(dashboard)/layout.tsx` - Use `useQuery` for user-status
- All wiki pages - Use React Query hooks

**Expected Impact**: 30-50% reduction in API calls, better caching

---

### 3. **Lazy Load Heavy Components** (High Priority)
The home page loads all components upfront. Lazy load heavy ones.

**Components to lazy load:**
- `MeetingsCard`
- Heavy chart/analytics components
- Non-critical UI elements

**Expected Impact**: 40-60% faster initial page load

---

### 4. **Optimize Initial Data Loading** (High Priority)
The dashboard layout makes multiple sequential calls with delays.

**Current issues:**
- Multiple `user-status` calls with delays (200ms, 500ms)
- Sequential API calls
- No prefetching

**Fix:**
- Single `user-status` call
- Parallel data loading
- Use React Query for automatic prefetching

**Expected Impact**: 2-3 seconds faster initial load

---

### 5. **Add Database Indexes** (Medium Priority)
Missing indexes can cause slow queries.

**Indexes to add:**
```sql
CREATE INDEX IF NOT EXISTS idx_workspace_members_user_workspace 
ON workspace_members(userId, workspaceId);

CREATE INDEX IF NOT EXISTS idx_wiki_pages_workspace_published 
ON wiki_pages(workspaceId, isPublished) WHERE isPublished = true;

CREATE INDEX IF NOT EXISTS idx_projects_workspace_created 
ON projects(workspaceId, createdAt DESC);
```

---

## Implementation Order

1. ✅ **Fix Vercel DATABASE_URL** (5 minutes, huge impact)
2. ✅ **Convert home page to React Query** (30 minutes, big impact)
3. ✅ **Lazy load heavy components** (20 minutes, big impact)
4. ✅ **Optimize dashboard layout loading** (30 minutes, big impact)
5. ✅ **Add database indexes** (15 minutes, medium impact)

---

## Expected Results

| Metric | Current | Target | After Fixes |
|--------|--------|--------|-------------|
| **LCP** | 8s | <2.5s | ~2s |
| **FCP** | 2.11s | <1.8s | ~1.5s |
| **TTFB** | 1.74s | <600ms | ~500ms |
| **RES** | 68 | >90 | ~85-90 |

---

## Quick Test After Fixes

1. Hard reload production site (Cmd+Shift+R)
2. Check Network tab:
   - API calls should be parallel
   - Response times <500ms
   - `X-Cache: HIT` on second load
3. Check Vercel Speed Insights:
   - LCP should drop to <3s
   - RES should improve to >80

