# PERFORMANCE.md — Loopwell Performance Baseline & Optimization

> **Documents performance characteristics, architecture decisions, and optimization opportunities.**
> Last updated: March 11, 2026

---

## 1. Architecture Performance Decisions

### Caching (3-Tier)

| Tier | Technology | TTL | Purpose |
|------|-----------|-----|---------|
| **L1** | TanStack Query (client) | 5min stale / 30min gc | UI responsiveness, request deduplication |
| **L2** | Redis (server) | 5s–24h configurable | Cross-request caching, workspace data |
| **L3** | In-memory Map (fallback) | 5min default, 1000 entries max | When Redis unavailable |

**Cache keys:** `WIKI_PAGES`, `PROJECTS`, `TASKS`, `AI_CONTEXT`, `USER_STATUS`, `WORKSPACE_DATA`, `PERMISSIONS`, `ORG_POSITIONS`, `FAVORITES`, `SEARCH_RESULTS`, `CALENDAR_EVENTS`, `AUDIT_LOGS`, `ANALYTICS`, `FEATURE_FLAGS`, `ONBOARDING_PLANS`, `ACTIVITIES`, `PROJECT_TEMPLATES`, `TASK_TEMPLATES`, `MIGRATIONS`, `HEALTH_CHECK`

**Invalidation:** `cache.invalidateWorkspace(wId)` for bulk workspace invalidation; `cache.invalidatePattern(glob)` for targeted invalidation.

---

### Dashboard Bootstrap

- **Single endpoint:** `GET /api/dashboard/bootstrap` loads all dashboard data in one request
- **8 parallel DB queries** via `Promise.all` (projects, wiki pages, workspaces, todos, task status counts, overdue count, workspace meta, drafts)
- **Strict limits enforced:**
  - Projects: 10 max
  - Wiki pages: 4 max
  - Todos: 50 max
  - Drafts: 6 max
- **60s edge cache** with 120s stale-while-revalidate (`Cache-Control: private, s-maxage=60, stale-while-revalidate=120`)
- **Performance guardrail:** Logs warning if response exceeds 1000ms
- **Minimal field selection:** Uses `select` only (no `include`), never loads `content`/`body`/`html` fields

---

### Client-Side Optimizations

- **Heavy widgets lazy-loaded:** `dynamic({ ssr: false })` for dashboard widgets
- **Skeleton loaders** during mount
- **Data prefetching on app load:**
  - Workspaces: 5min stale
  - Pages: 2min
  - Projects: 2min
  - Drafts: 1min
- **On-demand page content prefetch** on hover
- **TanStack Query deduplication** for parallel requests

---

### Database

- **Connection pooling:** Supabase pgbouncer (transaction mode, port 6543)
- **Workspace-scoped indexes** on all 152 models (via `WORKSPACE_SCOPED_MODELS` in scoping middleware)
- **pgvector** for semantic search (`context_embeddings` table)
- **HNSW/IVFFlat index:** Recommended for pgvector (not yet created — see Section 5)

---

## 2. Known Response Times (Development Baseline)

> Extracted from development test session logs. Times vary by machine load, network latency, and cache state.
> **Local** = DB/Prisma only; **API** = external API dependency.

| Endpoint | Typical Range | Notes |
|----------|---------------|-------|
| `GET /api/org/current` | 6–14ms | Local — auth + org context |
| `GET /api/projects` | 9–33ms | Local — cached when warm |
| `GET /api/wiki/pages` | 12–19ms | Local — cached when warm |
| `GET /api/dashboard/bootstrap` | 500–800ms | Local — 8 parallel queries, cold cache |
| `GET /api/calendar/events` | 443–1527ms | **API** — Google Calendar dependency |
| `GET /api/integrations/gmail/messages` | ~1628ms | **API** — Gmail API dependency |
| `POST /api/loopbrain/chat` | 5–11s | **API** — LLM call is bottleneck |
| **Dashboard page load** | ~500–800ms (DB data) | Multiple parallel requests; total dominated by bootstrap |

**Notes:**
- Calendar and Gmail times are external API latency; not optimizable on our side
- Loopbrain times depend on model choice, context size, and tool count
- Bootstrap times assume cold cache; warm cache/edge hit returns faster

---

## 3. Loopbrain Performance

### Agent Loop

- **LLM call is the bottleneck:** 3–10s per turn depending on tool count and context size
- **Tool execution:** typically <100ms for Prisma tools; 500–2000ms for OAuth tools (Gmail, Calendar, Drive)

### Context Bundling

- **Prompt budget management:** 12 context objects max, 6 retrieved, ~900 chars per object
- **Context sources:** Org snapshot, PM (projects/tasks/epics), wiki, calendar, integrations

### Streaming

- **Not yet implemented:** Response buffers fully before sending
- **Opportunity:** Streaming would improve perceived latency (Section 5)

---

## 4. Known Bottlenecks

| Bottleneck | Impact | Optimizable? |
|-----------|--------|--------------|
| **Calendar/Gmail API calls** | 500–1500ms per request | No — external dependency |
| **Loopbrain LLM calls** | 3–10s per turn | Partially — model choice, streaming would improve perceived speed |
| **Dashboard bootstrap (cold cache)** | ~500–800ms | Yes — prefetch, warm cache, query tuning |
| **Full-text search without pgvector index** | Falls back to keyword matching; slower for large wikis | Yes — add HNSW index (Section 5) |

---

## 5. Performance Recommendations (Not Yet Implemented)

| Recommendation | Purpose |
|----------------|---------|
| **Load testing (k6 or Artillery)** | Establish p50/p95/p99 baselines under concurrent load |
| **Connection pool monitoring** | Watch for exhaustion under concurrent load |
| **pgvector HNSW index** on `context_embeddings` | Faster semantic similarity search |
| **Response streaming** for Loopbrain chat | Reduce perceived latency; stream tokens as they arrive |
| **CDN for static assets** | Vercel handles this automatically |
| **Database query analysis** | Identify N+1 patterns if they exist |

---

## 6. Performance Guardrails Already in Place

| Guardrail | Location | Behavior |
|-----------|----------|----------|
| **Dashboard bootstrap slow warning** | `src/app/api/dashboard/bootstrap/route.ts` | Logs warn if response >1000ms |
| **TanStack Query deduplication** | Client | Parallel requests for same key share one network call |
| **Prisma connection pool** | Supabase pgbouncer | Managed pool prevents exhaustion |
| **Edge caching on bootstrap** | `Cache-Control` header | 60s cache, 120s stale-while-revalidate |
| **Lazy loading** | Dashboard widgets | `dynamic({ ssr: false })` prevents unnecessary client work |
| **Strict result limits** | Bootstrap route | MAX_PROJECTS=10, MAX_WIKI_PAGES=4, MAX_TODOS=50, MAX_DRAFTS=6 |
| **Minimal field selection** | Bootstrap route | `select` only; no `include`; no content/body fields |

---

*Last updated: March 11, 2026*
*See `cext/TECH_DEBT.md` for load testing P1 item. See `cext/DEPLOYMENT.md` for infrastructure.*
