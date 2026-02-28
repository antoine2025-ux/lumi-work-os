# N+1 & Query Performance Audit

**Date:** 2026-02-28
**Auditor:** Claude Code
**Scope:** `src/app/api/`, `src/lib/`

---

## Executive Summary

The audit identified **9 confirmed N+1 patterns**, **4 sequential count waterfall queries** that should be parallelised, **7 unbounded `findMany` calls** that lack `take:` in high-frequency paths, and **1 recursive N+1 in a graph traversal** that can grow exponentially with dependency depth.

The highest-impact findings are in the Loopbrain path (called on every AI chat turn) and in admin-triggered sync jobs that loop over workspace-wide entity sets. The org-context-persistence layer has an especially severe pattern: it runs two sequential Prisma calls per entity (findFirst + update/create) for every org member, team, department, and role in the workspace.

---

## Critical N+1s (fix immediately)

| File | Line(s) | Pattern | Recommended Fix |
|------|---------|---------|----------------|
| `src/app/api/workspaces/current/members/route.ts` | 53–88 | `findMany(WorkspaceMember)` followed by `map(async (member) => prisma.orgPosition.findFirst(...))` — one query per member | Add `include: { orgPositions: { where: { isActive: true }, include: { team: { include: { department: true } } }, take: 1 } }` to the original `findMany` and eliminate the map loop |
| `src/app/api/performance/cycles/route.ts` | 52–86 | `findMany(PerformanceCycle)` followed by `map(async (cycle) => prisma.performanceReview.groupBy(...))` — one `groupBy` per cycle | Replace with a single `prisma.performanceReview.groupBy({ by: ['cycleId', 'status'], where: { cycleId: { in: cycleIds } }, _count: true })` then aggregate in memory |
| `src/app/api/org/projects/route.ts` | 61–166 | `findMany(Project)` followed by `map(async (project) => { prisma.user.findUnique(ownerPersonId); prisma.user.findUnique(decisionPersonId); ... })` — up to 5 user lookups per project | Use `include: { accountability: { include: { ... } } }` in the initial query and join user data in the ProjectAccountability model, or replace with a single `prisma.user.findMany({ where: { id: { in: allPersonIds } } })` after collecting IDs from all accountability records |
| `src/app/api/org/decision/domains/[key]/route.ts` | 73–91 | `domain.authority.escalationSteps.map(async (step) => prisma.user.findUnique(...))` — one lookup per escalation step | Collect all `personId` values first, do one `prisma.user.findMany({ where: { id: { in: personIds } } })`, then map by ID |
| `src/app/api/org/decision/domains/[key]/authority/route.ts` | 203–221 | Same pattern after upsert — escalation steps resolved one-by-one | Same fix as above: batch-load all user names in one query |
| `src/lib/loopbrain/reasoning/proactiveInsights.ts` | 601–629 | `for (const meeting of upcomingMeetings) { await prisma.oneOnOneActionItem.findMany(...) }` — one query per upcoming meeting (up to 20) | Pre-load all open action items for the participants in a single query before the loop: `prisma.oneOnOneActionItem.findMany({ where: { workspaceId, status: 'OPEN', meeting: { OR: participantPairs, scheduledAt: { lt: now } } }, take: 200 })`, then group by meeting in memory |
| `src/lib/loopbrain/orgContextPersistence.ts` | 116–118 | `for (const obj of allObjects) { await upsertContextItemForOrgObject(...) }` where each upsert runs `findFirst` + `update`/`create` — two queries per entity for the entire org (can be hundreds of rows) | Use `prisma.contextItem.upsert()` in batches of 50 wrapped in `$transaction`, or use `createMany` with `skipDuplicates` combined with `updateMany` keyed on `(workspaceId, contextId, type)` |
| `src/lib/org/rollups/deriveTeamSkills.ts` | 332–334 | `for (const team of teams) { const summary = await deriveTeamSkillSummary(...) }` — each iteration runs multiple queries (positions, person skills, role card skills) for every team in the department | Load all teams' positions and skills in bulk at the department level with a single `prisma.personSkill.findMany({ where: { workspaceId, personId: { in: allPersonIds } }, include: { skill: true } })` and group by personId/teamId in memory |
| `src/app/api/performance/cycles/[cycleId]/launch/route.ts` | 62–96 | `for (const employeeId of participantIds) { await prisma.orgPosition.findFirst(...); await prisma.orgPosition.findFirst(...); await prisma.personManagerLink.findFirst(...) }` — 2-3 queries per participant during cycle launch | Batch-load all active positions for all `participantIds` upfront: `prisma.orgPosition.findMany({ where: { userId: { in: participantIds }, workspaceId, isActive: true }, select: { userId: true, parentId: true } })` and then resolve manager chains in memory |

---

## Loops with `await prisma` (write operations)

| File | Line(s) | Pattern | Recommended Fix |
|------|---------|---------|----------------|
| `src/app/api/org/issues/sync/route.ts` | 32–61 | Three separate `for` loops each calling `prisma.orgPersonIssue.upsert()` per person — one upsert per person in each category | Collect all upsert data, then run `prisma.$transaction([ ...upserts ])` in a single transaction. Or use `createMany` with `skipDuplicates` and separate `updateMany` for the `lastSeenAt` field |
| `src/app/api/org/duplicates/sync/route.ts` | 128–144 | `for (const c of candidates) { await prisma.orgDuplicateCandidate.findUnique(...); await prisma.orgDuplicateCandidate.upsert(...) }` — two queries per candidate pair | Batch-load all existing candidates in one `findMany({ where: { orgId, personAId: { in: [...] } } })`, then compute the diff in memory and use `createMany` + `updateMany` instead of per-row upsert |
| `src/app/api/org/issues/apply/route.ts` | 36–73 | Inside `$transaction`, `for (const a of actions) { await tx.orgPosition.findFirst(...); await tx.orgTeam.findFirst(...); await tx.orgPosition.update(...) }` — 3 sequential queries inside a transaction per action | Pre-load all relevant positions and teams in bulk before the transaction, resolve the patch data in memory, then run a single `$transaction` with the final update operations |
| `src/app/api/assistant/create-project/route.ts` | 112–131, 161–178 | Two sequential `for` loops each calling `prisma.task.create()` per task template — one round-trip per task | Replace with `prisma.task.createMany({ data: tasks })` |
| `src/app/api/tasks/[id]/dependencies/route.ts` | 270–296 | `hasCircularDependency()` recursively calls `prisma.task.findUnique()` per dependency node (DFS), and `updateReverseDependencies()` calls `prisma.task.update()` per dependency — can fan out exponentially | For cycle detection, load all relevant task dependency arrays in a single `findMany({ where: { id: { in: allKnownIds } }, select: { id: true, dependsOn: true } })` and run BFS/DFS in memory. For reverse dependency updates, use `prisma.task.updateMany` or batch in a single transaction |

---

## Unbounded Queries (add pagination)

These `findMany` calls have no `take:` limit in hot paths. On large workspaces they will scan the entire table.

| File | Line | Model | Issue | Recommended `take:` |
|------|------|-------|-------|---------------------|
| `src/lib/loopbrain/insight-detector.ts` | 313 | `Task` | `detectWorkloadInsights()` loads ALL tasks for workspace with no limit | `take: 5000` with a logged warning if approaching limit, or switch to `groupBy` aggregation |
| `src/lib/loopbrain/insight-detector.ts` | 458 | `Task` | `detectDependencyInsights()` loads all tasks with non-empty `dependsOn`/`blocks` arrays | `take: 2000` |
| `src/lib/loopbrain/insight-detector.ts` | 822 | `DecisionDomain` | `detectCommunicationInsights()` loads all decision domains | `take: 500` |
| `src/lib/loopbrain/insight-detector.ts` | 911 | `Project` | `detectProjectHealthInsights()` loads all active projects and all tasks together | Projects: `take: 200`; Tasks: `take: 10000` |
| `src/lib/loopbrain/goals/goal-queries.ts` | 73, 139, 192, 241, 287, 333 | `Goal` (6 calls) | Every goal query function (`getAtRiskGoals`, `getGoalProgress`, `getQuarterlyGoals`, etc.) loads all goals with full `include: { objectives: { include: { keyResults } } }` — this deeply nests data with no limit | Add `take: 200` and consider loading objectives/keyResults lazily |
| `src/lib/loopbrain/workload-analysis.ts` | 99 | `Task` | `buildWorkloadAnalysis()` loads ALL tasks assigned to a person — no limit on number of tasks | `take: 500, orderBy: { updatedAt: 'desc' }` |
| `src/app/api/org/projects/route.ts` | 14 | `Project` | Loads all projects for the org with full accountability/allocation includes and no limit | Add `take: 500` or implement cursor-based pagination |

---

## Sequential Count Waterfalls (parallelise)

These are not N+1s but sequential `await` chains that can be parallelised with `Promise.all`.

| File | Lines | Pattern | Recommended Fix |
|------|-------|---------|----------------|
| `src/app/api/loopbrain/index-health/route.ts` | 32–77 | 16 sequential `await prisma.*.count()` calls (8 entity counts + 8 contextItem counts) — each blocks on the previous | Wrap all 16 in a single `Promise.all([...])` array |
| `src/app/api/wiki/page-counts/route.ts` | 89–174 | `for (const workspace of workspaces) { count = await prisma.wikiPage.count(...) }` — one count query per wiki workspace | Replace with a `prisma.wikiPage.groupBy({ by: ['workspace_type'], where: { workspaceId, isPublished: true }, _count: true })` and derive per-workspace counts from that |

---

## Missing Includes (eliminate round-trips)

These patterns fetch a parent record and then separately fetch related data that could be included in the original query.

| File | Line | Current Pattern | Recommended `include` block |
|------|------|-----------------|----------------------------|
| `src/lib/loopbrain/context-engine.ts` | 902–926 | `buildBreadcrumbs()` traverses wiki page parent chain with a `while` loop calling `prisma.wikiPage.findUnique()` per level (up to 10 levels) | Load the page with its full parent chain using a raw SQL CTE, or cache the parent chain in a denormalized `breadcrumbPath` column. Alternatively, cap at 5 levels and use `Promise.all` for the level lookups |
| `src/lib/loopbrain/orgContextPersistence.ts` | 50–56, 116–118 | `upsertContextItemForOrgObject` calls `findFirst` then conditionally `update` or `create` for every entity | Use `prisma.contextItem.upsert({ where: { workspaceId_contextId_type: ... }, update: ..., create: ... })` once the composite unique index exists; this removes the findFirst round-trip entirely |

---

## Loopbrain-specific (high-impact, called on every chat turn)

| File | Line(s) | Issue |
|------|---------|-------|
| `src/lib/loopbrain/reasoning/proactiveInsights.ts` | 601–629 | **N+1**: `for (const meeting of upcomingMeetings)` calls `prisma.oneOnOneActionItem.findMany()` per meeting — called during every user-scoped insight generation |
| `src/lib/loopbrain/goals/goal-queries.ts` | 73–330 | **Unbounded + eager load**: Six separate `findMany(Goal)` calls each loading `objectives → keyResults` with no `take:` — every Loopbrain goal question triggers a full table scan |
| `src/lib/loopbrain/workload-analysis.ts` | 99 | **Unbounded**: `prisma.task.findMany({ where: { assigneeId: personId } })` — no limit; a power user with 1000+ tasks would return a massive payload on every workload check |
| `src/lib/loopbrain/reasoning/projectHealth.ts` | 750–766 | **Sequential loop**: `buildMultipleProjectHealthSnapshots()` calls `buildProjectHealthSnapshot()` in a `for` loop — each snapshot triggers 6 parallel queries; all snapshots are processed serially. For the POST endpoint that processes up to 50 projects, this is 50 sequential batches instead of concurrent |
| `src/lib/loopbrain/orgContextPersistence.ts` | 116–118 | **N+1 write**: Sequential `upsertContextItemForOrgObject()` for every org entity — two Prisma round-trips per entity. For a 200-person org this is ~400+ sequential queries on every org context sync |

---

## Notes

### Patterns NOT flagged as N+1

The following patterns were inspected but determined to be acceptable:

- **`org/capacity/teamRollup.ts`**: `computeAllTeamRollups` does a single broad `findMany(OrgPosition)` and then aggregates in memory — correct.
- **`org/rollups/deriveTeamSkills.ts`** (`getTeamMembersWithSkills`): Uses two sequential queries (positions then personSkills with `IN`-clause) — acceptable two-step lookup.
- **`lib/loopbrain/insight-detector.ts`** (capacity/coverage/skill-gap detectors): All use `Promise.all([...findMany()])` for their initial data loads — correct.
- **`lib/loopbrain/context-engine.ts`** (`getOrgContext`): Loads positions with `include: { team: { include: { department } }, user }` in one query — correct.

### Priority order for remediation

1. **P0 (fix before next deploy):** `orgContextPersistence.ts` line 116 — runs on org sync which can be triggered frequently
2. **P0:** `proactiveInsights.ts` line 601 — runs inside every Loopbrain chat session for authenticated users
3. **P1:** `workspaces/current/members/route.ts` — called by assignment dropdowns throughout the UI
4. **P1:** `performance/cycles/route.ts` — called on the performance dashboard
5. **P1:** `org/projects/route.ts` — up to 5 user lookups per project with no batching or caching
6. **P2:** `wiki/page-counts/route.ts` — mitigated by application-level cache (2-minute TTL), but should still be fixed
7. **P2:** All unbounded `findMany` calls in Loopbrain goal queries

### Index coverage

The following queries appear to lack composite indexes that would make them faster even after N+1 fixes:

- `prisma.orgPosition.findFirst({ where: { userId, workspaceId, isActive: true } })` — verify composite index `(workspaceId, userId, isActive)` exists on `OrgPosition`
- `prisma.personSkill.findMany({ where: { workspaceId, personId: { in: [...] } } })` — verify composite index `(workspaceId, personId)` exists on `PersonSkill`
- `prisma.workAllocation.findMany({ where: { workspaceId, personId, endDate: ... } })` — verify partial index on active allocations
