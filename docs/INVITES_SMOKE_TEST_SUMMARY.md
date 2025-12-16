# Workspace Invites Smoke Test - Summary

## Overview

This document summarizes the smoke test setup for workspace invites, designed for quick pre-deployment verification.

---

## Files Created

### 1. `docs/INVITES_SMOKE_TEST_CHECKLIST.md`

**Purpose**: Step-by-step manual smoke test checklist for workspace invites.

**Contents**:
- **Section A**: Environment preparation (env vars, migrations, workspace access)
- **Section B**: Generate and use invite link (as OWNER/ADMIN)
- **Section C**: Accept invite with second user (end-to-end flow)
- **Section D**: Negative/edge cases (expired, revoked, email mismatch, etc.)
- **Section E**: Quick pre-deploy checklist (condensed version)

**Key Features**:
- ✅ Explicit step-by-step instructions
- ✅ Can be handed to someone without prior knowledge
- ✅ References exact URLs and components
- ✅ Includes troubleshooting section
- ✅ Time estimate: 5-10 minutes for quick test

### 2. `scripts/dev-smoke-invite-link.ts`

**Purpose**: CLI helper to quickly generate invite links without using the UI.

**Usage**:
```bash
WORKSPACE_SLUG="my-workspace" \
TEST_EMAIL="test+cli@example.com" \
npm run smoke:invites:dev
```

**What it does**:
1. Resolves workspace by slug or ID
2. Finds an OWNER/ADMIN member
3. Creates a WorkspaceInvite record
4. Prints the full invite URL to stdout

**Features**:
- ✅ Uses `prismaUnscoped` (correct for non-scoped model)
- ✅ Handles duplicate invites (revokes old, creates new)
- ✅ Clean error messages
- ✅ No application behavior changes (dev helper only)

---

## Quick Start Guide

### For Manual Testing (Recommended)

1. **Follow the checklist**: Open `docs/INVITES_SMOKE_TEST_CHECKLIST.md`
2. **Section B**: Create invite via UI (`/w/[workspaceSlug]/settings?tab=members`)
3. **Section C**: Accept invite in different browser
4. **Verify**: User can access workspace with correct role

**Time**: ~5-10 minutes

### For Quick Link Generation

1. **Run helper script**:
   ```bash
   WORKSPACE_SLUG="your-workspace-slug" \
   TEST_EMAIL="test@example.com" \
   npm run smoke:invites:dev
   ```

2. **Copy the printed URL** and use it in Section C of the checklist

**Time**: ~30 seconds

---

## Pre-Deployment Steps

Before deploying to production, run this condensed checklist:

### 1. Environment Check (1 minute)
- [ ] `NEXT_PUBLIC_APP_URL` set correctly
- [ ] Migrations applied: `npx prisma migrate deploy`
- [ ] You have OWNER/ADMIN access to a workspace

### 2. Create Invite (2 minutes)
- [ ] Navigate to `/w/[workspaceSlug]/settings?tab=members`
- [ ] Create invite for test email
- [ ] Copy invite link

**OR** use helper script:
```bash
WORKSPACE_SLUG="your-workspace" TEST_EMAIL="test@example.com" npm run smoke:invites:dev
```

### 3. Accept Invite (2 minutes)
- [ ] Open invite URL in different browser/incognito
- [ ] Log in with matching email
- [ ] Accept invite
- [ ] Verify redirect to workspace

### 4. Verify Access (1 minute)
- [ ] User appears in workspace members list
- [ ] Role matches invite role
- [ ] Workspace appears in WorkspaceSwitcher

### 5. Edge Cases (Optional, 3 minutes)
- [ ] Test expired invite (should fail)
- [ ] Test revoked invite (should fail)
- [ ] Test email mismatch (should fail)

**Total time**: ~5-10 minutes for basic test, ~15 minutes with edge cases

---

## Integration with Rollout Docs

### Updated Files

1. **`docs/MULTI_TENANT_ROLLOUT_CHECKLIST.md`**
   - Added reference to invites smoke test in "Post-Deploy Checks"
   - Links to `docs/INVITES_SMOKE_TEST_CHECKLIST.md`

2. **`docs/WORKSPACE_INVITES_VERIFICATION.md`**
   - Added reference to smoke test checklist at top
   - Clarifies: verification doc = full implementation check, smoke test = pre-deploy quick test

3. **`package.json`**
   - Added script: `"smoke:invites:dev": "ts-node scripts/dev-smoke-invite-link.ts"`

---

## Key Points

### What This Does
- ✅ Provides repeatable smoke test procedure
- ✅ Quick verification before production deploy
- ✅ Helper script for fast link generation
- ✅ Clear documentation for team members

### What This Doesn't Do
- ❌ No email provider integration (manual link sharing only)
- ❌ No new UI features
- ❌ No changes to application behavior
- ❌ No automated tests (manual checklist only)

### Design Decisions

1. **Manual checklist** instead of automated tests:
   - Allows testing with real user accounts
   - Verifies UI/UX flow
   - Easy to run without test infrastructure

2. **Helper script** instead of UI-only:
   - Faster for repeated testing
   - Useful for CI/CD if needed later
   - Doesn't require browser interaction

3. **Minimal code changes**:
   - Only adds documentation and dev helper
   - No production code changes
   - Easy to maintain

---

## Troubleshooting

### Script fails: "Workspace not found"
- Verify `WORKSPACE_SLUG` matches an existing workspace slug
- Or use `WORKSPACE_ID` instead of `WORKSPACE_SLUG`

### Script fails: "No OWNER or ADMIN found"
- Ensure workspace has at least one OWNER or ADMIN member
- Check database: `SELECT * FROM workspace_members WHERE workspaceId = '...' AND role IN ('OWNER', 'ADMIN')`

### Invite link doesn't work
- Verify `NEXT_PUBLIC_APP_URL` matches your app URL
- Check token in database: `SELECT * FROM workspace_invites WHERE token = '...'`
- Ensure invite hasn't expired or been revoked

---

## Related Documentation

- `docs/INVITES_SMOKE_TEST_CHECKLIST.md` - Full smoke test procedure
- `docs/WORKSPACE_INVITES_VERIFICATION.md` - Complete implementation verification
- `docs/MULTI_TENANT_ROLLOUT_CHECKLIST.md` - Production rollout procedures
- `docs/MULTI_TENANT_INVITES.md` - Invites architecture documentation
