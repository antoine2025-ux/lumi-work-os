# Loopbrain Org Data Visibility Fix

## Problem
Loopbrain claimed "no org data exists" even though:
- Database had org positions, teams, departments ✅  
- ContextItems were synced ✅
- Data was loaded into context bundles ✅

BUT the LLM couldn't answer questions like "Who is the CEO?"

## Root Cause (Traced via Logging)

Added extensive console.log statements to trace data flow:

1. **orgContextForLoopbrain.ts** - ContextItems retrieved: ✅ 8-10 items
2. **orchestrator.ts** - orgPromptContext built: ✅ people:2, teams:1, roles:2-4
3. **buildOrgContextText()** - Prompt text generated: ❌ **ONLY SHOWING GENERIC SUMMARIES**

```typescript
// What was being sent to LLM:
### PEOPLE (2 total, showing 2)
- Antoine Morlet – Person Context | Person-level role, relationships, and workload context snapshot for Loopbrain.

// LLM couldn't see the actual data like:
// - role: CEO
// - reports_to: Antoine Morlet  
// - team_id: cmlhsytnx0025pfnd7ti4cju0
```

## The Exact Problem

`buildOrgContextText()` was ONLY using:
- `person.title` → "Antoine Morlet – Person Context"
- `person.summary` → Generic boilerplate text

But the ACTUAL DATA was in:
- `person.tags[]` → `["person", "role:CEO", "team_id:...", "reports_to:..."]`

These tags were **NEVER INCLUDED IN THE PROMPT**!

## Fixes

### Fix 1: Include Tags in Prompt Context

**File:** `src/lib/loopbrain/orgPromptContextBuilder.ts`

```typescript
// BEFORE (tags ignored):
for (const person of peopleSlice) {
  const summary = person.summary ? person.summary.substring(0, 100) : "No summary";
  lines.push(`- ${person.title} | ${summary}`);
}

// AFTER (tags included):
for (const person of peopleSlice) {
  const summary = person.summary ? person.summary.substring(0, 100) : "No summary";
  const tags = person.tags.length > 0 ? ` [${person.tags.join(", ")}]` : "";
  lines.push(`- ${person.title} | ${summary}${tags}`);
}
```

Applied to: PEOPLE, TEAMS, DEPARTMENTS, ROLES sections.

### Fix 2: Add Holder Information to Role Tags

**File:** `src/lib/context/org/buildRoleContext.ts`

```typescript
// BEFORE:
tags: [
  "role",
  `role_id:${roleId}`,
  `role_title:${title}`,
  isVacant ? "vacant:true" : "vacant:false",
  // ... no holder info
]

// AFTER:
tags: [
  "role",
  `role_id:${roleId}`,
  `role_title:${title}`,
  isVacant ? "vacant:true" : "vacant:false",
  primaryHolderId ? `holder_id:${primaryHolderId}` : "holder:none",
  primaryHolderName ? `holder:${primaryHolderName}` : null,
  // ...
].filter(Boolean) as string[]
```

### Fix 3: Extract Owner from Tags

**File:** `src/lib/loopbrain/orgContextForLoopbrain.ts`

```typescript
// BEFORE:
const contextObj: ContextObject = {
  // ...
  owner: null,  // Always null!
};

// AFTER:
const tags = (item.data as any)?.tags ?? [];
const holderTag = tags.find((t: string) => t.startsWith("holder:") && t !== "holder:none");
const owner = holderTag ? holderTag.replace("holder:", "") : null;

const contextObj: ContextObject = {
  // ...
  owner,  // Extracted from tags!
};
```

Result: Roles now show "| Owner: Antoine Morlet |" instead of "| No owner |"

### Fix 4: Filter Out Duplicate RoleCard Templates

**File:** `src/lib/loopbrain/orgPromptContextBuilder.ts`

```typescript
// BEFORE:
const roles = related.filter((ctx) => ctx.type === "role");
// Included both OrgPosition roles AND generic RoleCard templates

// AFTER:
const roles = related.filter((ctx) => 
  ctx.type === "role" && !ctx.id.includes("role-card:")
);
// Only includes actual OrgPosition roles with real holders
```

### Fix 5: Add Manager/Reporting Tags to Person Context

**File:** `src/lib/context/org/buildPersonContext.ts`

```typescript
// BEFORE:
tags: [
  "person",
  `role:${positionTitle}`,
  `team_id:${teamId}`,
  // ... no manager info
]

// AFTER:
tags: [
  "person",
  `role:${positionTitle}`,
  `team_id:${teamId}`,
  managerId ? `manager_id:${managerId}` : null,
  managerName ? `reports_to:${managerName}` : null,
  directReportsCount > 0 ? `direct_reports:${directReportsCount}` : null,
  // ...
].filter(Boolean) as string[]
```

## Verification

### Before Fix:
```
### PEOPLE (2 total)
- Antoine Morlet – Person Context | Person-level role, relationships, and workload context snapshot for Loopbrain.
```

LLM Response: "I don't have enough Org data to answer this."

### After Fix:
```
### PEOPLE (2 total)
- Antoine Morlet – Person Context | Person-level role, relationships, and workload context snapshot for Loopbrain. [person, user_id:cmlfbxss100078obey4qzmkvo, active:true, role:CEO, team:unknown, department:unknown, direct_reports:1, projects:0, tasks_active:0, tasks_blocked:0]
- Antoine Morlet – Person Context | Person-level role, relationships, and workload context snapshot for Loopbrain. [person, user_id:cmlf307ki00008osygyhptm63, active:true, role:Product manager, team_id:cmlhsytnx0025pfnd7ti4cju0, department_id:cmlhsytns001xpfndhxu4282a, manager_id:cmlfbxss100078obey4qzmkvo, reports_to:Antoine Morlet, projects:1, tasks_active:0, tasks_blocked:0]

### ROLES (2 total)
- CEO – Role Context | Owner: Antoine Morlet | Role-level definition... [role, role_id:cmlhsytnn001vpfndlvw8t45h, active:true, role_title:CEO, holder:Antoine Morlet, ...]
- Product manager – Role Context | Owner: Antoine Morlet | Role-level definition... [role, role_id:cmlhszhfl002npfnd99qq2yla, active:true, role_title:Product manager, holder:Antoine Morlet, ...]
```

LLM Response: "The CEO of Loopwell is Antoine Morlet" ✅

## Impact

- Org context now includes **ALL structured data** from tags
- LLM can see: roles, teams, departments, managers, reports, workload
- Prompt length increased from ~1,559 to ~2,867 chars (manageable)
- No duplicate/conflicting role entries

## Testing

Run sync + test:
```bash
npx tsx scripts/diagnostic/run-org-sync.ts
npx tsx scripts/diagnostic/test-chat-with-logging.ts
npx tsx scripts/diagnostic/inspect-actual-prompt.ts
```
