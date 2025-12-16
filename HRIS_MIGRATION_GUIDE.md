# HRIS Migration Guide: Express → Next.js

Complete step-by-step guide for migrating HRIS features from Express.js to Next.js.

---

## 📋 Pre-Migration Checklist

Before starting, gather:

- [ ] Access to HRIS codebase repository
- [ ] Database schema documentation or SQL files
- [ ] List of all API endpoints
- [ ] List of all React components
- [ ] Environment variables documentation
- [ ] Test data or sample data

---

## Phase 1: Analysis & Planning (Week 1)

### Step 1.1: Map HRIS Database Schema

**Goal**: Understand what tables/models exist in HRIS

**Action**: Review HRIS database schema files

```bash
# In HRIS codebase, look for:
# - SQL migration files
# - Schema definition files
# - Database initialization scripts
```

**Document**:
```markdown
## HRIS Database Tables

### Core Tables
- `employees` - Employee records
- `org_units` - Organizational units
- `positions` - Job positions
- `time_off_requests` - Time off management
- `compensation_history` - Salary history
- `events` - Calendar events
- `audit_logs` - Activity tracking
- `workflows` - Workflow definitions
- `workflow_instances` - Workflow executions
```

**Example HRIS SQL Schema** (what you might find):
```sql
CREATE TABLE employees (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  position_id INTEGER REFERENCES positions(id),
  org_unit_id INTEGER REFERENCES org_units(id),
  hire_date DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE time_off_requests (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER REFERENCES employees(id),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  type VARCHAR(50), -- 'vacation', 'sick', 'personal'
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  requested_at TIMESTAMP DEFAULT NOW()
);
```

---

### Step 1.2: Map API Endpoints

**Goal**: List all Express routes that need migration

**Action**: Review Express route files

```bash
# In HRIS codebase, find:
# - routes/ directory
# - app.js or server.js (main Express app)
# - controllers/ directory
```

**Create mapping document**:
```markdown
## HRIS API Endpoints

### Employees
- GET    /api/employees          → List employees
- GET    /api/employees/:id      → Get employee
- POST   /api/employees           → Create employee
- PUT    /api/employees/:id      → Update employee
- DELETE /api/employees/:id     → Delete employee

### Time Off
- GET    /api/time-off           → List requests
- POST   /api/time-off           → Create request
- PUT    /api/time-off/:id       → Update request
- GET    /api/time-off/employee/:id → Get employee requests

### Compensation
- GET    /api/compensation/:employeeId → Get history
- POST   /api/compensation        → Add record
```

---

### Step 1.3: Map React Components

**Goal**: Identify reusable components

**Action**: Review React component structure

```bash
# In HRIS frontend, find:
# - src/components/
# - src/pages/
# - Component dependencies
```

**Document**:
```markdown
## HRIS React Components

### Employee Management
- EmployeeList.tsx
- EmployeeCard.tsx
- EmployeeForm.tsx
- EmployeeProfile.tsx

### Time Off
- TimeOffRequestForm.tsx
- TimeOffCalendar.tsx
- TimeOffList.tsx

### Analytics
- CompensationChart.tsx
- EmployeeJourneyTimeline.tsx
```

---

## Phase 2: Database Schema Migration (Week 1-2)

### Step 2.1: Convert SQL to Prisma Models

**Goal**: Create Prisma models from HRIS SQL schemas

**Action**: Add models to `prisma/schema.prisma`

#### Example: Converting `employees` table

**HRIS SQL**:
```sql
CREATE TABLE employees (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  position_id INTEGER REFERENCES positions(id),
  org_unit_id INTEGER REFERENCES org_units(id),
  hire_date DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Prisma Model** (add to `prisma/schema.prisma`):
```prisma
model Employee {
  id          String    @id @default(cuid())
  workspaceId String    // Add workspace scoping
  email       String    @unique
  firstName   String?   @map("first_name")
  lastName    String?   @map("last_name")
  positionId  String?   @map("position_id")
  orgUnitId   String?   @map("org_unit_id")
  hireDate    DateTime? @map("hire_date") @db.Date
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")
  
  // Link to existing User model (if email matches)
  user        User?     @relation(fields: [email], references: [email])
  
  // Link to existing OrgPosition
  position    OrgPosition? @relation(fields: [positionId], references: [id])
  
  // Link to OrgTeam (org_unit maps to team)
  team        OrgTeam?  @relation(fields: [orgUnitId], references: [id])
  
  workspace   Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  
  timeOffRequests TimeOffRequest[]
  compensationHistory CompensationHistory[]
  events       EmployeeEvent[]
  
  @@index([workspaceId])
  @@index([email])
  @@index([positionId])
  @@map("employees")
}
```

**Key Changes**:
1. ✅ Add `workspaceId` for multi-tenancy
2. ✅ Use `cuid()` instead of `SERIAL`
3. ✅ Link to existing `User` model via email
4. ✅ Link to existing `OrgPosition` and `OrgTeam`
5. ✅ Use Prisma naming conventions (camelCase)

---

#### Example: Converting `time_off_requests` table

**HRIS SQL**:
```sql
CREATE TABLE time_off_requests (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER REFERENCES employees(id),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  type VARCHAR(50),
  status VARCHAR(50) DEFAULT 'pending',
  requested_at TIMESTAMP DEFAULT NOW()
);
```

**Prisma Model**:
```prisma
enum TimeOffType {
  VACATION
  SICK
  PERSONAL
  UNPAID
}

enum TimeOffStatus {
  PENDING
  APPROVED
  REJECTED
  CANCELLED
}

model TimeOffRequest {
  id          String        @id @default(cuid())
  workspaceId String
  employeeId  String        @map("employee_id")
  startDate   DateTime      @map("start_date") @db.Date
  endDate     DateTime      @map("end_date") @db.Date
  type        TimeOffType
  status      TimeOffStatus @default(PENDING)
  reason      String?
  requestedAt DateTime      @default(now()) @map("requested_at")
  approvedById String?      @map("approved_by_id")
  approvedAt  DateTime?     @map("approved_at")
  
  employee    Employee      @relation(fields: [employeeId], references: [id], onDelete: Cascade)
  approvedBy  User?         @relation("TimeOffApprover", fields: [approvedById], references: [id])
  workspace   Workspace     @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  
  @@index([workspaceId])
  @@index([employeeId])
  @@index([status])
  @@index([startDate, endDate])
  @@map("time_off_requests")
}
```

**Also update User model** (add relation):
```prisma
model User {
  // ... existing fields ...
  approvedTimeOffRequests TimeOffRequest[] @relation("TimeOffApprover")
}
```

---

#### Example: Converting `compensation_history` table

**HRIS SQL**:
```sql
CREATE TABLE compensation_history (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER REFERENCES employees(id),
  salary DECIMAL(10,2),
  currency VARCHAR(3) DEFAULT 'USD',
  effective_date DATE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Prisma Model**:
```prisma
model CompensationHistory {
  id           String    @id @default(cuid())
  workspaceId  String
  employeeId   String    @map("employee_id")
  salary       Decimal   @db.Decimal(10, 2)
  currency     String    @default("USD")
  effectiveDate DateTime @map("effective_date") @db.Date
  notes        String?
  createdAt    DateTime  @default(now()) @map("created_at")
  
  employee     Employee  @relation(fields: [employeeId], references: [id], onDelete: Cascade)
  workspace    Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  
  @@index([workspaceId])
  @@index([employeeId])
  @@index([effectiveDate])
  @@map("compensation_history")
}
```

---

### Step 2.2: Create Migration

**Action**: Generate and run Prisma migration

```bash
# Generate migration
npx prisma migrate dev --name add_hris_models

# This will:
# 1. Create migration SQL file
# 2. Apply to database
# 3. Generate Prisma Client
```

**Review migration file** (`prisma/migrations/.../migration.sql`):
```sql
-- CreateEnum
CREATE TYPE "TimeOffType" AS ENUM ('VACATION', 'SICK', 'PERSONAL', 'UNPAID');
CREATE TYPE "TimeOffStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateTable
CREATE TABLE "employees" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "first_name" TEXT,
    "last_name" TEXT,
    "position_id" TEXT,
    "org_unit_id" TEXT,
    "hire_date" DATE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_workspace_id_fkey" 
  FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

---

### Step 2.3: Update Existing Models

**Action**: Add relations to existing models

**Update `User` model**:
```prisma
model User {
  // ... existing fields ...
  
  // Add HRIS relations
  employee              Employee?
  approvedTimeOffRequests TimeOffRequest[] @relation("TimeOffApprover")
}
```

**Update `Workspace` model**:
```prisma
model Workspace {
  // ... existing fields ...
  
  // Add HRIS relations
  employees            Employee[]
  timeOffRequests      TimeOffRequest[]
  compensationHistory  CompensationHistory[]
  employeeEvents       EmployeeEvent[]
}
```

---

## Phase 3: API Migration (Week 3-4)

### Step 3.1: Convert Express Route to Next.js API Route

**Pattern**: Express route → Next.js API route

#### Example: Employees API

**HRIS Express Route** (`routes/employees.js`):
```javascript
const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/employees
router.get('/', async (req, res) => {
  try {
    const { orgUnitId, positionId } = req.query;
    let query = 'SELECT * FROM employees WHERE 1=1';
    const params = [];
    
    if (orgUnitId) {
      query += ' AND org_unit_id = $' + (params.length + 1);
      params.push(orgUnitId);
    }
    
    if (positionId) {
      query += ' AND position_id = $' + (params.length + 1);
      params.push(positionId);
    }
    
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/employees
router.post('/', async (req, res) => {
  try {
    const { email, firstName, lastName, positionId, orgUnitId, hireDate } = req.body;
    
    const result = await db.query(
      'INSERT INTO employees (email, first_name, last_name, position_id, org_unit_id, hire_date) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [email, firstName, lastName, positionId, orgUnitId, hireDate]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
```

**Next.js API Route** (`src/app/api/employees/route.ts`):
```typescript
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getUnifiedAuth } from "@/lib/unified-auth"
import { assertAccess } from "@/lib/auth/assertAccess"
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware"

// GET /api/employees - List employees
export async function GET(request: NextRequest) {
  try {
    const auth = await getUnifiedAuth(request)
    
    // Assert workspace access
    await assertAccess({ 
      userId: auth.user.userId, 
      workspaceId: auth.workspaceId, 
      scope: 'workspace', 
      requireRole: ['MEMBER'] 
    })

    setWorkspaceContext(auth.workspaceId)

    const { searchParams } = new URL(request.url)
    const orgUnitId = searchParams.get('orgUnitId')
    const positionId = searchParams.get('positionId')

    const where: any = {
      workspaceId: auth.workspaceId
    }

    if (orgUnitId) {
      where.orgUnitId = orgUnitId
    }

    if (positionId) {
      where.positionId = positionId
    }

    const employees = await prisma.employee.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true
          }
        },
        position: {
          include: {
            team: {
              include: {
                department: true
              }
            }
          }
        },
        team: {
          include: {
            department: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(employees)
  } catch (error: any) {
    console.error('Error fetching employees:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to fetch employees' 
    }, { status: 500 })
  }
}

// POST /api/employees - Create employee
export async function POST(request: NextRequest) {
  try {
    const auth = await getUnifiedAuth(request)
    
    // Require ADMIN or OWNER to create employees
    await assertAccess({ 
      userId: auth.user.userId, 
      workspaceId: auth.workspaceId, 
      scope: 'workspace', 
      requireRole: ['ADMIN', 'OWNER'] 
    })

    setWorkspaceContext(auth.workspaceId)

    const body = await request.json()
    const { 
      email,
      firstName,
      lastName,
      positionId,
      orgUnitId,
      hireDate
    } = body

    if (!email) {
      return NextResponse.json({ 
        error: 'Missing required field: email' 
      }, { status: 400 })
    }

    // Check if employee already exists
    const existing = await prisma.employee.findUnique({
      where: {
        email
      }
    })

    if (existing) {
      return NextResponse.json({ 
        error: 'Employee with this email already exists' 
      }, { status: 409 })
    }

    // Create employee
    const employee = await prisma.employee.create({
      data: {
        workspaceId: auth.workspaceId,
        email,
        firstName: firstName?.trim() || null,
        lastName: lastName?.trim() || null,
        positionId: positionId || null,
        orgUnitId: orgUnitId || null,
        hireDate: hireDate ? new Date(hireDate) : null
      },
      include: {
        user: true,
        position: true,
        team: true
      }
    })

    return NextResponse.json(employee, { status: 201 })
  } catch (error: any) {
    console.error('Error creating employee:', error)
    
    if (error.code === 'P2002') {
      return NextResponse.json({ 
        error: 'Employee with this email already exists' 
      }, { status: 409 })
    }
    
    return NextResponse.json({ 
      error: error.message || 'Failed to create employee' 
    }, { status: 500 })
  }
}
```

**Key Changes**:
1. ✅ Use `getUnifiedAuth()` instead of JWT middleware
2. ✅ Use `assertAccess()` for permissions
3. ✅ Add `workspaceId` scoping
4. ✅ Replace raw SQL with Prisma queries
5. ✅ Use TypeScript types
6. ✅ Include relations in responses

---

#### Example: Time Off Requests API

**HRIS Express Route** (`routes/time-off.js`):
```javascript
router.post('/', async (req, res) => {
  try {
    const { employeeId, startDate, endDate, type, reason } = req.body;
    const userId = req.user.id; // From JWT
    
    const result = await db.query(
      'INSERT INTO time_off_requests (employee_id, start_date, end_date, type, reason) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [employeeId, startDate, endDate, type, reason]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

**Next.js API Route** (`src/app/api/time-off/route.ts`):
```typescript
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getUnifiedAuth } from "@/lib/unified-auth"
import { assertAccess } from "@/lib/auth/assertAccess"
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware"

// POST /api/time-off - Create time off request
export async function POST(request: NextRequest) {
  try {
    const auth = await getUnifiedAuth(request)
    
    await assertAccess({ 
      userId: auth.user.userId, 
      workspaceId: auth.workspaceId, 
      scope: 'workspace', 
      requireRole: ['MEMBER'] 
    })

    setWorkspaceContext(auth.workspaceId)

    const body = await request.json()
    const { 
      employeeId,
      startDate,
      endDate,
      type,
      reason
    } = body

    // Validation
    if (!employeeId || !startDate || !endDate || !type) {
      return NextResponse.json({ 
        error: 'Missing required fields: employeeId, startDate, endDate, type' 
      }, { status: 400 })
    }

    // Verify employee belongs to workspace
    const employee = await prisma.employee.findFirst({
      where: {
        id: employeeId,
        workspaceId: auth.workspaceId
      }
    })

    if (!employee) {
      return NextResponse.json({ 
        error: 'Employee not found' 
      }, { status: 404 })
    }

    // Create time off request
    const timeOffRequest = await prisma.timeOffRequest.create({
      data: {
        workspaceId: auth.workspaceId,
        employeeId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        type: type.toUpperCase(), // Convert to enum
        reason: reason?.trim() || null,
        status: 'PENDING'
      },
      include: {
        employee: {
          include: {
            user: true
          }
        }
      }
    })

    return NextResponse.json(timeOffRequest, { status: 201 })
  } catch (error: any) {
    console.error('Error creating time off request:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to create time off request' 
    }, { status: 500 })
  }
}
```

---

### Step 3.2: Create Individual Route Files

**Pattern**: For routes with `:id`, create `[id]/route.ts`

**Example**: `src/app/api/employees/[id]/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getUnifiedAuth } from "@/lib/unified-auth"
import { assertAccess } from "@/lib/auth/assertAccess"
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware"

// GET /api/employees/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getUnifiedAuth(request)
    const { id } = await params
    
    await assertAccess({ 
      userId: auth.user.userId, 
      workspaceId: auth.workspaceId, 
      scope: 'workspace', 
      requireRole: ['MEMBER'] 
    })

    setWorkspaceContext(auth.workspaceId)

    const employee = await prisma.employee.findFirst({
      where: {
        id,
        workspaceId: auth.workspaceId
      },
      include: {
        user: true,
        position: {
          include: {
            team: {
              include: {
                department: true
              }
            }
          }
        },
        timeOffRequests: {
          orderBy: {
            startDate: 'desc'
          },
          take: 10
        },
        compensationHistory: {
          orderBy: {
            effectiveDate: 'desc'
          },
          take: 10
        }
      }
    })

    if (!employee) {
      return NextResponse.json({ 
        error: 'Employee not found' 
      }, { status: 404 })
    }

    return NextResponse.json(employee)
  } catch (error: any) {
    console.error('Error fetching employee:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to fetch employee' 
    }, { status: 500 })
  }
}

// PUT /api/employees/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getUnifiedAuth(request)
    const { id } = await params
    
    await assertAccess({ 
      userId: auth.user.userId, 
      workspaceId: auth.workspaceId, 
      scope: 'workspace', 
      requireRole: ['ADMIN', 'OWNER'] 
    })

    setWorkspaceContext(auth.workspaceId)

    const body = await request.json()
    const { firstName, lastName, positionId, orgUnitId, hireDate } = body

    // Verify employee exists and belongs to workspace
    const existing = await prisma.employee.findFirst({
      where: {
        id,
        workspaceId: auth.workspaceId
      }
    })

    if (!existing) {
      return NextResponse.json({ 
        error: 'Employee not found' 
      }, { status: 404 })
    }

    // Update employee
    const employee = await prisma.employee.update({
      where: { id },
      data: {
        firstName: firstName !== undefined ? firstName?.trim() || null : undefined,
        lastName: lastName !== undefined ? lastName?.trim() || null : undefined,
        positionId: positionId !== undefined ? positionId : undefined,
        orgUnitId: orgUnitId !== undefined ? orgUnitId : undefined,
        hireDate: hireDate !== undefined ? (hireDate ? new Date(hireDate) : null) : undefined
      },
      include: {
        user: true,
        position: true,
        team: true
      }
    })

    return NextResponse.json(employee)
  } catch (error: any) {
    console.error('Error updating employee:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to update employee' 
    }, { status: 500 })
  }
}

// DELETE /api/employees/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getUnifiedAuth(request)
    const { id } = await params
    
    await assertAccess({ 
      userId: auth.user.userId, 
      workspaceId: auth.workspaceId, 
      scope: 'workspace', 
      requireRole: ['ADMIN', 'OWNER'] 
    })

    setWorkspaceContext(auth.workspaceId)

    // Verify employee exists and belongs to workspace
    const employee = await prisma.employee.findFirst({
      where: {
        id,
        workspaceId: auth.workspaceId
      }
    })

    if (!employee) {
      return NextResponse.json({ 
        error: 'Employee not found' 
      }, { status: 404 })
    }

    // Delete employee (cascades to related records)
    await prisma.employee.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting employee:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to delete employee' 
    }, { status: 500 })
  }
}
```

---

## Phase 4: Frontend Migration (Week 5-6)

### Step 4.1: Convert CommonJS to ESM

**HRIS Component** (`components/EmployeeList.js`):
```javascript
const React = require('react');
const axios = require('axios');

function EmployeeList() {
  const [employees, setEmployees] = React.useState([]);
  
  React.useEffect(() => {
    axios.get('/api/employees')
      .then(res => setEmployees(res.data))
      .catch(err => console.error(err));
  }, []);
  
  return (
    <div>
      {employees.map(emp => (
        <div key={emp.id}>{emp.first_name} {emp.last_name}</div>
      ))}
    </div>
  );
}

module.exports = EmployeeList;
```

**Next.js Component** (`src/components/employees/employee-list.tsx`):
```typescript
"use client"

import { useQuery } from "@tanstack/react-query"
import { EmployeeCard } from "./employee-card"

interface Employee {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  position?: {
    title: string
    team?: {
      name: string
      department?: {
        name: string
      }
    }
  }
}

export function EmployeeList() {
  const { data: employees, isLoading, error } = useQuery<Employee[]>({
    queryKey: ['employees'],
    queryFn: async () => {
      const response = await fetch('/api/employees')
      if (!response.ok) throw new Error('Failed to fetch employees')
      return response.json()
    }
  })

  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>

  return (
    <div className="grid gap-4">
      {employees?.map(employee => (
        <EmployeeCard key={employee.id} employee={employee} />
      ))}
    </div>
  )
}
```

**Key Changes**:
1. ✅ Convert to TypeScript
2. ✅ Use `"use client"` directive
3. ✅ Use TanStack Query (already in your stack)
4. ✅ Use `fetch` instead of axios
5. ✅ Use ESM imports/exports

---

### Step 4.2: Adapt to Next.js Patterns

**HRIS Page** (`pages/employees/index.js`):
```javascript
import EmployeeList from '../components/EmployeeList';

export default function EmployeesPage() {
  return (
    <div>
      <h1>Employees</h1>
      <EmployeeList />
    </div>
  );
}
```

**Next.js Page** (`src/app/(dashboard)/employees/page.tsx`):
```typescript
import { EmployeeList } from "@/components/employees/employee-list"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"

export default function EmployeesPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Employees</h1>
        <Button>
          <Plus className="mr-2" />
          Add Employee
        </Button>
      </div>
      <EmployeeList />
    </div>
  )
}
```

---

### Step 4.3: Use Existing UI Components

**Leverage your existing shadcn/ui components**:

```typescript
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

export function EmployeeCard({ employee }: { employee: Employee }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {employee.firstName} {employee.lastName}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{employee.email}</p>
        {employee.position && (
          <Badge>{employee.position.title}</Badge>
        )}
      </CardContent>
    </Card>
  )
}
```

---

## Phase 5: Data Migration (Week 7)

### Step 5.1: Create Data Migration Script

**Goal**: Migrate existing HRIS data to new schema

**Create**: `scripts/migrate-hris-data.ts`

```typescript
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function migrateHRISData() {
  console.log('Starting HRIS data migration...')

  // Step 1: Connect to HRIS database (if separate)
  // Or read from CSV/JSON export
  
  // Step 2: Map employees
  const hrisEmployees = await getHRISEmployees() // Your function to fetch from HRIS DB
  
  for (const hrisEmp of hrisEmployees) {
    // Find or create user by email
    let user = await prisma.user.findUnique({
      where: { email: hrisEmp.email }
    })
    
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: hrisEmp.email,
          name: `${hrisEmp.first_name} ${hrisEmp.last_name}`,
          emailVerified: new Date()
        }
      })
    }
    
    // Find workspace (you'll need to determine mapping)
    const workspaceId = await getWorkspaceIdForHRISOrg(hrisEmp.org_id)
    
    // Find position (map from HRIS position_id)
    const positionId = await mapHRISPositionId(hrisEmp.position_id)
    
    // Create employee record
    await prisma.employee.create({
      data: {
        workspaceId,
        email: hrisEmp.email,
        firstName: hrisEmp.first_name,
        lastName: hrisEmp.last_name,
        positionId,
        hireDate: hrisEmp.hire_date ? new Date(hrisEmp.hire_date) : null
      }
    })
  }
  
  // Step 3: Migrate time off requests
  const timeOffRequests = await getHRISTimeOffRequests()
  
  for (const request of timeOffRequests) {
    const employee = await prisma.employee.findFirst({
      where: {
        email: request.employee_email // Or map by ID
      }
    })
    
    if (employee) {
      await prisma.timeOffRequest.create({
        data: {
          workspaceId: employee.workspaceId,
          employeeId: employee.id,
          startDate: new Date(request.start_date),
          endDate: new Date(request.end_date),
          type: request.type.toUpperCase(),
          status: request.status.toUpperCase(),
          reason: request.reason || null
        }
      })
    }
  }
  
  console.log('Migration complete!')
}

migrateHRISData()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
```

---

## Phase 6: Testing & Validation (Week 8)

### Step 6.1: Create Test Suite

**Create**: `tests/hris-api.test.ts`

```typescript
import { describe, it, expect, beforeAll } from 'vitest'

describe('HRIS API', () => {
  it('should list employees', async () => {
    const response = await fetch('http://localhost:3000/api/employees')
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(Array.isArray(data)).toBe(true)
  })
  
  it('should create time off request', async () => {
    const response = await fetch('http://localhost:3000/api/time-off', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        employeeId: 'test-employee-id',
        startDate: '2024-02-01',
        endDate: '2024-02-05',
        type: 'VACATION'
      })
    })
    expect(response.status).toBe(201)
  })
})
```

---

### Step 6.2: Manual Testing Checklist

- [ ] Create employee via API
- [ ] List employees with filters
- [ ] Create time off request
- [ ] Approve/reject time off request
- [ ] View compensation history
- [ ] Test workspace isolation (employees from workspace A don't show in workspace B)
- [ ] Test permissions (MEMBER can't create employees)
- [ ] Test UI components render correctly
- [ ] Test data migration script

---

## 📋 Migration Checklist

### Week 1: Analysis
- [ ] Map database schema
- [ ] Map API endpoints
- [ ] Map React components
- [ ] Document dependencies

### Week 2: Database
- [ ] Convert SQL to Prisma models
- [ ] Create migration
- [ ] Test migration on dev database
- [ ] Update existing models with relations

### Week 3-4: API
- [ ] Convert Express routes to Next.js routes
- [ ] Add authentication & authorization
- [ ] Add workspace scoping
- [ ] Test all endpoints

### Week 5-6: Frontend
- [ ] Convert CommonJS to ESM
- [ ] Adapt React components
- [ ] Use existing UI components
- [ ] Create pages

### Week 7: Data
- [ ] Create data migration script
- [ ] Test migration on sample data
- [ ] Run production migration
- [ ] Verify data integrity

### Week 8: Testing
- [ ] Write unit tests
- [ ] Write integration tests
- [ ] Manual testing
- [ ] Performance testing

---

## 🚨 Common Pitfalls & Solutions

### Pitfall 1: Missing Workspace Scoping
**Problem**: Forgot to add `workspaceId` to queries
**Solution**: Always use `getUnifiedAuth()` and filter by `workspaceId`

### Pitfall 2: Enum Mismatch
**Problem**: HRIS uses strings, Prisma uses enums
**Solution**: Convert strings to uppercase and map to enum values

### Pitfall 3: Date Format Issues
**Problem**: HRIS dates might be strings
**Solution**: Always convert to `Date` objects: `new Date(dateString)`

### Pitfall 4: Missing Relations
**Problem**: Forgot to include relations in Prisma queries
**Solution**: Use `include` to fetch related data

### Pitfall 5: Authentication Differences
**Problem**: HRIS uses JWT, Next.js uses NextAuth
**Solution**: Use `getUnifiedAuth()` which handles NextAuth sessions

---

## 📚 Reference: Complete Example

See `src/app/api/org/departments/route.ts` for a complete example of:
- ✅ Authentication
- ✅ Authorization
- ✅ Workspace scoping
- ✅ Error handling
- ✅ Prisma queries

---

**Next Steps**: Start with Phase 1 (Analysis) and work through each phase systematically.



