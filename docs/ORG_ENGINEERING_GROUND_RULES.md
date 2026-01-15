# Loopwell Org Module – Engineering Ground Rules
**(Authoritative, Non-Negotiable)**

## Purpose

These rules govern all future Org work. They supersede historical assumptions, transitional Phase 0 decisions, and legacy compatibility patterns.

**If code or prompts violate these rules, they are incorrect by definition.**

---

## 1. Canonical Identity Rule (Overrides Phase 0 Docs)

### ✅ Single Truth
- **`workspaceId` is the ONLY canonical identifier**
- **`orgId` does not exist as a semantic concept in Loopwell 2.0**

### ❌ Explicitly Forbidden
- Accepting `orgId` parameters "for ergonomics"
- Type aliases equating `OrgId = WorkspaceId`
- Functions named `requireActiveOrgId`
- Comments stating "workspace IS the org"

### ✅ Required Correction
All Org APIs, services, and helpers **MUST**:
- accept `workspaceId`
- retrieve it exclusively via `getUnifiedAuth(request)`
- remove `orgId` from signatures over time (Phase 1 cleanup)

### Rationale
Your integration contract is correct. Phase 0 aliasing was a temporary documentation bridge, not an architectural truth.

**From this point forward:**
- `workspaceId` is tenant scope
- `orgId` is legacy noise

---

## 2. Auth & Scoping (Strict)

### ✅ Required Pattern
Every Org backend entry point **MUST** follow this exact order:

```typescript
1. getUnifiedAuth(request)
2. assertAccess({ userId, workspaceId, scope, role })
3. setWorkspaceContext(workspaceId)
4. Prisma queries (scoped automatically)
```

### ❌ Forbidden
- Accepting `workspaceId` from body, params, or query
- Skipping `assertAccess`
- Using `prismaUnscoped` outside auth flows

---

## 3. Backend Pattern Lock

### ✅ Mandatory
- **Next.js Route Handlers only**
- **No Server Actions**
- **No direct Prisma access from UI or client components**

### ✅ Required Structure
```
/src/app/api/org/**/route.ts
Shared logic under /src/server/org/**
```

---

## 4. Database Truth Policy (Overrides Phase 0 Philosophy)

### ✅ Final Rule
- **Missing tables are NOT acceptable**
- **Defensive fallback code is NOT allowed long-term**

### ⚠️ Transitional Allowance (Already Done)
Phase 0 defensive code is tolerated only until:
- migrations are verified
- feature flags are enabled
- Phase 1 cleanup removes defensive patterns

### ✅ Mandatory Direction
- Defensive try/catch patterns **MUST** be removed once tables exist
- Feature flags control availability, not silent failure

---

## 5. Feature Flags (Correctly Used)

Feature flags are:
- for rollout
- **not** for masking broken schema

### ✅ Allowed
- Disable capacity, management load, ownership until ready

### ❌ Forbidden
- Returning fake data
- Returning empty arrays because "table may not exist"

---

## 6. Org Models & Unused Schema

### ✅ Explicit Rules
**Do NOT use:**
- `Org` model
- `OrgMembership`
- legacy `SavedView`

### ✅ Direction
- Treat them as deprecated
- No new features may reference them
- Removal planned post-merge

---

## 7. Loopbrain Is Not Optional

Every Org mutation **MUST**:
- Produce a `ContextObject`
- Persist it
- Trigger indexing (non-blocking)

**Org without Loopbrain context is incomplete by definition.**

---

## 8. UI Discipline

### ✅ Mandatory
- Use `src/components/ui/*`
- Reuse existing layouts
- Follow Loopwell UX patterns

### ❌ Forbidden
- Custom UI kits
- Duplicate tables, dialogs, buttons
- Inline styling systems

---

## 9. Phase Discipline

1. **Phase 0**: Stabilization (DONE)
2. **Phase 1**: Schema truth + ID cleanup
3. **Phase 2**: Core Org value
4. **Phase 3**: Intelligence

**Skipping phases is not allowed.**

---

## 10. Enforcement Rule

Every Cursor prompt **must** include:
- explicit file paths
- plan explanation before code
- regression checks
- migration instructions
- verification steps

---

## Summary Checklist

Before writing any Org code, verify:

- [ ] Using `workspaceId` (never `orgId`)
- [ ] Following strict auth pattern (`getUnifiedAuth` → `assertAccess` → `setWorkspaceContext`)
- [ ] Route Handler (not Server Action)
- [ ] No defensive fallback code (tables must exist)
- [ ] Feature flags for rollout (not masking broken code)
- [ ] Not using deprecated models (`Org`, `OrgMembership`, legacy `SavedView`)
- [ ] Loopbrain integration included
- [ ] Using existing UI components
- [ ] Following phase discipline
- [ ] Prompt includes paths, plan, checks, migration, verification

---

**Last Updated**: Ground Rules established
**Authority**: Supersedes all previous documentation
**Status**: Active and enforceable

