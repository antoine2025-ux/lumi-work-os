# Prisma Schema Migration: orgId → workspaceId

## Overview

This document tracks Prisma schema fields that still use `orgId` and need to be migrated to `workspaceId` in a future schema migration. This is Phase 2 of the orgId → workspaceId migration.

**Phase 1 (COMPLETED)**: TypeScript code migration - all TypeScript variables, function parameters, and API route logic now use `workspaceId` consistently.

**Phase 2 (PENDING)**: Prisma schema migration - database field names and Prisma model definitions.

## Status

- **TypeScript Migration**: ✅ COMPLETE (all .ts/.tsx files migrated)
- **Schema Migration**: ⏳ PENDING (documented here)

## Models with `orgId` Fields

### 1. Project Model
**File**: `prisma/schema.prisma:1207-1257`

```prisma
model Project {
  // ...
  workspaceId         String
  orgId               String? // Org identifier (same as workspaceId for v1, optional for backward compatibility)
  // ...
  
  @@index([orgId])
}
```

**Migration Plan**:
- `orgId` field is optional and redundant with `workspaceId`
- Remove `orgId` field entirely
- Drop `@@index([orgId])` index
- Update all queries reading `project.orgId` to use `project.workspaceId`

**Current Usage in Code**:
- `src/app/api/org/projects/route.ts:79,148` - reads `project.orgId || project.workspaceId` as fallback
- These reads are intentional and will need updating when schema changes

---

### 2. OrgInvitation Model
**File**: `prisma/schema.prisma:2175-2199`

```prisma
model OrgInvitation {
  // ...
  workspace   Workspace? @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  workspaceId String?
  org         Org?       @relation(fields: [orgId], references: [id], onDelete: Cascade)
  orgId       String?
  // ...
  
  @@index([orgId, status])
}
```

**Migration Plan**:
- Remove `org` relation and `orgId` field
- Keep only `workspace` relation and `workspaceId`
- Drop `@@index([orgId, status])` index
- Ensure `workspaceId` is NOT NULL after data migration

**Current Usage in Code**:
- `src/app/api/org/invitations/route.ts` - Prisma `where: { orgId: workspaceId }` and `data: { orgId: workspaceId }`
- `src/app/api/org/invitations/respond/route.ts` - reads `invite.orgId` as Prisma field
- `src/app/api/org/invitations/resend/route.ts` - reads `updated.orgId` as Prisma field

---

### 3. Taxonomy Models (OrgRoleTaxonomy, OrgSkillTaxonomy)
**Files**: Multiple taxonomy-related models

**Models Affected**:
- `OrgRoleTaxonomy`
- `OrgSkillTaxonomy`
- `PersonRoleAssignment`
- `PersonSkill`

**Current Usage in Code**:
- `src/app/api/org/taxonomy/upsert/route.ts:32,39` - `data: { orgId: workspaceId, ... }`
- `src/app/api/org/taxonomy/roles/route.ts:28` - `where: { orgId: workspaceId, ... }`
- `src/app/api/org/taxonomy/skills/route.ts:28` - `where: { orgId: workspaceId, ... }`
- `src/app/api/org/people/update-profile/route.ts:83,88,91,107,112,115` - multiple `orgId` field references

**Migration Plan**:
- These models likely use `orgId` as the workspace scoping field
- Rename `orgId` → `workspaceId` in model definitions
- Update all compound unique constraints and indexes
- Ensure foreign key relations point to `Workspace.id` not `Org.id`

---

### 4. Other Models with `orgId` Fields

Based on the codebase scan, additional models may have `orgId` fields that need investigation:

- `OrgPersonAvailability`
- `OrgOwnership`
- `OrgSuggestionRun`
- `OrgFixEvent`
- `PersonManagerLink`
- `OrgDepartment`
- `OrgTeam`
- `OrgPosition`
- `PersonCapacity`
- `Domain`
- `SystemEntity`

**Action Required**: Audit `prisma/schema.prisma` for all models with `orgId` fields.

---

## Migration Steps (Phase 2)

### Pre-Migration Checklist
1. ✅ Ensure all TypeScript code uses `workspaceId` (Phase 1 complete)
2. ✅ Verify `npm run typecheck` passes with 0 errors
3. ✅ Verify `npm run lint` passes
4. ⏳ Run full test suite to ensure no regressions
5. ⏳ Create comprehensive list of all `orgId` fields in schema

### Schema Migration Process
1. **Backup Production Data**: Full database backup before any schema changes
2. **Create Migration Script**: 
   - For each model, add `workspaceId` field if missing
   - Backfill `workspaceId` from `orgId` where data exists
   - Verify data integrity (all rows have valid `workspaceId`)
3. **Update Prisma Schema**:
   - Rename `orgId` → `workspaceId` in model definitions
   - Update all `@@index`, `@@unique`, and `@@map` directives
   - Update foreign key relations from `Org` to `Workspace`
4. **Generate Migration**: `npx prisma migrate dev --name rename-orgId-to-workspaceId`
5. **Test Migration**: Apply to staging environment first
6. **Deploy**: Apply to production with `npx prisma migrate deploy`

### Post-Migration Verification
1. Run full test suite
2. Verify all Prisma queries work correctly
3. Check application logs for any `orgId` references
4. Monitor production for errors

---

## Code Comments for Prisma Field References

Throughout the codebase, Prisma field references to `orgId` have been marked with comments:

```typescript
// Example patterns:
where: { orgId: workspaceId } // orgId is a Prisma field — will be migrated in schema migration
data: { orgId: workspaceId }  // orgId is a Prisma field — will be migrated in schema migration
project.orgId || project.workspaceId // project.orgId is a REAL DATABASE FIELD — keep the read
```

These comments help distinguish between:
- **Prisma field names** (database columns) - need schema migration
- **TypeScript variable names** - already migrated in Phase 1

---

## Related Files

- **Migration Plan**: `docs/migration-plan-orgid-to-workspaceid.md`
- **Prisma Schema**: `prisma/schema.prisma`
- **Scoping Middleware**: `src/lib/prisma/scopingMiddleware.ts`

---

## Timeline

- **Phase 1 (TypeScript)**: Completed March 1, 2026
- **Phase 2 (Schema)**: TBD - requires careful planning and staging deployment

---

## Notes

- The `Org` model itself may be deprecated in favor of `Workspace` as the primary tenant model
- Some models have both `workspaceId` and `orgId` fields during transition period
- All new models should use `workspaceId` exclusively
- The workspace scoping middleware (`scopingMiddleware.ts`) already enforces `workspaceId` for all queries

---

**Last Updated**: March 1, 2026
**Status**: Phase 1 Complete, Phase 2 Documented
