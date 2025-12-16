# Organization Foundation Implementation Status

## ✅ Completed

### 1. Database Schema Updates
- ✅ Created `OrgDepartment` model with proper relationships
- ✅ Created `OrgTeam` model linked to Department
- ✅ Updated `OrgPosition` to reference `teamId` instead of `department` string
- ✅ Updated `RoleCard` to link to `OrgPosition` via `positionId`
- ✅ Added proper indexes and constraints

### 2. API Endpoints Created
- ✅ `GET /api/org/departments` - List all departments
- ✅ `POST /api/org/departments` - Create department
- ✅ `GET /api/org/departments/[id]` - Get department
- ✅ `PUT /api/org/departments/[id]` - Update department
- ✅ `DELETE /api/org/departments/[id]` - Delete department
- ✅ `GET /api/org/teams` - List all teams (with department filter)
- ✅ `POST /api/org/teams` - Create team
- ✅ `GET /api/org/teams/[id]` - Get team
- ✅ `PUT /api/org/teams/[id]` - Update team
- ✅ `DELETE /api/org/teams/[id]` - Delete team

### 3. Documentation
- ✅ Created `ORG_ARCHITECTURE_FOUNDATION.md` with complete architecture guide

---

## ⏳ Next Steps Required

### 1. Database Migration (CRITICAL)
**Action Required**: Create and run Prisma migration

```bash
npx prisma migrate dev --name add_org_foundation_models
```

**Migration Notes**:
- This will create new tables: `org_departments`, `org_teams`
- `org_positions` table will get new `teamId` column (nullable for migration)
- `role_cards` table will get new `positionId` column (nullable)
- Old `department` string field in `org_positions` should be kept temporarily for data migration

### 2. Data Migration Script
**Action Required**: Create script to migrate existing data

**Steps**:
1. Extract unique department strings from existing `OrgPosition.department` values
2. Create `OrgDepartment` records for each unique department
3. Create default "General" team for each department (or prompt admin)
4. Link `OrgPosition` records to `OrgTeam` via `teamId`
5. Optionally link existing `RoleCard` records to positions

**File**: `scripts/migrate-org-foundation.ts`

### 3. Update Position API
**Action Required**: Update `/api/org/positions` endpoints

**Changes Needed**:
- `POST /api/org/positions` - Require `teamId` instead of `department` string
- `GET /api/org/positions` - Include team and department relationships
- Update validation to ensure teamId exists

**File**: `src/app/api/org/positions/route.ts`

### 4. Update RoleCard API
**Action Required**: Update `/api/org/role-cards` endpoints

**Changes Needed**:
- `POST /api/org/role-cards` - Require `positionId` instead of `department` string
- `GET /api/org/role-cards` - Include position relationship
- Update validation to ensure positionId exists

**File**: `src/app/api/org/role-cards/route.ts`

### 5. Build Guided Admin UI Flow
**Action Required**: Create foundational structure builder UI

**Components Needed**:
1. `OrgFoundationWizard` - Multi-step wizard component
   - Step 1: Create Departments
   - Step 2: Create Teams
   - Step 3: Create Positions
   - Step 4: Create Role Cards
   - Step 5: Ready to add users

2. `DepartmentManager` - Component for managing departments
   - List view with add/edit/delete
   - Form for creating/editing

3. `TeamManager` - Component for managing teams
   - List view grouped by department
   - Form with department dropdown

4. `PositionManager` - Component for managing positions
   - List view grouped by team
   - Form with team dropdown

**Files**:
- `src/components/org/org-foundation-wizard.tsx`
- `src/components/org/department-manager.tsx`
- `src/components/org/team-manager.tsx`
- `src/components/org/position-manager.tsx`

### 6. Update Org Chart Page
**Action Required**: Update `/org` page to show structure builder first

**Logic**:
- Check if any departments exist
- If no departments: Show guided wizard
- If departments exist: Show normal org chart view
- Add "Manage Structure" button for admins

**File**: `src/app/(dashboard)/org/page.tsx`

### 7. Update User Creation Flow
**Action Required**: Update user creation to use new structure

**Changes**:
- Replace department string input with Department dropdown
- Add Team dropdown (filters by selected department)
- Add Position dropdown (filters by selected team)
- Auto-select RoleCard if linked to position

**Files**:
- `src/components/org/user-profile-form.tsx`
- `src/components/admin/user-profile-form.tsx`

---

## 🔄 Migration Strategy

### Phase 1: Schema Migration (Safe)
1. Add new tables (departments, teams)
2. Add new columns (teamId, positionId) as nullable
3. Keep old columns temporarily

### Phase 2: Data Migration
1. Extract departments from existing positions
2. Create department records
3. Create default teams
4. Link positions to teams
5. Link role cards to positions

### Phase 3: Code Updates
1. Update API endpoints
2. Update UI components
3. Remove old department string fields (after verification)

### Phase 4: Cleanup
1. Remove old `department` string field from `OrgPosition`
2. Remove old `department` string field from `RoleCard`
3. Update all references

---

## 📋 Testing Checklist

- [ ] Create department via API
- [ ] Create team via API (with department)
- [ ] Create position via API (with team)
- [ ] Create role card via API (with position)
- [ ] Verify relationships work correctly
- [ ] Test data migration script
- [ ] Test UI wizard flow
- [ ] Test user creation with new structure
- [ ] Verify org chart displays correctly
- [ ] Test deletion cascades properly

---

## 🚨 Important Notes

1. **Backward Compatibility**: Old `department` string fields are kept temporarily to allow gradual migration

2. **Required Fields**: 
   - Teams require `departmentId`
   - Positions require `teamId` (after migration)
   - RoleCards require `positionId` (after migration)

3. **Deletion Rules**:
   - Cannot delete department with teams
   - Cannot delete team with positions
   - Positions can be deleted (user assignment is optional)

4. **Access Control**: 
   - All endpoints require workspace membership
   - Create/Update/Delete require ADMIN or OWNER role

---

## 📚 Related Files

- `prisma/schema.prisma` - Database schema
- `ORG_ARCHITECTURE_FOUNDATION.md` - Architecture documentation
- `src/app/api/org/departments/` - Department API endpoints
- `src/app/api/org/teams/` - Team API endpoints
- `src/app/(dashboard)/org/page.tsx` - Org Chart page (needs update)

