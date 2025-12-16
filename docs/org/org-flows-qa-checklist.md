# Org Flows – API + UX QA Checklist

This checklist is for validating Org flows end-to-end after changes to membership, invites, activity, exports, and danger zone. Run through it on a local dev environment using the API Debug Overlay.

## 1. Create organization

- [ ] From "New org" flow, create a new organization with a custom name.
  - Expected: Redirect to the new org dashboard.
  - Expected: Org appears in org switcher (if applicable).

- [ ] Attempt to create an org with an empty name.
  - Expected: Org is created with a sensible fallback name (e.g. "Untitled organization") and no errors.

- [ ] In API debug overlay:
  - [ ] Confirm a single `OrgCreate` call with 201 status and reasonable duration.

## 2. Invitations

- [ ] Invite a new email address from Members → Invitations.
  - Expected: Invitation appears in active invites list with "Pending" status.
  - Expected: "Invitation sent" toast with the correct email.

- [ ] Try inviting the same email again.
  - Expected: User sees a clear error ("pending invitation already exists"), surfaced via toast.
  - Expected: No duplicate invite row is created.

- [ ] Try inviting your own email.
  - Expected: Clear error ("You cannot invite yourself."), no new invite row.

- [ ] Cancel an existing "Pending" invite.
  - Expected: Status moves to history (or disappears from active list depending on UI).
  - Expected: "Invitation cancelled" toast.

- [ ] In API debug overlay:
  - [ ] Confirm `OrgInviteCreate` and `OrgInviteCancel` calls use correct URLs and return appropriate statuses.
  - [ ] Use label filter to verify only invite-related calls.

## 3. Members and roles

- [ ] Promote a member from Member → Admin.
  - Expected: Role badge updates quickly.
  - Expected: "Role updated" toast and activity entry.

- [ ] Demote an Admin to Member (when there is >1 Admin).
  - Expected: Role change succeeds, activity entry is added.

- [ ] Attempt to demote the last remaining Admin.
  - Expected: Clear error ("You must keep at least one admin…").
  - Expected: Role select snaps back to previous value.

- [ ] Remove a member:
  - Expected: Confirmation dialog appears.
  - Expected: On confirm, member disappears from the list, and removal is reflected in activity.

- [ ] In API debug overlay:
  - [ ] Filter by `OrgMemberUpdateRole` and `OrgMemberRemove` labels.
  - [ ] Confirm success/error statuses align with behavior above.

## 4. Leave organization

- [ ] As a non-owner, non-last-admin member, click "Leave organization".
  - Expected: Confirmation dialog with correct org name.
  - Expected: After leaving, user is redirected away from the org (e.g. orgs list).

- [ ] Attempt to leave as the last Admin.
  - Expected: Clear error message instructing user to assign another admin first.
  - Expected: Membership remains intact.

- [ ] In API debug overlay:
  - [ ] Filter by `OrgLeave` label.
  - [ ] Confirm the failed leave attempt is recorded as an error.

## 5. Activity and exports

- [ ] On Members page, scroll to "Organization activity" preview.
  - Expected: Recent org events, with human-readable descriptions (create, invite, remove, role change, ownership transfer).

- [ ] Use the filters:
  - [ ] "Membership" + "Last 7 days" should show member-related events if present.
  - [ ] "Org lifecycle" should show created/deleted events (where applicable).

- [ ] Navigate to Settings → Activity view:
  - Expected: Full-width activity feed with filters and export buttons.

- [ ] Export CSV and JSON:
  - Expected: Download starts (no error page).
  - Expected: Export respects the selected filters (type + timeframe).

- [ ] Hit export multiple times quickly:
  - Expected: Rate-limiting kicks in with a clear error when limits are exceeded.

- [ ] In API debug overlay:
  - [ ] Verify `/api/org/activity` calls when changing filters or loading more.
  - [ ] Verify export calls are visible in the Network tab (overlay won't show them because they are file responses, but errors will appear).

## 6. Danger zone (ownership + delete)

- [ ] Transfer ownership to another member:
  - Expected: Only owner sees controls enabled.
  - Expected: After transfer, new owner is reflected in org settings/metadata.
  - Expected: Activity log shows an ownership transfer event.

- [ ] As non-owner, confirm:
  - [ ] Buttons are disabled, and helper text explains owner-only actions.

- [ ] Attempt to delete the org:
  - Expected: Multi-step confirmation ("DELETE" typed exactly).
  - Expected: On success, org disappears from org switcher and direct access fails.

- [ ] In API debug overlay:
  - [ ] Filter by `OrgOwnershipTransfer` and `OrgDelete`.
  - [ ] Confirm a failed delete (e.g., by cancelling typed text) does not issue a request, while a successful one logs a 200.

## 7. Error envelope sanity checks

- [ ] For at least one endpoint in each category (invite, member, ownership, org update):
  - Intentionally trigger:
    - [ ] Validation error (missing/invalid input).
    - [ ] Permission error (non-admin actions).
  - Confirm:
    - [ ] User-facing error messages are clear and consistent.
    - [ ] API responses follow `{ ok: false, error: { code, message } }`.

- [ ] In DevTools Network tab:
  - [ ] Spot-check responses: codes and messages match what UI shows.

## 8. Performance & perceived responsiveness

- [ ] Confirm spinners/loading states appear correctly for:
  - [ ] Invite submission.
  - [ ] Role change (no duplicate requests).
  - [ ] Ownership transfer.
  - [ ] Delete org.

- [ ] Verify there are no obvious double-submits when quickly clicking buttons twice.

## 9. Regression checks

- [ ] Org switcher still works correctly after all flows.
- [ ] Profile / non-Org API calls still work and show up in overlay (as a sanity check for shared infra).
- [ ] No console errors or noisy warnings in typical Org workflows.

---

## Open issues / follow-ups

_Add any issues discovered during QA here, with format:_

- [ ] **Issue title**
  - Category: API / UX / Performance
  - Suggested milestone: L9 / L10 / etc.
  - Description: Brief details

---

# NOTES

- This step is intentionally documentation/QA-only; no code paths are modified.

- You can run this checklist at the end of any future Org-related milestone to validate that the standardized API + `useApiAction` + orgApi + overlay stack is still behaving as expected.

- If you find issues while running the checklist, add them directly under a new section in this doc, for example:
  - "Open issues / follow-ups", with short bullets including:
    - [ ] Short title
    - [ ] Category (API, UX, Performance)
    - [ ] Suggested milestone (e.g., L9, L10)

