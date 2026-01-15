# Org Center – UX QA Checklist (v2)

*A refined, production-ready internal QA guide for verifying Org Center UX integrity.*

Use this checklist when:

- Integrating Org into a new Loopwell environment.

- Performing substantial UI/UX changes.

- Preparing for demos, reviews, or release cycles.

- Conducting pre-merge QA for Org-related PRs.

---

# 0. Critical Path Smoke Test (Run This First)

These 8 checks catch 90% of issues:

- [ ] The global Loopwell header appears consistently on Dashboard, Spaces, Loopbrain, Org, Settings.

- [ ] The Org pill is highlighted when on any `/org/...` route.

- [ ] Org pages show: **global header → org sidebar → content** (no extra nav bars).

- [ ] Sidebar shows correct active highlight for every route.

- [ ] Page headers (breadcrumb + title) match Spaces spacing (`px-10 pt-8 pb-4`).

- [ ] Empty states look intentional; no raw unstyled text.

- [ ] Skeletons appear immediately while loading; no layout jumps.

- [ ] No console errors across any `/org/*` pages.

---

# 1. Role-Based Access Matrix

| Area | Owner | Admin | Member | Non-Member |
|------|--------|---------|-----------|--------------|
| Overview | Full | Full | Read | No Access |
| People | Full | Full | Read | No Access |
| Structure | Full | Full | No Access | No Access |
| Org Chart | Full | Full | Read (if allowed) | No Access |
| Activity | Full | Partial | No Access | No Access |
| Org Settings | Full | Partial | No Access | No Access |

---

# 2. Shell & Navigation

## 2.1 Global Header

- [ ] Same header on Dashboard, Spaces, Loopbrain, Org, Settings.

- [ ] Org pill highlighted on all `/org/*` pages.

- [ ] No duplicated or flashing headers during navigation.

## 2.2 Org Layout

- [ ] Layout stack: global header → sidebar → content.

- [ ] Content grid aligns with Spaces.

- [ ] No leftover "MainProductNav" bars from dev work.

---

# 3. Org Sidebar

## 3.1 Visual + Interaction

- [ ] Items grouped into MAIN, ORG, ADMIN.

- [ ] Active item: dark pill, blue dot, slight elevation.

- [ ] Hover: subtle background + shadow.

- [ ] Keyboard focus ring visible on Tab.

## 3.2 Correct Highlighting

- [ ] `/org` → Overview

- [ ] `/org/people` → People

- [ ] `/org/structure` → Structure

- [ ] `/org/chart` → Org chart

- [ ] `/org/activity` → Activity

- [ ] `/org/settings` → Settings

---

# 4. Page Headers & Breadcrumbs

## 4.1 Layout

- [ ] Header padding: `px-10 pt-8 pb-4`.

- [ ] Breadcrumb: `Org / [Page name]`.

- [ ] Title: `text-2xl font-semibold`.

- [ ] Description: concise + accurate.

## 4.2 Required Copy

- [ ] Overview: "See a high-level view of your organization's people, teams, and structure."

- [ ] People: "See everyone in this workspace, along with their teams, roles, and reporting lines."

- [ ] Structure: "Manage departments, teams, and roles so everyone understands how work is organized."

- [ ] Org chart: "See how departments, teams, and managers connect across your organization."

- [ ] Activity: "Review recent admin activity and export a snapshot of your org for audits or backups."

- [ ] Settings: "Manage this organization's members, invites, and configuration."

---

# 5. Overview Experience

## 5.1 With Data

- [ ] Metrics load correctly.

- [ ] Cards have subtle hover elevation.

- [ ] No jitter or layout shift.

## 5.2 Empty Org

- [ ] Empty state displays: "Your organization is just getting started."

- [ ] CTA 1: Invite your first member → `/org/settings?tab=members`.

- [ ] CTA 2: Set up structure → `/org/structure`.

## 5.3 No Access

- [ ] "You don't have access to this Org Center" card appears.

- [ ] No sensitive data visible.

---

# 6. People Experience

## 6.1 Loaded State

- [ ] Table columns: name, email, role, team, department, location.

- [ ] Row hover is subtle and consistent.

- [ ] Team/department links navigate to Structure tab filters.

## 6.2 Search & Filters

- [ ] Placeholder: "Search by name, email, team, or role".

- [ ] Search filters correctly.

- [ ] Clearing search restores full list.

## 6.3 Empty & No Access

- [ ] Empty: "No people match this view".

- [ ] Primary CTA: Invite people.

- [ ] Secondary CTA: Clear filters.

- [ ] Non-member shows no-access card.

---

# 7. Structure Experience

## 7.1 Tabs

- [ ] Tabs clearly labeled and visually distinct when active.

- [ ] Switching tabs is smooth with no layout jump.

## 7.2 Empty States

- [ ] Teams: "No teams yet".

- [ ] Departments: "No departments yet".

- [ ] Roles: "No roles defined".

- [ ] CTAs only visible for users with manage-structure permissions.

## 7.3 Loading

- [ ] Pill skeleton + 1–2 content skeleton blocks appear.

---

# 8. Org Chart

- [ ] Renders cleanly with real structure.

- [ ] Empty → "No org chart yet" + CTA.

- [ ] Non-member → no-access card.

---

# 9. Activity & Exports

## 9.1 Activity Strip

- [ ] Shows invites, team/department/role creation events.

- [ ] Includes actor + timestamp.

## 9.2 Export Panel

- [ ] CSV/JSON buttons visible (if allowed).

- [ ] Buttons disabled while loading.

- [ ] Restricted users see hidden or disabled panel appropriately.

## 9.3 Empty / No Access

- [ ] Calm message when no activity exists.

- [ ] Non-member sees no-access card.

---

# 10. Org Settings

- [ ] Tabs: Members, Invites, General, Danger zone.

- [ ] Permissions match role matrix.

- [ ] Danger zone explains permanence clearly.

---

# 11. Performance & Stability Checks

- [ ] Page transitions <150ms.

- [ ] No white flashes or full-page reloads.

- [ ] Skeletons appear immediately.

- [ ] No console errors or hydration warnings.

---

# 12. Accessibility Checks

- [ ] All interactive elements reachable by Tab.

- [ ] Focus rings visible and not clipped.

- [ ] Page titles use `<h1>`.

- [ ] Buttons have labels (icons have aria-labels).

- [ ] Sufficient color contrast.

---

# 13. Responsive Layout Checks

- [ ] Sidebar scrolls gracefully on narrow screens.

- [ ] Tables support horizontal scroll.

- [ ] Page header doesn't wrap awkwardly.

- [ ] No overflowing or clipped UI.

---

# 14. Before Merging Any Org PR (Mini Checklist)

**All must pass before merging:**

- [ ] Visited `/org`, `/org/people`, `/org/structure`, `/org/activity`, `/org/settings`.

- [ ] Global header displays correctly on all pages.

- [ ] Sidebar highlights correct item for each route.

- [ ] Headers + content align with global grid.

- [ ] Empty states polished and consistent.

- [ ] No console errors or broken links.

- [ ] No unexpected layout jumps or flashing UI.

---

# This document is now ready for use as the official Org Center UX QA guide.
