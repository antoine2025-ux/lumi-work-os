# Phase 1 Schema Mapping & Decisions

This document maps the required Org MVP models to existing Prisma schema models.

## Model Mappings

### People
- **Required**: OrgPerson
- **Existing**: OrgPosition (serves as Person representation)
  - `userId` = links to User (person)
  - `title` = role/title
  - `teamId` = team assignment
  - `parentId` = manager (self-relation)
  - `workspaceId` = workspace scoping ✅

**Decision**: Reuse OrgPosition. No new OrgPerson model needed.

### Departments
- **Required**: OrgDepartment
- **Existing**: OrgDepartment ✅
  - `workspaceId` = workspace scoping ✅
  - All required fields present

**Decision**: Use existing OrgDepartment model.

### Teams
- **Required**: OrgTeam
- **Existing**: OrgTeam ✅
  - `workspaceId` = workspace scoping ✅
  - `departmentId` = department link ✅
  - `ownerPersonId` = MISSING (needs to be added)

**Decision**: Use existing OrgTeam model, add `ownerPersonId` field.

### Team Membership
- **Required**: OrgTeamMember
- **Existing**: OrgPosition.teamId (direct link)

**Decision**: OrgPosition.teamId is sufficient for MVP. No separate OrgTeamMember model needed initially (can add later if many-to-many needed).

### Reporting Lines
- **Required**: Manager relationship
- **Existing**: OrgPosition.parentId (self-relation) ✅
- **Also exists**: PersonManagerLink (but uses orgId - needs migration)

**Decision**: Use OrgPosition.parentId as primary source. PersonManagerLink can serve as audit/history if needed, but must be migrated to workspaceId.

### Ownership Assignments
- **Required**: OrgOwnershipAssignment
- **Existing**: OwnerAssignment
  - Uses `orgId` - **MUST MIGRATE TO workspaceId**

**Decision**: Migrate OwnerAssignment.orgId → workspaceId.

### Availability
- **Required**: OrgAvailabilityStatus enum + availability tracking
- **Existing**: 
  - PersonAvailability (personId only, no workspaceId)
  - PersonAvailabilityHealth (uses orgId)
  - AvailabilityStatus enum (values: AVAILABLE, LIMITED, UNAVAILABLE)

**Decision**: 
- Add workspaceId to PersonAvailability
- Migrate PersonAvailabilityHealth.orgId → workspaceId
- Keep existing AvailabilityStatus enum (values are acceptable)

## Models Requiring Migration

These models use `orgId` and must be migrated to `workspaceId`:

1. **OwnerAssignment** - orgId → workspaceId
2. **PersonManagerLink** - orgId → workspaceId
3. **PersonAvailabilityHealth** - orgId → workspaceId

## Models Requiring workspaceId Addition

These models need workspaceId added:

1. **PersonAvailability** - currently only has personId (User.id), needs workspaceId
2. **OrgTeam** - needs ownerPersonId field (optional, nullable)

## Deprecated Models (Do NOT Use)

Per Ground Rules:
- Org (deprecated)
- OrgMembership (deprecated)
- SavedView (deprecated - use OrgSavedView instead)

These will be removed in future phases.

