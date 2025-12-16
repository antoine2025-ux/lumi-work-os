# Org Center – Milestone L13 Plan  
## Org Insights & Reporting (v1)

### 1. Goals

L13 focuses on **lightweight, actionable insights** inside Org Center, not a full analytics product.

**Primary goals:**

- Give Owners/Admins a **quick sense of org shape**:
  - Headcount by department/team.
  - Role distribution (IC vs Manager, or similar).
  - Growth over time (basic join trend).
- Integrate insights **directly into Org Center**, not a separate analytics app:
  - Small charts.
  - Highlighted metrics.
  - Simple tables.

**Secondary goals:**

- Respect existing **permissions** from L12 (Owner/Admin visibility).
- Use **existing data** where possible (avoid heavy new pipelines initially).
- Design in a way that can later expand to:
  - Engagement metrics.
  - Space/Loopbrain usage by team/role.
  - Performance and automation hooks.

---

### 2. Where will Insights live?

**Proposed surfaces:**

1. **Org Overview (/org)**  
   - Add a compact **"Org Insights" strip**:
     - Total people
     - Teams per department
     - % of people with a manager (if we have reporting lines)
   - A small "Org snapshot" chart (e.g. headcount over last N months).

2. **New "Insights" page (/org/insights) – optional**  
   - A dedicated page for richer charts/tables:
     - Headcount by team/department.
     - Role breakdown.
     - New members over time.
   - Only visible to **Owner/Admin**.

3. **Inline insights on other pages**  
   - People:
     - "Top 3 teams by headcount".
   - Structure:
     - Department cards show headcount rollup.
   - Org chart:
     - Hovering or side panel shows aggregate info (e.g. team size, reports).

For L13 v1, we'll focus on:

- Enhancing **Org Overview**.
- Adding a simple **/org/insights** page with a few core charts.

---

### 3. Initial Metrics & Visuals (v1)

We want a minimal but meaningful set of insights.

#### 3.1 Core metrics

- **Total headcount** (current org members).
- **Headcount by department** (top 5, "others" aggregated).
- **Headcount by team** (top 5, "others" aggregated).
- **Role distribution**:
  - By role name.
  - Or grouped: "IC vs Manager" if we have that concept.
- **Join trend**:
  - New members per week/month for last 3–6 months.

#### 3.2 Visualizations

- **Small cards**:
  - `Total people`, `Teams`, `Departments`, `Active roles`.
- **Bar chart**:
  - Headcount by department (top N).
- **Stacked bar or donut**:
  - Role distribution.
- **Line chart**:
  - New members over time.

We'll use lightweight charts (e.g., Recharts or a simple custom SVG) and keep the **dark, minimal Loopwell visual style**.

---

### 4. Data Sources & Model (concept)

We'll primarily derive insights from:

- `OrgMembership` / `User`:
  - Joining date (if we have it).
  - Role, team, department relationships.
- `Team` and `Department` models:
  - Org-level relationships.
- `Role` model:
  - Labels and category (IC vs Manager, optional).

**We will **not**:**

- Add heavy event tracking pipelines in L13.
- Build full-blown time-series storage (we'll approximate via createdAt where possible).

**We **might** add:**

- A simple `orgMetricSnapshot` table later if we need faster dashboards, but not in L13 Step 1.

---

### 5. Permissions & Access

Insights should respect the L12 permission model:

- **Owner**:
  - Sees all insights, including sensitive org-level numbers.
- **Admin**:
  - Sees most org metrics (headcount, team breakdown, trends).
- **Member**:
  - Probably sees high-level non-sensitive counts on Org Overview (e.g., total people, teams) but not the dedicated /org/insights page.
- **Non-member**:
  - No access; sees standard "no access to Org Center" state.

We'll formalize which capabilities are needed in L13 Step 2 by extending `OrgCapability` for insights.

---

### 6. UX & Layout Notes

- Keep the **Org Overview** page primary:
  - A small "Insights" section should feel like a natural extension.
  - No overwhelming dashboards; just **3–5 clear visuals/cards**.
- The optional **/org/insights** page:
  - Can show more charts and tables.
  - Should reuse the same header + sidebar as other Org pages.
  - Should feature progressive disclosure (no giant wall of charts).

---

### 7. Phased Implementation Plan (Draft)

**L13 – Step 2**  
- Define **Insights capabilities** and access rules.
- Extend `OrgCapability` and Org sidebar for Insights page.

**L13 – Step 3**  
- Define **Prisma queries** (or data loader) for core metrics:
  - Headcount, headcount by department, roles, join trend.

**L13 – Step 4**  
- Implement a basic `/org/insights` API endpoint returning a **single consolidated payload**:
  - `headcount`, `byDepartment`, `byTeam`, `byRole`, `joinTrend`.

**L13 – Step 5**  
- Create `/org/insights` page with:
  - Metric cards.
  - 1–2 charts (department bar, join trend line).

**L13 – Step 6**  
- Add small "Insights snapshot" section to `/org` overview using the same API.

**L13 – Step 7+**  
- Polish visuals, add loading skeletons, refine filters, potentially add:
  - Time range selector.
  - Role filter.
  - Department/team drill-ins.

---

### 8. Open Questions (to be clarified later)

- Do Members see any Insights beyond simple counts?
- How far back should join trends go (3 months, 6 months, 12 months)?
- Do we need **custom date filters** in v1 or is a fixed window enough?
- Should Insights ever include **usage data** (e.g., Spaces, Loopbrain) or is that a future milestone?

---

## NOTES

- This plan is intentionally scoped to **lightweight analytics** that sit within Org Center.
- It builds entirely on **existing data** and the L12 permission framework.
- Future milestones can extend this into:
  - Engagement dashboards.
  - Automation triggers based on metrics.
  - Cross-module insights (Org + Spaces + Loopbrain).

---

## NEXT RECOMMENDED STEP

**Next recommended step:** Milestone L13 – Step 2: Extend the **Org capability model** to include insights-related capabilities (e.g. `org:insights:view`) and wire basic access control for the future `/org/insights` page.

