# Org Center – Integration Checklist (Internal)

Use this checklist to verify Org Center end-to-end in your dev environment before sharing more broadly.

## 1. Prisma & Database

- [ ] `OrgAuditLog` model exists in `schema.prisma` and migrations have been run.
- [ ] Core Org models exist and are wired: `Organization`, `OrgMember`, `OrgTeam`, `OrgDepartment`, `OrgRole`, `OrgInvite` (names may differ but semantics match).
- [ ] Relations used in Org Center routes (`orgMember.user`, `orgMember.team`, `orgTeam.department`, `orgTeam.members`, `orgRole.members`, etc.) are correct.

## 2. Auth & Current Org

- [ ] `getCurrentUserId` returns a valid user id when signed in.
- [ ] `/api/org/current` can resolve a current org id (from session, cookie, or config).
- [ ] `useCurrentOrg` returns `{ org, currentMemberRole }` without errors.
- [ ] `OrgDebugPanel` shows org info and role (`OWNER` / `ADMIN` / `MEMBER`) with `source: "org"` (not fallback).

## 3. Permissions

- [ ] Permissions matrix in Org Settings → General shows expected capabilities per role.
- [ ] As OWNER:
  - [ ] Can see and access Invites & Danger tabs in Org Settings.
  - [ ] Can create teams/departments/roles and invites.
- [ ] As ADMIN:
  - [ ] Can manage invites and structure but cannot see delete-org actions (Danger zone).
- [ ] As MEMBER:
  - [ ] Cannot see Invites or Danger tabs.
  - [ ] Cannot see "New team/department/role" buttons.
  - [ ] Cannot use invites/structure mutation APIs (403 with clear message).

## 4. Org Overview

- [ ] Overview page loads with correct counts for people, teams, departments, invites.
- [ ] "What's possible here?" helper card is visible and copy feels correct.
- [ ] For a brand new org (0 people/teams/departments), the empty state offers "Invite your first member".
- [ ] For a non-member hitting the same org, a calm "No access" card is shown.

## 5. People

- [ ] People directory lists org members with name, email, role, team, department, location.
- [ ] Search works on name/email/role.
- [ ] Team and Department columns link to Structure page (correct tab + highlighting).
- [ ] "Invite people" button shows only for roles allowed to manage people.
- [ ] For non-members, People page shows the "No access" card.

## 6. Structure & Org Chart

- [ ] Structure page shows Teams / Departments / Roles tabs with real data.
- [ ] "View people" from a team row filters the People page by that team.
- [ ] Teams/Departments/Role empty states are calm and actionable.
- [ ] Org Chart page loads real structure (or a friendly empty state) and respects "No access" states.

## 7. Activity & Exports

- [ ] Admin Activity strip shows invite + structure creation events with correct actor and timestamps.
- [ ] Activity Export panel:
  - [ ] CSV export downloads a file with headers and rows.
  - [ ] JSON export returns a valid JSON payload.
  - [ ] Exports are available only to roles with `viewActivityExports`.
- [ ] For non-members, Activity page shows "No access" card.

## 8. General UI polish

- [ ] Org Center pages (Overview, People, Structure, Chart, Activity) share consistent padding, typography, and card styles.
- [ ] Loading states show skeletons roughly matching final layout (no jarring full-page spinners).
- [ ] Error messages are human-readable and not overly technical.
- [ ] There are no obvious leftover "demo" comments or unused demo data blocks.

---

# NOTES

- This checklist is intentionally **practical** and tied directly to what we've built in L7–L9.
- It can be adapted for onboarding team members to the Org Center code.
- After completing this checklist, the Org Center should feel production-ready for incremental improvements.

