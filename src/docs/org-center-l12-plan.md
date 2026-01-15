# Org Center – Milestone L12 Plan  
### Org Roles, Permissions & Member Management Enhancements

## Goals

- Establish a **clean permission system** for all Org actions.  
- Implement dynamic UI gating (show/hide buttons, modals, tabs).  
- Improve Org member management UX.  

---

# Org Center – L12 Step 1: Action Audit & Permission Surface Map

This document identifies **every action a user can take** across Org Center.

It will be used to design:
- Capability matrix  
- Role definitions  
- Permission gating rules  
- Server-side enforcement  
- UI-based gating  

---

## 1. Org-Level Actions

| Action | Description | Page | Requires permission? (expected) |
|--------|-------------|-------|---------------------------------|
| Switch org | Switch between organizations | Global header | ✔ Yes (must be member of org) |
| View Org Center | Access `/org` | All Org pages | ✔ Yes (org member) |
| View Org Overview metrics | Load people/teams/dept counts | /org | Maybe (owner/admin) ? Or allow read-only? |
| Export Org Activity | Download CSV/JSON | /org/activity | ✔ Yes (owner/admin expected) |

---

## 2. People Actions

| Action | Description | Page | Permission needed |
|--------|-------------|-------|-------------------|
| View People list | Browse directory | /org/people | ✔ Must be org member |
| Search People | Query by name/email | /org/people | ✔ Allowed for all members |
| Filter by Team | `/org/people?teamId=...` | /org/people | ✔ Allowed for all members |
| Filter by Department | `/org/people?departmentId=...` | /org/people | ✔ Allowed |
| Filter by Role | `/org/people?roleId=...` | /org/people | ✔ Allowed |
| Sort People | Sort by name/join date/etc. | /org/people | ✔ Allowed |
| Invite People | Open invite dialog | /org/people or /org/settings/invites | ✔ Admin+ only |
| Remove Member | Remove person from org | /org/settings/members | ✔ Owner/Admin |
| Change Member Role | Promote/demote | /org/settings/members | ✔ Owner only (or Admin for limited changes?) |

---

## 3. Structure Actions (Teams, Departments, Roles)

### Teams

| Action | Description | Permission |
|--------|-------------|------------|
| View Teams list | Read list | All org members |
| Create Team | Modal → API | Admin or Owner |
| Edit Team | Update name/department/etc. | Admin or Owner |
| Delete Team | Remove from org | Owner only (most likely) |
| View filtered teams | Using URL params | All members |

### Departments

| Action | Description | Permission |
|--------|-------------|------------|
| View Departments list | Read | All members |
| Create Department | Modal | Admin or Owner |
| Edit Department | Name/desc changes | Admin or Owner |
| Delete Department | Dangerous → cascading | Owner only |

### Roles

| Action | Description | Permission |
|--------|-------------|------------|
| View Roles list | Read | All members |
| Create Role | Modal | Admin or Owner |
| Edit Role | Name/level/desc | Admin or Owner |
| Delete Role | Remove role completely | Owner only |

---

## 4. Org Chart Actions

| Action | Description | Permission |
|--------|-------------|------------|
| View Org Chart | View department/team structure | All members |
| Expand Departments | Client-side expand/collapse | All members |
| Click department → go to Structure | Deep link | All members |
| Click team → go to People | Deep link | All members |
| View chart of teams you don't belong to | Read-only view | Allowed unless restricted later |

---

## 5. Activity Actions

| Action | Description | Permission |
|--------|-------------|------------|
| View recent admin activity | Read-only | Admin or Owner |
| View sensitive items (invites, role changes) | Read-only | Owner only (optional) |
| Export activity | Download CSV/JSON | Admin or Owner |

---

## 6. Org Settings Actions

### Members tab

| Action | Permission |
|--------|------------|
| View member list | All members? Or Admin+? |
| Change member role | Owner only |
| Remove member | Admin+ |

### Invites tab

| Action | Permission |
|--------|------------|
| View active invites | Admin+ |
| Create invite | Admin+ |
| Delete invite | Admin+ |

### General tab

| Action | Permission |
|--------|------------|
| Change org name | Owner or Admin |
| Change org description | Owner or Admin |

### Danger zone

| Action | Permission |
|--------|------------|
| Delete organization | Owner only |

---

## 7. "Hidden" Actions (Implicit Permission Surfaces)

These often get forgotten but must be guarded:

| Hidden Action | Description | Permission |
|---------------|-------------|------------|
| Hit a deep link directly (e.g., `/org/people?teamId=xyz`) | Should validate access | Must be org member |
| Fetch API routes for teams/depts/roles | Should validate org + role | Admin+ for mutations, members for reads |
| Access structure API for someone else's org | Should be denied | Must match user's org |
| Browser nav into restricted pages | Should render no-access card | Member-level or higher |

---

## 8. Proposed Permission Roles (Draft)

This is the starting scaffold for L12:

| Capability | Member | Admin | Owner |
|------------|--------|-------|--------|
| View Org pages | ✔ | ✔ | ✔ |
| Create/edit teams | ✖ | ✔ | ✔ |
| Delete teams | ✖ | ✖ | ✔ |
| Create/edit departments | ✖ | ✔ | ✔ |
| Delete departments | ✖ | ✖ | ✔ |
| Create/edit roles | ✖ | ✔ | ✔ |
| Delete roles | ✖ | ✖ | ✔ |
| View Activity | ✖ | ✔ | ✔ |
| Export Activity | ✖ | ✔ | ✔ |
| Invite members | ✖ | ✔ | ✔ |
| Remove members | ✖ | ✔ | ✔ |
| Promote/demote members | ✖ | ✖ | ✔ |
| Delete org | ✖ | ✖ | ✔ |

This matrix will be refined in Step 2.

---

## 9. Key Takeaways for L12

- **Every Org action** must be evaluated through the lens of permissions.
- UI gating must match backend gating.
- Deep links require SSR permission checks.
- API routes must validate:
  - Authenticated user  
  - User's org  
  - User's role/capabilities  

This audit completes the foundation for L12 Step 2.

---

# Org Center – L12 Step 2: Formal Capability Matrix

## Status: ✅ Complete

Step 2 converted the action audit into a **formal, type-safe capability system** that can be implemented in code.

## What Was Created

### 1. Core Capability Definitions (`src/lib/org/capabilities.ts`)

- **`OrgRole`** type: `"OWNER" | "ADMIN" | "MEMBER"`
- **`OrgCapability`** type: 25 granular capabilities using `org:resource:action` naming
- **Role → Capability mappings**: 
  - `ORG_CAPABILITIES_READONLY` (Member)
  - `ORG_CAPABILITIES_ADMIN` (Admin)
  - `ORG_CAPABILITIES_OWNER` (Owner)
- **Helper functions**:
  - `getOrgCapabilitiesForRole(role)` - Get all capabilities for a role
  - `hasOrgCapability(role, capability)` - Check single capability
  - `hasAllOrgCapabilities(input)` - Check multiple capabilities (AND)
  - `hasAnyOrgCapability(input)` - Check multiple capabilities (OR)

### 2. Server-Side Permission Helpers (`src/lib/org/permissions.server.ts`)

- **`OrgPermissionContext`** type: `{ userId, orgId, role }`
- **`getOrgPermissionContext()`** - Stub for fetching auth + org context (TODO: wire to real auth)
- **`assertOrgCapability(context, capability)`** - Throws if capability missing
- **`can(context, capability)`** - Returns boolean check

### 3. Client-Side Permission Helpers (`src/lib/org/permissions.client.ts`)

- **`OrgClientPermissions`** type: `{ role }`
- **`canClient(perms, capability)`** - Client-side capability check

### 4. UI Gating Component (`src/components/org/OrgCapabilityGate.tsx`)

- React component for conditionally rendering UI based on capabilities
- Usage pattern:
  ```tsx
  <OrgCapabilityGate
    capability="org:team:create"
    permissions={orgPermissionsFromServer}
  >
    <CreateTeamDialogInlineTrigger />
  </OrgCapabilityGate>
  ```

## Capability Matrix Summary

| Capability | Member | Admin | Owner |
|------------|--------|-------|-------|
| View Org pages | ✔ | ✔ | ✔ |
| Create/edit teams | ✖ | ✔ | ✔ |
| Delete teams | ✖ | ✖ | ✔ |
| Create/edit departments | ✖ | ✔ | ✔ |
| Delete departments | ✖ | ✖ | ✔ |
| Create/edit roles | ✖ | ✔ | ✔ |
| Delete roles | ✖ | ✖ | ✔ |
| View Activity | ✖ | ✔ | ✔ |
| Export Activity | ✖ | ✔ | ✔ |
| Invite members | ✖ | ✔ | ✔ |
| Remove members | ✖ | ✔ | ✔ |
| Promote/demote members | ✖ | ✖ | ✔ |
| Delete org | ✖ | ✖ | ✔ |

## Key Design Decisions

1. **Granular capabilities**: Each action has its own capability (e.g., `org:team:create` vs `org:team:update`)
2. **Type-safe**: All capabilities are TypeScript union types, preventing typos
3. **Centralized**: Single source of truth in `capabilities.ts`
4. **Server/Client separation**: Different helpers for server vs client contexts
5. **Composable**: Can check single or multiple capabilities

## Next Steps

- **Step 3**: Wire `getOrgPermissionContext()` to real auth/org context
- **Step 4**: Start using `assertOrgCapability` in API routes
- **Step 5**: Use `OrgCapabilityGate` in UI components

---

## Proposed Steps

1. **Audit Current Permission Gaps** ✅ *Complete*

2. **Define Org Capability Matrix** ✅ *Complete*

3. **Wire Org Roles into Real User/Org Context** ➜ *Next*

4. **Apply Permissions Across Structure Editing**  

5. **Apply Permissions to People / Chart / Activity**  

6. **Member Management Enhancements**  

7. **Invite Flow Improvements**  

8. **Dynamic UI Gating (SSR + Client)**  

9. **QA Pass: Roles & Permissions**  

10. **Recap Doc + Milestone Close**

---

## Notes

- This is the *preliminary scaffold*; details will be filled out during L12 Step 1–3.
- No code is added at this stage — only planning.

---

