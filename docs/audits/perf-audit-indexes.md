# Prisma Schema Index Audit

**Date:** 2026-02-28
**Auditor:** Claude Code
**Schema:** `prisma/schema.prisma` (4,619 lines)
**Schema models:** 162
**WORKSPACE_SCOPED_MODELS count:** 137

---

## Executive Summary

**28 missing or suboptimal indexes found across 20 models.**

The audit applied five rules to all 162 Prisma models:
- Rule 1 — FK fields without indexes
- Rule 2 — WORKSPACE_SCOPED_MODELS missing `workspaceId` index
- Rule 3 — Missing composite indexes (`workspaceId` + sort field)
- Rule 4 — Sort fields without indexes in hot routes
- Rule 5 — Unique constraints count as implicit indexes (not flagged)

The highest-risk findings are in models that are both workspace-scoped and queried on every AI chat turn or every page load. `OnboardingTemplate`, `OnboardingPlan`, and `ProjectTemplate` have no indexes at all. `WikiChunk` is workspace-scoped with no `workspaceId` index — this is a semantic-search model queried by the Loopbrain context engine on every AI interaction. `Workflow` (workspace-scoped) also has no indexes.

---

## Priority 1 — WORKSPACE_SCOPED_MODELS Missing `workspaceId` Index

These models appear in `WORKSPACE_SCOPED_MODELS` in `src/lib/prisma/scopingMiddleware.ts`. The middleware injects `WHERE workspaceId = X` on **every single `findMany`, `findFirst`, and `count` call**. Without a `workspaceId` index, every such query is a full table scan.

| Model | Current Indexes | Missing Index | Impact |
|-------|----------------|---------------|--------|
| `WikiChunk` | none | `@@index([workspaceId])` | HIGH — queried by Loopbrain semantic search on every AI chat turn; table grows proportionally to wiki size |
| `Workflow` | none | `@@index([workspaceId])` | HIGH — workspace-scoped, admin UI lists all workflows |
| `OnboardingTemplate` | none | `@@index([workspaceId])` | HIGH — scoped findMany on every onboarding page load |
| `OnboardingPlan` | `@@index([userId, status])` only | `@@index([workspaceId])` | HIGH — scoped on every onboarding dashboard request; userId index alone is insufficient when middleware injects workspaceId filter |
| `ProjectTemplate` | none | `@@index([workspaceId])` | MEDIUM — listed on project creation modal |
| `TaskTemplateItem` | `@@index([workspaceId])` — present | ok | — |

**Recommended Prisma syntax:**
```prisma
// Model: WikiChunk
@@index([workspaceId])
@@index([pageId])  // also missing — see Priority 2

// Model: Workflow
@@index([workspaceId])
@@index([workspaceId, isActive])  // common listing filter

// Model: OnboardingTemplate
@@index([workspaceId])
@@index([workspaceId, isActive])

// Model: OnboardingPlan
@@index([workspaceId])
@@index([workspaceId, userId])  // replaces bare [userId, status] for scoped user plan lookup
@@index([workspaceId, status])

// Model: ProjectTemplate
@@index([workspaceId])
@@index([workspaceId, category])  // filtered by category on creation modal
```

---

## Priority 2 — Hot Route FK Fields Missing Indexes

These FK fields are confirmed to appear in `WHERE` clauses of the most-called API routes identified in `docs/audits/perf-audit-queries.md` and the routes read during this audit.

| Model | FK Field | Used In Route / Pattern | Missing Index | Recommended Prisma Syntax |
|-------|----------|------------------------|--------------|--------------------------|
| `WikiChunk` | `pageId` | Semantic search joins; chunk loading for a wiki page | `@@index([pageId])` | `@@index([pageId])` |
| `OnboardingPlan` | `templateId` | Onboarding plan creation joins to template | `@@index([templateId])` | `@@index([templateId])` |
| `WorkflowAssignment` | `instanceId` | Assignment list per workflow instance | none — only `@@index([workspaceId])` | `@@index([instanceId])` |
| `WorkflowAssignment` | `userId` | Assignments by user | none | `@@index([userId])` |
| `WorkflowInstance` | `userId` | User's workflow instances | `@@index([workspaceId, status])` — no userId index | `@@index([workspaceId, userId])` |
| `WorkflowInstance` | `workflowId` | Instances for a given workflow | none | `@@index([workflowId])` |
| `OneOnOneMeeting` | `workspaceId` (composite with status) | Loopbrain proactive insights iterates upcoming meetings per participant | has `[workspaceId, employeeId]` and `[workspaceId, managerId]` but not `[workspaceId, scheduledAt]` composite needed for date-range queries | `@@index([workspaceId, scheduledAt])` |
| `OneOnOneActionItem` | `workspaceId + status` | Loopbrain N+1: loads open action items per meeting (identified in perf-audit-queries.md line 86) | has `@@index([meetingId])` but no `[workspaceId, assigneeId, status]` for the batch pre-load fix | `@@index([workspaceId, assigneeId, status])` |
| `PerformanceCycle` | `createdById` | Admin views of cycles created by user | only `[workspaceId]` and `[workspaceId, status]` | `@@index([workspaceId, createdById])` |
| `PerformanceReview` | `employeeId` standalone | Performance dashboard queries by employee | has `[workspaceId, managerId, status]` and `[workspaceId, period]` — no `[workspaceId, employeeId]` standalone | `@@index([workspaceId, employeeId])` |
| `GoalProgressUpdate` | `sourceId` | Project completion → goal progress sync | `@@index([goalId, createdAt])`, `@@index([updatedById])`, `@@index([workspaceId])` — no sourceId index | `@@index([sourceId])` |
| `GoalCheckIn` | `userId` standalone | Loading a user's check-ins across goals | `@@unique([goalId, userId, period])` creates index on `(goalId, userId, period)` — adequate for goal-scoped lookup but not for `WHERE workspaceId = X AND userId = Y` | `@@index([workspaceId, userId])` |
| `ProjectAllocation` | `orgPositionId` | Linked via `orgPositionId` in tasks route POST | no index | `@@index([orgPositionId])` — `orgPositionId` field does not exist on this model (field is `personId`); the `ProjectAllocation` model is missing `@@index([projectId])` | `@@index([projectId])` |

---

## Priority 3 — Missing Composite Indexes (`workspaceId` + Sort Field)

These models are workspace-scoped and commonly queried with time-based ordering or status filtering, but lack a composite that would allow index-only scans.

| Model | Existing Indexes | Recommended Composite | Reason |
|-------|-----------------|----------------------|--------|
| `Activity` | `@@index([workspaceId, createdAt(sort: Desc)])` — present | ok | Already has the needed composite |
| `ChatSession` | `@@index([workspaceId, userId, phase])`, `@@index([updatedAt(sort: Desc)])` | `@@index([workspaceId, updatedAt(sort: Desc)])` | Sessions list is sorted by `updatedAt DESC` filtered by `workspaceId`; current index on bare `updatedAt` requires heap fetch for workspaceId filter |
| `Workflow` | none | `@@index([workspaceId, isActive])`, `@@index([workspaceId, createdAt])` | Workflow listing typically filters active ones per workspace |
| `OnboardingTemplate` | none | `@@index([workspaceId, isActive])` | Template browser filters by `isActive = true` |
| `Goal` | `@@index([workspaceId])`, `@@index([workspaceId, status])`, `@@index([workspaceId, level])` etc. | `@@index([workspaceId, endDate])` | Loopbrain goal queries filter by quarter + status + approaching end date; endDate range queries need composite |
| `LoopbrainPendingAction` | `@@index([workspaceId, status])`, `@@index([assignedTo, status])` | `@@index([workspaceId, expiresAt])` | Expiry cleanup queries filter `expiresAt < NOW()` per workspace |
| `LeaveRequest` | `@@index([workspaceId, personId, status])`, `@@index([startDate, endDate])` | `@@index([workspaceId, startDate, endDate])` | Range queries on leave overlap (`startDate <= X AND endDate >= Y`) are workspace-scoped; bare `[startDate, endDate]` without workspaceId forces post-filter |
| `WorkAllocation` | `@@index([workspaceId, personId])`, `@@index([workspaceId, personId, startDate, endDate])` | ok | Already has the entity-graph composite |
| `PersonActivityMetric` | `@@index([workspaceId, personId])`, `@@index([weekStarting])` | `@@index([workspaceId, weekStarting])` | Weekly metric rollups filter by workspace + week; bare `[weekStarting]` requires post-filter |
| `OrgIntelligenceSnapshot` | `@@index([workspaceId, createdAt])` | ok | Already correct |
| `ProactiveInsight` | `@@index([workspaceId, status])`, `@@index([workspaceId, createdAt(sort: Desc)])`, `@@index([workspaceId, expiresAt])` | ok | Well indexed |

---

## Priority 4 — Other FK Fields Without Indexes

All remaining foreign key fields lacking indexes. These represent full-table-scan risk whenever a child record is loaded by its parent FK.

| Model | FK Field | Notes | Recommended Prisma Syntax |
|-------|----------|-------|--------------------------|
| `Account` | `userId` | NextAuth internal — `@@unique([provider, providerAccountId])` exists. `userId` has no index. Session lookup by `userId` is frequent during auth. | `@@index([userId])` |
| `Session` | `userId` | NextAuth session table — no `userId` index. Every auth check that resolves session → user requires a full scan. | `@@index([userId])` |
| `WikiChunk` | `pageId` | Covered under Priority 2 | `@@index([pageId])` |
| `OnboardingTask` | `templateId` | Tasks loaded by template — currently has `@@index([workspaceId])` but no `templateId` index | `@@index([templateId])` |
| `onboarding_task_assignments` | `planId` | Has `@@unique([planId, taskId])` which creates index — ok for PK lookup | implicit via unique |
| `onboarding_task_assignments` | `taskId` | No separate index on `taskId` alone for reverse lookup | `@@index([taskId])` |
| `RoleCard` | `createdById` | No index on who created the card | `@@index([createdById])` |
| `WorkRequest` | `requesterPersonId` | No index — filtered in work intake views | `@@index([workspaceId, requesterPersonId])` |
| `WorkRequest` | `domainId` | Has `@@index([workspaceId, domainType, domainId])` — sufficient | ok |
| `WorkImpact` | `workRequestId` | Has `@@index([workspaceId, workRequestId])` — ok | ok |
| `WorkImpact` | `createdById` | No index | `@@index([createdById])` |
| `DecisionEscalationStep` | `personId` | Has `@@index([authorityId])` and `@@index([workspaceId])` but no `personId` index; when resolving "who is responsible?" queries iterate steps by personId | `@@index([personId])` |
| `GoalWorkflowRule` | `workspaceId + trigger` | Has `@@index([workspaceId, isActive])` and `@@index([trigger])` — but no composite `[workspaceId, trigger]` for scoped trigger lookups | `@@index([workspaceId, trigger])` |
| `GoalAnalytics` | `goalId` | `@@unique([goalId, period])` creates implicit index on `(goalId, period)` — sufficient | ok (unique covers it) |
| `GoalAnalytics` | `workspaceId` | Has `@@index([workspaceId])` — ok | ok |
| `PersonRoleAssignment` | `personId` | Has `@@index([orgId, personId])` — no standalone `personId` for cross-org lookups but model is org-scoped not workspace-scoped; `orgId` is used instead | ok for org-scoped queries |
| `CapacityAllocation` | `personId` | Has `@@index([orgId, personId])` — ok | ok |
| `CapacityAllocation` | `teamId` | Has `@@index([orgId, teamId])` — ok | ok |
| `PersonManagerLink` | `managerId` | Has `@@index([workspaceId, managerId])` — ok | ok |
| `Objective` | `goalId` | Has `@@index([goalId])` — ok | ok |
| `KeyResult` | `objectiveId` | Has `@@index([objectiveId])` — ok | ok |
| `KeyResultUpdate` | `keyResultId` | Has `@@index([keyResultId])` — ok | ok |
| `KeyResultUpdate` | `updatedById` | No index on `updatedById` | `@@index([updatedById])` |
| `GoalComment` | `authorId` | No index on `authorId` | `@@index([authorId])` |
| `GoalUpdate` | `authorId` | No index on `authorId` | `@@index([authorId])` |
| `GoalApproval` | `approverId` | Has `@@index([approverId, status])` — ok | ok |
| `OneOnOneTalkingPoint` | `meetingId` | Has `@@index([meetingId])` — ok | ok |
| `OneOnOneTalkingPoint` | `addedBy` (userId) | No index | `@@index([addedBy])` |

---

## Models Already Well-Indexed (reference)

The following models have good index coverage and require no changes:

- **`WorkspaceMember`** — 5 composite indexes covering role, joinedAt, userId, employmentStatus queries
- **`OrgPosition`** — 7 indexes including entity-graph composite `(workspaceId, teamId, userId)`
- **`Task`** — `(projectId, status)`, `(workspaceId, assigneeId)`, `(workspaceId, assigneeId, dueDate)`, `(workspaceId, status)`
- **`WikiPage`** — `(workspaceId, updatedAt)`, `(workspaceId, isPublished)`, GIN on `tags`, plus `last_viewed_at`, `view_count`, `workspace_type` indexes
- **`OrgAuditLog`** — `(workspaceId, createdAt)`, `(workspaceId, event)`, `(workspaceId, actorUserId)`
- **`PersonAvailability`** — `(workspaceId, personId)`, `(personId, startDate)`, `(workspaceId, reason)`, `(workspaceId, source)`
- **`PersonManagerLink`** — `(workspaceId, personId)`, `(workspaceId, managerId)`
- **`CapacityContract`** — entity-graph composite `(workspaceId, personId, effectiveFrom, effectiveTo)`
- **`WorkAllocation`** — entity-graph composite `(workspaceId, personId, startDate, endDate)`
- **`PersonSkill`** — expertise composite `(workspaceId, skillId, proficiency)`, plus `(workspaceId, personId)`
- **`Todo`** — `(workspaceId, assignedToId, status, dueAt)`, `(workspaceId, anchorType, anchorId)`
- **`Activity`** — `(workspaceId, createdAt)`, `(actorId, entity, entityId)`
- **`OrgSavedView`** — `(workspaceId, scope)` with `@@unique([workspaceId, scope, key])`
- **`LoopbrainOpenLoop`** — `(workspaceId, userId, status)`
- **`ProactiveInsight`** — 5 indexes covering status, category, priority, expiresAt, createdAt
- **`OrgInvitation`** — `(workspaceId, status)`, `[email]`, `[token]`
- **`PersonRelationship`** — `(workspaceId, personAId)`, `(workspaceId, personBId)`, `(workspaceId, strength)`
- **`LeaveRequest`** — 4 indexes covering person+status, status, approvedById, date range
- **`OwnerAssignment`** — `(workspaceId, entityType)`, `(workspaceId, entityType, entityId)`, `(workspaceId, ownerPersonId)`
- **`OrgIssueResolution`** — `(workspaceId, issueKey)`, `(workspaceId, issueType)`, `(workspaceId, entityType, entityId)`

---

## Exact Prisma Lines to Add

Copy these blocks into the respective model definitions in `prisma/schema.prisma`. Each entry includes the model name as a comment.

```prisma
// ============================================================
// PRIORITY 1 — WORKSPACE_SCOPED_MODELS missing workspaceId index
// ============================================================

// Model: WikiChunk (line ~646)
@@index([workspaceId])
@@index([pageId])

// Model: Workflow (line ~970)
@@index([workspaceId])
@@index([workspaceId, isActive])

// Model: OnboardingTemplate (line ~700)
@@index([workspaceId])
@@index([workspaceId, isActive])

// Model: OnboardingPlan (line ~737)
@@index([workspaceId])
@@index([workspaceId, status])
@@index([workspaceId, userId])
// (remove or keep the bare @@index([userId, status]) — the composite above is strictly better)

// Model: ProjectTemplate (line ~1419)
@@index([workspaceId])
@@index([workspaceId, category])

// ============================================================
// PRIORITY 2 — Hot route FK fields
// ============================================================

// Model: WorkflowInstance (line ~985)
@@index([workflowId])
@@index([workspaceId, userId])   // add userId dimension to existing workspace index

// Model: WorkflowAssignment (line ~1005)
@@index([instanceId])
@@index([userId])

// Model: OneOnOneMeeting (line ~4379)
@@index([workspaceId, scheduledAt])   // date-range queries for upcoming meetings

// Model: OneOnOneActionItem (line ~4443)
@@index([workspaceId, assigneeId, status])   // batch pre-load fix from N+1 audit

// Model: PerformanceCycle (line ~4256)
@@index([workspaceId, createdById])

// Model: PerformanceReview (line ~4211)
@@index([workspaceId, employeeId])

// Model: GoalProgressUpdate (line ~4180)
@@index([sourceId])

// Model: GoalCheckIn (line ~4538)
@@index([workspaceId, userId])

// Model: ProjectAllocation (line ~2677)
@@index([projectId])   // currently only has [workspaceId, projectId] and [personId, startDate]
                       // standalone [projectId] speeds up allocation → project JOIN

// ============================================================
// PRIORITY 3 — Composite workspaceId + sort field
// ============================================================

// Model: ChatSession (line ~1092)
@@index([workspaceId, updatedAt(sort: Desc)])

// Model: Goal (line ~3874)
@@index([workspaceId, endDate])

// Model: LoopbrainPendingAction (line ~1039)
@@index([workspaceId, expiresAt])

// Model: LeaveRequest (line ~3831)
@@index([workspaceId, startDate, endDate])

// Model: PersonActivityMetric (line ~3795)
@@index([workspaceId, weekStarting])

// ============================================================
// PRIORITY 4 — Other FK fields without indexes
// ============================================================

// Model: Account (line ~12)
@@index([userId])

// Model: Session (line ~31)
@@index([userId])

// Model: OnboardingTask (line ~717)
@@index([templateId])

// Model: onboarding_task_assignments (line ~1539)
@@index([taskId])

// Model: KeyResultUpdate (line ~4007)
@@index([updatedById])

// Model: GoalComment (line ~4030)
@@index([authorId])

// Model: GoalUpdate (line ~4052)
@@index([authorId])

// Model: GoalWorkflowRule (line ~4569)
@@index([workspaceId, trigger])

// Model: DecisionEscalationStep (line ~3318)
@@index([personId])

// Model: OneOnOneTalkingPoint (line ~4420)
@@index([addedBy])

// Model: WorkRequest (line ~3199)
@@index([workspaceId, requesterPersonId])

// Model: WorkImpact (line ~3371)
@@index([createdById])
```

---

## Cross-Reference: N+1 Audit Indexes Flagged But Not Yet Created

The `docs/audits/perf-audit-queries.md` "Index coverage" section flagged the following at the bottom. Status after this audit:

| Query pattern flagged | Index Status |
|----------------------|-------------|
| `prisma.orgPosition.findFirst({ where: { userId, workspaceId, isActive: true } })` | **OK** — `@@index([workspaceId, userId])` (`idx_org_positions_workspace_user`) exists |
| `prisma.personSkill.findMany({ where: { workspaceId, personId: { in: [...] } } })` | **OK** — `@@index([workspaceId, personId])` exists |
| `prisma.workAllocation.findMany({ where: { workspaceId, personId, endDate: ... } })` | **OK** — `@@index([workspaceId, personId, startDate, endDate])` exists (`idx_work_allocations_capacity`) |

All three previously flagged queries are now covered by existing indexes. No additional action needed for them.

---

## Summary Table

| Priority | Count | Example |
|----------|-------|---------|
| P1 — WORKSPACE_SCOPED missing `workspaceId` | 5 models | `WikiChunk`, `Workflow`, `OnboardingTemplate`, `OnboardingPlan`, `ProjectTemplate` |
| P2 — Hot route FK missing index | 13 findings | `WorkflowInstance.workflowId`, `OneOnOneMeeting` date composite, `PerformanceReview.employeeId` |
| P3 — Missing composite (workspaceId + sort) | 5 models | `ChatSession.updatedAt`, `Goal.endDate`, `LeaveRequest` date range |
| P4 — Other FK fields without indexes | 13 fields | `Account.userId`, `Session.userId`, `KeyResultUpdate.updatedById` |
| **Total** | **36 recommendations** | — |

The `Account.userId` and `Session.userId` findings (Priority 4) are worth flagging separately: NextAuth resolves sessions on **every authenticated request** and uses both of these join paths. If the user table is large, adding `@@index([userId])` to both tables is low-risk and high-reward.
