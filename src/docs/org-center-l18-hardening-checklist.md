# Org Center – L18 Hardening & Pre-Launch Checklist

Use this checklist before:

- Internal beta
- Important demos
- Enabling Org Center for more users

---

## 1. Environment & flags

- [ ] `NEXT_PUBLIC_ORG_CENTER_ENABLED` is set correctly for this environment.
- [ ] `NEXT_PUBLIC_ORG_CENTER_BETA` is set to "true" in environments where Org Center should show a beta badge.
- [ ] `/api/org/health` returns `ok: true` and context for a normal Owner/Admin.
- [ ] `/api/org/health` returns `ok: true` and `context: null` behaves calmly for non-members (no crash).

---

## 2. Critical flows (Owner)

As an **Owner**, verify:

- [ ] You can open all core pages via `/org/dev-smoke`:
  - Overview, People, Structure, Org chart, Insights, Activity, Settings.
- [ ] No error boundaries are triggered in normal usage.
- [ ] Org Overview, Insights strip, and /org/insights charts load without errors.
- [ ] Members page:
  - Shows base role + custom role.
  - "View permissions" opens inspector.
  - Custom role assignment works and updates Activity.
- [ ] Activity page:
  - Shows custom-role events with human-readable text.
  - Shows other admin events as expected.

---

## 3. Critical flows (Admin)

As an **Admin**, verify:

- [ ] You see Org sidebar and can access all relevant Org pages (except Owner-only actions if configured).
- [ ] Insights is accessible (if `org:insights:view` is enabled for Admin).
- [ ] You cannot see Owner-only Danger Zone actions.
- [ ] Custom role assignment:
  - Either available (if Admin has `org:member:role.change`) or clearly explained as restricted.

---

## 4. Critical flows (Member)

As a **Member**, verify:

- [ ] `/org` routes:
  - Show allowed content (e.g., overview, people) if permitted.
  - Show consistent "You don't have access to this Org Center. Ask an owner or admin to grant you access, or switch organizations." when blocked.
- [ ] Sidebar:
  - Does not show Insights or Settings if not allowed.
- [ ] Members page:
  - Does not expose custom-role assignment controls if Member.
  - Shows a clear explanation if any action is restricted.
- [ ] `/api/org/insights`, `/api/org/custom-roles` return 403.

---

## 5. Error handling & resilience

- [ ] Intentionally throwing an error in one Org page triggers the **OrgError** boundary with a clear message and "Try again" button.
- [ ] Refreshing after an error restores the page.
- [ ] Logs capture the error stack (check console/logs in dev/staging).

---

## 6. Performance sanity

- [ ] Navigating between main Org pages feels snappy (no obvious jank).
- [ ] Insights page:
  - Skeleton appears on first load.
  - Charts render within a reasonable time.
- [ ] Org Overview:
  - Renders metrics and strip without obvious delay.
- [ ] Org sidebar and header:
  - No double headers.
  - No layout jumping during route changes.

---

## 7. Visual & copy review

- [ ] "Org Center" label consistent in sidebar and headers.
- [ ] "Beta" badge appears only when expected.
- [ ] "You don't have access to this Org Center. Ask an owner or admin to grant you access, or switch organizations." copy is consistent across pages.
- [ ] Role pills (system + custom) look clean and non-cluttered.

---

## 8. Sign-off

Before enabling Org Center more broadly:

- [ ] Owner flows signed off.
- [ ] Admin flows signed off.
- [ ] Member flows signed off.
- [ ] Non-member behavior verified.
- [ ] Error boundary behavior verified.
- [ ] Flags and healthcheck documented.

Signed by: _____________________  
Date: __________________________

---

# NOTES

- L18 is a **stability & confidence** milestone:
  - No heavy new features.
  - Focus on feature flags, error handling, health checks, and QA docs.
- With these pieces, Org Center is:
  - Easier to deploy gradually.
  - Easier to debug when something breaks.
  - Easier to verify quickly before demos.

---

# NEXT RECOMMENDED STEP

Next recommended step: **Milestone L19 – Org Center External Readiness**, focusing on:

- Documentation for end users (help center-style).
- Final terminology + copy review.
- Onboarding flows (first-run experience) for new orgs entering Org Center.

