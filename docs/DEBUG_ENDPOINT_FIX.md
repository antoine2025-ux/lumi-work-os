# Debug Endpoint Crash Fix

## Problem

The debug endpoint `/api/debug/db` was crashing with:
```
TypeError: Cannot read properties of undefined (reading 'count')
at route.ts:68:71
```

**Root Cause:** `prismaUnscoped.space` was undefined because the Prisma client wasn't regenerated after adding the `Space` model to the schema.

---

## Solution

### 1. Added Safe Guard Function

Created a `safeCount()` helper that:
- Checks if the Prisma model exists before calling `count()`
- Returns `{ ok: false, reason }` if model is missing
- Returns `{ ok: true, value }` if count succeeds
- Prevents crashes and provides diagnostic info

**Implementation in `src/app/api/debug/db/route.ts`:**
```typescript
const safeCount = async (modelName: string): Promise<{ ok: boolean; value?: number; reason?: string }> => {
  const p = prismaUnscoped as any
  const model = p[modelName]
  
  if (!model) {
    return { 
      ok: false, 
      reason: `prisma.${modelName} is missing on Prisma Client. Run: npx prisma generate` 
    }
  }
  
  if (typeof model.count !== 'function') {
    return { 
      ok: false, 
      reason: `prisma.${modelName}.count is not a function. Prisma Client may be stale.` 
    }
  }
  
  try {
    const count = await model.count()
    return { ok: true, value: count }
  } catch (error: any) {
    return { 
      ok: false, 
      reason: `Error counting ${modelName}: ${error.message}` 
    }
  }
}
```

### 2. Updated Response Format

Changed from:
```json
{
  "dataVerification": {
    "projects": 2,
    "wikiPages": 3,
    "spaces": -1  // Error case
  }
}
```

To:
```json
{
  "dataVerification": {
    "projects": 2,
    "wikiPages": 3,
    "spaces": { "error": "prisma.space is missing on Prisma Client. Run: npx prisma generate" }
  }
}
```

### 3. Regenerated Prisma Client

```bash
npx prisma generate
```

Verified:
- ✅ `prisma.space` exists
- ✅ `prisma.space.count()` works
- ✅ All models accessible

### 4. Updated Print Script

Applied the same safe guard pattern to `scripts/print-db.ts` for consistency.

---

## Files Changed

1. **`src/app/api/debug/db/route.ts`**
   - Added `safeCount()` helper function
   - Updated data verification to use safe guards
   - Changed response format to show errors explicitly

2. **`scripts/print-db.ts`**
   - Added same `safeCount()` helper
   - Updated output to show errors clearly

3. **Prisma Client Regenerated**
   - Ran `npx prisma generate`
   - Verified `space` model is accessible

---

## Verification

✅ **All models accessible:**
```javascript
{ projects: 2, wikiPages: 3, spaces: 8 }
```

✅ **Print script works:**
```
Data Verification:
  Projects: 2
  WikiPages: 3
  Spaces: 8
```

✅ **Debug endpoint now returns JSON even if models are missing:**
- If model exists: returns count number
- If model missing: returns `{ error: "reason" }`
- Never crashes

---

## Why This Matters

**Before:** Debug endpoint crashed if Prisma client was stale, making it impossible to diagnose the actual database connection issue.

**After:** Debug endpoint always returns useful diagnostic info, even if Prisma client is out of sync with schema. This helps identify:
- Stale Prisma client (model missing)
- Wrong Prisma import/export
- Model naming mismatches
- Database connection issues

---

## Testing

Test the endpoint:
```bash
# Should return JSON (even if some models are missing)
curl http://localhost:3000/api/debug/db

# Should show all models if Prisma client is up to date
curl http://localhost:3000/api/debug/db | jq '.dataVerification'
```

Expected output (when Prisma client is regenerated):
```json
{
  "dataVerification": {
    "projects": 2,
    "wikiPages": 3,
    "spaces": 8
  }
}
```

Expected output (if Prisma client is stale):
```json
{
  "dataVerification": {
    "projects": 2,
    "wikiPages": 3,
    "spaces": {
      "error": "prisma.space is missing on Prisma Client. Run: npx prisma generate"
    }
  }
}
```

---

**Status:** ✅ Fixed - Debug endpoint never crashes, always returns diagnostic info
