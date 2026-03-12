# Onboarding Module

> Audited 2026-03-09 from live code. 1 dynamic route, 7 API routes, 15 components (3,311L), 5 Prisma models.

## Purpose

5-step workspace setup wizard that creates the workspace, collects company type, provisions initial org structure, and triggers Loopbrain context sync + briefing generation on completion.

## Current State

| Feature | Status | Notes |
|---------|--------|-------|
| Step 1 — Workspace | **LIVE** | Name, admin name/title, company size. Creates workspace + Leadership dept + Executive Team + admin OrgPosition. |
| Step 2 — Invites | **DEPRECATED** | 2026-03-08. Preserved for reference. Users now invite post-onboarding via `/org`. |
| Step 3 — Org Structure | **DEPRECATED** | 2026-03-08. Same. Users set up org via `/org`. |
| Step 4 — Company Type | **LIVE** | 7 options: SaaS, Agency, E-commerce, Healthcare, Financial, Manufacturing, Other |
| Step 5 — Ready | **LIVE** | Completion screen. Fires Loopbrain context sync + briefing pre-generation. Redirects to `/home`. |
| Middleware gates | **LIVE** | `isFirstTime=true` or `onboardingComplete=false` → redirect to `/onboarding/1` |
| JWT flags | **LIVE** | `isFirstTime` + `onboardingComplete` carried in token (no extra DB query) |
| Progress API | **LIVE** | GET/POST `/api/onboarding/progress` (554L). Discriminated union validation per step. |
| Step mapping | **LIVE** | UI shows 3 steps (1→4→5). API still supports 5 for backward compat. |
| Paywall tiers | **LIVE** | solo→trial, 2-15→business (€375/mo), 16-30→scale (€650/mo), 31-50→scale-plus, 50+→enterprise |
| Employee onboarding plans | **LIVE** | Templates, tasks, plans with status tracking (PENDING→IN_PROGRESS→DONE) |
| AI task generation | **LIVE** | OpenAI-based task generation with fallback defaults |
| Loopbrain briefing | **LIVE** | Post-completion: generates personalized narrative (Your Company, Team, Projects, Governance, Getting Started) |

### Actual User Flow (3 visible steps)

```
Step 1 (UI 1) → Workspace name, admin info, company size
    ↓ Creates workspace + org scaffolding
Step 4 (UI 2) → Company type selection
    ↓ Persists companyType
Step 5 (UI 3) → "You're all set!" + Go to Dashboard / Set up Organization
    ↓ Fire-and-forget: syncOrgContext + generateOnboardingBriefing
    → /home
```

Step mapping: `UI_TO_API_STEP = { 1: 1, 2: 4, 3: 5 }`. Steps 2, 3 skipped in UI but API still accepts them.

## Key Files

### Pages
- `src/app/onboarding/layout.tsx` (13L) — Clean full-width layout, centered max-w-2xl
- `src/app/onboarding/[step]/page.tsx` (187L) — Dynamic route with step mapping, progress fetch on mount, resume behavior

### API Routes — 7 total
- `src/app/api/onboarding/progress/route.ts` (554L) — Core endpoint. GET: fetch progress. POST: submit step data (discriminated union by step).
  - Step 1: `getServerSession` (no workspace yet). Creates workspace + Leadership dept + Executive Team + OrgPosition.
  - Steps 2-5: `getUnifiedAuth → assertAccess(OWNER/ADMIN) → setWorkspaceContext`
  - Step 5: marks complete, fire-and-forget Loopbrain sync + briefing
- `src/app/api/onboarding/generate/route.ts` — AI task generation (OpenAI, with fallback)
- `src/app/api/onboarding/plans/route.ts`, `plans/[id]/route.ts` — Onboarding plan CRUD
- `src/app/api/onboarding/templates/route.ts`, `templates/[id]/route.ts` — Template CRUD
- `src/app/api/onboarding/tasks/[id]/route.ts` — PATCH task status

### Components (`src/components/onboarding/` — 3,311L total)

**Active wizard:**
- `wizard/progress-stepper.tsx` (70L) — 3-step visual indicator: ["Workspace", "Company Type", "Ready"]
- `wizard/step-1-workspace.tsx` — Workspace name, admin name/title, company size, PaywallBanner
- `wizard/step-4-first-space.tsx` — Company type selection (7 options with icons)
- `wizard/step-5-ready.tsx` — Completion with "Go to dashboard" + "Set up organization" buttons

**Deprecated (preserved for reference):**
- `wizard/step-2-invites.tsx` — DEPRECATED 2026-03-08. Team member invites.
- `wizard/step-3-org-structure.tsx` — DEPRECATED 2026-03-08. Departments/teams setup.

**Supporting:**
- `PaywallBanner.tsx` (81L) — Tier-based pricing banners (trial/business/scale/enterprise)
- `task-list.tsx`, `plan-card.tsx`, `template-card.tsx`, `new-plan-dialog.tsx` — Employee onboarding plan management
- `workspace-onboarding-modal.tsx` — Workspace creation modal
- `org-setup-banner.tsx`, `org-wizard/` (4 files) — Post-onboarding org setup prompts

### Validations
- `src/lib/validations/onboarding.ts` (111L) — Zod schemas:
  - `CompanySizeEnum`: solo, 2-10, 11-15, 16-30, 31-50, 50+
  - `CompanyTypeEnum`: saas, agency, ecommerce, healthcare, financial, manufacturing, other
  - `OnboardingStep1Schema`: workspaceName (2-100), adminName, adminTitle, companySize
  - `OnboardingStep2Schema`: invites[] + skipped?
  - `OnboardingStep3Schema`: departments[] + teams[] + skipped?
  - `OnboardingStep4Schema`: companyType
  - `OnboardingStep5Schema`: confirm (literal true)
  - `OnboardingStepSubmissionSchema`: discriminated union of all steps

### Middleware Gates (`src/middleware.ts`)
- Line 77-83: `token.isFirstTime === true` → redirect `/onboarding/1`
- Line 87-93: `token.onboardingComplete === false` → redirect `/onboarding/1`
- Skip gates for `/onboarding/*` and `/welcome` (avoid redirect loops)

## Data Models (5 Prisma models)

**OnboardingProgress** (1 per workspace): `workspaceId` (unique), `currentStep`, `completedSteps[]`, `orgBasicsComplete`, `departmentsCreated`, `teamsCreated`, `peopleInvited`, `capacitySet`, `integrationsConnected`, `orgName`, `orgIndustry`, `orgSize`, `isComplete`, `completedAt`, `skippedAt`

**OnboardingTemplate**: `workspaceId`, `name`, `description`, `role`, `duration`, `isActive`

**OnboardingTask**: `templateId` (cascade), `workspaceId`, `title`, `description`, `order`, `isRequired`, `estimatedMinutes`

**OnboardingPlan**: `workspaceId`, `templateId`, `userId` (cascade), `title`, `status` (ACTIVE/COMPLETED/CANCELLED/ON_HOLD), `startDate`, `endDate`

**onboarding_task_assignments** (join): `planId`, `taskId`, `workspaceId`, `status` (PENDING/IN_PROGRESS/DONE), `completedAt`, `notes`

## API Routes — 7 total

All use Zod validation. Step 1 uses `getServerSession` (pre-workspace). Steps 2-5 use `getUnifiedAuth → assertAccess(OWNER/ADMIN) → setWorkspaceContext`.

## Loopbrain Integration — LIVE

| Integration | Mechanism | Location |
|-------------|-----------|----------|
| Context sync | Fire-and-forget on Step 5 | `progress/route.ts` — `Promise.allSettled([syncOrgContext, syncDepartmentContexts])` |
| Briefing generation | Fire-and-forget on Step 5 | `src/lib/loopbrain/scenarios/onboarding-briefing.ts` — cached in ProactiveInsight (24h TTL) |
| Intent detection | Keyword matching | `intent-router.ts` — "new here", "just joined", "onboard me" → confidence 0.93 |
| Briefing scenario | `onboarding_briefing` | `scenarios/onboarding-briefing.ts` — fires on Step 5 complete |
| Dashboard card | `OnboardingBriefing.tsx` | Shows briefing for 30 days post-signup |
| Briefing sections | 5 sections | Your Company, Your Team, Your Projects, Governance, Getting Started |

## Known Gaps

| Gap | Severity | Notes |
|-----|----------|-------|
| Steps 2-3 deprecated but API still accepts them | P3 | UI skips them. API backward compat maintained. |
| No `/welcome` route exists | P3 | Middleware bypasses it to avoid loops, but no actual page |
| ~~`@ts-nocheck` on plans/tasks routes~~ | ✅ Resolved Mar 11 | Both files fully type-checked |
| Onboarding models not in WORKSPACE_SCOPED_MODELS | P3 | Have workspaceId FK but not listed in scopingMiddleware — manual scoping only |

No TODOs or FIXMEs found in active onboarding code.

## Dependencies

**Foundation:** `db.ts`, `unified-auth.ts` (steps 2-5), `getServerSession` (step 1), `assertAccess.ts`, `scopingMiddleware.ts`, `api-errors.ts`

**Validations:** `src/lib/validations/onboarding.ts`

**Auth:** `src/server/authOptions.ts` — JWT `isFirstTime` + `onboardingComplete` flags

**External:** OpenAI API (task generation with fallback)

## Integration Points

| Consumer | How | What |
|----------|-----|------|
| **Middleware** | JWT flags | Gates all protected routes until onboarding complete |
| **Org module** | Step 1 creates org scaffolding | Leadership dept, Executive Team, admin OrgPosition |
| **Loopbrain** | Step 5 fire-and-forget | Context sync + briefing pre-generation |
| **Dashboard** | OnboardingBriefing card | Shows AI briefing for 30 days post-signup |
| **Settings** | Workspace data | Workspace created in Step 1 used throughout app |
