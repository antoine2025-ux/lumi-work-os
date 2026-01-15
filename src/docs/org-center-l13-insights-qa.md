# Org Center – L13 Insights QA Checklist (v1)

This checklist validates **Org Insights & Reporting** across:

- Roles (Owner/Admin/Member/Non-member)
- Data states (healthy data vs. almost-empty org)
- UX behavior (filters, charts, empty states)

Use it:

- Before demos.
- After changing Insights queries or visuals.
- When debugging "why don't I see insights?" issues.

---

## 1. Role-based Access

### 1.1 Owner

- [ ] `/org/insights` is accessible without errors.
- [ ] Org sidebar shows an **"Insights"** item.
- [ ] Org Overview (`/org`) shows the **"Org insights" strip** under the header.
- [ ] Structure → Departments shows **"Top departments by headcount"** inline insight.

### 1.2 Admin

- [ ] Same as Owner (Insights visible in sidebar + overview strip).
- [ ] `/org/insights` content (summary cards + charts + filters) is fully visible and interactive.

### 1.3 Member

- [ ] Org sidebar does **not** show an "Insights" item.
- [ ] `/org/insights` (if accessed via manually typing URL) shows a clean **no-access** card:
  - "You don't have permission to view insights for this org."
- [ ] Org Overview:
  - Does **not** show the Org insights strip.
- [ ] Structure → Departments:
  - Does **not** show "Top departments by headcount" inline insight.

### 1.4 Non-member

- [ ] Any direct visit to `/org/insights` shows the standard **Org Center no-access** state.
- [ ] No snapshot data is returned for non-members (API responds with 401/403).

---

## 2. Org Insights Page (`/org/insights`)

### 2.1 Summary cards

With a populated org:

- [ ] Cards show:
  - People (total headcount)
  - Teams
  - Departments
  - Roles
- [ ] Values are non-negative integers.
- [ ] Numbers match expectations from:
  - People directory
  - Structure pages (Teams/Departments/Roles).

With a nearly empty org (e.g. 0–1 people):

- [ ] Cards display zeros calmly (no errors, no NaN).

### 2.2 Department headcount chart

With multiple departments:

- [ ] "Headcount by department" chart renders properly.
- [ ] X-axis labels show department names (or "Unassigned" when relevant).
- [ ] Bars heights reflect relative headcounts.
- [ ] Tooltip shows department name + headcount.

With no departments or all-zero data:

- [ ] Chart area shows the **empty state text**:
  > "Not enough department data yet. Once people are assigned to departments, you'll see headcount here."

### 2.3 Join trend chart

With recent join activity:

- [ ] "New members over time" chart renders line and dots.
- [ ] X-axis labels show recent months (YYYY-MM).
- [ ] Tooltip values match expected join counts from membership createdAt dates.

With no recent joins:

- [ ] Chart area shows the **empty state text**:
  > "No recent join activity yet. As people join this org, you'll see the trend here."

---

## 3. Filters – Department Focus

### 3.1 Dropdown behavior

As Owner/Admin on `/org/insights`:

- [ ] A "Department focus" dropdown appears above the charts.
- [ ] Default selection: **All departments**.
- [ ] Opening dropdown shows:
  - "All departments"
  - One option per department (name).

### 3.2 Interaction

- [ ] Selecting a department updates **Dept headcount chart** to show only that department.
- [ ] Join trend description updates to:
  - "Shows how many people joined this department (approximate)…" when a department is selected.
  - "Shows how many people joined the whole org…" when "All departments" is selected.
- [ ] Switching back to "All departments" restores full dept chart.

### 3.3 No-department state

When there are no departments:

- [ ] "Department focus" dropdown is **hidden** or disabled.
- [ ] Charts fall back to default (All departments / no data).

---

## 4. Org Overview – Insights Strip

On `/org` as Owner/Admin:

- [ ] "Org insights" section appears under the Org overview header.
- [ ] Strip uses same metrics as `/org/insights` summary cards:
  - People, Teams, Departments, Roles.
- [ ] Values match the dedicated Insights page for the same org.
- [ ] Layout:
  - Uses the same dark theme and spacing as the rest of Org overview.
  - Does not visually overwhelm or dominate the page.

As Member:

- [ ] "Org insights" strip is **not** visible.

---

## 5. Structure – Departments Inline Insight

On `/org/structure` with Departments tab active (Owner/Admin):

- [ ] A small card appears:
  - Title: "Top departments by headcount"
  - Up to 3 departments listed.
- [ ] Headcounts align with:
  - Dept chart on `/org/insights`.
  - Department membership derived from People/Structure.
- [ ] If there are fewer than 3 departments, it shows correctly (1–2 rows, no errors).

In an org with **no departments**:

- [ ] Inline insight does not appear at all (no error state).

As Member / Non-member:

- [ ] Inline insight does not appear.

---

## 6. Loading & Error Handling

### 6.1 Loading

- [ ] Navigating to `/org/insights` shows the **loading skeleton**:
  - Skeleton title & description.
  - Skeleton summary cards.
  - Skeleton chart blocks.
- [ ] Once data loads, skeleton disappears cleanly (no flash).

### 6.2 Errors

Simulate temporary issues (e.g. by breaking the API in dev):

- [ ] If `/api/org/insights` fails, the page shows a meaningful error state or at least a generic "Something went wrong" message (depending on implementation).
- [ ] Errors do **not** crash the entire Org Center shell.

---

## 7. Permissions + Insights Consistency

Double-check consistency for each role:

### Owner

- [ ] Has `org:insights:view` in the capability matrix.
- [ ] Can access `/org/insights` and see everything.
- [ ] Sees Org insights strip on `/org`.
- [ ] Sees inline "Top departments by headcount" on Structure → Departments.

### Admin

- [ ] Same as Owner (unless the matrix deliberately restricts certain insights).
- [ ] If any restriction differs, it is clearly documented in the capabilities table.

### Member

- [ ] Does **not** have `org:insights:view`.
- [ ] Never sees Insights sidebar link.
- [ ] Never sees Org insights strip or inline dept insight.
- [ ] Always sees a calm no-access message if visiting `/org/insights` directly.

### Non-member

- [ ] Has no Org Center access; `/org/insights` is unreachable except via no-access state.
- [ ] Backend ensures no snapshot is returned for non-members.

---

## 8. Findings & Follow-ups

Use this section to document discrepancies found during QA.

Example entries:

- [ ] **ISSUE**: Admin cannot see Org Overview insights strip.
  - **Expected**: Admin has `org:insights:view`.
  - **Cause**: `hasOrgCapability` check on `/org` page only considers Owner.
  - **Status**: TODO / IN PROGRESS / DONE.

- [ ] **ISSUE**: Member still sees "Insights" in sidebar.
  - **Expected**: Only Owner/Admin.
  - **Cause**: Sidebar logic not updated to include role check.
  - **Status**: TODO.

---

# NOTES

- This QA doc does **not** introduce new behavior; it helps you quickly re-check L13 features after changes.

- It is a good candidate to keep next to:
  - L11 Org UX QA checklist
  - L12 Permissions QA checklist

---

# NEXT RECOMMENDED STEP

Next recommended step: Milestone L13 – Step 8: Apply any fixes found during Insights QA (tweak queries, gating, or UX), then draft an **L13 recap** summarizing Insights capabilities and how they integrate into Org Center.

