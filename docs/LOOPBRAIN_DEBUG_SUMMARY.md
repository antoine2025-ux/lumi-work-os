# Loopbrain Org Data Debugging Summary

## Task
Debug and fix critical issue where Loopbrain claimed no org data existed despite:
- Org chart showing data (CEO: Antoine Morlet)  
- Database having positions, teams, departments
- ContextItems table having synced data

## Debugging Approach (As Requested)

### Added Logging to Trace Data Flow

**1. `orgContextForLoopbrain.ts` (line ~38)**
```typescript
console.log("[DEBUG] ContextItems retrieved:", items.length, items.map(i => ({type: i.type, contextId: i.contextId})));
```

**2. `orchestrator.ts` (line ~625, ~655)**
```typescript
console.log("[DEBUG] Org mode detection:", { query, requestedMode, wantsOrg });
console.log("[DEBUG] orgPromptContext built:", { people: ..., teams: ..., roles: ... });
console.log("[DEBUG] hasOrgContext:", hasOrgContext);
```

**3. `orgPromptContextBuilder.ts` (line ~70, ~185)**
```typescript
console.log("[DEBUG] buildOrgContextText input context:", { org, people, teams, roles });
console.log("[DEBUG] buildOrgContextText output:", result.substring(0, 500));
```

### Test Command Used
```bash
npx tsx scripts/diagnostic/test-chat-with-logging.ts
```

## Exact Failure Point Found

### ✅ Data Loading Was Working
```
[DEBUG] ContextItems retrieved: 8-10 items
  - role: CEO, Product manager
  - person: Antoine Morlet (x2)
  - team: Executive Team
  - department: Executive
  - org: Loopwell

[DEBUG] orgPromptContext built: {
  people: 2,
  teams: 1,
  departments: 1,
  roles: 2-4
}

[DEBUG] hasOrgContext: true
```

### ❌ But LLM Couldn't See The Data

**Prompt Preview (BEFORE fix):**
```
### PEOPLE (2 total)
- Antoine Morlet – Person Context | Person-level role, relationships, and workload context snapshot for Loopbrain.
```

**LLM Response:** "I don't have enough Org data to answer this."

### Root Cause
The `buildOrgContextText()` function was ONLY showing:
- `title`: "Antoine Morlet – Person Context"
- `summary`: Generic boilerplate text

But the actual data (role, team, manager, etc.) was in **`tags[]`**, which was **NEVER INCLUDED IN THE PROMPT**!

Example tags that LLM couldn't see:
```typescript
tags: [
  "person",
  "role:CEO",
  "team_id:cmlhsytnx0025pfnd7ti4cju0",
  "reports_to:Antoine Morlet",
  "direct_reports:1",
  // ... etc
]
```

## Fixes Applied

### Fix 1: Include Tags in Prompt (5 files)
**Files Modified:**
- `src/lib/loopbrain/orgPromptContextBuilder.ts` (4 sections: people, teams, departments, roles)

**Change:**
```typescript
// Add tags to each entity's prompt line
const tags = entity.tags.length > 0 ? ` [${entity.tags.join(", ")}]` : "";
lines.push(`- ${entity.title} | ${entity.summary}${tags}`);
```

### Fix 2: Add Holder Info to Role Tags
**File:** `src/lib/context/org/buildRoleContext.ts`

**Change:**
```typescript
tags: [
  // ... existing tags
  primaryHolderId ? `holder_id:${primaryHolderId}` : "holder:none",
  primaryHolderName ? `holder:${primaryHolderName}` : null,
].filter(Boolean) as string[]
```

### Fix 3: Extract Owner from Tags
**File:** `src/lib/loopbrain/orgContextForLoopbrain.ts`

**Change:**
```typescript
const holderTag = tags.find((t: string) => t.startsWith("holder:") && t !== "holder:none");
const owner = holderTag ? holderTag.replace("holder:", "") : null;
// Set owner field instead of always null
```

### Fix 4: Filter Duplicate RoleCard Templates
**File:** `src/lib/loopbrain/orgPromptContextBuilder.ts`

**Change:**
```typescript
const roles = related.filter((ctx) => 
  ctx.type === "role" && !ctx.id.includes("role-card:")
);
```

### Fix 5: Add Manager/Reporting Tags
**File:** `src/lib/context/org/buildPersonContext.ts`

**Change:**
```typescript
tags: [
  // ... existing tags
  managerId ? `manager_id:${managerId}` : null,
  managerName ? `reports_to:${managerName}` : null,
  directReportsCount > 0 ? `direct_reports:${directReportsCount}` : null,
].filter(Boolean) as string[]
```

## Verification

### After Fix - Prompt Preview:
```
### PEOPLE (2 total)
- Antoine Morlet – Person Context | ... [person, role:CEO, direct_reports:1, ...]
- Antoine Morlet – Person Context | ... [person, role:Product manager, reports_to:Antoine Morlet, ...]

### ROLES (2 total)
- CEO – Role Context | Owner: Antoine Morlet | ... [role, holder:Antoine Morlet, ...]
- Product manager – Role Context | Owner: Antoine Morlet | ... [role, holder:Antoine Morlet, ...]
```

### Test Results:
❓ **"Who is the CEO?"**
✅ **"The CEO of Loopwell is Antoine Morlet"**

## Files Changed Summary

1. `src/lib/loopbrain/orgContextForLoopbrain.ts` - Extract owner from tags
2. `src/lib/loopbrain/orgPromptContextBuilder.ts` - Include tags in prompts, filter duplicates
3. `src/lib/context/org/buildRoleContext.ts` - Add holder tags
4. `src/lib/context/org/buildPersonContext.ts` - Add manager/reporting tags

## Sync Required
After deploying these changes, run:
```bash
npx tsx scripts/diagnostic/run-org-sync.ts
```

This re-syncs org data with the new tag structure.

## Diagnostic Scripts Created

- `scripts/diagnostic/check-org-data.ts` - Check database vs ContextItem counts
- `scripts/diagnostic/run-org-sync.ts` - Run sync programmatically
- `scripts/diagnostic/test-chat-with-logging.ts` - Test LLM with debug logs
- `scripts/diagnostic/inspect-actual-prompt.ts` - Show exact prompt sent to LLM
- `scripts/diagnostic/test-single-question.ts` - Test one question in detail

## Key Lesson

**Data was loaded correctly at every step** ✅  
**BUT the LLM prompt excluded the actual data fields** ❌

The fix wasn't about loading more data — it was about **including the data we already had** in the prompt sent to the LLM.
