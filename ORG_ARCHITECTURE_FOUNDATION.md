# Organization Architecture Foundation

## 🎯 Core Principle

**Define foundational organizational entities BEFORE building user-creation flows.**

A user is a node in a larger system. You cannot build clean creation flows until the underlying structure exists.

---

## 📐 Correct Build Sequence

### Phase 1: Foundational Structure (Build First)

#### 1. **Departments** (Top-Level Structure)
- **Purpose**: Define organizational divisions
- **Examples**: Engineering, Product, Design, HR, Operations
- **Fields**: name, description, color, order, isActive
- **Relationships**: Has many Teams

#### 2. **Teams** (Groups Within Departments)
- **Purpose**: Define groups within departments
- **Examples**: Engineering > Backend Team, Engineering > Frontend Team
- **Fields**: name, description, color, order, isActive
- **Relationships**: Belongs to Department, Has many Positions

#### 3. **Positions** (Roles Within Teams)
- **Purpose**: Define roles within teams
- **Examples**: Frontend Developer, Tech Lead, Product Manager
- **Fields**: title, level, parentId (for hierarchy), order
- **Relationships**: Belongs to Team, Has one RoleCard, Can have one User

#### 4. **Role Cards** (Position Definition)
- **Purpose**: Define responsibilities, competencies, KPIs for a position
- **Fields**: roleName, jobFamily, level, roleDescription, responsibilities[], requiredSkills[], keyMetrics[]
- **Relationships**: Belongs to Position (one-to-one)

---

### Phase 2: User Assignment (Build After Structure Exists)

#### 5. **User Creation Flow**
Once all foundational entities exist, user creation becomes clean:

**Step 1 - Basic Info**
- Full Name
- Email
- Profile Picture (optional)

**Step 2 - Assign Organizational Structure**
- Department (dropdown - filters from existing departments)
- Team (auto-filters based on selected department)
- Position (auto-filters based on selected team)
- Role Card (auto-selects if tied to position)

**Step 3 - Define Access Level**
- Member (minimal editing)
- Team Lead (edit team-level data)
- HR Admin (full org access)
- System Admin (super admin)

**Step 4 - Invite**
- Send magic link or email invite

---

## 🗄️ Database Schema

### Models Created

```prisma
model OrgDepartment {
  id          String    @id @default(cuid())
  workspaceId String
  name        String
  description String?
  color       String?
  order       Int       @default(0)
  isActive    Boolean   @default(true)
  teams       OrgTeam[]
}

model OrgTeam {
  id           String        @id @default(cuid())
  workspaceId  String
  departmentId String
  name         String
  description  String?
  color        String?
  order        Int           @default(0)
  isActive     Boolean       @default(true)
  department   OrgDepartment
  positions    OrgPosition[]
}

model OrgPosition {
  id                 String        @id @default(cuid())
  workspaceId        String
  teamId             String?       // Links to OrgTeam
  userId             String?       // Links to User (optional)
  title              String
  level              Int           @default(1)
  parentId           String?       // For hierarchy
  team               OrgTeam?
  roleCard           RoleCard?     // One-to-one
  user               User?
}

model RoleCard {
  id              String       @id @default(cuid())
  workspaceId     String
  positionId      String?      // Links to OrgPosition
  roleName        String
  jobFamily       String
  level           String
  roleDescription String
  responsibilities String[]
  requiredSkills  String[]
  preferredSkills String[]
  keyMetrics      String[]
  position        OrgPosition?
}
```

---

## 🎨 UI/UX Flow

### Admin Onboarding Sequence

1. **Welcome Screen**
   - "Let's set up your organization structure"
   - Clear explanation of why structure comes first

2. **Step 1: Create Departments**
   - Simple form: Name, Description (optional), Color
   - List view showing created departments
   - "Add Department" button
   - Can skip and add more later

3. **Step 2: Create Teams**
   - Select Department dropdown
   - Form: Name, Description (optional), Color
   - Shows teams grouped by department
   - "Add Team" button

4. **Step 3: Create Positions**
   - Select Team dropdown (auto-filters by department)
   - Form: Title, Level, Parent Position (optional)
   - Shows positions grouped by team
   - "Add Position" button

5. **Step 4: Create Role Cards**
   - Select Position dropdown
   - Form: Role Name, Job Family, Level, Description
   - Rich fields: Responsibilities, Required Skills, Key Metrics
   - "Create Role Card" button

6. **Step 5: Ready to Add Users**
   - "Your organization structure is ready!"
   - "Add Your First Team Member" button
   - Links to user creation flow

---

## 🔌 API Endpoints

### Departments
- `GET /api/org/departments` - List all departments
- `POST /api/org/departments` - Create department
- `GET /api/org/departments/[id]` - Get department
- `PUT /api/org/departments/[id]` - Update department
- `DELETE /api/org/departments/[id]` - Delete department

### Teams
- `GET /api/org/teams` - List all teams (with department filter)
- `POST /api/org/teams` - Create team
- `GET /api/org/teams/[id]` - Get team
- `PUT /api/org/teams/[id]` - Update team
- `DELETE /api/org/teams/[id]` - Delete team

### Positions (Updated)
- `GET /api/org/positions` - List all positions (with team filter)
- `POST /api/org/positions` - Create position (requires teamId)
- `GET /api/org/positions/[id]` - Get position
- `PUT /api/org/positions/[id]` - Update position
- `DELETE /api/org/positions/[id]` - Delete position

### Role Cards (Updated)
- `GET /api/org/role-cards` - List all role cards (with position filter)
- `POST /api/org/role-cards` - Create role card (requires positionId)
- `GET /api/org/role-cards/[id]` - Get role card
- `PUT /api/org/role-cards/[id]` - Update role card
- `DELETE /api/org/role-cards/[id]` - Delete role card

---

## ✅ Benefits of This Architecture

1. **Clean UI/UX**
   - No empty dropdowns
   - No "please create X first" messages
   - Guided, logical flow

2. **Better AI Context**
   - Positions carry meaning
   - Teams define hierarchy
   - Role cards explain responsibilities
   - Structure helps AI interpret org context

3. **Scalability**
   - Easy to add new departments/teams
   - Clear data relationships
   - Proper normalization

4. **Professional Feel**
   - Matches industry standards (BambooHR, HiBob, Rippling)
   - Structured, intentional design
   - No placeholder chaos

---

## 🚀 Migration Strategy

### For Existing Data

1. **Extract departments from existing OrgPosition.department strings**
   - Create OrgDepartment records for unique department values
   - Map old department strings to new department IDs

2. **Create teams**
   - For each department, create default "General" team
   - Or prompt admin to create teams during migration

3. **Update positions**
   - Link OrgPosition to OrgTeam via teamId
   - Remove old department string field

4. **Link role cards**
   - If role cards exist, link them to positions based on matching criteria
   - Or prompt admin to link manually

---

## 📝 Next Steps

1. ✅ Create Prisma schema models
2. ⏳ Create database migration
3. ⏳ Build API endpoints for Departments
4. ⏳ Build API endpoints for Teams
5. ⏳ Update Position API to require teamId
6. ⏳ Update RoleCard API to link to positionId
7. ⏳ Build guided admin UI flow
8. ⏳ Update Org Chart page to show structure builder
9. ⏳ Create user creation flow that uses structure
10. ⏳ Write migration script for existing data

