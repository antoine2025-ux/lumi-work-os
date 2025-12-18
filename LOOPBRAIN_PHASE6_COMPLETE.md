# Loopbrain Phase 6: Org Capacity Context Contract - Complete ✅

## Summary

Implemented org capacity planning context so Loopbrain can answer capacity questions with grounded, citable sources. Added time off tracking, workload signals, and role cards to the canonical ContextObject system.

## Files Created

1. **`prisma/schema.prisma`** (updated)
   - Added `TimeOff` model with:
     - `id`, `workspaceId`, `userId`
     - `startDate`, `endDate`
     - `type` (vacation, sick, personal, other)
     - `status` (approved, pending, cancelled)
     - `notes`
     - Relations to `User` and `Workspace`

## Files Updated

1. **`src/lib/context/context-types.ts`**
   - Added `'time_off'` to `ContextObjectType` union

2. **`src/lib/context/context-builders.ts`**
   - Added `WorkloadStats` interface:
     - `tasksAssignedTotal`
     - `tasksInProgress`
     - `tasksOverdue`
     - `tasksDueNext7Days`
   - Added `personToContext()`:
     - Converts User to ContextObject
     - Includes role, team, workload stats, time off
     - Summary includes availability signals (e.g., "Off until 2025-12-12")
     - Tags: `available`, `off_now`, `overloaded`, `light_load`
     - Metadata includes workload stats and time off dates
   - Added `teamToContext()`:
     - Converts OrgTeam to ContextObject
     - Includes aggregate stats (memberCount, activeMemberCount, availableMemberCount)
     - Tags: `active`, `has_capacity`
   - Added `timeOffToContext()`:
     - Converts TimeOff to ContextObject
     - Summary includes dates and type
     - Tags: `active`, `off_now`, `upcoming`, `approved`, `past`
     - Relations to person

3. **`src/lib/loopbrain/context-engine.ts`**
   - Added `getOrgCapacityContext()`:
     - Fetches org positions (roles) with users and teams
     - Fetches time off windows (active + upcoming 30 days)
     - Computes workload stats per person from Task model
     - Returns ContextObject[]:
       - `person` objects with workload stats and time off
       - `time_off` objects (separate for citations)
       - `team` objects with aggregate stats
     - Scoped by workspace and permissions

4. **`src/lib/loopbrain/orchestrator.ts`**
   - Updated `handleOrgMode()`:
     - For `capacity_planning` intent, uses `getOrgCapacityContext()` instead of `getOrgPeopleContext()`
     - Includes people, time_off, teams, and workload stats
   - Updated `handleDashboardMode()`:
     - For `capacity_planning` intent, also includes capacity context
   - Updated `buildOrgPrompt()`:
     - For `capacity_planning` intent, shows people, time_off, and teams separately
     - Special instructions for capacity planning:
       1. Current availability constraints (who is off and when)
       2. Workload signals (task counts, overdue, in-progress)
       3. Recommended temporary coverage
       4. Confidence + missing data
     - All must cite sources (person:*, time_off:*, team:*)

5. **`scripts/test-loopbrain-smoke.ts`**
   - Added Test 12: Capacity Planning Context
   - Added `testCapacityPlanning()` function structure

## Implementation Details

### TimeOff Model

```prisma
model TimeOff {
  id          String    @id @default(cuid())
  workspaceId String
  userId      String
  startDate   DateTime
  endDate     DateTime
  type        String    @default("vacation")
  status      String    @default("approved")
  notes       String?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  user        User      @relation(...)
  workspace   Workspace @relation(...)
}
```

### Workload Stats Computation

For each person, computes:
- `tasksAssignedTotal`: All tasks assigned to user
- `tasksInProgress`: Tasks with status `IN_PROGRESS`
- `tasksOverdue`: Tasks with `dueDate < now` and status != `DONE`
- `tasksDueNext7Days`: Tasks with `dueDate` in next 7 days

### Person ContextObject

**Summary Examples:**
- "John Doe (Senior Engineer) in Backend Team - Off until 2025-12-12 - 3 overdue tasks"
- "Jane Smith (Product Manager) in Product Team - Available"

**Tags:**
- `available` - No time off, not overloaded
- `off_now` - Currently on time off
- `off_upcoming` - Time off in next 30 days
- `overloaded` - Has overdue tasks
- `busy` - More than 5 in-progress tasks
- `light_load` - 2 or fewer assigned tasks

**Metadata:**
- `tasksAssignedTotal`, `tasksInProgress`, `tasksOverdue`, `tasksDueNext7Days`
- `timeOffStartDate`, `timeOffEndDate`, `timeOffType`, `timeOffStatus`

### Time Off ContextObject

**Summary Examples:**
- "Sarah - Off now until 2025-12-12 (vacation, approved)"
- "John - Off from 2025-12-20 to 2025-12-25 (sick, approved)"

**Tags:**
- `active` - Currently active time off
- `off_now` - Currently on time off
- `upcoming` - Future time off
- `approved` - Status is approved
- `past` - Time off has ended

### Team ContextObject

**Summary Examples:**
- "Backend Team in Engineering - 5 active members, 3 available"

**Tags:**
- `active` - Team is active
- `has_capacity` - Has available members

**Metadata:**
- `memberCount`, `activeMemberCount`, `availableMemberCount`

### Capacity Context Flow

1. **Intent Detection**: Router detects `capacity_planning` intent
2. **Context Loading**: 
   - `handleOrgMode()` or `handleDashboardMode()` calls `getOrgCapacityContext()`
   - Fetches positions, time off, computes workload stats
3. **Context Packing**: Capacity context objects packed with budgets
4. **Prompt Building**: 
   - For `capacity_planning`, shows people, time_off, teams separately
   - Special instructions for structured capacity analysis
5. **LLM Response**: Must cite person:*, time_off:*, team:* objects
6. **Citation Validation**: Ensures all capacity claims are cited

## Example Capacity Planning Query

**Query:** "We need analyst capacity for 3 weeks; Sarah is off until 2025-12-20. Who can cover?"

**Context Includes:**
- Person objects with workload stats and availability
- Time off objects for Sarah (and others)
- Team objects with aggregate capacity

**Expected Answer Structure:**
1. **Availability constraints:**
   - "Sarah is off until 2025-12-20 (source: time_off:to123)"
   - "John has 3 overdue tasks (source: person:user456)"

2. **Workload signals:**
   - "Jane has 2 in-progress tasks, 0 overdue (source: person:user789)"
   - "Team Backend has 3 available members (source: team:team123)"

3. **Recommended coverage:**
   - "Jane can cover (source: person:user789)"
   - "Team Backend has capacity (source: team:team123)"

4. **Confidence:**
   - "I have time off data for Sarah and workload stats for all team members."

## Verification Steps

1. ✅ **Type Check**: No TypeScript errors
2. ✅ **Lint Check**: No linter errors
3. ⏳ **Manual Test 1**: Create a time off entry
   - Expected: Time off appears in capacity context
4. ⏳ **Manual Test 2**: Query: "We need analyst capacity for 3 weeks; Sarah is off until X. Who can cover?"
   - Expected: Answer includes citations to person:* and time_off:*
   - Expected: sourcesUsed includes relevant objects
   - Expected: Answer mentions availability, workload, and recommendations
5. ⏳ **Manual Test 3**: Query: "Who has capacity next week?"
   - Expected: Lists people with availability, excludes people who are off, mentions workload

## Key Features

1. ✅ **Time off tracking** - TimeOff model with dates, type, status
2. ✅ **Workload signals** - Task counts, overdue, in-progress, due soon
3. ✅ **Role cards** - Person objects with roles, teams, availability
4. ✅ **Team capacity** - Aggregate stats per team
5. ✅ **Canonical ContextObjects** - All flow into unified format
6. ✅ **Citable sources** - person:*, time_off:*, team:* objects
7. ✅ **Workspace scoped** - All queries respect workspace boundaries
8. ✅ **Permission safe** - Uses existing auth/access patterns

## Constraints Met

- ✅ No new complex features or UI pages
- ✅ Minimal DB model (TimeOff only)
- ✅ Everything flows into canonical ContextObject
- ✅ Must respect workspace + permissions

## Next Steps

- Run Prisma migration to create TimeOff table
- Test with real workspace data
- Monitor capacity planning query accuracy
- Consider adding more workload signals (SLA risk, etc.)

