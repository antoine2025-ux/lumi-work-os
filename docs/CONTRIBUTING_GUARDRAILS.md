# Contributing Guardrails

This document defines rules and conventions for contributing to Loopwell, specifically designed to enable parallel development without breaking dependencies.

**Last Updated:** February 2026

---

## Table of Contents

1. [PR Scope Rules](#pr-scope-rules)
2. [Stable Seams](#stable-seams)
3. [Contract-First Changes](#contract-first-changes)
4. [Adding Routes](#adding-routes)
5. [Adding Database Models](#adding-database-models)
6. [Adding UI Components](#adding-ui-components)
7. [Avoiding Breakage Between Org and Spaces](#avoiding-breakage-between-org-and-spaces)
8. [Pre-Commit Checklist](#pre-commit-checklist)
9. [Code Review Guidelines](#code-review-guidelines)

---

## PR Scope Rules

### Rule 1: One Feature Area Per PR

Keep PRs focused on a single feature area to minimize merge conflicts and review complexity.

| Good | Bad |
|------|-----|
| "Add person skills API endpoint" | "Add person skills and fix wiki search" |
| "Update org chart layout" | "Update org chart and refactor auth" |
| "Fix workspace deletion redirect" | "Fix workspace deletion and add new dashboard" |

### Rule 2: Separate Org vs Spaces Work

When two developers work in parallel:

- **Developer A**: Work on Org features (`/org/*`, `/api/org/*`, `src/components/org/*`)
- **Developer B**: Work on Spaces features (`/wiki/*`, `/projects/*`, `src/components/wiki/*`)

Avoid cross-cutting changes unless coordinated.

### Rule 3: Changes to Stable Seams Require Explicit Review

If your PR touches any of these files, flag it in the PR description:

```
src/lib/db.ts
src/lib/unified-auth.ts
src/middleware.ts
src/server/authOptions.ts
src/lib/prisma/scopingMiddleware.ts
prisma/schema.prisma
```

Use this template in PR description:

```markdown
## Stable Seam Changes

This PR modifies the following stable seams:
- [ ] `src/lib/db.ts` - Reason: ...
- [ ] `src/lib/unified-auth.ts` - Reason: ...
- [ ] Other: ...

### Impact Assessment
- What could break: ...
- How it was tested: ...
```

### Rule 4: No Cross-Cutting Changes Without Coordination

If your change affects both Org and Spaces (or multiple feature areas), either:

1. Split into separate PRs
2. Coordinate with other developers first
3. Document the cross-cutting nature in the PR

---

## Stable Seams

These modules are shared dependencies that must remain stable. Treat them as contracts.

### Critical (Do Not Modify Without Team Coordination)

| Module | Purpose | Consumers |
|--------|---------|-----------|
| `src/lib/db.ts` | Prisma client | All data access |
| `src/lib/unified-auth.ts` | Auth context | All API routes |
| `src/middleware.ts` | Route protection | All routes |
| `src/server/authOptions.ts` | NextAuth config | All auth |
| `prisma/schema.prisma` | Data model | All features |

### High (Modify With Caution)

| Module | Purpose | Consumers |
|--------|---------|-----------|
| `src/lib/auth/assertAccess.ts` | Permission checks | API routes |
| `src/lib/workspace-context.tsx` | Client workspace state | Client components |
| `src/lib/prisma/scopingMiddleware.ts` | Workspace isolation | Data layer |
| `src/providers/user-status-provider.tsx` | User status | Client components |

### How to Safely Modify Stable Seams

1. **Understand the blast radius**
   ```bash
   # Count files importing the module
   rg "from ['\"]@/lib/db['\"]" src/ --files-with-matches | wc -l
   ```

2. **Maintain backward compatibility**
   - Don't change function signatures
   - Don't remove exports
   - Add new functionality, don't modify existing

3. **Add tests before changing**
   - Unit tests for the module
   - Integration tests for affected flows

4. **Run full verification**
   ```bash
   npm run typecheck && npm run lint && npm run test
   ```

---

## Contract-First Changes

When making changes that affect interfaces, update the contract first.

### API Changes

1. **Define/update Zod schema first**
   ```typescript
   // src/lib/schemas/person.ts
   export const PersonCreateSchema = z.object({
     name: z.string().min(1),
     email: z.string().email(),
     departmentId: z.string().uuid().optional(),
   })
   ```

2. **Update API route to use schema**
   ```typescript
   const validated = PersonCreateSchema.parse(body)
   ```

3. **Update any client code**

### Database Changes

1. **Update Prisma schema first**
   ```prisma
   model Person {
     id          String   @id @default(uuid())
     name        String
     email       String   @unique
     departmentId String?
     department  OrgDepartment? @relation(fields: [departmentId], references: [id])
   }
   ```

2. **Generate Prisma client**
   ```bash
   npm run db:push  # Development
   # OR
   npx prisma migrate dev --name add_person_department  # With migration
   ```

3. **Update TypeScript types if needed**

4. **Update affected queries**

### UI Changes

1. **Check if component exists in `src/components/ui/`**
2. **If extending, maintain existing props**
3. **If creating new, follow shadcn/ui patterns**

---

## Adding Routes

### Page Routes

**Location:** `src/app/(dashboard)/[feature]/page.tsx`

**Template:**

```typescript
// src/app/(dashboard)/my-feature/page.tsx
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'My Feature | Loopwell',
}

export default function MyFeaturePage() {
  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-semibold">My Feature</h1>
      {/* Content */}
    </div>
  )
}
```

### API Routes

**Location:** `src/app/api/[feature]/route.ts`

**Template:**

```typescript
// src/app/api/my-feature/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { handleApiError } from '@/lib/api-errors'
import { prisma } from '@/lib/db'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { z } from 'zod'

// Define schema for validation
const CreateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  // ... other fields
})

export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate
    const auth = await getUnifiedAuth(request)
    
    // 2. Authorize
    await assertAccess({
      userId: auth.user.userId,
      workspaceId: auth.workspaceId,
      scope: 'workspace',
      requireRole: ['MEMBER'],
    })
    
    // 3. Set workspace context
    setWorkspaceContext(auth.workspaceId)
    
    // 4. Query with explicit workspaceId
    const data = await prisma.myModel.findMany({
      where: { workspaceId: auth.workspaceId },
    })
    
    return NextResponse.json(data)
  } catch (error) {
    return handleApiError(error, request)
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getUnifiedAuth(request)
    
    await assertAccess({
      userId: auth.user.userId,
      workspaceId: auth.workspaceId,
      scope: 'workspace',
      requireRole: ['MEMBER'],
    })
    
    setWorkspaceContext(auth.workspaceId)
    
    // Validate input
    const body = await request.json()
    const validated = CreateSchema.parse(body)
    
    // Create with workspaceId
    const created = await prisma.myModel.create({
      data: {
        ...validated,
        workspaceId: auth.workspaceId,
      },
    })
    
    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    return handleApiError(error, request)
  }
}
```

### Checklist for New Routes

- [ ] Uses `getUnifiedAuth()` for authentication
- [ ] Uses `assertAccess()` for authorization
- [ ] Uses `setWorkspaceContext()` for Prisma scoping
- [ ] Includes explicit `workspaceId` in queries
- [ ] Uses `handleApiError()` for error handling
- [ ] Uses Zod for input validation (POST/PUT/PATCH)
- [ ] Returns appropriate status codes (200, 201, 400, 401, 403, 404, 500)

---

## Adding Database Models

### Step 1: Update Prisma Schema

```prisma
// prisma/schema.prisma

model MyNewModel {
  id          String   @id @default(uuid())
  name        String
  description String?
  
  // Workspace scoping (if applicable)
  workspaceId String
  workspace   Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  
  // Timestamps
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  // Indexes
  @@index([workspaceId])
  @@index([name])
}
```

### Step 2: Generate Client

```bash
# Development (no migration file)
npm run db:push

# Production (with migration)
npx prisma migrate dev --name add_my_new_model
```

### Step 3: Add to Workspace Scoping (If Applicable)

If the model should be workspace-scoped, add it to `WORKSPACE_SCOPED_MODELS` in `src/lib/prisma/scopingMiddleware.ts`:

```typescript
const WORKSPACE_SCOPED_MODELS = [
  // ... existing models
  'MyNewModel',
]
```

### Step 4: Create Types (If Needed)

```typescript
// src/types/my-feature.ts
import { MyNewModel } from '@prisma/client'

export type MyNewModelWithRelations = MyNewModel & {
  // Add relation types if needed
}
```

### Checklist for New Models

- [ ] Has `id` field with `@id @default(uuid())`
- [ ] Has `workspaceId` if workspace-scoped
- [ ] Has `createdAt` and `updatedAt` timestamps
- [ ] Has appropriate indexes
- [ ] Has `onDelete: Cascade` for workspace relation
- [ ] Added to `WORKSPACE_SCOPED_MODELS` if applicable
- [ ] Prisma client regenerated

---

## Adding UI Components

### Using Existing Components

Always check `src/components/ui/` first:

```typescript
// Good - using existing components
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
```

### Creating New Components

**Location:** `src/components/[feature]/MyComponent.tsx`

**Template:**

```typescript
// src/components/my-feature/MyComponent.tsx
'use client'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface MyComponentProps {
  title: string
  description?: string
  onAction?: () => void
  className?: string
}

export function MyComponent({
  title,
  description,
  onAction,
  className,
}: MyComponentProps) {
  return (
    <Card className={cn('', className)}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {description && (
          <p className="text-sm text-muted-foreground mb-4">{description}</p>
        )}
        {onAction && (
          <Button onClick={onAction}>
            Take Action
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
```

### Design System Patterns

**Use `cn()` for conditional classes:**
```typescript
import { cn } from '@/lib/utils'

<div className={cn(
  'base-classes',
  isActive && 'active-classes',
  className
)} />
```

**Use design tokens for org components:**
```typescript
import { tokens } from '@/components/org/ui/tokens'

<div className={tokens.card}>
  <h2 className={tokens.heading}>Title</h2>
</div>
```

**Follow shadcn/ui variant patterns:**
```typescript
import { cva, type VariantProps } from 'class-variance-authority'

const myComponentVariants = cva(
  'base-classes',
  {
    variants: {
      variant: {
        default: 'default-classes',
        destructive: 'destructive-classes',
      },
      size: {
        sm: 'small-classes',
        lg: 'large-classes',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'sm',
    },
  }
)
```

### Checklist for New Components

- [ ] Uses existing `src/components/ui/*` primitives
- [ ] Uses `cn()` for className merging
- [ ] Has TypeScript interface for props
- [ ] Supports `className` prop for customization
- [ ] Follows existing naming conventions
- [ ] No duplicate functionality with existing components

---

## Avoiding Breakage Between Org and Spaces

### Shared Dependencies

Both Org and Spaces features depend on:

| Dependency | Used By |
|------------|---------|
| `src/lib/db.ts` | All data access |
| `src/lib/unified-auth.ts` | All API routes |
| `src/lib/workspace-context.tsx` | All client components |
| `src/components/ui/*` | All UI |

### Safe Parallel Work

**Developer A (Org):**
- Work in `src/app/org/*`, `src/app/api/org/*`, `src/components/org/*`
- Use org-specific models: `OrgDepartment`, `OrgTeam`, `OrgPosition`, `WorkRequest`
- Don't modify shared dependencies without coordination

**Developer B (Spaces):**
- Work in `src/app/(dashboard)/wiki/*`, `src/app/api/wiki/*`, `src/components/wiki/*`
- Use spaces-specific models: `WikiPage`, `WikiChunk`, `Project`, `Task`
- Don't modify shared dependencies without coordination

### Conflict Prevention

1. **Communicate before modifying shared files**
2. **Use feature branches**
3. **Merge main frequently**
4. **Run tests before pushing**

### If You Must Modify Shared Code

1. **Create a separate PR for the shared change**
2. **Get it merged first**
3. **Then continue with feature work**

---

## Pre-Commit Checklist

Run these checks before committing:

```bash
# TypeScript check
npm run typecheck

# Lint check
npm run lint

# Unit tests
npm run test

# (Optional) Full quality gate
npm run quality:gate
```

### Quick Check Script

```bash
# Run from project root
npm run typecheck && npm run lint
```

### What Each Check Catches

| Check | Catches |
|-------|---------|
| `typecheck` | Type errors, missing imports, wrong types |
| `lint` | Code style issues, unused variables, potential bugs |
| `test` | Broken functionality, regression bugs |
| `test:e2e` | Integration issues, broken user flows |

---

## Code Review Guidelines

### For Authors

1. **Keep PRs small** (< 400 lines of changes)
2. **Write clear PR descriptions**
3. **Self-review before requesting review**
4. **Respond to feedback promptly**

### For Reviewers

1. **Check for stable seam modifications**
2. **Verify workspace scoping in queries**
3. **Check for proper error handling**
4. **Verify TypeScript types are correct**
5. **Look for potential security issues**

### PR Description Template

```markdown
## Summary
Brief description of what this PR does.

## Changes
- Change 1
- Change 2

## Stable Seam Changes
- [ ] None
- [ ] `src/lib/db.ts` - Reason: ...
- [ ] Other: ...

## Testing
- [ ] Ran `npm run typecheck`
- [ ] Ran `npm run lint`
- [ ] Ran `npm run test`
- [ ] Manual testing: ...

## Screenshots (if UI changes)
```

---

## Quick Reference

### Common Commands

```bash
# Development
npm run dev              # Start dev server
npm run typecheck        # Check types
npm run lint             # Run linter

# Database
npm run db:push          # Push schema changes (dev)
npx prisma studio        # Open Prisma Studio

# Testing
npm run test             # Unit tests
npm run test:e2e         # E2E tests

# Quality
npm run quality:gate     # Full quality check
```

### Key Imports

```typescript
// Data
import { prisma } from '@/lib/db'

// Auth
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'

// Errors
import { handleApiError } from '@/lib/api-errors'

// UI
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

// Validation
import { z } from 'zod'
```

### File Locations

| What | Where |
|------|-------|
| Pages | `src/app/(dashboard)/[feature]/page.tsx` |
| API routes | `src/app/api/[feature]/route.ts` |
| Components | `src/components/[feature]/` |
| UI primitives | `src/components/ui/` |
| Utilities | `src/lib/` |
| Types | `src/types/` |
| Prisma schema | `prisma/schema.prisma` |
