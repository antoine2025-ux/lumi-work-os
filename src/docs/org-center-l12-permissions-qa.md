# Org Center – L12 Permissions QA Checklist

This document verifies that **Org Center roles & capabilities** behave as expected:

- OWNER
- ADMIN
- MEMBER
- Non-member (no org access)

Use it:

- Before demoing Org to others.
- After making permission changes.
- To debug "why can/can't I do this?" questions.

---

## 1. Roles & Test Accounts

For a clean QA run, prepare 4 accounts (or simulated sessions):

- **Owner** – has `OrgRole = "OWNER"` for a given org.
- **Admin** – has `OrgRole = "ADMIN"` for the same org.
- **Member** – has `OrgRole = "MEMBER"` for the same org.
- **Non-member** – is logged in but has **no membership** for this org.

For each scenario below, run through all relevant checks.

---

## 2. Global Access & Shell

### 2.1 Owner

- [ ] Can access `/org`, `/org/people`, `/org/structure`, `/org/chart`, `/org/activity`, `/org/settings`.
- [ ] Org sidebar correctly highlights active route.
- [ ] Global header is visible and identical to Dashboard/Spaces/Loopbrain.

### 2.2 Admin

- [ ] Same as Owner, except any explicitly Owner-only actions (e.g. delete org) are not available.
- [ ] No unexpected 403 errors when browsing read-only surfaces.

### 2.3 Member

- [ ] Can access `/org`, `/org/people`, `/org/structure`, `/org/chart`, `/org/activity`, `/org/settings`.
- [ ] `/org/activity`: Can view activity list (has `org:activity:view`), but export buttons are hidden (no `org:activity:export`).
- [ ] `/org/settings`: Can access but sees limited content:
  - Members tab: Can view member list (has `org:member:list`), but no remove/change role actions.
  - Invites tab: Hidden or shows no-access card (no `org:member:invite`).
  - Danger zone: Hidden or shows no-access message (no `org:org:delete`).

### 2.4 Non-member

- [ ] Visiting any `/org` route shows the standard **no-access card**.
- [ ] No underlying data leaks (lists/tables empty or not rendered).
- [ ] Any attempt to call protected Org APIs returns 401/403.

---

## 3. Structure (Teams / Departments / Roles)

### 3.1 Owner

- [ ] **Teams tab**:
  - Sees **New team** button.
  - Can open modal, create team successfully.
  - New team appears in list, Org chart, and People filters.
- [ ] **Departments tab**:
  - Sees **New department** button.
  - Can create department successfully.
- [ ] **Roles tab**:
  - Sees **New role** button.
  - Can create role successfully.

### 3.2 Admin

- [ ] Same as Owner for create actions (assuming matrix gives Admin create rights).
- [ ] Cannot see or trigger strictly Owner-only deletes (if implemented as Owner-only).

### 3.3 Member

- [ ] **Teams/Departments/Roles tabs**:
  - Can view lists.
  - Does **not** see New team/department/role buttons.
  - Clicking team/department links → navigates to People/filtered Structure as expected.
- [ ] Attempting to craft POST calls manually to `/api/org/teams`, `/api/org/departments`, `/api/org/roles` returns 403.

### 3.4 Non-member

- [ ] Any `/org/structure` route shows no-access state (or redirects).
- [ ] `/api/org/teams`, `/api/org/departments`, `/api/org/roles` return 401/403.

---

## 4. People & Filters

### 4.1 Owner / Admin / Member

For each role (Owner, Admin, Member):

- [ ] Can view `/org/people` directory (assuming Members have view rights).
- [ ] Search by name/email works.
- [ ] Filters:
  - Team filter (via `/org/people?teamId=...`).
  - Department filter (via `/org/people?departmentId=...`).
  - Role filter (via `/org/people?roleId=...`).
- [ ] Clicking team/department links in People table:
  - Navigates to `/org/structure?tab=teams&teamId=...` or `&departmentId=...`.

### 4.2 Invite People CTA

- [ ] **Owner/Admin**: see "Invite people" CTA where expected (People page, Settings → Invites).
- [ ] **Member**: does **not** see "Invite people" CTA.
- [ ] **Non-member**: no access to Org pages, so no CTA.

---

## 5. Members & Invites (Org Settings)

### 5.1 Members Tab

- [ ] **Owner**:
  - Sees member list.
  - Can remove members (except optional constraints like not removing last owner, etc.).
  - Can change member roles via UI; API call succeeds.
- [ ] **Admin**:
  - Sees member list.
  - Can remove members if allowed by matrix (`org:member:remove`).
  - Cannot change roles if matrix reserves `org:member:role.change` for Owner.
- [ ] **Member**:
  - Sees Members tab (has `org:member:list`).
  - Can view member list (read-only).
  - Does not see remove/change role buttons (no `org:member:remove` or `org:member:role.change`).
- [ ] **Non-member**:
  - Any call to `/api/org/members` returns 401/403.

### 5.2 Invites Tab

- [ ] **Owner/Admin**:
  - Sees invites list.
  - Can create new invite (UI + API).
  - Can cancel/delete invites if UI supports it.
- [ ] **Member**:
  - No Invite tab or a no-access card.
- [ ] **Non-member**:
  - `/api/org/invites` returns 401/403.

---

## 6. Activity & Exports

### 6.1 Owner

- [ ] Can access `/org/activity`.
- [ ] Activity events list renders without errors.
- [ ] Export buttons (CSV/JSON) are visible and functional:
  - Clicking triggers `/api/org/activity/export` (or equivalent).
  - Response is successful (200) and data is provided.

### 6.2 Admin

- [ ] Same as Owner, if matrix gives Admin both `org:activity:view` and `org:activity:export`.
- [ ] If exports are Owner-only:
  - Can view activity list, but:
  - Does **not** see export buttons.

### 6.3 Member

- [ ] `/org/activity`:
  - Can access and view activity list (has `org:activity:view`).
  - Does **not** see export buttons (no `org:activity:export`).
- [ ] API calls to `/api/org/activity/export` return 403.

### 6.4 Non-member

- [ ] Any `/org/activity` route returns or renders no access (401/403 or no-access UI).

---

## 7. Danger Zone (Delete Org)

### 7.1 Owner

- [ ] In `/org/settings`, sees Danger zone section.
- [ ] UI clearly describes the destructive action.
- [ ] Triggering delete flow:
  - Prompts for confirmation (modal or confirm).
  - Calls `DELETE /api/org/danger`.
  - On success, user is redirected to a neutral page (e.g. Dashboard, org picker).

### 7.2 Admin

- [ ] Does not see delete-org button.
- [ ] Attempting a direct `DELETE /api/org/danger` call returns 403.

### 7.3 Member / Non-member

- [ ] No Danger zone UI.
- [ ] Direct `DELETE /api/org/danger` returns 401/403.

---

## 8. Deep Links & API-only Access

For each role, verify:

- [ ] Visiting `/org/people?teamId=...` for a team in a org they belong to:
  - Respects permissions; if member, at least read-only is allowed.
- [ ] Visiting `/org/structure?tab=teams&departmentId=...`:
  - For Org members, shows filtered view.
  - For non-members, no-access card.
- [ ] Raw API calls (via devtools) to:
  - `/api/org/teams`, `/api/org/departments`, `/api/org/roles`
  - `/api/org/members`, `/api/org/invites`
  - `/api/org/activity`, `/api/org/activity/export`
  - `/api/org/danger`
  behave consistently with capability matrix.

---

## 9. Role/Capability Matrix – Quick Reference

Ensure behavior matches the matrix in `src/lib/org/capabilities.ts`:

| Capability               | Member | Admin | Owner |
|--------------------------|--------|-------|-------|
| org:view                 | ✔ | ✔ | ✔ |
| org:overview:view        | ✔ | ✔ | ✔ |
| org:people:view          | ✔ | ✔ | ✔ |
| org:structure:view       | ✔ | ✔ | ✔ |
| org:chart:view           | ✔ | ✔ | ✔ |
| org:activity:view        | ✔ | ✔ | ✔ |
| org:settings:view        | ✔ | ✔ | ✔ |
| org:member:list          | ✔ | ✔ | ✔ |
| org:member:invite        | ✖ | ✔ | ✔ |
| org:member:remove        | ✖ | ✔ | ✔ |
| org:member:role.change   | ✖ | ✖ | ✔ |
| org:team:create          | ✖ | ✔ | ✔ |
| org:team:update          | ✖ | ✔ | ✔ |
| org:team:delete          | ✖ | ✖ | ✔ |
| org:department:create    | ✖ | ✔ | ✔ |
| org:department:update    | ✖ | ✔ | ✔ |
| org:department:delete    | ✖ | ✖ | ✔ |
| org:role:create          | ✖ | ✔ | ✔ |
| org:role:update          | ✖ | ✔ | ✔ |
| org:role:delete          | ✖ | ✖ | ✔ |
| org:activity:export       | ✖ | ✔ | ✔ |
| org:org:update           | ✖ | ✔ | ✔ |
| org:org:delete           | ✖ | ✖ | ✔ |

If QA reveals discrepancies, update either:

- The matrix in `capabilities.ts`, or
- The code using `assertOrgCapability` / `OrgCapabilityGate`, or
- The UI expectations.

---

## 10. Recording Findings

At the bottom of this doc, keep a short list of issues found and their status:

### Findings (example format)

- [ ] **ISSUE**: Member can still see "New team" button on `/org/structure`.
  - **Expected**: Only Admin/Owner.
  - **Probable cause**: Missing `OrgCapabilityGate` in CreateTeamDialog.
  - **Status**: TODO / IN PROGRESS / DONE.

- [ ] **ISSUE**: Admin cannot export activity.
  - **Expected**: Admin should have `org:activity:export`.
  - **Probable cause**: Capability mapping missing in `ORG_CAPABILITIES_ADMIN`.
  - **Status**: TODO.

---

## 11. Quick Test Script

For a rapid smoke test, run this sequence:

1. **As Owner**:
   - Create a team → verify it appears.
   - Invite a member → verify invite sent.
   - View activity → verify events visible.
   - Export activity → verify download works.
   - Attempt delete org → verify confirmation flow (don't actually delete).

2. **As Admin**:
   - View structure → verify can see teams/departments/roles.
   - Create a department → verify success.
   - View members → verify can see list.
   - Remove a member → verify success (if allowed).
   - Change member role → verify fails (403) if Owner-only.
   - View activity → verify can see.
   - Export activity → verify can export.
   - Attempt delete org → verify button hidden or 403.

3. **As Member**:
   - View structure → verify read-only, no create buttons.
   - View people → verify can browse.
   - View members → verify can see member list (read-only), no remove/change role buttons.
   - View activity → verify can see activity list, but export buttons are hidden.
   - Attempt create team via API → verify 403.
   - Attempt invite member via API → verify 403.
   - Attempt export activity via API → verify 403.

4. **As Non-member**:
   - Visit `/org` → verify no-access card.
   - Attempt any API call → verify 401/403.

---

## 12. Edge Cases

- [ ] **Last Owner**: Attempting to remove/change role of last Owner should be prevented (if implemented).
- [ ] **Self-removal**: Owner/Admin removing themselves should be handled gracefully (if allowed).
- [ ] **Org switching**: If user belongs to multiple orgs, switching orgs preserves permission context correctly.
- [ ] **Session expiry**: Expired sessions show appropriate auth errors, not broken UI.
- [ ] **Concurrent changes**: Multiple admins editing structure simultaneously don't cause conflicts (if applicable).

---

# NOTES

- This step is deliberately **documentation-only**: no new features, just clarity.
- It gives you:
  - A repeatable, role-based QA script for Org Center permissions.
  - A way to catch mis-alignments between backend checks and UI gating.
- As your permission model evolves (e.g., more granular capabilities, custom roles), you can extend this checklist.

---

# NEXT RECOMMENDED STEP

Next recommended step: Milestone L12 – Step 9: Apply **any fixes discovered during Permissions QA** (tweak capability mapping, adjust gating, clean up edge cases) and then prepare a short **L12 Recap draft** summarizing the new permissions model.

