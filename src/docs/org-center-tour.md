# Org Center – Internal Tour (v1)

This document is for internal stakeholders (engineering, product, design) to quickly understand what the Org Center does today and where it lives in the app.

> Recommended: capture a small set of screenshots in your dev environment and paste them into your internal wiki, referencing the sections below.

---

## 1. Org Overview

**Route:** `/org`  
**Main components:**

- **Header:** Org name and a short description (what the Org Center is for).
- **"What's possible here?" helper card:** Explains in 2–3 bullets what admins can do here.
- **Metrics strip:** People, Teams, Departments, Open invites.
- **Key cards:** At-a-glance views (e.g. structure summary, recent activity).
- **Empty state:** "Your organization is just getting started" with CTA to "Invite your first member".
- **No access state:** Calm card shown when user is not a member of the org.

**Screenshot checklist:**

- [ ] Overview with real data (mid-sized org).
- [ ] Overview for a brand new org (empty state).
- [ ] Overview for a user without access (No access state).

---

## 2. People

**Route:** `/org/people`  
**Main components:**

- **Search & filters bar:** Search by name/email/role, with placeholder filter pills for future expansion.
- **Directory table:** Name, email, role, team, department, location, actions.
- **Drill-ins:**
  - Team and department names link into `/org/structure?tab=teams` or `?tab=departments`.
  - "View people" from Structure links back into `/org/people?teamId=…`.
- **Permissions:**
  - "Invite people" button shows only for roles allowed to manage people.
  - No access state for non-members.

**Screenshot checklist:**

- [ ] Directory with several members, different teams/departments.
- [ ] Search in action (e.g. filtering by role).
- [ ] People page filtered by a specific team (via `?teamId=…`).
- [ ] People page for a user without access.

---

## 3. Structure

**Route:** `/org/structure`  
**Main components:**

- **Tabs:** Teams, Departments, Roles.
- **Teams tab:**
  - Table of teams with department, members, lead, "View people" action.
  - "New team" button gated by permissions.
  - Empty state for no teams yet.
- **Departments tab:**
  - Cards per department with team counts.
  - "New department" button gated by permissions.
  - Drill-in link "View teams" → `tab=teams&departmentId=…`.
- **Roles tab:**
  - Table of roles with level, default team, active people.
  - "New role" button gated by permissions.
  - Empty state for no roles.

**Screenshot checklist:**

- [ ] Teams tab with 3–6 teams in different departments.
- [ ] Departments tab with 2–4 departments and team counts.
- [ ] Roles tab with a few roles at different levels.
- [ ] Structure page for a user without access.

---

## 4. Org Chart

**Route:** `/org/chart`  
**Main components:**

- **Org chart visualization:** Departments → teams → leads / headcount.
- **Empty state:** Friendly message when there is no structure yet.
- **No access state:** When chart data is forbidden.

**Screenshot checklist:**

- [ ] Org chart for a non-trivial structure (≥ 2 departments, ≥ 3 teams).
- [ ] Org chart empty state.
- [ ] Org chart no access state.

---

## 5. Activity & Exports

**Route:** `/org/activity`  
**Main components:**

- **Header:** Activity & exports.
- **Activity Export panel:**
  - "Download CSV" / "Download JSON" buttons.
  - Exports limited to recent activity, gated by `viewActivityExports` capability.
- **Admin Activity strip:**
  - Last few sensitive actions (invites, team/department/role creation).
  - Actor name/email and timestamps.
- **No access state:** For users without org-level access.

**Screenshot checklist:**

- [ ] Activity page showing several recent admin actions.
- [ ] Export panel visible on the left (desktop).
- [ ] Activity page for a user without access.

---

## 6. Org Settings & Permissions

**Route:** `/org/settings`  

**Key points:**

- **Tabs:** Members, Invites, General, Danger (depending on role).
- **Permissions overview:** Table that shows what OWNER / ADMIN / MEMBER can do.
- **Role gating:**
  - Members do not see Invites / Danger.
  - Admins see Invites but not Danger.
  - Owners see everything.

**Screenshot checklist:**

- [ ] General tab with Permissions overview visible.
- [ ] Invites tab as an Owner/Admin.
- [ ] Danger tab as an Owner.
- [ ] Members tab showing roles.

---

## 7. Developer view

**OrgDebugPanel (internal-only):**

- Shows:
  - Current org payload.
  - Resolved role and source (org vs fallback).
  - Overview stats and chart data error/loading states.
- Useful for:
  - Debugging role resolution.
  - Verifying Org Center APIs respond as expected.

**Screenshot checklist:**

- [ ] Org debug panel with an Owner in a populated org.
- [ ] Org debug panel for a Member in a limited org.

---

## Notes & Next Steps

- This tour is intentionally "lightweight"; it's meant to pair with live demos.
- For external documentation or marketing, create a separate, user-facing tour.
- For UX improvements, see `src/docs/org-center-ux-improvements.md`.

---

