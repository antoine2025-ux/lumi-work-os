# L5 Step 1 – Define Core ContextObject Types and Org Workspace Context Shape

**Date:** 2024-12-XX  
**Status:** ✅ Completed

---

## Overview

Created a central TypeScript representation for ContextObjects and defined the Org Workspace context shape. This establishes the type system and constructors that will later be used to persist context to the `ContextItem` table and feed into Loopbrain.

---

## Features Implemented

### 1. Core ContextObject Types

**File:** `src/lib/context/types.ts`

**Purpose:** Single source of truth for all context types

**Exports:**

1. **`ContextType`** – Canonical labels for different context entities
   ```typescript
   export type ContextType =
     | "workspace"
     | "org"
     | "department"
     | "team"
     | "position"
     | "person"
     | "project";
   ```

2. **`BaseContextObject<TData>`** – Base shape for any ContextObject
   ```typescript
   export interface BaseContextObject<TData = unknown> {
     contextId: string;
     workspaceId: string;
     type: ContextType;
     title: string;
     summary?: string | null;
     data: TData;
     capturedAt: string;
   }
   ```

3. **`makeContextObject<TData>`** – Type-safe builder helper
   - Creates `BaseContextObject` instances
   - Provides defaults for optional fields
   - Sets `capturedAt` to current ISO timestamp if not provided

**Benefits:**
- Single source of truth for context types
- Type-safe context object creation
- Consistent structure across all context kinds
- Ready for DB serialization

---

### 2. Org Workspace Context Data Shape

**File:** `src/lib/context/org/types.ts`

**Purpose:** Defines structured data shape for workspace-level org context

**Exports:**

1. **`OrgWorkspaceContextData`** – Structured data interface
   ```typescript
   export interface OrgWorkspaceContextData {
     workspace: {
       id: string;
       name: string;
       slug: string;
       description?: string | null;
     };
     orgStructure: {
       departmentsCount: number;
       teamsCount: number;
       positionsCount: number;
       filledPositionsCount: number;
       peopleCount: number;
     };
     quickFacts: {
       hasOrgChart: boolean;
       hasDepartments: boolean;
       hasTeams: boolean;
       hasPositions: boolean;
     };
     meta?: Record<string, unknown>;
   }
   ```

2. **`OrgWorkspaceContextObject`** – Concrete ContextObject type
   ```typescript
   export type OrgWorkspaceContextObject = BaseContextObject<OrgWorkspaceContextData>;
   ```

**Structure:**
- **workspace:** Basic workspace information
- **orgStructure:** High-level metrics (counts)
- **quickFacts:** Boolean flags for quick reasoning
- **meta:** Free-form metadata for future expansion

---

### 3. Org Workspace Context Builder

**File:** `src/lib/context/org/buildOrgWorkspaceContext.ts`

**Purpose:** Pure builder function for creating Org Workspace context objects

**Exports:**

1. **`OrgWorkspaceContextInput`** – Input interface
   ```typescript
   export interface OrgWorkspaceContextInput {
     workspaceId: string;
     workspaceName: string;
     workspaceSlug: string;
     workspaceDescription?: string | null;
     departmentsCount?: number;
     teamsCount?: number;
     positionsCount?: number;
     filledPositionsCount?: number;
     peopleCount?: number;
   }
   ```

2. **`buildOrgWorkspaceContext(input)`** – Builder function
   - Pure function (no DB access)
   - Takes input values and builds `OrgWorkspaceContextObject`
   - Computes `quickFacts` from counts
   - Sets defaults for optional fields
   - Generates title and summary

**Logic:**
- Defaults all counts to 0 if not provided
- Computes `hasOrgChart` if any org structure exists
- Sets individual flags based on counts
- Creates descriptive title: `${workspaceName} – Org Overview`

---

## Type System Architecture

### Base Types:
```
BaseContextObject<TData>
  ├── contextId: string
  ├── workspaceId: string
  ├── type: ContextType
  ├── title: string
  ├── summary?: string | null
  ├── data: TData
  └── capturedAt: string
```

### Org Workspace Types:
```
OrgWorkspaceContextObject
  ├── BaseContextObject<OrgWorkspaceContextData>
  └── data: OrgWorkspaceContextData
      ├── workspace: { id, name, slug, description }
      ├── orgStructure: { counts... }
      ├── quickFacts: { flags... }
      └── meta: Record<string, unknown>
```

---

## Files Created

### New Files:
1. ✅ `src/lib/context/types.ts`
   - Core ContextObject types
   - ContextType enumeration
   - makeContextObject helper

2. ✅ `src/lib/context/org/types.ts`
   - Org Workspace context data shape
   - Type definitions

3. ✅ `src/lib/context/org/buildOrgWorkspaceContext.ts`
   - Builder function
   - Input interface
   - Pure construction logic

---

## Usage Example

```typescript
import { buildOrgWorkspaceContext } from "@/lib/context/org/buildOrgWorkspaceContext";

const ctx = buildOrgWorkspaceContext({
  workspaceId: "ws_123",
  workspaceName: "Loopwell",
  workspaceSlug: "loopwell",
  departmentsCount: 3,
  teamsCount: 7,
  positionsCount: 20,
  filledPositionsCount: 15,
  peopleCount: 18,
});

console.log(JSON.stringify(ctx, null, 2));
```

**Output:**
```json
{
  "contextId": "ws_123",
  "workspaceId": "ws_123",
  "type": "workspace",
  "title": "Loopwell – Org Overview",
  "summary": "Workspace-level org context snapshot for Loopbrain.",
  "data": {
    "workspace": {
      "id": "ws_123",
      "name": "Loopwell",
      "slug": "loopwell",
      "description": null
    },
    "orgStructure": {
      "departmentsCount": 3,
      "teamsCount": 7,
      "positionsCount": 20,
      "filledPositionsCount": 15,
      "peopleCount": 18
    },
    "quickFacts": {
      "hasOrgChart": true,
      "hasDepartments": true,
      "hasTeams": true,
      "hasPositions": true
    },
    "meta": {}
  },
  "capturedAt": "2024-12-15T14:30:22.000Z"
}
```

---

## Benefits

### For Development:
- **Type Safety:** Strong TypeScript types prevent errors
- **Consistency:** Single source of truth for context structure
- **Extensibility:** Easy to add new context types
- **Testability:** Pure functions are easy to test

### For Future Steps:
- **DB Persistence:** Ready to serialize to ContextItem table
- **Loopbrain Integration:** Structured data ready for AI processing
- **Context Store:** Foundation for context management system
- **Query Routing:** ContextType enables smart routing

---

## Next Steps

**L5 Step 2:** Create Context Store writer
- Implement function to persist `BaseContextObject` to `ContextItem` table
- Handle JSON serialization of `data` field
- Add error handling and validation

**L5 Step 3:** Create Org Workspace context loader
- Fetch workspace data from Prisma
- Count org entities (departments, teams, positions, people)
- Build context object using `buildOrgWorkspaceContext`

---

## Notes

- All types are in-memory representations (no DB access yet)
- Builder functions are pure (no side effects)
- `capturedAt` defaults to current timestamp
- `quickFacts` computed from counts automatically
- Foundation ready for persistence layer
- Compatible with existing Loopbrain context system

---

## Testing Checklist

- ✅ Types compile without errors
- ✅ Builder function creates valid objects
- ✅ Default values work correctly
- ✅ quickFacts computed correctly
- ✅ Type inference works
- ✅ JSON serialization works
- ✅ No circular dependencies
- ✅ Imports resolve correctly

