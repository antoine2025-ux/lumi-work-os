# Phase 1 - Step 1.2: Schema Truth Implementation Summary

## Overview
This step implements schema truth for Org MVP by ensuring all required Prisma tables/relations exist with workspaceId scoping (no orgId). Feature flags are introduced for rollout control.

## Schema Changes Made

### 1. OrgTeam - Added ownerPersonId
- Added `ownerPersonId` field (nullable) to track team ownership
- Added index on `ownerPersonId`
- **File**: `prisma/schema.prisma` (OrgTeam model)

### 2. PersonAvailability - Added workspaceId
- Added `workspaceId` field (required)
- Added foreign key relation to Workspace
- Added indexes on `workspaceId` and `(workspaceId, personId)`
- **File**: `prisma/schema.prisma` (PersonAvailability model)

### 3. OwnerAssignment - Migrated from orgId to workspaceId
- Changed `orgId` → `workspaceId`
- Added foreign key relation to Workspace
- Updated unique constraint: `(workspaceId, entityType, entityId)`
- Updated indexes to use `workspaceId`
- **File**: `prisma/schema.prisma` (OwnerAssignment model)

### 4. PersonManagerLink - Migrated from orgId to workspaceId
- Changed `orgId` → `workspaceId`
- Added foreign key relation to Workspace
- Updated unique constraint: `(workspaceId, personId, managerId)`
- Updated indexes to use `workspaceId`
- **File**: `prisma/schema.prisma` (PersonManagerLink model)

### 5. PersonAvailabilityHealth - Migrated from orgId to workspaceId
- Changed `orgId` → `workspaceId`
- Added foreign key relation to Workspace
- Updated unique constraint: `(workspaceId, personId)`
- Updated indexes to use `workspaceId`
- **File**: `prisma/schema.prisma` (PersonAvailabilityHealth model)

### 6. Workspace Model - Added Relations
- Added `personAvailabilities` relation
- Added `personAvailabilityHealth` relation
- Added `ownerAssignments` relation
- Added `personManagerLinks` relation
- **File**: `prisma/schema.prisma` (Workspace model)

## Model Mappings (Reusing Existing Models)

As documented in `PHASE1_SCHEMA_MAPPING.md`:
- **OrgPerson** → Uses existing `OrgPosition` model (userId, title, teamId, parentId for manager)
- **OrgDepartment** → Uses existing `OrgDepartment` model ✅
- **OrgTeam** → Uses existing `OrgTeam` model (added ownerPersonId)
- **OrgTeamMember** → Uses `OrgPosition.teamId` (no separate junction table needed for MVP)
- **Reporting Lines** → Uses `OrgPosition.parentId` (self-relation for manager hierarchy)

## Migration File

**File**: `prisma/migrations/20251227174218_org_phase1_schema_truth/migration.sql`

The migration:
1. Adds `ownerPersonId` to `org_teams`
2. Adds `workspaceId` to `person_availability` with backfill from workspace_members
3. Migrates `owner_assignments` from `orgId` to `workspaceId`
4. Migrates `person_manager_links` from `orgId` to `workspaceId`
5. Migrates `person_availability_health` from `orgId` to `workspaceId`
6. Updates all constraints, indexes, and foreign keys

**Note**: The `orgId` columns remain in tables temporarily (not dropped) to allow gradual code migration. They should be removed in a future cleanup migration.

## Feature Flags

**File**: `src/server/org/flags.ts`

Created feature flag system for Org rollout:
- `org.people.write` (default: false)
- `org.structure.write` (default: false)
- `org.ownership.write` (default: false)
- `org.reporting.write` (default: false)
- `org.availability.write` (default: false)

All flags default to `false` for safe Phase 1 rollout. Flags are for gating functionality, NOT for masking missing schema.

## Verification Steps

1. ✅ Schema file validates (no syntax errors)
2. ⏳ Migration file created
3. ⏳ Migration should be applied: `pnpm prisma migrate dev --name org_phase1_schema_truth`
4. ⏳ Prisma client should be regenerated: `pnpm prisma generate`
5. ⏳ Verify tables exist in database with correct columns
6. ⏳ Verify no `orgId` columns are being used in new code (per Ground Rules)

## Next Steps

- Phase 1.3/1.4: Implement read-only and write `/api/org` Route Handlers with strict auth
- Phase 1.5: Wire UI to use API routes (remove hardcoded data)

## Compliance with Ground Rules

✅ No `orgId` added (only `workspaceId`)
✅ No Server Actions introduced
✅ No defensive fallbacks for missing tables
✅ Feature flags for rollout control only (not masking broken schema)
✅ All models workspace-scoped via foreign keys to Workspace
✅ Deprecated models (Org, OrgMembership, SavedView) not referenced

