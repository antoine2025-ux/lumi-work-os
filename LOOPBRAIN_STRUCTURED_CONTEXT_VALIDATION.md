# Loopbrain Structured Context Compliance Validation

## 5) ContextObject Standardization Check

### Shared ContextObject Type

**✅ EXISTS**: `src/lib/context/context-types.ts` defines `ContextObject` interface:

```typescript
export interface ContextObject {
  id: string                    // ✅ Required
  type: ContextObjectType       // ✅ Required
  title: string                 // ✅ Required
  summary: string               // ✅ Required
  tags: string[]                // ✅ Required
  ownerId?: string              // ✅ Optional
  status?: string               // ✅ Optional
  updatedAt: Date               // ✅ Required
  relations: ContextRelation[]  // ✅ Required
  metadata?: Record<string, unknown>  // ✅ Optional
}
```

### Context Contributors Verification

**✅ COMPLIANT: Projects** (`src/lib/context/context-builders.ts:projectToContext()`)
- ✅ `id`: `project.id`
- ✅ `type`: `'project'`
- ✅ `title`: `project.name`
- ✅ `summary`: Built from status, department, priority
- ✅ `tags`: Built from status, priority, department, team
- ✅ `ownerId`: `project.ownerId`
- ✅ `status`: Normalized project status
- ✅ `updatedAt`: `project.updatedAt`
- ✅ `relations`: Owner relation, project relations
- ✅ `metadata`: Department, team, priority, etc.

**✅ COMPLIANT: Tasks** (`src/lib/context/context-builders.ts:taskToContext()`)
- ✅ `id`: `task.id`
- ✅ `type`: `'task'`
- ✅ `title`: `task.title`
- ✅ `summary`: Built from status, assignee, project
- ✅ `tags`: Built from status, priority, task tags
- ✅ `ownerId`: `task.assigneeId`
- ✅ `status`: Normalized task status
- ✅ `updatedAt`: `task.updatedAt`
- ✅ `relations`: Project relation, assignee relation
- ✅ `metadata`: Priority, due date, epic info, etc.

**✅ COMPLIANT: Pages** (`src/lib/context/context-builders.ts:pageToContext()`)
- ✅ `id`: `page.id`
- ✅ `type`: `'page'`
- ✅ `title`: `page.title`
- ✅ `summary`: Built from excerpt/content, category, published status
- ✅ `tags`: Built from page tags, category
- ✅ `ownerId`: `page.createdById`
- ✅ `status`: `'published'` or `'draft'`
- ✅ `updatedAt`: `page.updatedAt`
- ✅ `relations`: Owner relation, project relations
- ✅ `metadata`: Category, slug, view count, etc.

**✅ COMPLIANT: Roles** (`src/lib/context/context-builders.ts:roleToContext()`)
- ✅ `id`: `role.id`
- ✅ `type`: `'role'`
- ✅ `title`: `role.title`
- ✅ `summary`: Built from level, user, team
- ✅ `tags`: Built from level, team, active status
- ✅ `ownerId`: `role.userId`
- ✅ `status`: `'active'` or `'vacant'`
- ✅ `updatedAt`: `role.updatedAt` or `role.createdAt`
- ✅ `relations`: User relation, team relation
- ✅ `metadata`: Level, team info, etc.

**✅ COMPLIANT: Epics** (`src/lib/loopbrain/context-sources/pm/epics.ts:buildEpicContext()`)
- ✅ Uses `projectToContext()` pattern (similar structure)
- ✅ `id`: `epic.id`
- ✅ `type`: `'epic'` (but ContextObjectType doesn't include 'epic' - **GAP**)
- ✅ `title`: `epic.title`
- ✅ `summary`: Built from status, task counts
- ✅ `tags`: Built from status, color
- ✅ `ownerId`: Not set (epics don't have owners)
- ✅ `status`: Epic status
- ✅ `updatedAt`: `epic.updatedAt`
- ✅ `relations`: Project relation
- ✅ `metadata`: Task counts, order, color, etc.

### Gaps Identified

**❌ GAP 1: Epic Type Not in ContextObjectType**

**Location**: `src/lib/context/context-types.ts`

**Issue**: 
- `ContextObjectType` only includes: `'project' | 'page' | 'task' | 'role' | 'person' | 'meeting' | 'workspace' | 'team'`
- Epics use `'epic'` as type, but it's not in the union
- This causes type errors or requires type assertions

**Fix**: Add `'epic'` to `ContextObjectType`:
```typescript
export type ContextObjectType =
  | 'project'
  | 'page'
  | 'task'
  | 'epic'  // ADD THIS
  | 'role'
  | 'person'
  | 'meeting'
  | 'workspace'
  | 'team'
```

**❌ GAP 2: Inconsistent Status Normalization**

**Issue**:
- Projects: `normalizeProjectStatus()` maps `ACTIVE` → `'active'`
- Tasks: `normalizeTaskStatus()` maps `TODO` → `'todo'`, `DONE` → `'done'`
- Epics: Uses raw status (no normalization)
- Pages: Uses `'published'` or `'draft'` (hardcoded)

**Impact**: Status values are inconsistent across types, making filtering/querying harder

**Fix**: Create shared status normalization utility or ensure all builders normalize consistently

**❌ GAP 3: Missing Required Fields Validation**

**Issue**: No runtime validation that ContextObjects have all required fields before storing/using

**Fix**: Add validation function:
```typescript
function validateContextObject(obj: any): obj is ContextObject {
  return (
    typeof obj.id === 'string' &&
    typeof obj.type === 'string' &&
    typeof obj.title === 'string' &&
    typeof obj.summary === 'string' &&
    Array.isArray(obj.tags) &&
    obj.updatedAt instanceof Date &&
    Array.isArray(obj.relations)
  )
}
```

**⚠️ MINOR GAP 4: Metadata Structure Inconsistency**

**Issue**: Different context sources put different fields in `metadata`:
- Projects: `department`, `team`, `priority`
- Tasks: `dueDate`, `priority`, `epicId`, `epicTitle`
- Epics: `tasksTotal`, `tasksDone`, `order`, `color`
- Pages: `category`, `slug`, `viewCount`

**Impact**: LLM needs to know which fields are in metadata for each type

**Fix**: Document metadata structure per type, or create type-specific metadata interfaces

### Smallest Fix Plan

**Priority 1: Add Epic Type** (5 minutes)
- Add `'epic'` to `ContextObjectType` in `src/lib/context/context-types.ts`
- No breaking changes, just extends the union

**Priority 2: Add Status Normalization for Epics** (10 minutes)
- Create `normalizeEpicStatus()` function in `src/lib/loopbrain/context-sources/pm/epics.ts`
- Use it in `buildEpicContext()`

**Priority 3: Add Runtime Validation** (15 minutes)
- Create `validateContextObject()` helper in `src/lib/context/context-types.ts`
- Call it before storing ContextObjects in `saveContextItem()`
- Log warnings for invalid objects

**Total Estimated Time**: 30 minutes

### Compliance Summary

**✅ All context contributors output ContextObject shape**: YES
- Projects: ✅ Compliant
- Tasks: ✅ Compliant
- Pages: ✅ Compliant
- Roles: ✅ Compliant
- Epics: ✅ Compliant (except type not in union)

**✅ Required fields present**: YES (all builders include required fields)

**✅ Optional fields handled consistently**: MOSTLY (status normalization could be more consistent)

**✅ Relations built correctly**: YES (all builders create relations array)

**✅ Metadata structured**: YES (all builders include metadata, though structure varies)

