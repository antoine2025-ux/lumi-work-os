# Workspace Invites 500 Error - Root Cause Analysis & Fix

## Problem Statement
Users were experiencing 500 Internal Server Error when creating workspace invites from the Members tab. The error was generic and didn't reveal the actual cause.

## Root Cause Analysis

### 1. POST Handler Flow Analysis

**File**: `src/app/api/workspaces/[workspaceId]/invites/route.ts`

**Step-by-step flow:**
1. Gets `workspaceId` from `await params` (line 31)
2. Calls `getUnifiedAuth(request)` (line 32) - can throw "Unauthorized" errors
3. Checks workspaceId match (line 35) - returns 403 if mismatch ✓
4. Calls `assertAccess()` (line 43) - throws `Error("Forbidden: ...")` if no access
5. Validates email and role (lines 57-84) - returns 400 for validation errors ✓
6. Checks user role and existing members (lines 87-125)
7. Checks existing invites (line 130)
8. Creates invite with `prismaUnscoped.workspaceInvite.create()` (line 218)

### 2. Error Handling Issues Identified

**Problem**: Auth/authorization errors were being caught and returned as 500 instead of proper HTTP status codes:

1. **`getUnifiedAuth` throws**: 
   - Throws `Error("Unauthorized: No session found...")` 
   - Should return **401 Unauthorized**, not 500

2. **`assertAccess` throws**:
   - Throws `Error("Forbidden: User not member of workspace")`
   - Throws `Error("Forbidden: Insufficient permissions")`
   - Should return **403 Forbidden**, not 500

3. **Generic catch block**:
   - All errors (auth, access, database) were caught and returned as 500
   - No distinction between client errors (401/403) and server errors (500)

### 3. Prisma Schema Verification

**Model**: `WorkspaceInvite` in `prisma/schema.prisma`

**Fields match correctly:**
- ✅ `workspaceId` (String)
- ✅ `email` (String @db.VarChar(255))
- ✅ `role` (WorkspaceRole enum: OWNER, ADMIN, MEMBER, VIEWER)
- ✅ `token` (String @unique)
- ✅ `expiresAt` (DateTime)
- ✅ `createdByUserId` (String)
- ✅ Table mapping: `@@map("workspace_invites")`

**Prisma client accessor**: `prismaUnscoped.workspaceInvite` ✅

**No schema mismatches found.**

## The Fix

### Changes Made

1. **Separate auth error handling** (lines 33-50):
   - Wrapped `getUnifiedAuth` in try/catch
   - Returns 401 for unauthorized errors
   - Re-throws other errors to be handled as 500

2. **Separate access error handling** (lines 52-68):
   - Wrapped `assertAccess` in try/catch
   - Returns 403 for forbidden/insufficient permissions errors
   - Re-throws other errors to be handled as 500

3. **Improved error response in development** (lines 254-280):
   - Returns actual error message in development
   - Includes error name and stack trace (first 10 lines)
   - Returns generic message in production

4. **Enhanced frontend error logging** (`src/components/settings/workspace-members.tsx`):
   - Always logs detailed error information (status, statusText, data)
   - Makes debugging easier in browser console

## Root Cause Summary

**The likely cause of the 500 was**: Auth/authorization errors (`getUnifiedAuth` throwing "Unauthorized" or `assertAccess` throwing "Forbidden") were being caught by the generic catch block and returned as 500 Internal Server Error instead of the appropriate 401/403 status codes.

**The fix**: Separated auth/authorization error handling from server errors, ensuring:
- Auth failures → 401 Unauthorized
- Access denied → 403 Forbidden  
- Server/database errors → 500 Internal Server Error (with detailed message in dev)

## Manual Verification Steps

### 1. Prerequisites
```bash
# Ensure Prisma client is up to date
npx prisma generate

# Restart dev server
npm run dev
```

### 2. Test Invite Creation

1. **Navigate to workspace settings**:
   - Go to `/w/[yourWorkspaceSlug]/settings?tab=members`
   - Or use the workspace switcher to navigate to a workspace

2. **Create an invite**:
   - Fill in an email address
   - Select a role (MEMBER, ADMIN, etc.)
   - Click "Invite Member"

3. **Expected behavior**:
   - ✅ **No 500 error** in network tab
   - ✅ **Invite appears** in "Pending Invites" list
   - ✅ **Success toast** appears
   - ✅ **Browser console** shows no errors

4. **If error occurs**:
   - Check **Network tab** → Response should show:
     - `401` for auth errors (with error message)
     - `403` for access denied (with error message)
     - `500` only for actual server errors (with detailed error in dev)
   - Check **Browser console** → Should show detailed error log:
     ```javascript
     {
       status: 401/403/500,
       statusText: "...",
       data: { error: "actual error message" }
     }
     ```
   - Check **Server console** → Should show detailed error logs with stack traces

### 3. Test Error Scenarios

1. **Unauthorized (401)**:
   - Logout and try to create invite
   - Should get 401 with "Unauthorized" message

2. **Forbidden (403)**:
   - Login as MEMBER (not OWNER/ADMIN)
   - Try to create invite
   - Should get 403 with "Forbidden" message

3. **Validation (400)**:
   - Try invalid email format
   - Should get 400 with validation error

4. **Server Error (500)**:
   - If database is down or schema mismatch
   - Should get 500 with detailed error in dev

## Files Modified

- `src/app/api/workspaces/[workspaceId]/invites/route.ts` - Separated auth/access error handling, improved dev error messages
- `src/components/settings/workspace-members.tsx` - Enhanced error logging in browser console

## Next Steps

If the 500 persists after these fixes:

1. **Check server console** for the actual error message
2. **Check browser console** for the detailed error log
3. **Check network tab** for the response status and body
4. **Share the exact error message** from the server console or network response

The enhanced error handling will now reveal the actual root cause instead of hiding it behind a generic 500.
