# Org Center Permissions Model – Final Summary (L12)

This document summarizes the **entire Org Center permissions system** after completing Milestone L12.

It covers:

- Roles  
- Capabilities  
- Backend enforcement  
- UI gating  
- Deep link rules  
- Extensibility guidelines  

---

## 1. Roles

Org Center defines three system-level roles:

| Role   | Description |
|--------|-------------|
| **Owner** | Highest authority. Full administrative control. Can delete orgs, change member roles, manage structure, view/export activity. |
| **Admin** | Operational authority. Can manage structure, members, invites, and activity (if permitted). Cannot delete org or change roles of others unless allowed. |
| **Member** | Regular user. Read-only access across Org Center. Cannot perform structural or administrative actions. |

Roles are stored inside the database (e.g., `WorkspaceMember.role`).

---

## 2. Capabilities

Capabilities define **what actions are allowed**.  
Capabilities are atomic (e.g., `org:team:create`, `org:activity:export`) and roles are **collections** of capabilities.

Capabilities used in L12 include:

### Viewing capabilities

- `org:view` — General org access
- `org:overview:view` — View org overview page
- `org:people:view` — View people directory
- `org:structure:view` — View structure (teams/departments/roles)
- `org:chart:view` — View org chart
- `org:activity:view` — View activity logs
- `org:settings:view` — View settings page

### Structure management

- `org:team:create` — Create new teams
- `org:team:update` — Update existing teams
- `org:team:delete` — Delete teams (Owner-only)
- `org:department:create` — Create new departments
- `org:department:update` — Update existing departments
- `org:department:delete` — Delete departments (Owner-only)
- `org:role:create` — Create new roles
- `org:role:update` — Update existing roles
- `org:role:delete` — Delete roles (Owner-only)

### Member & invite management

- `org:member:list` — View member list
- `org:member:invite` — Send invitations
- `org:member:remove` — Remove members
- `org:member:role.change` — Change member roles (Owner-only)

### Activity & exports

- `org:activity:export` — Export activity logs (CSV/JSON)

### Org-level actions

- `org:org:update` — Update org settings
- `org:org:delete` — Delete organization (Owner-only)

Roles → capability mapping is stored in:

**`src/lib/org/capabilities.ts`**

This file is the **single source of truth** for authorization.

---

## 3. Backend Enforcement

Every protected Org API route must call:

1. `getOrgPermissionContext(request)` — Resolves current user's org + role
2. `assertOrgCapability(context, "<capability>")` — Throws if capability missing

For example:

```typescript
const context = await getOrgPermissionContext(req);

try {
  assertOrgCapability(context, "org:team:create");
} catch (permError) {
  const status = mapPermissionErrorToStatus(permError);
  return NextResponse.json(
    {
      ok: false,
      error: {
        code: status === 401 ? "UNAUTHORIZED" : "FORBIDDEN",
        message: "Not allowed to create teams in this org.",
      },
    },
    { status }
  );
}

// At this point, context is guaranteed non-null & authorized
const orgId = context!.orgId;
```

If unauthorized:

- Missing context (no auth) → **401 Unauthorized**
- Missing capability → **403 Forbidden**
- Permission status translated via `mapPermissionErrorToStatus`

Backend checks exist for:

### Structure

- Creating teams, departments, roles (`org:team:create`, `org:department:create`, `org:role:create`)
- Editing structure (`org:team:update`, `org:department:update`, `org:role:update`)
- Deleting structure (`org:team:delete`, `org:department:delete`, `org:role:delete`)

### Members & Invites

- Listing members (`org:member:list`)
- Inviting members (`org:member:invite`)
- Removing members (`org:member:remove`)
- Changing roles (`org:member:role.change`)

### Activity

- Viewing activity logs (`org:activity:view`)
- Exporting logs (`org:activity:export`)

### Danger Zone

- Deleting org (`org:org:delete` — Owner-only)

### Integrity Checks

All entity mutations include an org boundary check:

```typescript
if (entity.workspaceId !== context.orgId) {
  return NextResponse.json(
    { error: "Entity does not belong to this org." },
    { status: 404 }
  );
}
```

---

## 4. UI Gating

The frontend performs **non-authoritative** gating to hide unavailable options.

Two key primitives:

### `OrgPermissionsProvider`

Provides the client with:

```typescript
{
  role: "OWNER" | "ADMIN" | "MEMBER"
}
```

Wrapped around all `/org` pages inside:

**`src/app/org/layout.tsx`**

The provider fetches permission context server-side and passes it to the client.

### `OrgCapabilityGate`

A wrapper component used to hide UI elements:

```tsx
<OrgCapabilityGate
  capability="org:team:create"
  permissions={perms}
  fallback={null}
>
  <NewTeamButton />
</OrgCapabilityGate>
```

This keeps UI honest and clean:

- Members don't see admin buttons.
- Admins don't see Owner-only actions.
- Only Owner sees Danger zone content.

**Important:** UI gating is **non-authoritative**. Backend always enforces permissions. UI gating improves UX by hiding unavailable options.

---

## 5. Deep Link Rules

All deep links such as:

- `/org/people?teamId=...`
- `/org/structure?tab=departments&departmentId=...`
- `/org/activity`
- `/org/settings`

are protected by the backend, not the UI.

If a user doesn't have access:

- The frontend shows a **no-access card** (`OrgNoAccessState`), OR
- API returns 401/403

Thus deep-linking never bypasses authorization.

---

## 6. No-Access Principles

A consistent, calm, non-scary UI is used for all denied scenarios:

- **Non-members** visiting any `/org` page → calm no-access card
- **Members** visiting Activity/Invites/Members → no-access message (if gated)
- **Admins** visiting Danger zone → no-access message

This maintains predictability and prevents jarring 403 errors in the UI.

The `OrgNoAccessState` component provides consistent messaging:

- Clear title: "You don't have access to this Org Center"
- Helpful description explaining why
- Next steps guidance
- Non-threatening tone

---

## 7. Developer Guidelines

### 7.1 Adding a New Org Action

Steps:

1. **Define capability** in `OrgCapability` type (`src/lib/org/capabilities.ts`)
2. **Add to role sets** — Include in `ORG_CAPABILITIES_OWNER`, `ORG_CAPABILITIES_ADMIN`, or `ORG_CAPABILITIES_MEMBER` as appropriate
3. **Add backend enforcement** — Use `getOrgPermissionContext` + `assertOrgCapability` in API route
4. **Wrap UI elements** — Use `OrgCapabilityGate` to hide/show UI
5. **Update QA doc** — Add test case to `org-center-l12-permissions-qa.md`

Example:

```typescript
// 1. Add to capabilities.ts
export type OrgCapability = 
  | "org:team:create"
  | "org:new:action"; // ← New capability

// 2. Add to role sets
export const ORG_CAPABILITIES_ADMIN: OrgCapability[] = [
  // ... existing
  "org:new:action", // ← Add here
];

// 3. Backend enforcement
const context = await getOrgPermissionContext(req);
assertOrgCapability(context, "org:new:action");

// 4. UI gating
<OrgCapabilityGate capability="org:new:action" permissions={perms}>
  <NewActionButton />
</OrgCapabilityGate>
```

### 7.2 Adding New Roles

If Loopwell ever adds custom roles:

1. **Create new capability set** in `capabilities.ts`
2. **Map in backend** — Update `getOrgCapabilitiesForRole` function
3. **Provide UI role selector** if needed (e.g., in Settings)
4. **Update `OrgPermissionsProvider`** — Ensure it handles new role
5. **Update QA doc** — Add role-specific test cases

### 7.3 Adding New Sections/Pages

Ensure:

- **API protected** via mandatory capability check
- **UI gated** via `OrgCapabilityGate` or conditional rendering
- **Sidebar visibility** logic matches capabilities (`OrgSidebar.tsx`)
- **Deep links** return 401/403 for unauthorized users
- **No-access state** shown when appropriate

---

## 8. Stability Guarantees

After L12:

- ✅ Org Center is fully **role-driven**, not page-driven
- ✅ Backend enforces all security boundaries
- ✅ UI is aligned with backend guarantees
- ✅ Adding new features is straightforward and consistent
- ✅ The potential for privilege mismatch is drastically reduced

**Security Model:**

- **Defense in depth** — Both backend and frontend enforce permissions
- **Fail secure** — Missing permissions default to deny
- **Consistent errors** — Standardized 401/403 responses
- **Audit trail** — Key mutations logged via `logOrgAudit`

---

## 9. Summary Table

| Capability | Member | Admin | Owner |
|------------|--------|-------|-------|
| **Viewing** |
| `org:view` | ✔ | ✔ | ✔ |
| `org:overview:view` | ✔ | ✔ | ✔ |
| `org:people:view` | ✔ | ✔ | ✔ |
| `org:structure:view` | ✔ | ✔ | ✔ |
| `org:chart:view` | ✔ | ✔ | ✔ |
| `org:activity:view` | ✔ | ✔ | ✔ |
| `org:settings:view` | ✔ | ✔ | ✔ |
| **Structure Management** |
| `org:team:create` | ✖ | ✔ | ✔ |
| `org:team:update` | ✖ | ✔ | ✔ |
| `org:team:delete` | ✖ | ✖ | ✔ |
| `org:department:create` | ✖ | ✔ | ✔ |
| `org:department:update` | ✖ | ✔ | ✔ |
| `org:department:delete` | ✖ | ✖ | ✔ |
| `org:role:create` | ✖ | ✔ | ✔ |
| `org:role:update` | ✖ | ✔ | ✔ |
| `org:role:delete` | ✖ | ✖ | ✔ |
| **Member Management** |
| `org:member:list` | ✔ | ✔ | ✔ |
| `org:member:invite` | ✖ | ✔ | ✔ |
| `org:member:remove` | ✖ | ✔ | ✔ |
| `org:member:role.change` | ✖ | ✖ | ✔ |
| **Activity & Exports** |
| `org:activity:export` | ✖ | ✔ | ✔ |
| **Org-Level Actions** |
| `org:org:update` | ✖ | ✔ | ✔ |
| `org:org:delete` | ✖ | ✖ | ✔ |

---

## 10. Key Files Reference

| File | Purpose |
|------|---------|
| `src/lib/org/capabilities.ts` | Capability definitions and role mappings |
| `src/lib/org/permissions.server.ts` | Server-side permission helpers |
| `src/lib/org/permissions.client.ts` | Client-side permission helpers |
| `src/components/org/OrgCapabilityGate.tsx` | UI gating component |
| `src/components/org/OrgPermissionsContext.tsx` | Permission context provider |
| `src/app/org/layout.tsx` | Layout that provides permissions to all `/org` pages |
| `src/docs/org-center-l12-permissions-qa.md` | QA checklist for permissions |

---

## 11. Common Patterns

### Pattern: Protected API Route

```typescript
export async function POST(req: NextRequest) {
  const context = await getOrgPermissionContext(req);
  
  try {
    assertOrgCapability(context, "org:team:create");
  } catch (permError) {
    const status = mapPermissionErrorToStatus(permError);
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: status === 401 ? "UNAUTHORIZED" : "FORBIDDEN",
          message: "Not allowed to create teams in this org.",
        },
      },
      { status }
    );
  }
  
  // Proceed with authorized action
  const orgId = context!.orgId;
  // ... create team
}
```

### Pattern: Protected UI Element

```tsx
import { useOrgPermissions } from "@/components/org/OrgPermissionsContext";
import { OrgCapabilityGate } from "@/components/org/OrgCapabilityGate";

export function MyComponent() {
  const perms = useOrgPermissions();
  
  return (
    <OrgCapabilityGate
      capability="org:team:create"
      permissions={perms}
      fallback={null}
    >
      <button>New Team</button>
    </OrgCapabilityGate>
  );
}
```

### Pattern: Conditional Tab Visibility

```tsx
const visibleTabs = SETTINGS_TABS.filter((tab) => {
  if (tab.id === "invites") {
    return role && hasOrgCapability(role, "org:member:invite");
  }
  if (tab.id === "danger") {
    return role && hasOrgCapability(role, "org:org:delete");
  }
  return true;
});
```

---

## 12. Final Notes

- This summary is the **developer-facing reference** for all Org permissions.
- Designers/UI should use this doc whenever placing CTA buttons or deciding visibility/UX flows.
- Engineering should consult it when implementing new features or refactoring authorization.
- QA should reference `org-center-l12-permissions-qa.md` for test cases.

**Remember:**

- ✅ Backend is authoritative — always enforce permissions server-side
- ✅ UI gating improves UX — but never rely on it for security
- ✅ Consistency matters — use the same capability names everywhere
- ✅ Fail secure — default to deny when in doubt

---

## NEXT RECOMMENDED STEP

Next recommended step: Milestone L12 – Step 11: Begin implementing **L13 (Org Insights / Reporting)** or **L14 (Org Automation)** — or continue into **L9/L10 UX refinement** depending on the roadmap. The permission foundation is now complete and ready for expansion.

