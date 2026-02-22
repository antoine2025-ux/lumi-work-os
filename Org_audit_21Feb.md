 Org Module Audit — Ground Truth Report                                                                                 
                                                                                                                         
  ---                                                                                                                    
  1. FILE INVENTORY                                                                                                      
                                                                                                                         
  ┌────────────────────────────────────────────┬────────────┬──────────────────────────────────────────────┐             
  │                 Directory                  │ File Count │                   Purpose                    │             
  ├────────────────────────────────────────────┼────────────┼──────────────────────────────────────────────┤
  │ src/app/(dashboard)/w/[workspaceSlug]/org/ │ 32         │ Primary workspace-scoped org UI              │
  ├────────────────────────────────────────────┼────────────┼──────────────────────────────────────────────┤
  │ src/app/org/                               │ 65         │ Legacy routes (being superseded)             │
  ├────────────────────────────────────────────┼────────────┼──────────────────────────────────────────────┤
  │ src/components/org/                        │ 314        │ Shared component library                     │
  ├────────────────────────────────────────────┼────────────┼──────────────────────────────────────────────┤
  │ src/lib/org/                               │ 169        │ Business logic, queries, permissions, health │
  ├────────────────────────────────────────────┼────────────┼──────────────────────────────────────────────┤
  │ src/app/api/org/                           │ 204        │ API routes covering all org operations       │
  └────────────────────────────────────────────┴────────────┴──────────────────────────────────────────────┘

  ---
  2. NAVIGATION STRUCTURE

  Defined in src/lib/org/nav-config.ts. Three-section model:

  My Profile & Team (VIEWER+):
  - My Profile → /profile (always visible)
  - My Team → /my-team (conditional: teamLead)
  - My Department → /my-department (conditional: hasDepartment) — ⚠ PAGE MISSING

  Organization (mixed access):
  - Directory → /directory (ADMIN)
  - Teams & Departments → /structure (ADMIN)
  - Org Chart → /chart (VIEWER)
  - Positions & Roles → /positions (ADMIN)
  - Performance → /performance (ADMIN)

  Org Admin (ADMIN+):
  - Health & Issues → /admin
  - Settings → /admin/settings

  Layout: Server layout fetches permissions once, provides via context. OrgLayoutClient renders sidebar + main.
  OrgSidebar does role-based filterNavItems() filtering.

  ---
  3. PAGE-BY-PAGE ANALYSIS

  URL: /org/profile
  Status: Functional
  Components: BasicInfo, Employment, CurrentWorkload, TimeOff, PendingActions, WikiContributions, RoleCardView
  Notes: Full edit-in-place; pending approvals visible to managers/admins
  ────────────────────────────────────────
  URL: /org/my-team
  Status: Functional
  Components: TeamMembers, Capacity, PendingActions
  Notes: Shows direct reports + team; 40h/week capacity assumption
  ────────────────────────────────────────
  URL: /org/my-department
  Status: Broken
  Components: —
  Notes: Nav item exists; page 404s
  ────────────────────────────────────────
  URL: /org/directory
  Status: Functional
  Components: PeopleListClient
  Notes: Admin-only; search + filter
  ────────────────────────────────────────
  URL: /org/people/[personId]
  Status: Functional
  Components: PersonProfilePageClient
  Notes: Individual profile detail
  ────────────────────────────────────────
  URL: /org/people/new
  Status: Broken
  Components: PersonCreateForm
  Notes: Form page exists; not wired to create API
  ────────────────────────────────────────
  URL: /org/structure
  Status: Functional
  Components: StructureClient
  Notes: Dept + team management
  ────────────────────────────────────────
  URL: /org/structure/departments/[id]
  Status: Functional
  Components: DepartmentPageClient
  Notes: Inline editing
  ────────────────────────────────────────
  URL: /org/structure/teams/[id]
  Status: Functional
  Components: TeamPageClient
  Notes: Member management
  ────────────────────────────────────────
  URL: /org/chart
  Status: Functional
  Components: OrgChartClient, OrgChartTree
  Notes: Tree + visualization
  ────────────────────────────────────────
  URL: /org/positions
  Status: Functional
  Components: PositionsClient
  Notes: List view; links to role cards
  ────────────────────────────────────────
  URL: /org/performance
  Status: Stub
  Components: PerformanceHome
  Notes: Skeleton only; no cycle editor
  ────────────────────────────────────────
  URL: /org/performance/cycles/[id]
  Status: Stub
  Components: CycleDetailPage
  Notes: No functional cycle editor
  ────────────────────────────────────────
  URL: /org/admin
  Status: Functional
  Components: Health dashboard
  Notes: Metrics work; "Fix" buttons not wired
  ────────────────────────────────────────
  URL: /org/admin/settings
  Status: Stub
  Components: SettingsClient
  Notes: Form skeleton; not integrated with API
  ────────────────────────────────────────
  URL: /org/activity
  Status: Partial
  Components: ActivityContent
  Notes: Page exists; audit events incomplete

  ---
  4. COMPONENT INVENTORY

  Profile Components — Functional:
  - BasicInfoSection — Inline name/role edit
  - EmploymentDetailsSection — Start date, location, timezone
  - CurrentWorkloadSection — Allocations + utilization
  - TimeOffSectionWrapper — Leave requests + approvals
  - WikiContributionsSection — Recent wiki pages
  - RoleCardView.tsx (318 lines) — Fully implemented (see below)

  Role Card Components — Fully Implemented:
  - RoleCardView.tsx — Fetches from /api/org/people/[personId]/role-card; displays template (job family, level,
  description), responsibilities, required/preferred skills from RoleCardSkill junction table, declared skills, active
  projects + task counts
  - SkillsEditor.tsx — Inline skill add/remove (own profile only)
  - EditRoleCardSkillDialog — exists but form not fully wired to creation flow

  Org Chart Components — Functional:
  - OrgChartClient, OrgChartTree, OrgChartItem, OrgChartTooltip, DepartmentDetailView, transformChartData.ts

  Structure Components — Functional:
  - StructureClient, DepartmentOrgRow, TeamLoopbrainPanel

  Directory Components — Functional:
  - PeopleListClient, PersonPanel, PersonProfilePanel, user-profile-card

  Admin/Health Components — Functional:
  - OrgHealthCard, OrgHealthDetails, OrgHealthHistoryChart, OrgQaStatusList

  Form Components — Mixed:
  - role-form.tsx — Partial
  - role-card-form.tsx — Partial; components exist, not wired
  - invite-member-form.tsx — Functional
  - position-form-simple.tsx — Partial
  - member-actions.tsx — Action menu

  Loopbrain Integration — Functional:
  - OrgLoopbrainAnswer, OrgPersonLoopbrainPanel, DepartmentLoopbrainPanelClient, RoleLoopbrainPanel

  ---
  5. API ROUTE AUDIT

  Coverage (204 total routes):

  ┌────────────────┬────────────────┐
  │    Pattern     │    Coverage    │
  ├────────────────┼────────────────┤
  │ getUnifiedAuth │ 166/204 (81%)  │
  ├────────────────┼────────────────┤
  │ assertAccess   │ ~160/204 (78%) │
  ├────────────────┼────────────────┤
  │ Zod validation │ ~150/204 (73%) │
  ├────────────────┼────────────────┤
  │ handleApiError │ ~180/204 (88%) │
  └────────────────┴────────────────┘

  Key Routes:

  Route: /api/org/people/create
  Methods: POST
  Auth: ✓
  assertAccess: ADMIN
  Zod: ✓
  Status: Functional
  ────────────────────────────────────────
  Route: /api/org/people/[id]/manager
  Methods: GET/PUT
  Auth: ✓
  assertAccess: GET:VIEWER, PUT:ADMIN
  Zod: ✓
  Status: Functional
  ────────────────────────────────────────
  Route: /api/org/people/[id]
  Methods: PATCH
  Auth: ✓
  assertAccess: ADMIN
  Zod: ✓
  Status: Functional
  ────────────────────────────────────────
  Route: /api/org/people/[id]/archive
  Methods: POST
  Auth: ✓
  assertAccess: ADMIN
  Zod: ✓
  Status: Functional
  ────────────────────────────────────────
  Route: /api/org/people/[id]/role-card
  Methods: GET
  Auth: ✓
  assertAccess: VIEWER
  Zod: ✓
  Status: Fully Implemented
  ────────────────────────────────────────
  Route: /api/org/people/[id]/skills
  Methods: POST
  Auth: ✓
  assertAccess: SELF
  Zod: ✓
  Status: Functional
  ────────────────────────────────────────
  Route: /api/org/structure/departments/create
  Methods: POST
  Auth: ✓
  assertAccess: ADMIN
  Zod: ✓
  Status: Functional
  ────────────────────────────────────────
  Route: /api/org/structure/teams/[id]/members/[add|remove]
  Methods: POST/DELETE
  Auth: ✓
  assertAccess: ADMIN
  Zod: ✓
  Status: Functional
  ────────────────────────────────────────
  Route: /api/org/role-cards/[id]/skills
  Methods: GET/POST
  Auth: ✓
  assertAccess: VIEWER/ADMIN
  Zod: ✓
  Status: Functional
  ────────────────────────────────────────
  Route: /api/org/invitations/create
  Methods: POST
  Auth: ✓
  assertAccess: ADMIN
  Zod: ✓
  Status: Functional
  ────────────────────────────────────────
  Route: /api/org/leave-requests
  Methods: POST
  Auth: ✓
  assertAccess: VIEWER
  Zod: ✓
  Status: Functional
  ────────────────────────────────────────
  Route: /api/org/leave-requests/[id]/approve
  Methods: PUT
  Auth: ✓
  assertAccess: assertManagerOrAdmin
  Zod: ✓
  Status: Functional
  ────────────────────────────────────────
  Route: /api/org/health/route
  Methods: GET
  Auth: ✓
  assertAccess: ADMIN
  Zod: ✓
  Status: Functional
  ────────────────────────────────────────
  Route: /api/org/intelligence/snapshots/latest
  Methods: GET
  Auth: ✓
  assertAccess: ADMIN
  Zod: ✓
  Status: Functional
  ────────────────────────────────────────
  Route: /api/org/activity
  Methods: GET
  Auth: ✓
  assertAccess: ADMIN
  Zod: ✓
  Status: Partial

  ---
  6. DATA MODEL USAGE

  Model: OrgPosition
  Active Fields: parentId (manager hierarchy), userId, title, level, responsibilities
  Status: Primary — fully used
  ────────────────────────────────────────
  Model: OrgDepartment
  Active Fields: ownerPersonId for optional lead
  Status: Active
  ────────────────────────────────────────
  Model: OrgTeam
  Active Fields: leaderId for team lead
  Status: Active
  ────────────────────────────────────────
  Model: RoleCard
  Active Fields: Linked via roleCardId on OrgPosition
  Status: Fully implemented
  ────────────────────────────────────────
  Model: RoleCardSkill
  Active Fields: Junction: roleCardId + skillId + type (REQUIRED/PREFERRED) + minProficiency
  Status: Fully implemented
  ────────────────────────────────────────
  Model: PersonSkill
  Active Fields: Self-declared; proficiency 1-5; source SELF/INFERRED/VERIFIED
  Status: Active
  ────────────────────────────────────────
  Model: PersonManagerLink
  Active Fields: personId → managerId; intentionallyUnassigned flag
  Status: Denormalization layer
  ────────────────────────────────────────
  Model: CapacityContract
  Active Fields: Weekly hours per person
  Status: Active
  ────────────────────────────────────────
  Model: LeaveRequest
  Active Fields: PENDING/APPROVED/DENIED
  Status: Active

  Manager relationship: dual model (confirmed)
  - OrgPosition.parentId = source of truth for org chart tree building
  - PersonManagerLink = denormalization for fast "my direct reports" reads
  - Both updated by PUT /api/org/people/[personId]/manager; sync not guaranteed in edge cases

  ---
  7. MANAGER RELATIONSHIP STATUS

  parentId is SET by:
  1. /api/org/people/create — accepts managerId param → calls setOrgPersonManager()
  2. PUT /api/org/people/[personId]/manager — manual admin assignment
  3. POST /api/org/import/apply — bulk CSV import

  parentId is READ by:
  1. buildOrgChartTree() — builds nested hierarchy for org chart
  2. GET /api/org/people/[personId]/manager — resolves via position.parent.user
  3. /org/my-team — uses PersonManagerLink for fast direct-report lookup
  4. Loopbrain reasoning — flags parentId === null as MISSING_MANAGER issue

  assertManagerOrAdmin() usage:
  - Called on leave-requests/[id]/approve — leave approval gated to manager or admin
  - Checks ADMIN+ first, then falls back to position.parentId check

  When parentId is null:
  - Flagged as MISSING_MANAGER issue in health dashboard
  - Can suppress with PersonManagerLink.intentionallyUnassigned = true
  - My Team page shows empty direct reports section (no crash)

  ---
  8. FEATURE STATUS MATRIX

  ┌───────────────────────────────────────┬─────────────┬─────┬───────────┬────────────────────────────────────────┐
  │                Feature                │     UI      │ API │ Wired E2E │                 Notes                  │
  ├───────────────────────────────────────┼─────────────┼─────┼───────────┼────────────────────────────────────────┤
  │ View own profile                      │      ✓      │  ✓  │     ✓     │                                        │
  ├───────────────────────────────────────┼─────────────┼─────┼───────────┼────────────────────────────────────────┤
  │ Edit own profile                      │      ✓      │  ✓  │     ✓     │ Name, employment, skills               │
  ├───────────────────────────────────────┼─────────────┼─────┼───────────┼────────────────────────────────────────┤
  │ View org chart (tree)                 │      ✓      │  ✓  │     ✓     │                                        │
  ├───────────────────────────────────────┼─────────────┼─────┼───────────┼────────────────────────────────────────┤
  │ View org chart (list/directory)       │      ✓      │  ✓  │     ✓     │                                        │
  ├───────────────────────────────────────┼─────────────┼─────┼───────────┼────────────────────────────────────────┤
  │ Filter by department                  │      ✓      │  ✓  │     ✓     │                                        │
  ├───────────────────────────────────────┼─────────────┼─────┼───────────┼────────────────────────────────────────┤
  │ Filter by team                        │      ✓      │  ✓  │     ✓     │                                        │
  ├───────────────────────────────────────┼─────────────┼─────┼───────────┼────────────────────────────────────────┤
  │ Search people                         │      ✓      │  ✓  │     ✓     │                                        │
  ├───────────────────────────────────────┼─────────────┼─────┼───────────┼────────────────────────────────────────┤
  │ View person card (public)             │      ✓      │  ✓  │     ✓     │                                        │
  ├───────────────────────────────────────┼─────────────┼─────┼───────────┼────────────────────────────────────────┤
  │ View person card (manager-enriched)   │      ✓      │  ✓  │     ✓     │                                        │
  ├───────────────────────────────────────┼─────────────┼─────┼───────────┼────────────────────────────────────────┤
  │ Request time off                      │      ✓      │  ✓  │     ✓     │                                        │
  ├───────────────────────────────────────┼─────────────┼─────┼───────────┼────────────────────────────────────────┤
  │ Approve time off (manager)            │      ✓      │  ✓  │     ✓     │                                        │
  ├───────────────────────────────────────┼─────────────┼─────┼───────────┼────────────────────────────────────────┤
  │ View team roster (manager)            │      ✓      │  ✓  │     ✓     │                                        │
  ├───────────────────────────────────────┼─────────────┼─────┼───────────┼────────────────────────────────────────┤
  │ Add person (admin)                    │      ✓      │  ✓  │     ✗     │ Form exists; not wired                 │
  ├───────────────────────────────────────┼─────────────┼─────┼───────────┼────────────────────────────────────────┤
  │ Invite member (admin)                 │      ✓      │  ✓  │     ✓     │                                        │
  ├───────────────────────────────────────┼─────────────┼─────┼───────────┼────────────────────────────────────────┤
  │ Create department                     │      ✓      │  ✓  │     ✓     │                                        │
  ├───────────────────────────────────────┼─────────────┼─────┼───────────┼────────────────────────────────────────┤
  │ Create team                           │      ✓      │  ✓  │     ✓     │                                        │
  ├───────────────────────────────────────┼─────────────┼─────┼───────────┼────────────────────────────────────────┤
  │ Assign manager (admin)                │      ✓      │  ✓  │     ✓     │                                        │
  ├───────────────────────────────────────┼─────────────┼─────┼───────────┼────────────────────────────────────────┤
  │ Add person → assign manager in 1 flow │      ✗      │  ✓  │     ✗     │ No manager picker on create form       │
  ├───────────────────────────────────────┼─────────────┼─────┼───────────┼────────────────────────────────────────┤
  │ Role card display                     │      ✓      │  ✓  │     ✓     │                                        │
  ├───────────────────────────────────────┼─────────────┼─────┼───────────┼────────────────────────────────────────┤
  │ Role card edit                        │ ✓ (partial) │  ✓  │     ✗     │ Components exist; form not fully wired │
  ├───────────────────────────────────────┼─────────────┼─────┼───────────┼────────────────────────────────────────┤
  │ Create role card                      │      ✗      │  ✓  │     ✗     │ No UI to create; API only              │
  ├───────────────────────────────────────┼─────────────┼─────┼───────────┼────────────────────────────────────────┤
  │ Assign role card to position          │      ✓      │  ✓  │     ✓     │                                        │
  ├───────────────────────────────────────┼─────────────┼─────┼───────────┼────────────────────────────────────────┤
  │ Health & issues dashboard             │      ✓      │  ✓  │     ~     │ "Fix" buttons not wired                │
  ├───────────────────────────────────────┼─────────────┼─────┼───────────┼────────────────────────────────────────┤
  │ Positions & roles config              │      ✓      │  ✓  │     ✓     │                                        │
  ├───────────────────────────────────────┼─────────────┼─────┼───────────┼────────────────────────────────────────┤
  │ Performance cycles                    │  ✓ (stub)   │  ✗  │     ✗     │ Skeleton only                          │
  ├───────────────────────────────────────┼─────────────┼─────┼───────────┼────────────────────────────────────────┤
  │ My Department page                    │      ✗      │  —  │     ✗     │ Nav item → 404                         │
  ├───────────────────────────────────────┼─────────────┼─────┼───────────┼────────────────────────────────────────┤
  │ Activity audit log                    │      ✓      │  ✓  │     ~     │ Events partially tracked               │
  ├───────────────────────────────────────┼─────────────┼─────┼───────────┼────────────────────────────────────────┤
  │ Admin settings                        │  ✓ (stub)   │  ✓  │     ✗     │ Form not wired                         │
  └───────────────────────────────────────┴─────────────┴─────┴───────────┴────────────────────────────────────────┘

  ---
  9. GAPS & BROKEN FLOWS

  Broken (UI + API exist, not connected):
  1. Create Person — PersonCreateForm at /org/people/new not wired to POST /api/org/people/create. ~30 min fix.
  2. Role Card Edit Form — role-card-form.tsx components exist; not connected to API. ~2h fix.
  3. Admin Settings — SettingsClient form skeleton not wired to settings APIs. ~3h fix.
  4. Health "Fix" Buttons — Buttons rendered but onClick handlers are no-ops. ~1h fix.

  Missing pages referenced by nav:
  5. /org/my-department — Nav shows it if user has a dept; page doesn't exist → 404.

  Completely stubbed modules:
  6. Performance — /org/performance and /org/performance/cycles/[id] are skeleton components with no data, no API, no
  CRUD.

  Silent data inconsistency:
  7. PersonManagerLink vs OrgPosition.parentId — Dual model can drift; no reconciliation job confirmed.

  Not exposed in UI at all:
  8. Create Role Card — No page/form to create new role cards; API routes exist.
  9. Create Position — Positions only created as side effect of person creation or CSV import.

  Partially tracked audit trail:
  10. Activity log — Not all mutations emit audit events; completeness unknown.

  ---
  10. SUMMARY

  What actually works today (solid):
  - Profile view/edit (own + others), workload, skills, role card display
  - Org chart tree + directory with search/filter
  - Dept/team structure management (full CRUD)
  - Manager assignment via API (org chart respects hierarchy)
  - Leave request + approval flow
  - Invitations
  - Health dashboard metrics
  - Loopbrain Q&A integration throughout

  Critical gaps blocking core journeys:

  ┌─────────────────────────────────────┬───────────┐
  │                 Gap                 │  Effort   │
  ├─────────────────────────────────────┼───────────┤
  │ Create Person form not wired        │ ~30 min   │
  ├─────────────────────────────────────┼───────────┤
  │ My Department page missing          │ ~1-2h     │
  ├─────────────────────────────────────┼───────────┤
  │ Role card creation/edit not in UI   │ ~2-3h     │
  ├─────────────────────────────────────┼───────────┤
  │ Settings page stubbed               │ ~3h       │
  ├─────────────────────────────────────┼───────────┤
  │ Performance module entirely stubbed │ ~2-3 days │
  ├─────────────────────────────────────┼───────────┤
  │ Activity audit incomplete           │ ~2h       │
  └─────────────────────────────────────┴───────────┘

  Quick wins (90% done, just needs wiring):
  - Wire PersonCreateForm → POST /api/org/people/create
  - Create /org/my-department page (reuse structure view scoped to user's dept)
  - Wire role card form components to create/edit APIs
  - Wire health dashboard "Fix" buttons to their respective mutation APIs
  - Add manager picker to person create flow

  Dead code candidates:
  - src/app/org/* legacy routes — being fully superseded by /w/[ws]/org/
  - OrgOverviewClient (old home page) — replaced

  Architecture health:
  - Auth + RBAC pattern solid; 81% auth coverage, 78% RBAC
  - Dual manager model (OrgPosition.parentId + PersonManagerLink) works but adds drift risk — consider consolidating
  reads to one source
  - Role card data model is complete and well-designed; the gap is purely presentation/wiring
  - Loopbrain integration is thorough — every major section has a contextual Q&A panel