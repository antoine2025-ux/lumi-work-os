# Milestone L4 – Focused Fix Plan

> **Status:** Ready for implementation – root cause identified from codebase analysis.  
> **Note:** This plan is based on codebase inspection. After running QA (L3 Step 23), update the root cause section if patterns differ.

---

## Root cause being addressed

**Selected root cause:** `wrong_relations`

**Reasons for choosing this:**
- Code inspection shows all mapper functions (`mapDepartmentToContextObject`, `mapTeamToContextObject`, `mapPositionToContextObject`, `mapPersonToContextObject`) return empty `relations` arrays
- Comments in code indicate "Relations will be populated by a higher-level graph builder" but no such builder exists
- Example findings in QA log show "Missing team context or relation" and "Wrong team membership"
- Questions about reporting lines, team membership, and department structure require proper relations to answer correctly

**Estimated impact:** ~60-70% of failing questions (based on example findings showing relation-related issues)

**Proposed fix direction:**
- Implement explicit relation-building logic in `orgContextBuilder.ts` that populates `relations` arrays for all Org ContextObjects
- Add relations for: `member_of_team`, `member_of_department`, `reports_to`, `manages`, `has_team`, `has_person`
- Ensure relations are persisted when ContextItems are upserted

---

## Why this root cause matters

- **Improves accuracy of:** `org-reporting-1`, `org-reporting-2`, `org-structure-1`, `org-team-membership-1`, `org-roles-1`
- **Fixes ~60-70%** of current failing Org→Loopbrain answers
- **Unblocks clean context generation** for future milestones by establishing proper graph structure

**Impact analysis:**
- Number of ❌ Wrong answers affected: ~2-3 (team membership, reporting lines)
- Number of ⚠️ Partial answers affected: ~2-3 (incomplete team lists, missing relations)
- Total questions improved: ~4-6 out of 7 canonical questions

**Affected smoke-test IDs:**
- `org-reporting-1` – "Who leads the Platform team?" (requires `manages` or `reports_to` relations)
- `org-reporting-2` – "Who reports to the Head of Engineering?" (requires `reports_to` relations)
- `org-structure-1` – "Which teams are part of the Engineering department?" (requires `member_of_department` relations)
- `org-team-membership-1` – "Which people are in the AI & Loopbrain Team?" (requires `member_of_team` relations)
- `org-roles-1` – "What roles exist in the Engineering department?" (requires `member_of_department` relations)

**Lower priority (may benefit but less critical):**
- `org-health-1` – "Are there any single-person teams?" (may benefit from better team membership relations)
- `org-health-2` – "Which manager has the most direct reports?" (requires `reports_to` relations)

---

## High-level fixes to implement

### 1. **Add relation-building helper functions**

**File:** `src/lib/loopbrain/orgContextBuilder.ts` (new functions)

Create helper functions that build relations from the OrgContextBundle:

- `buildDepartmentRelations(bundle: OrgContextBundle): ContextRelation[]`
  - For each department: `has_team` relations to all teams in that department
  
- `buildTeamRelations(bundle: OrgContextBundle): ContextRelation[]`
  - For each team: `member_of_department` relation (if departmentId exists)
  - For each team: `has_person` relations to all people in positions assigned to that team
  
- `buildPositionRelations(bundle: OrgContextBundle): ContextRelation[]`
  - For each position: `member_of_team` relation (if teamId exists)
  - For each position: `reports_to` relation (if parentId exists in OrgPosition model)
  - For each position: `has_person` relation (if userId exists)
  
- `buildPersonRelations(bundle: OrgContextBundle): ContextRelation[]`
  - For each person: `member_of_team` relation (via primaryPosition.teamId)
  - For each person: `member_of_department` relation (via primaryPosition.departmentId)
  - For each person: `has_role` relation (via primaryPosition.id)
  - For each person: `reports_to` relation (if primaryPosition has parentId)

**Technical details:**
- Use canonical IDs from `orgIds.ts` (`departmentId`, `teamId`, `roleId`, `personId`)
- Relation type should match canonical relation types from `contextTypes.ts`
- Handle null/undefined gracefully (not all entities have all relations)

---

### 2. **Update mapper functions to accept and populate relations**

**File:** `src/lib/loopbrain/orgContextMapper.ts`

Modify mapper function signatures to accept optional relations:

- `mapDepartmentToContextObject(dept: OrgDepartmentSource, relations?: ContextRelation[]): ContextObject`
- `mapTeamToContextObject(team: OrgTeamSource, relations?: ContextRelation[]): ContextObject`
- `mapPositionToContextObject(position: OrgPositionSource, relations?: ContextRelation[]): ContextObject`
- `mapPersonToContextObject(person: OrgPersonSource, relations?: ContextRelation[]): ContextObject`

**Implementation:**
- Merge provided relations with base relations array
- Keep existing tag-based metadata for backward compatibility
- Relations take precedence over tags for graph traversal

---

### 3. **Integrate relation building into bundle creation**

**File:** `src/lib/loopbrain/orgContextBuilder.ts`

Update `buildOrgContextBundleForCurrentWorkspace()`:

1. Build initial ContextObjects (as currently done)
2. Build relations using helper functions from step 1
3. Enrich ContextObjects with their relations:
   - Departments: add `has_team` relations
   - Teams: add `member_of_department` and `has_person` relations
   - Positions: add `member_of_team`, `reports_to`, `has_person` relations
   - People: add `member_of_team`, `member_of_department`, `has_role`, `reports_to` relations
4. Return enriched bundle

**Technical approach:**
- Build relations in a second pass after all ContextObjects are created
- Use Maps for efficient lookups (e.g., `Map<teamId, ContextObject>`)
- Ensure bidirectional relations where appropriate (e.g., person → team and team → person)

---

### 4. **Add parentId support to OrgPositionSource**

**File:** `src/lib/loopbrain/orgContextMapper.ts`

Extend `OrgPositionSource` type to include:

```typescript
export type OrgPositionSource = {
  // ... existing fields
  parentId?: string | null; // For reporting hierarchy
  parentTitle?: string | null; // Optional: parent position title
};
```

Update `fetchOrgPositionSources()` in `orgContextBuilder.ts` to include parent position:

```typescript
include: {
  team: { include: { department: true } },
  user: true,
  parent: true, // Add parent position
}
```

---

### 5. **Update health checks to validate relations**

**File:** `src/lib/loopbrain/orgContextHealth.ts`

Add new health check:

- **Check 9: Missing relations**
  - Verify that ContextObjects have expected relations:
    - Teams should have `member_of_department` if departmentId exists
    - People should have `member_of_team` if primaryPosition.teamId exists
    - Positions should have `member_of_team` if teamId exists
  - Flag ContextObjects with missing expected relations

---

### 6. **Add dev-only relation inspection endpoint**

**File:** `src/app/api/dev/org-loopbrain/relations/route.ts` (new)

Create endpoint that:
- Takes an entity ID and type (e.g., `person:user-123` or `team:team-456`)
- Returns all relations for that entity (both incoming and outgoing)
- Shows the graph structure as Loopbrain sees it

**Use case:** Debug why "Who leads X?" returns wrong answer by inspecting relations

---

### 7. **Update prompt builder to emphasize relations**

**File:** `src/lib/loopbrain/orgQuestionPrompt.ts`

Enhance system prompt to explicitly mention relations:

- Add section: "Org context includes relations between entities:"
  - `member_of_team` – person/position belongs to team
  - `member_of_department` – team/person belongs to department
  - `reports_to` – person/position reports to manager
  - `manages` – manager manages direct reports
  - `has_person` – team/position has assigned person
  - `has_role` – person has role/position

- Add instruction: "Use relations to answer questions about reporting lines, team membership, and organizational structure."

---

### 8. **Add relation visualization to dev status page**

**File:** `src/app/(dashboard)/org/dev/OrgRelationsDebugPanel.tsx` (new, optional)

Create a small dev panel that:
- Allows inputting an entity ID (person, team, department)
- Shows all relations for that entity
- Visualizes the graph structure

**Use case:** Quick debugging of relation issues during QA

---

## Definition of done

- [ ] All mapper functions accept and populate relations arrays
- [ ] `buildOrgContextBundleForCurrentWorkspace()` builds complete relation graph
- [ ] Relations are persisted in ContextItem.data when upserted
- [ ] Smoke-test questions move from ❌/⚠️ → ✅:
  - `org-reporting-1` – "Who leads the Platform team?" → ✅
  - `org-reporting-2` – "Who reports to the Head of Engineering?" → ✅
  - `org-structure-1` – "Which teams are part of the Engineering department?" → ✅
  - `org-team-membership-1` – "Which people are in the AI & Loopbrain Team?" → ✅
  - `org-roles-1` – "What roles exist in the Engineering department?" → ✅
- [ ] Health checks pass for relation validation
- [ ] Dev relation inspection endpoint works
- [ ] Loopbrain's answers match Org UI ground truth for relation-based questions
- [ ] No regressions in previously ✅ questions
- [ ] Relations are visible in `/api/dev/org-context-preview` JSON preview

---

## Technical files involved

**Core files to modify:**
- `src/lib/loopbrain/orgContextMapper.ts` – add relations parameter to mappers
- `src/lib/loopbrain/orgContextBuilder.ts` – add relation-building logic
- `src/lib/loopbrain/orgContextPersistence.ts` – ensure relations are persisted (should already work)

**New files to create:**
- `src/lib/loopbrain/orgRelationBuilder.ts` – relation-building helper functions (optional, can be in orgContextBuilder.ts)
- `src/app/api/dev/org-loopbrain/relations/route.ts` – relation inspection endpoint

**Files to update:**
- `src/lib/loopbrain/orgContextHealth.ts` – add relation validation check
- `src/lib/loopbrain/orgQuestionPrompt.ts` – enhance prompt with relation guidance

**Files that should already work (verify):**
- `src/app/api/org/**/route.ts` – sync hooks should preserve relations when upserting

---

## Implementation order

1. **Step 1:** Add `parentId` to `OrgPositionSource` and fetch it (foundation for reporting relations)
2. **Step 2:** Create relation-building helper functions
3. **Step 3:** Update mapper signatures to accept relations
4. **Step 4:** Integrate relation building into bundle creation
5. **Step 5:** Update health checks
6. **Step 6:** Add dev relation inspection endpoint
7. **Step 7:** Enhance prompt with relation guidance
8. **Step 8:** Test with smoke-test checklist

---

## Next steps

1. Run QA pass using smoke-test checklist (L3 Step 23) to confirm root cause
2. If root cause differs, update this document accordingly
3. Start Milestone L4 – Step 1: Implement relation-building helpers
4. Re-run smoke tests after each step to verify improvement

---
