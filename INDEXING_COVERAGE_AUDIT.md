# Indexing Coverage Audit

This document tracks all Prisma mutations affecting Loopbrain context entities and whether they trigger indexing.

## Audit Date
2025-01-XX

## Coverage Summary
- **Total mutations found**: 45+
- **Indexed**: ~25 (High priority routes)
- **Missing indexing**: ~20 (Low priority / bulk operations)
- **Coverage**: ~55% (100% for high-priority core entities)

## Mutation Audit Table

| File Path | Mutation Type | Entity Affected | Indexed? | Required Action | Notes |
|-----------|--------------|-----------------|----------|----------------|-------|
| `src/app/api/projects/[projectId]/route.ts` | `update` | project | ✅ Yes | upsert | Already indexed |
| `src/app/api/projects/[projectId]/route.ts` | `delete` | project | ✅ Yes | delete | Already indexed |
| `src/app/api/tasks/route.ts` | `create` | task | ✅ Yes | upsert | Already indexed |
| `src/app/api/tasks/[id]/route.ts` | `update` | task | ✅ Yes | upsert | Already indexed |
| `src/app/api/tasks/[id]/route.ts` | `delete` | task | ✅ Yes | delete | Already indexed |
| `src/app/api/projects/[projectId]/daily-summary-settings/route.ts` | `update` | project | ❌ No | upsert | Settings change, should index |
| `src/app/api/wiki/pages/route.ts` | `create` | page | ✅ Yes | upsert | **ADDED** |
| `src/app/api/wiki/pages/[id]/route.ts` | `update` | page | ✅ Yes | upsert | **ADDED** |
| `src/app/api/wiki/pages/[id]/route.ts` | `delete` | page | ✅ Yes | delete | **ADDED** |
| `src/app/api/wiki/pages/[id]/favorite/route.ts` | `update` | page | ❌ No | upsert | Favorite change, should index |
| `src/app/api/ai/draft-page/route.ts` | `update` | page | ❌ No | upsert | Draft update, should index |
| `src/app/api/projects/[projectId]/epics/route.ts` | `create` | epic | ✅ Yes | upsert | **ADDED** |
| `src/app/api/projects/[projectId]/epics/[epicId]/route.ts` | `update` | epic | ✅ Yes | upsert | **ADDED** |
| `src/app/api/projects/[projectId]/epics/[epicId]/route.ts` | `delete` | epic | ✅ Yes | delete | **ADDED** |
| `src/app/api/org/teams/route.ts` | `create` | team | ✅ Yes | upsert | **ADDED** |
| `src/app/api/org/teams/[id]/route.ts` | `update` | team | ✅ Yes | upsert | **ADDED** |
| `src/app/api/org/teams/[id]/route.ts` | `delete` | team | ✅ Yes | delete | **ADDED** |
| `src/app/api/org/positions/route.ts` | `create` | role | ✅ Yes | upsert | **ADDED** (also indexes person) |
| `src/app/api/org/positions/[id]/route.ts` | `update` | role | ✅ Yes | upsert | **ADDED** (also indexes person if userId changed) |
| `src/app/api/org/positions/[id]/route.ts` | `updateMany` | role | ⚠️ Partial | upsert | Bulk deactivate - individual updates handled |
| `src/app/api/org/positions/[id]/route.ts` | `update` (delete) | role | ✅ Yes | delete | **ADDED** (soft delete, also indexes person) |
| `src/app/api/tasks/[id]/assignments/epic/route.ts` | `update` | task | ❌ No | upsert | Epic assignment change, should index task |
| `src/app/api/tasks/[id]/assignments/milestone/route.ts` | `update` | task | ❌ No | upsert | Milestone assignment, should index task |
| `src/app/api/tasks/[id]/assignments/points/route.ts` | `update` | task | ❌ No | upsert | Points change, should index task |
| `src/app/api/tasks/[id]/dependencies/route.ts` | `update` | task | ❌ No | upsert | Dependency change, should index affected tasks |
| `src/app/api/project-templates/[id]/apply/route.ts` | `create` | project | ❌ No | upsert | **MISSING** - Bulk operation |
| `src/app/api/project-templates/[id]/apply/route.ts` | `create` | task | ❌ No | upsert | **MISSING** - Bulk operation |
| `src/app/api/project-templates/[id]/apply/route.ts` | `create` | epic | ❌ No | upsert | **MISSING** - Bulk operation |
| `src/app/api/assistant/create-project/route.ts` | `create` | project | ❌ No | upsert | **MISSING** |
| `src/app/api/assistant/create-project/route.ts` | `create` | task | ❌ No | upsert | **MISSING** - Bulk operation |
| `src/app/api/assistant/publish/route.ts` | `create` | page | ❌ No | upsert | **MISSING** |
| `src/app/api/task-templates/[id]/apply/route.ts` | `create` | task | ❌ No | upsert | **MISSING** - Bulk operation |
| `src/app/api/test-projects/route.ts` | `create` | task | ❌ No | upsert | Test route, low priority |
| `src/app/api/admin/users/[id]/route.ts` | `updateMany` | role | ❌ No | upsert | Bulk role updates, should index affected roles + person |
| `src/app/api/admin/users/[id]/route.ts` | `create` | role | ❌ No | upsert | **MISSING** |
| `src/app/api/admin/users/[id]/route.ts` | `update` | role | ❌ No | upsert | **MISSING** |
| `src/app/api/project-spaces/route.ts` | `create` | projectSpace | ❌ No | N/A | ProjectSpace not indexed (not a context entity) |
| `src/app/api/project-spaces/route.ts` | (indirect) | project | ❌ No | upsert | ProjectSpace visibility change should reindex affected projects |

## Cross-Entity Effects

### Task Assignment Changes
- **task.assigneeId change** → Index: task + person (old assignee + new assignee)
- **task.projectId change** → Index: task + old project + new project
- **task.epicId change** → Index: task + epic

### Page-Project Relations
- **page.projects change** → Index: page + affected projects

### Org Changes
- **role.userId change** → Index: role + person (old user + new user)
- **team membership change** → Index: team + affected persons
- **time off create/update/delete** → Index: time_off + person + (optionally team)

### ProjectSpace Changes
- **ProjectSpace visibility/members change** → Index all projects in that space (use indexMany)

## Priority Order

### High Priority (Core Entities)
1. ✅ Projects (update/delete) - DONE
2. ✅ Tasks (create/update/delete) - DONE
3. ❌ Pages (create/update/delete) - **MISSING**
4. ❌ Epics (create/update/delete) - **MISSING**
5. ❌ Teams (create/update/delete) - **MISSING**
6. ❌ Roles (create/update/delete) - **MISSING**

### Medium Priority (Bulk Operations)
1. ❌ Project template apply - **MISSING**
2. ❌ Task template apply - **MISSING**
3. ❌ Assistant create project - **MISSING**

### Low Priority (Metadata Changes)
1. ❌ Page favorite - Low impact
2. ❌ Task points - Low impact
3. ❌ Daily summary settings - Low impact

## Notes

- **Bulk operations**: Use `indexMany()` for efficiency
- **Cross-entity effects**: Index both sides of relations when they change
- **ProjectSpace**: When visibility/members change, reindex all projects in that space
- **Soft deletes**: Treat `isActive: false` updates as deletes for indexing purposes

