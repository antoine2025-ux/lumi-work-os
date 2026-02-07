# Org Feature — Current State Audit (Read-Only)

**Date:** 2025-02-07  
**Scope:** Loopwell Org feature — database, API, UI, permissions, cross-module connections, audit trail.  
**Rules:** Audit only; no code changes, no migrations, no refactors.

---

## Step 1 — Repo Discovery (Completed)

### A) Database
- **prisma/schema.prisma** — All Org-related models, enums, and relations.
- **Org-related migrations:**
  - prisma/migrations/20250115000000_add_org_departments_teams/
  - prisma/migrations/20251227174218_org_phase1_schema_truth/
  - prisma/migrations/20260103203116_add_org_department_owner/ and related renames
  - prisma/migrations/20260104141822_org_roadmap_implementation/
  - prisma/migrations/20260120000000_add_org_system_tables/

### B) API layer
- **Entry pattern:** `getUnifiedAuth(request)` → `assertAccess({ userId, workspaceId, scope: "workspace", requireRole })` → `setWorkspaceContext(workspaceId)` → Prisma.
- **Root:** src/app/api/org/ — 150+ route handlers under subpaths (people, structure, capacity, audit, invitations, loopbrain, etc.).
- **Server modules:** src/server/org/ (people/read|write, structure/read|write, ownership, audit/write, health, intelligence), src/server/orgContext.ts, src/server/audit/orgAudit.ts.

### C) UI
- **Pages (root org):** src/app/org/ — layout (src/app/org/layout.tsx), page (src/app/org/page.tsx), and nested: people, structure, chart, issues, ownership, intelligence, activity, settings, work, recommendations, decision, workspace-settings.
- **Workspace-scoped org:** src/app/(dashboard)/w/[workspaceSlug]/org/ — activity, chart, intelligence, issues, ownership, people, settings, structure.
- **Components:** src/components/org/ — 80+ components (OrgSidebar, OrgLayoutClient, permission-guard, people/, structure/, capacity/, intelligence/, health/, work/, etc.).

### D) Auth/Permissions
- **Unified auth:** src/lib/unified-auth.ts — session + active workspace; src/lib/current-workspace.ts — wraps getUnifiedAuth for workspaceId.
- **Access assert:** src/lib/auth/assertAccess.ts — WorkspaceMember + role hierarchy (VIEWER < MEMBER < ADMIN < OWNER).
- **Org permission context (UI):** src/lib/org/permissions.server.ts — getOrgPermissionContext (React.cache); src/lib/org/context-db.ts — getOrgAndMembershipForUser.
- **Org capability (legacy):** src/lib/orgAuth.ts — assertOrgAccess / assertOrgCapability; src/lib/orgMembership.ts — resolveOrgPermissionForCurrentUser (maps WorkspaceMember to OWNER/ADMIN/MEMBER).
- **Client guard:** src/components/org/permission-guard.tsx — PermissionGuard (usePermissionContext), RoleGuard (allowedRoles).
- **Middleware:** No org-specific middleware; workspace/session resolved per-request in layout and API.

### E) Cross-feature usage
- **Projects:** src/app/api/projects/route.ts, src/app/api/projects/[projectId]/route.ts — use `auth.workspaceId` and assertAccess/assertProjectAccess; Project has `orgId` (optional, v1 = workspaceId).
- **Tasks:** Task.assigneeId → User; workload/context uses workspaceId + assigneeId; src/lib/loopbrain/indexing/builders/org.ts — person context uses OrgPosition + task counts by assigneeId.
- **Dashboard:** src/app/api/dashboard/bootstrap/route.ts — workspaceId + tasks by assigneeId.
- **Docs/Wiki:** Workspace-scoped; no direct Org model references in audit scope.

---

## Step 2 — Database + Domain Model Map

### Org-related models (exact names and purpose)

| Model | Purpose | Key fields | Relations |
|-------|--------|------------|-----------|
| **Workspace** | Tenant; "org" in practice is workspace | id, name, slug, ownerId, orgCenterOnboardingCompletedAt | members (WorkspaceMember), orgDepartments, orgTeams, orgPositions, orgAuditLogs, orgInvitations, orgCustomRoles, … |
| **WorkspaceMember** | Membership + role per workspace | workspaceId, userId, role (WorkspaceRole), customRoleId, preferences, employmentStatus | user, workspace, customRole (OrgCustomRole) |
| **Org** (legacy) | Frozen Phase D org entity | id, name | memberships (OrgMembership), invitations (OrgInvitation), audit (AuditLogEntry), roles (Role) |
| **OrgMembership** (legacy) | Legacy org membership | orgId, userId, role (OrgRole) | org (Org) |
| **OrgDepartment** | Department within workspace | workspaceId, name, description, order, isActive, ownerPersonId | workspace, teams (OrgTeam) |
| **OrgTeam** | Team; optional department | workspaceId, departmentId?, name, order, isActive, ownerPersonId | workspace, department (OrgDepartment), positions (OrgPosition) |
| **OrgPosition** | Person's position (reporting + team) | workspaceId, userId?, title, level, parentId, teamId, isActive, archivedAt, roleDescription, responsibilities, … | workspace, user, parent/children (hierarchy), team (OrgTeam), roleCard (RoleCard) |
| **OrgPersonProfileOverride** | Override profile per user/workspace | workspaceId, userId, title, availability, departmentId, teamIds, skills, notes | — |
| **OrgCustomRole** | Custom role with capabilities (JSON) | workspaceId, key, name, capabilities (Json) | workspace, memberships (WorkspaceMember) |
| **OrgAuditLog** | Workspace-scoped audit events | workspaceId, userId, actorUserId?, targetUserId?, action, entityType, entityId, oldValues, newValues, event (OrgAuditEventType?) | workspace, user, actor, target (User) |
| **OrgInvitation** | Invites; dual workspaceId + orgId | workspaceId, orgId?, email, role (OrgRole), status | workspace, org? (Org) |
| **OrgSavedView** | Saved views (people, etc.) | workspaceId, scope, key, name, filters | workspace |
| **OrgActivityExport** | Export metadata | workspaceId, userId | workspace, user |
| **OrgIssueResolution** | Resolved org issues | workspaceId, issueKey, issueType, entityType, entityId, resolvedBy | workspace |
| **OrgPersonIssue** (orgId) | Person issues (legacy orgId) | orgId, personId, type, resolution, resolvedById | — |
| **PersonAvailability** | Time-bound availability | workspaceId, personId, type, startDate, endDate, reason, source | workspace, person (User) |
| **PersonManagerLink** | Reporting line (workspace) | workspaceId, personId, managerId | workspace |
| **OwnerAssignment** | Entity ownership | workspaceId, entityType, entityId, ownerPersonId | workspace |
| **ProjectAllocation** (orgId) | Project allocation (legacy orgId) | orgId, projectId, personId, fraction, startDate, endDate | project, person |
| **Role** (legacy Org) | Legacy org role definition | orgId, name | org, responsibilities |
| **AuditLogEntry** (legacy Org) | Legacy org audit | orgId, … | org |

### Enums
- **WorkspaceRole:** OWNER, ADMIN, MEMBER, VIEWER (used by WorkspaceMember and assertAccess).
- **OrgRole:** VIEWER, EDITOR, ADMIN (used by legacy Org/OrgMembership and OrgInvitation).
- **OrgAuditEventType:** ORG_CREATED, ORG_DELETED, MEMBER_ADDED, MEMBER_REMOVED, MEMBER_ROLE_CHANGED, ORG_OWNERSHIP_TRANSFERRED.
- **EmploymentStatus:** ACTIVE, ON_LEAVE, TERMINATED, CONTRACTOR (WorkspaceMember).

### Narrative
- **Current domain:** "Org" is implemented as **Workspace** plus workspace-scoped org structure. Workspace = tenant; WorkspaceMember = membership and role. Structure: OrgDepartment → OrgTeam → OrgPosition; OrgPosition has parentId (manager) and teamId. "Person" is User; optional OrgPersonProfileOverride and RoleCard (linked to OrgPosition) for title/skills. Legacy **Org** and **OrgMembership** still exist (Phase D frozen); some tables (OrgPersonIssue, OrgDuplicateCandidate, ProjectAllocation, PersonCapacity, etc.) still use **orgId** (separate from workspaceId), creating dual semantics and migration debt.

---

## Step 3 — Permissions / Access Control Audit

### Where roles live
- **DB:** WorkspaceMember.role (WorkspaceRole), optional WorkspaceMember.customRoleId → OrgCustomRole (capabilities JSON). Legacy: OrgMembership.role (OrgRole).
- **Session:** getUnifiedAuth() returns activeWorkspaceId and user; no role in JWT/session; role is read from DB per request (assertAccess, getOrgPermissionContext).

### Where access checks happen
- **API:** src/lib/auth/assertAccess.ts — checks WorkspaceMember for (workspaceId, userId), then role hierarchy. Most org API routes use: getUnifiedAuth → assertAccess({ userId, workspaceId, scope: "workspace", requireRole: ["MEMBER"] or ["ADMIN","OWNER"] }).
- **UI layout:** src/app/org/layout.tsx — getOrgPermissionContext(); no context → "no workspace" or "not signed in". No route-level middleware; protection is layout + per-API assertAccess.
- **Client:** src/components/org/permission-guard.tsx — PermissionGuard (calculateOrgPermissions), RoleGuard (allowedRoles).

### Org API routes: check pattern
- **Use assertAccess (correct):** e.g. people/route, people/[personId]/route, ownership/route, issues/route, capacity/*, structure/teams|departments, audit (ADMIN/OWNER), settings/capacity, work/*, responsibility/*, positions/[id], overview, etc.
- **Use only getUnifiedAuth or requireWorkspaceId (weaker):**
  - src/app/api/org/people/directory/route.ts — **requireWorkspaceId()** only (no assertAccess) → any authenticated user with a workspace can call; no MEMBER check.
  - src/app/api/org/people/structure/validate/route.ts, src/app/api/org/people/structure/detail/route.ts — **getUnifiedAuth** only.
  - src/app/api/org/people/manager/route.ts, src/app/api/org/people/manager/edge/route.ts — getUnifiedAuth only.
  - src/app/api/org/people/health/route.ts, src/app/api/org/people/export/route.ts — getUnifiedAuth only.
  - src/app/api/org/views/route.ts, src/app/api/org/views/[viewId]/route.ts — getUnifiedAuth only.
  - src/app/api/org/readiness/route.ts — getUnifiedAuth.
  - src/app/api/org/intelligence/route.ts — getUnifiedAuth (and possibly internal checks).
- **Risk:** Routes that only use getUnifiedAuth/requireWorkspaceId rely on "having an active workspace" but do not explicitly enforce WorkspaceMember or role; if getUnifiedAuth is ever relaxed or bypassed, those endpoints could be exposed. **Directory** is the clearest gap (sensitive people list).

### Inconsistencies
- **Dual role systems:** WorkspaceRole (OWNER/ADMIN/MEMBER/VIEWER) in assertAccess vs OrgRole (VIEWER/EDITOR/ADMIN) in legacy Org/orgContext; getActiveOrgContext falls back to workspace and returns role "VIEWER" without reading WorkspaceMember.role.
- **Permission guard vs API:** UI uses OWNER/ADMIN/MEMBER; API uses same via assertAccess — consistent. calculateOrgPermissions gives canViewFullOrg: true for everyone (no employee vs manager slice yet).
- **Custom roles:** OrgCustomRole exists and is linked to WorkspaceMember; assertAccess explicitly excludes customRoleId in select (comment: "may not exist in database") — capability-based checks are not applied in assertAccess.

---

## Step 4 — Org Feature Flow Map (End-to-End)

| Feature | UI entry | Data fetch | DB read/write | State |
|--------|----------|------------|----------------|-------|
| **Org overview** | src/app/org/page.tsx | getOrgPermissionContext; overview/route, readiness, integrity, recommendations | Workspace, WorkspaceMember, overview aggregates | Server components, React.cache context |
| **People list/directory** | src/app/org/people/page.tsx, PeopleListClient, PeopleDirectory | /api/org/people, /api/org/people/directory, getWorkspacePeopleDirectory | WorkspaceMember, User, OrgPosition, OrgTeam, OrgDepartment, OrgPersonProfileOverride | Client + server, hooks (useOrgPeopleDirectory) |
| **Person profile** | src/app/org/people/[personId]/page.tsx | /api/org/people/[personId], responsibilities, availability, skills, manager | User, OrgPosition, OrgTeam, PersonAvailability, PersonManagerLink, responsibilities | Server + client components |
| **Org chart** | src/app/org/chart/page.tsx, OrgChartClient | /api/org/chart | OrgPosition, OrgTeam, OrgDepartment, User | Client + server |
| **Structure (departments/teams)** | src/app/org/structure/page.tsx, StructurePageClient | /api/org/structure, structure/departments, structure/teams | OrgDepartment, OrgTeam, OrgPosition | Client + server |
| **Issues inbox** | src/app/org/issues/page.tsx | /api/org/issues, issues/summary | Derived + OrgIssueResolution, OrgPersonIssue | Client (OrgIssuesInboxClient) |
| **Ownership** | src/app/org/ownership/page.tsx | /api/org/ownership, ownership/assign, bulk-assign | OwnerAssignment, OrgPosition, OrgTeam, OrgDepartment | Client + server |
| **Capacity** | Settings + overview cards | /api/org/capacity/summary, teams, people, effective, contract | CapacityContract, WorkAllocation, PersonAvailability, OrgPosition | Client (CapacityOverviewCard, etc.) |
| **Work requests** | src/app/org/work/page.tsx | /api/org/work/requests | WorkRequest, WorkImpact, WorkEffortDefaults | Client |
| **Intelligence** | src/app/org/intelligence/page.tsx | /api/org/intelligence, snapshots, landing | OrgIntelligenceSnapshot, OrgIntelligenceSettings, context | Client (IntelligenceLandingClient, etc.) |
| **Audit log** | Activity / exports UI | /api/org/audit (ADMIN/OWNER) | OrgAuditLog | Server + client |
| **Invitations** | Settings (InvitesSection) | /api/org/invitations/* | OrgInvitation, WorkspaceMember | Client |
| **Members & roles** | Settings (MembersSection) | /api/org/members, members/[memberId]/custom-role | WorkspaceMember, OrgCustomRole | Client |
| **Decision authority** | src/app/org/settings/decision-authority/page.tsx | /api/org/decision/domains, authority | DecisionDomain | Client |
| **Responsibility tags/profiles** | src/app/org/settings/responsibility/page.tsx | /api/org/responsibility/tags, profiles | ResponsibilityTag, RoleResponsibilityProfile | Client |

---

## Step 5 — Connections to Other Modules

- **Projects:** Project.workspaceId, Project.orgId (optional). Projects list/filter by workspaceId; no direct join to OrgPosition/OrgTeam. src/app/api/projects/route.ts, src/app/api/projects/[projectId]/route.ts.
- **Tasks:** Task.assigneeId → User; Task.workspaceId. Dashboard and Loopbrain use workspaceId + assigneeId for "my tasks" and person workload. src/lib/loopbrain/indexing/builders/org.ts — person context uses OrgPosition + task counts by assigneeId. No Task ↔ OrgPosition FK.
- **Docs/Wiki:** Wiki pages workspace-scoped; no Org model in audit.
- **Dashboard:** src/app/api/dashboard/bootstrap/route.ts — workspaceId, tasks by assigneeId, projects; no OrgPosition/OrgDepartment in bootstrap.
- **Workspace:** Creation/deletion and membership in src/app/api/workspaces/route.ts; org list/switch in src/app/api/org/list/route.ts, src/app/api/org/switch/route.ts. WorkspaceMember is the single source of truth for "who is in the org" for the current design.

---

## Step 6 — Audit Trail / Activity (for Loopbrain)

- **OrgAuditLog (workspace-scoped):** Written by:
  - src/lib/orgAudit.ts — logOrgAudit (INVITE_CREATED, INVITE_REVOKED, TEAM_CREATED, DEPARTMENT_CREATED, ROLE_CREATED, MEMBER_CUSTOM_ROLE_UPDATED); used by teams/route, departments/route, members/[memberId]/custom-role.
  - src/server/audit/orgAudit.ts — logOrgAuditEvent / logOrgAuditEventStandalone (ORG_CREATED, ORG_DELETED, MEMBER_ADDED, MEMBER_REMOVED, MEMBER_ROLE_CHANGED, ORG_OWNERSHIP_TRANSFERRED); used by workspaces/route, acceptOrgInvitation, org/delete, members/updateRole, members/remove, members/leave, ownership/transfer.
- **OrgAuditLog read:** src/app/api/org/audit/route.ts — ADMIN/OWNER only; src/lib/orgAudit.ts listOrgAuditForOrg; src/lib/audit.ts; src/server/data/orgActivityExport.ts, src/server/data/orgActivity.ts.
- **Activity model:** prisma/schema.prisma (lines 1027–1040) — **no workspaceId in schema**; migration prisma/migrations/20251210110313_add_workspace_to_activity/migration.sql added workspaceId in DB. **Schema drift:** Prisma Activity model does not include workspaceId.
- **Other logging:** OrgQnaLog, OrgLoopbrainQueryLog, OrgLoopbrainQuery (Loopbrain); no unified "every user action" audit. Many mutations (e.g. position updates, profile overrides, capacity, work requests) do **not** write to OrgAuditLog.

**Conclusion:** No unified audit trail. OrgAuditLog covers a subset of org events (invites, teams, departments, roles, membership/ownership); Activity is generic (entity/action) and schema is out of sync with DB. Most org mutations are not logged for Loopbrain.

---

## Step 7 — Deliverable: Structured Report

### 1) Org: Current Structure Summary
- Org is **Workspace** + workspace-scoped structure: OrgDepartment → OrgTeam → OrgPosition; User = person; WorkspaceMember = membership and role. Legacy Org/OrgMembership still present; some tables use orgId. Two parallel "org" concepts (workspace vs Org entity) and orgId vs workspaceId in places create confusion and migration risk.

### 2) DB Models & Relationships
- See Step 2 table. Core: Workspace, WorkspaceMember, OrgDepartment, OrgTeam, OrgPosition, OrgPersonProfileOverride, OrgCustomRole, OrgAuditLog, OrgInvitation. Legacy: Org, OrgMembership, Role, AuditLogEntry. Supporting: PersonAvailability, PersonManagerLink, OwnerAssignment, OrgIssueResolution, OrgSavedView, OrgActivityExport, and many orgId/workspaceId hybrid tables.

### 3) Org UI Map
- **Layout:** src/app/org/layout.tsx — getOrgPermissionContext, OrgPermissionsProvider, OrgLayoutClient.
- **Pages:** src/app/org/page.tsx (overview), people, people/[personId], structure, structure/departments/[departmentId], structure/teams/[teamId], chart, chart/departments/[departmentId], issues, ownership, intelligence, intelligence/[section], activity, work, work/[id], recommendations, decision, settings, settings/capacity, responsibility, decision-authority, workspace-settings, departments/new.
- **Key components:** src/components/org/ — OrgSidebar, OrgLayoutClient, OrgPageHeader, permission-guard, PeopleListClient, PeopleDirectory, PersonProfileDrawer, StructurePageClient, DepartmentRowsCard, EditDepartmentDialog, OrgChartClient, OrgIssuesInboxClient, OwnershipClient, CapacityOverviewCard, WorkOverviewCard, OrgIntelligenceOverview, ExportsSection, MembersSection, InvitesSection, etc.

### 4) Org API Map
- **Pattern:** getUnifiedAuth → assertAccess(workspace, requireRole) → setWorkspaceContext → Prisma. Base path: src/app/api/org/.
- **Key groups:** people (list, create, directory, [personId] CRUD, manager, health, export, structure, responsibilities, skills, availability, employment, archive), structure (departments, teams, availability), chart, capacity (summary, teams, people, effective, contract), work (requests, feasibility, impact, effort-defaults), issues (list, summary, sync, apply, preview), ownership (assign, bulk-assign, transfer), intelligence (landing, snapshots, recommendations, settings), audit, invitations, members, roles, role-cards, responsibility (tags, profiles), decision (domains, authority, resolve), health, allocations, positions, views, preferences, loopbrain (context, engines, feedback, health, metrics, rollout), onboarding, overview, readiness, list, switch, departments, teams, taxonomy, systems, duplicates, digest, flags, integrity, import, merge.

### 5) Permissions/RBAC: Current Implementation + Risks
- **Implementation:** WorkspaceMember.role (WorkspaceRole); assertAccess enforces workspace membership + role hierarchy; getOrgPermissionContext for UI (React.cache); PermissionGuard/RoleGuard on client. Custom roles (OrgCustomRole) exist but are not enforced in assertAccess.
- **Risks:** (1) **Directory and several people/* routes** use only getUnifiedAuth or requireWorkspaceId — no explicit assertAccess; (2) getActiveOrgContext (rbac.ts) can return role "VIEWER" from workspace fallback without reading WorkspaceMember; (3) Schema comment in assertAccess excludes customRoleId — capability-based access not applied; (4) canViewFullOrg: true for all — no employee "own slice" or manager-only views yet.

### 6) Cross-Module Connections
- **Projects:** workspaceId (+ optional orgId); no FK to OrgPosition/OrgTeam.
- **Tasks:** assigneeId → User; workload/context uses User + OrgPosition; no direct Task–OrgPosition link.
- **Dashboard:** workspaceId + assigneeId for tasks; no Org structure in bootstrap.
- **Loopbrain:** Person context from OrgPosition + task counts; ownership/health/capacity use org models.

### 7) Audit Trail: Current State + Gaps
- **Current:** OrgAuditLog used for invites, teams, departments, custom roles, membership/ownership events (two implementations: lib/orgAudit.ts and server/audit/orgAudit.ts). Activity table has workspaceId in DB but not in Prisma schema.
- **Gaps:** (1) Many org mutations not logged (position create/update/archive, profile overrides, capacity, work requests, issue resolutions, etc.). (2) No single "everything a user does" log for Loopbrain. (3) Activity schema drift (workspaceId missing in schema).

### 8) Critical Issues / Inconsistencies (Ranked)

- **High:** (1) **Org API routes without assertAccess** — directory, people/structure/validate, people/structure/detail, people/manager, people/manager/edge, people/health, people/export, views, readiness, and possibly intelligence — rely only on getUnifiedAuth/requireWorkspaceId; (2) **Dual org semantics** — workspace vs Org entity and orgId vs workspaceId in schema and code increase confusion and data integrity risk; (3) **No role-based visibility** — all members can view full org (canViewFullOrg: true); employee/manager slice not implemented.
- **Med:** (4) **Audit coverage** — most org mutations not in OrgAuditLog; (5) **Activity schema drift** — Prisma Activity model missing workspaceId; (6) **Custom roles not enforced** in assertAccess; (7) **Legacy Org/OrgMembership** still referenced (getActiveOrgContext, OrgInvitation.orgId) — dead or dual path.
- **Low:** (8) Two audit helpers (lib/orgAudit vs server/audit/orgAudit) with different event shapes; (9) OrgRole vs WorkspaceRole naming and usage mixed in docs/code.

### 9) Recommendations for NEXT PHASE (No Code)

- **Departments/teams:** Already modeled (OrgDepartment, OrgTeam); clarify ownership (ownerPersonId) and ensure all structure writes go through a single audit path.
- **Reporting lines:** PersonManagerLink and OrgPosition.parentId both exist; pick one source of truth (recommend OrgPosition.parentId) and align UI/APIs and Loopbrain.
- **Role-based visibility:** Introduce "view scope" in permission context (e.g. full / manager / self); enforce in API (filter people/positions by reporting subtree or self) and in UI (PermissionGuard + data filters). Align with calculateOrgPermissions (canViewFullOrg, canEditTeamRoles).
- **User profile completeness:** Centralize "person in org" on User + OrgPosition + OrgPersonProfileOverride; define minimal required fields for Loopbrain and enforce in people create/update and readiness checks.
- **Loopbrain context and audit:** (1) Add workspaceId to Activity in Prisma schema and use it for all relevant actions; (2) Standardize on one OrgAuditLog writer and event set; (3) Optionally add a single "action log" or extend OrgAuditLog for all org mutations (position, profile, capacity, work, issue resolution) so Loopbrain can consume a single stream.

---

## Top 10 Most Central Org Files

1. **prisma/schema.prisma** — Source of truth for Workspace, WorkspaceMember, OrgDepartment, OrgTeam, OrgPosition, OrgAuditLog, OrgInvitation.
2. **src/lib/auth/assertAccess.ts** — Central API access check (WorkspaceMember + role).
3. **src/lib/unified-auth.ts** — Session + active workspace resolution used by org and dashboard.
4. **src/lib/org/permissions.server.ts** — Server-side org permission context (getOrgPermissionContext).
5. **src/app/org/layout.tsx** — Org layout and permission loading; gates all /org pages.
6. **src/server/orgContext.ts** — getActiveOrgContext (legacy OrgMembership + workspace fallback); used by rbac.ts.
7. **src/lib/org/context-db.ts** — getOrgAndMembershipForUser (workspace + WorkspaceMember).
8. **src/app/api/org/people/route.ts** — People list API; exemplar of getUnifiedAuth + assertAccess pattern.
9. **src/server/org/people/read.ts** — Server-side people read (used by API and possibly server components).
10. **src/lib/orgAudit.ts** — OrgAuditLog write (logOrgAudit) and read (listOrgAuditForOrg); one of two audit paths.

---

## Exact Commands Used (Repeatable Audit)

```bash
# Org-related in Prisma
rg -n "org|Org|organization|Organization" --glob "*.prisma" .

# Org-related in src
rg -l "org|Org|organization|Organization" src/

# API org routes
ls -R src/app/api/org/

# Permissions / access
rg -n "requireSession|getServerSession|requireWorkspace|requireRole|can\(|hasPermission|assertAccess|requireWorkspaceId|getUnifiedAuth|assertOrgAccess" src/app/api/org/

# Audit / activity
rg -n "Activity|ActivityEvent|audit|AuditLog|logOrgAudit|orgAudit" prisma/schema.prisma
rg -l "logOrgAudit|orgAudit" src/

# Workspace / WorkspaceMember in schema
rg -n "Workspace|workspaceId|WorkspaceMember" prisma/schema.prisma
```
