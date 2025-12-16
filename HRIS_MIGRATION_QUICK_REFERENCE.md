# HRIS Migration Quick Reference

Quick checklist and reference for migrating HRIS features.

---

## 🚀 Quick Start

1. **Analyze HRIS codebase** → Map schemas, routes, components
2. **Convert SQL → Prisma** → Add models to `schema.prisma`
3. **Convert Express → Next.js** → Create API routes
4. **Convert React components** → Adapt to Next.js patterns
5. **Migrate data** → Run migration script
6. **Test** → Verify everything works

---

## 📋 Migration Checklist

### Phase 1: Analysis
- [ ] Review HRIS database schema
- [ ] List all API endpoints
- [ ] List all React components
- [ ] Document dependencies

### Phase 2: Database
- [ ] Convert SQL tables to Prisma models
- [ ] Add `workspaceId` to all models
- [ ] Link to existing models (User, OrgPosition, etc.)
- [ ] Create enums for status fields
- [ ] Run `npx prisma migrate dev --name add_hris_models`
- [ ] Update existing models with relations

### Phase 3: API Routes
- [ ] Convert Express routes to Next.js routes
- [ ] Add `getUnifiedAuth()` to all routes
- [ ] Add `assertAccess()` for permissions
- [ ] Add `workspaceId` filtering
- [ ] Replace raw SQL with Prisma queries
- [ ] Handle Prisma error codes
- [ ] Test all endpoints

### Phase 4: Frontend
- [ ] Convert CommonJS to ESM
- [ ] Add `"use client"` directive
- [ ] Replace axios with fetch + TanStack Query
- [ ] Use existing UI components
- [ ] Create Next.js pages
- [ ] Test UI components

### Phase 5: Data Migration
- [ ] Create migration script
- [ ] Test on sample data
- [ ] Run production migration
- [ ] Verify data integrity

### Phase 6: Testing
- [ ] Unit tests for API routes
- [ ] Integration tests
- [ ] Manual testing checklist
- [ ] Performance testing

---

## 🔄 Common Conversions

### Express → Next.js Route

**Before (Express)**:
```javascript
router.get('/', async (req, res) => {
  const userId = req.user.id;
  const results = await db.query('SELECT * FROM table');
  res.json(results.rows);
});
```

**After (Next.js)**:
```typescript
export async function GET(request: NextRequest) {
  const auth = await getUnifiedAuth(request);
  await assertAccess({ userId: auth.user.userId, workspaceId: auth.workspaceId, scope: 'workspace', requireRole: ['MEMBER'] });
  setWorkspaceContext(auth.workspaceId);
  
  const results = await prisma.model.findMany({
    where: { workspaceId: auth.workspaceId }
  });
  return NextResponse.json(results);
}
```

### SQL → Prisma Query

**Before (SQL)**:
```sql
SELECT * FROM employees 
WHERE org_unit_id = $1 
ORDER BY created_at DESC;
```

**After (Prisma)**:
```typescript
const employees = await prisma.employee.findMany({
  where: {
    workspaceId: auth.workspaceId,
    orgUnitId: orgUnitId
  },
  orderBy: {
    createdAt: 'desc'
  }
});
```

### React Component (CommonJS → ESM)

**Before (CommonJS)**:
```javascript
const React = require('react');
const axios = require('axios');

function Component() {
  const [data, setData] = React.useState([]);
  React.useEffect(() => {
    axios.get('/api/data').then(res => setData(res.data));
  }, []);
  return <div>{data.map(...)}</div>;
}
module.exports = Component;
```

**After (ESM + TanStack Query)**:
```typescript
"use client"
import { useQuery } from "@tanstack/react-query"

export function Component() {
  const { data } = useQuery({
    queryKey: ['data'],
    queryFn: async () => {
      const res = await fetch('/api/data')
      return res.json()
    }
  })
  return <div>{data?.map(...)}</div>
}
```

---

## 📝 Prisma Model Template

```prisma
model ModelName {
  id          String    @id @default(cuid())
  workspaceId String    // ALWAYS include
  // ... fields ...
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  
  workspace   Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  // ... relations ...
  
  @@index([workspaceId])
  @@map("table_name")
}
```

---

## 🔐 Authentication Pattern

**Every API route needs**:
```typescript
// 1. Authenticate
const auth = await getUnifiedAuth(request)

// 2. Authorize
await assertAccess({ 
  userId: auth.user.userId, 
  workspaceId: auth.workspaceId, 
  scope: 'workspace', 
  requireRole: ['MEMBER'] // or ['ADMIN', 'OWNER']
})

// 3. Set workspace context
setWorkspaceContext(auth.workspaceId)

// 4. Filter by workspace
const results = await prisma.model.findMany({
  where: {
    workspaceId: auth.workspaceId // ALWAYS filter
  }
})
```

---

## 🎯 File Structure

```
src/
├── app/
│   ├── api/
│   │   ├── employees/
│   │   │   ├── route.ts          # GET, POST
│   │   │   └── [id]/
│   │   │       └── route.ts      # GET, PUT, DELETE
│   │   ├── time-off/
│   │   │   └── route.ts
│   │   └── compensation/
│   │       └── route.ts
│   └── (dashboard)/
│       ├── employees/
│       │   └── page.tsx
│       └── time-off/
│           └── page.tsx
├── components/
│   └── employees/
│       ├── employee-list.tsx
│       └── employee-card.tsx
└── lib/
    └── db.ts
```

---

## ⚠️ Common Pitfalls

1. **Missing workspace scoping** → Always filter by `workspaceId`
2. **Enum mismatch** → Convert strings to uppercase for enums
3. **Date format** → Always use `new Date(dateString)`
4. **Missing relations** → Use `include` in Prisma queries
5. **Wrong auth pattern** → Use `getUnifiedAuth()`, not JWT

---

## 📚 Reference Files

- **Full Guide**: `HRIS_MIGRATION_GUIDE.md`
- **Route Template**: `scripts/migration-templates/express-to-nextjs-route-template.ts`
- **Example Route**: `src/app/api/org/departments/route.ts`
- **Prisma Schema**: `prisma/schema.prisma`

---

## 🆘 Need Help?

1. Check existing routes for patterns (`src/app/api/org/`)
2. Review Prisma schema for model examples
3. See `HRIS_MIGRATION_GUIDE.md` for detailed steps
4. Use route template for quick conversion

---

**Status**: Ready to start migration! 🚀



