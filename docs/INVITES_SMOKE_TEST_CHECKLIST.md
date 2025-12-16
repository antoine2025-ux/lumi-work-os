# Workspace Invites Smoke Test Checklist

## Purpose

This checklist provides a repeatable manual smoke test for workspace invites functionality before production deployment. It focuses on link generation and acceptance flow without requiring email provider integration.

**Use this checklist**: Before each production deploy to verify invites work end-to-end.

---

## A. Environment Preparation

### A1. Verify Environment Variables

- [ ] **`NEXT_PUBLIC_APP_URL`** is set correctly:
  - Dev: `http://localhost:3000` (or your dev port)
  - Staging: `https://staging.yourdomain.com`
  - Production: `https://yourdomain.com`
  
- [ ] **`PRISMA_WORKSPACE_SCOPING_ENABLED`** state is known:
  - Current value: `true` / `false`
  - Note: This affects Prisma client behavior but shouldn't impact invites (WorkspaceInvite is not scoped)

### A2. Verify Database Migrations

- [ ] Run: `npx prisma migrate deploy` (or equivalent for your environment)
- [ ] Confirm: No migration errors
- [ ] Verify: `workspace_invites` table exists:
  ```bash
  npx prisma db execute --stdin <<< "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'workspace_invites')"
  ```

### A3. Verify Test Workspace Access

- [ ] You have access to at least one workspace where you are **OWNER** or **ADMIN**
- [ ] Note the workspace slug: `_________________` (fill in for reference)
- [ ] Verify you can access: `/w/[workspaceSlug]/settings?tab=members`

---

## B. Generate and Use an Invite Link (OWNER/ADMIN User)

### B1. Login as OWNER/ADMIN

- [ ] Log in as a user who is **OWNER** or **ADMIN** of a workspace
- [ ] User email: `_________________` (fill in for reference)

### B2. Navigate to Members Tab

- [ ] Go to: `/w/[workspaceSlug]/settings?tab=members`
  - Replace `[workspaceSlug]` with your actual workspace slug
  - Example: `/w/my-workspace/settings?tab=members`
- [ ] Confirm: "Pending Invites" section is visible
- [ ] Confirm: "Invite Member" button/form is visible

### B3. Create an Invite

- [ ] Click "Invite Member" (or equivalent button)
- [ ] Enter email: `test+invitesmoke@example.com` (or your test email)
- [ ] Select role: **MEMBER** (or choose another role for testing)
- [ ] Click "Invite" (or "Send Invite")

### B4. Verify Invite Creation

- [ ] **No error toast** appears
- [ ] **Success toast** appears: "Invite created for [email]"
- [ ] **Invite appears** in "Pending Invites" table
- [ ] Invite entry shows:
  - [ ] Email address
  - [ ] Role
  - [ ] "Copy Link" button or visible token/link
  - [ ] Expiry date (should be ~7 days from now)

### B5. Copy Invite Link

- [ ] Click "Copy Link" button (or copy the invite URL manually)
- [ ] Verify link format: `[APP_URL]/invites/[TOKEN]`
  - Example: `http://localhost:3000/invites/abc123def456...`
- [ ] **Save this link** for the next section: `_________________`

**Alternative: Use Dev Helper Script**

If you prefer to generate invite links via CLI:

```bash
WORKSPACE_SLUG="your-workspace-slug" \
TEST_EMAIL="test+cli@example.com" \
npm run smoke:invites:dev
```

This prints an invite URL you can use directly.

---

## C. Accept Invite with a Second User

### C1. Open Different Browser Session

- [ ] Open a **different browser profile** or **incognito/private window**
- [ ] This simulates a different user accepting the invite

### C2. Navigate to Invite URL

- [ ] Paste the invite URL from section B5 into the address bar
- [ ] URL format: `[APP_URL]/invites/[TOKEN]`
- [ ] Press Enter to navigate

### C3. Handle Authentication

**If NOT logged in:**
- [ ] You should see: "You need to be logged in to accept this invitation"
- [ ] Click "Go to Login" (or navigate to `/login`)
- [ ] **Sign up or log in** as a user with the **same email** as the invite
  - Example: If invite was sent to `test+invitesmoke@example.com`, log in with that email
- [ ] After login, you should be redirected back to the invite page

**If already logged in:**
- [ ] Verify the logged-in email matches the invite email (case-insensitive)
- [ ] If email doesn't match, log out and log in with the correct email

### C4. Accept the Invite

- [ ] Click "Accept Invite" button
- [ ] Wait for processing (should take 1-2 seconds)
- [ ] Confirm: Success message appears: "Invite accepted successfully!"

### C5. Verify Workspace Access

- [ ] **Automatic redirect** occurs to the workspace
- [ ] You land at: `/home` or `/w/[workspaceSlug]` (or similar workspace dashboard)
- [ ] **WorkspaceSwitcher** in header shows the new workspace
- [ ] **Your role** matches the invite role:
  - Check: Settings → Members tab
  - Your email should appear in the members list with the correct role

### C6. Verify Membership Persistence

- [ ] **Refresh the page** → workspace access persists
- [ ] **Log out and log back in** → workspace still appears in WorkspaceSwitcher
- [ ] **Switch to another workspace** (if you have multiple) → can switch back to the new workspace

---

## D. Negative / Edge Cases

### D1. Expired Invite

- [ ] **Manually expire an invite** (via database or wait 7+ days):
  ```sql
  UPDATE workspace_invites 
  SET expiresAt = NOW() - INTERVAL '1 day' 
  WHERE email = 'test+expired@example.com';
  ```
- [ ] Navigate to the expired invite URL
- [ ] Expected: Error message "This invite has expired" (410 status)
- [ ] **Result**: `PASS` / `FAIL`

### D2. Revoked Invite

- [ ] Create a new invite (follow section B)
- [ ] **Revoke the invite** via UI (click "Revoke" button in Pending Invites)
- [ ] Copy the invite link before it disappears
- [ ] Navigate to the revoked invite URL (in different browser)
- [ ] Expected: Error message "This invite has been revoked" (410 status)
- [ ] **Result**: `PASS` / `FAIL`

### D3. Email Mismatch

- [ ] Create an invite for: `test+wrongemail@example.com`
- [ ] Copy the invite link
- [ ] In different browser, **log in with a different email** (e.g., `other@example.com`)
- [ ] Navigate to the invite URL
- [ ] Expected: Error message "This invite was sent to a different email address" (403 status)
- [ ] **Result**: `PASS` / `FAIL`

### D4. Non-Admin Attempts to Invite

- [ ] **Log in as MEMBER or VIEWER** (not OWNER/ADMIN)
- [ ] Navigate to: `/w/[workspaceSlug]/settings?tab=members`
- [ ] Expected: "Invite Member" button/form is **NOT visible**
- [ ] If you try to access the API directly:
  ```bash
  curl -X POST http://localhost:3000/api/workspaces/[workspaceId]/invites \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","role":"MEMBER"}' \
    --cookie "your-session-cookie"
  ```
- [ ] Expected: 403 Forbidden response
- [ ] **Result**: `PASS` / `FAIL`

### D5. Already Accepted Invite

- [ ] Create and accept an invite (follow sections B and C)
- [ ] Try to accept the **same invite again** (use the same URL)
- [ ] Expected: Error message "This invite has already been accepted" (409 status)
- [ ] **Result**: `PASS` / `FAIL`

### D6. Duplicate Invite (Same Email)

- [ ] Create an invite for: `test+duplicate@example.com`
- [ ] **Create another invite** for the same email (before accepting the first)
- [ ] Expected: First invite is automatically revoked, new invite is created
- [ ] Verify: Only one pending invite exists for that email
- [ ] **Result**: `PASS` / `FAIL`

---

## E. Quick Pre-Deploy Checklist

Before deploying to production, run this condensed version:

- [ ] **Environment**: `NEXT_PUBLIC_APP_URL` set correctly
- [ ] **Migrations**: Applied successfully
- [ ] **Create invite**: As OWNER/ADMIN → Success
- [ ] **Accept invite**: Different user → Success
- [ ] **Verify access**: User can access workspace
- [ ] **Verify role**: Role matches invite
- [ ] **Edge cases**: At least test expired + revoked invites

**Time estimate**: 5-10 minutes

---

## Troubleshooting

### Issue: "Invite not found" (404)

**Possible causes**:
- Token is incorrect or malformed
- Invite was deleted from database
- Database connection issue

**Fix**: Verify token matches database, check database connection

### Issue: "This invite was sent to a different email address" (403)

**Possible causes**:
- Logged-in user email doesn't match invite email
- Email case mismatch (should be handled, but verify)

**Fix**: Log in with the exact email address the invite was sent to

### Issue: "This invite has expired" (410)

**Possible causes**:
- Invite is older than 7 days
- System clock is incorrect
- `expiresAt` was manually set in the past

**Fix**: Create a new invite

### Issue: Invite doesn't appear in Pending Invites

**Possible causes**:
- Invite was revoked
- Invite was already accepted
- Invite expired
- Workspace ID mismatch

**Fix**: Check database directly or create a new invite

---

## Related Documentation

- `docs/WORKSPACE_INVITES_VERIFICATION.md` - Full implementation verification
- `docs/MULTI_TENANT_ROLLOUT_CHECKLIST.md` - Production rollout procedures
- `docs/MULTI_TENANT_INVITES.md` - Invites architecture documentation
