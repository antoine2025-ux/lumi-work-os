# Org Center – Insights & Reporting (Milestone L13)  
### Final Recap & Architecture Overview

This document summarizes the complete Insights system introduced in Milestone L13.

---

# 1. High-level Goals

The purpose of Org Insights is to provide organization owners and admins with a concise, data-driven overview of:

- Headcount
- Team/department distribution
- Structural health of the organization
- Growth patterns (join trends)
- Inline insights in operational views (e.g., Structure)

The scope explicitly **excludes**:

- Real-time analytics  
- Predictive modeling  
- Financial data  
- User activity unrelated to Org structure  

This milestone delivers a **foundation layer** that future analytics can build upon.

---

# 2. Architecture Overview

### 2.1 Core engine: `getOrgInsightsSnapshot`

One function powers the entire Insights platform.

**Responsibilities:**

- Gather all org membership records.
- Aggregate people by:
  - Department
  - Team
  - Role
- Compute summary counts.
- Generate a multi-month join trend.
- Return a highly structured JSON payload.

**Signature:**

```typescript
getOrgInsightsSnapshot(
  orgId: string,
  ctx: OrgPermissionContext | null,
  opts: OrgInsightsOptions = {}
): Promise<OrgInsightsSnapshot>
```

**Important constraint:**  
This function **may only run for roles with `org:insights:view` capability** (Owner, Admin).  
Server-side guard ensures Members cannot load snapshot data even if a developer calls it by mistake.

**Location:** `src/lib/org/insights.ts`

---

### 2.2 API Route: `/api/org/insights`

- Returns a full snapshot.
- Fully permission-guarded.
- Returns 401/403 for Members and non-members.
- Used internally by dev tools; UI uses SSR instead of fetching.

**Location:** `src/app/api/org/insights/route.ts`

---

### 2.3 SSR-first Insights Page

The `/org/insights` page is **server-rendered**:

- Loads permission context.
- Validates capability.
- Loads snapshot on the server.
- Renders summary cards + charts via client components.

**Benefits:**

- Faster perceived load.
- Zero flashing / no client fetches.
- Secure (snapshot never leaks to unauthorized users).

**Location:** `src/app/org/insights/page.tsx`

---

# 3. UX Layers

### 3.1 Summary Cards

Render:

- People
- Teams
- Departments
- Roles

Reusable across:

- `/org/insights`
- Insights strip in `/org`

**Component:** `src/components/org/insights/OrgInsightsSummaryCards.tsx`

---

### 3.2 Charts

Two main charts:

1. **Headcount by Department**
   - Bar chart
   - Sorted descending
   - Empty state when no structure

2. **Join Trend**
   - Line chart
   - Month-by-month membership growth
   - Empty state if no recent joins
   - Scoped label when department filter applied

**Components:**
- `src/components/org/insights/OrgInsightsDeptHeadcountChart.tsx`
- `src/components/org/insights/OrgInsightsJoinTrendChart.tsx`

---

### 3.3 Filters

A lightweight **Department focus** filter:

- Client-only (no new API calls).
- Hidden when < 2 departments exist.
- Affects both charts.
- Provides clarity: "this department (approximate)" vs "whole org".

**Component:** `src/components/org/insights/OrgInsightsChartsSection.tsx`

---

# 4. Integrations Across Org Center

### 4.1 Org Overview Insights Strip

Visible only to:

- Owner
- Admin  

(Users with `org:insights:view`)

Shows:

- Summary cards
- Empty state on new orgs

Does **not** show charts (kept intentionally lightweight).

**Components:**
- `src/components/org/insights/OrgOverviewInsightsStrip.tsx` (client)
- `src/components/org/insights/OrgOverviewInsightsStripServer.tsx` (server wrapper)

**Integration:** `src/app/org/page.tsx` (wrapped in Suspense)

---

### 4.2 Structure → Departments Inline Insight

Shows **Top 3 departments by headcount**.

- Helps Admins/Owners get structural context while managing teams/departments.
- Hidden when:
  - User lacks permission
  - All headcounts are zero
  - No departments exist

**Component:** `src/components/org/structure/DepartmentsTopInsights.tsx`

**Integration:** `src/app/org/structure/page.tsx` (DepartmentsTab, wrapped in Suspense)

---

# 5. Permissions Model (Insights)

### 5.1 Capability added in L13

`org:insights:view`

Mapped to:

- Owner → yes  
- Admin → yes  
- Member → no  
- Non-member → no  

**Location:** `src/lib/org/capabilities.ts`

---

### 5.2 Where the capability is checked

- Sidebar (Insights tab visible only to allowed roles)
- Org Overview strip
- Structure inline insight
- `/org/insights` page
- `/api/org/insights` route
- `getOrgInsightsSnapshot` (server guard)

---

### 5.3 Security guarantee

No matter what, **a Member cannot trigger snapshot generation** due to server guard.

**Server guard implementation:**

```typescript
export function assertCanViewInsights(ctx: OrgPermissionContext | null) {
  if (!ctx || !hasOrgCapability(ctx.role, "org:insights:view")) {
    throw new Error("Not allowed to load Org Insights snapshot.");
  }
}
```

This guard runs at the start of `getOrgInsightsSnapshot()` and prevents any unauthorized snapshot loads.

---

# 6. Empty-state & Loading Behavior

### 6.1 Empty states

- Summary cards → show zeros calmly.
- Department chart → text hint when no dept distribution exists.
- Join chart → hint when no join activity exists.
- Overview strip → "Insights will appear once your organization has people..." message.
- Inline insights → hidden entirely when no meaningful data.

---

### 6.2 Loading skeleton

`src/app/org/insights/loading.tsx` displays:

- Skeleton title + description
- Skeleton summary cards
- Skeleton chart areas

Next.js automatically shows this on first load or slow navigation.

---

# 7. Developer Workflow Improvements

### 7.1 Snapshot stability

Snapshot function produces consistent results:

- Type-safe
- Predictable
- No external dependencies

---

### 7.2 Easy QA

`src/docs/org-center-l13-insights-qa.md` provides:

- Role QA
- Chart QA
- Gating QA
- Filter QA
- Structure inline insight QA

---

### 7.3 Long-term extensibility

Future Insights milestones can add:

- Turnover trends
- Tenure distribution
- Location breakdowns
- Team-size evolution
- Reporting-line health metrics

---

# 8. What's Left Out (Intentional)

- No caching layer (kept simple for now)
- No metadata or saved reports
- No CSV/JSON export for Insights (Activity has export; Insights does not yet)
- No live-updating charts

These can be future milestones.

---

# 9. Snapshot Structure (Reference)

```typescript
{
  orgId: string,
  generatedAt: string,
  summary: {
    totalPeople: number,
    totalTeams: number,
    totalDepartments: number,
    totalRoles: number
  },
  byDepartment: [
    { departmentId, departmentName, headcount }
  ],
  byTeam: [
    { teamId, teamName, departmentId, departmentName, headcount }
  ],
  byRole: [
    { roleId, roleName, headcount }
  ],
  joinTrend: [
    { periodStart, periodEnd, newMembers }
  ]
}
```

Used consistently across:

- Insights page
- Overview strip
- Department inline insight
- Future analytics UI

**Type definition:** `src/lib/org/insights.ts` → `OrgInsightsSnapshot`

---

# 10. Data Flow

### 10.1 Snapshot generation

1. `getOrgInsightsSnapshot()` is called with `orgId` and `permissionContext`.
2. Server guard validates `org:insights:view` capability.
3. Prisma queries fetch:
   - `WorkspaceMember` records (memberships)
   - `OrgTeam` records (teams)
   - `OrgDepartment` records (departments)
   - `RoleCard` records (roles)
   - `OrgPosition` records (user → team/role mappings)
4. Aggregations compute:
   - Summary counts
   - Department headcounts (via positions → teams → departments)
   - Team headcounts (via positions → teams)
   - Role headcounts (via positions → roles)
   - Join trend buckets (monthly, last N months)
5. Structured snapshot returned.

---

### 10.2 UI rendering

**SSR path (Insights page):**
1. Server component loads permission context.
2. Validates capability.
3. Calls `getOrgInsightsSnapshot()`.
4. Passes snapshot to client components.
5. Charts render with Recharts.

**Client path (Overview strip, inline insights):**
1. Server component wrapper loads permission context.
2. Validates capability.
3. Calls `getOrgInsightsSnapshot()`.
4. Renders client component with snapshot.
5. Wrapped in Suspense for loading states.

---

# 11. Key Files Reference

**Backend:**
- `src/lib/org/insights.ts` - Snapshot generator + types
- `src/app/api/org/insights/route.ts` - API endpoint
- `src/lib/org/capabilities.ts` - Permission definitions

**Frontend Pages:**
- `src/app/org/insights/page.tsx` - Main Insights page (SSR)
- `src/app/org/insights/loading.tsx` - Loading skeleton
- `src/app/org/page.tsx` - Overview (includes insights strip)

**Components:**
- `src/components/org/insights/OrgInsightsSummaryCards.tsx` - Summary metrics
- `src/components/org/insights/OrgInsightsChartsSection.tsx` - Charts + filter wrapper
- `src/components/org/insights/OrgInsightsDeptHeadcountChart.tsx` - Department bar chart
- `src/components/org/insights/OrgInsightsJoinTrendChart.tsx` - Join trend line chart
- `src/components/org/insights/OrgOverviewInsightsStrip.tsx` - Overview strip (client)
- `src/components/org/insights/OrgOverviewInsightsStripServer.tsx` - Overview strip (server)
- `src/components/org/structure/DepartmentsTopInsights.tsx` - Inline insight

**Documentation:**
- `src/docs/org-center-l13-plan.md` - Original planning doc
- `src/docs/org-center-l13-insights-qa.md` - QA checklist
- `src/docs/org-center-l13-recap.md` - This document

---

# 12. Summary

L13 successfully introduced a **complete Insights foundation** for Org Center:

- Secure permission-gated snapshot engine  
- Full SSR-driven Insights page  
- Lightweight Overview insights strip  
- Inline insights in Structure  
- Filters + empty-state UX  
- Unified data model across all pages  
- Professional QA processes  

The system is now **production-ready** and designed for expansion.

---

# NEXT RECOMMENDED STEP

Next recommended step: Begin **L14 – Org Roles UX & Advanced Permissions**, improving clarity around role capabilities, mapping roles to actions, and integrating richer permission visuals into the Org interface.

