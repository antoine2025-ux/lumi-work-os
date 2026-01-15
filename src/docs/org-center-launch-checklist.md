# Org Center – Launch Checklist

Run this checklist before enabling Org Center for real users.

---

## Environment & Flags

- [ ] `ORG_CENTER_ENABLED=true` in production.
- [ ] `ORG_CENTER_FORCE_DISABLED=false` (or unset).
- [ ] `ORG_CENTER_BETA=true` (optional for early rollout).
- [ ] Healthcheck `/api/org/health` returns `ok: true` and context.

---

## UX & Navigation

- [ ] Global Loopwell header visible across all Org pages.
- [ ] Sidebar highlights correct active page.
- [ ] No layout jumps on navigation.
- [ ] Announcement banner appears for beta users (if enabled).
- [ ] Announcement banner dismisses correctly.

---

## Features & Permissions

- [ ] People page loads list / empty state correctly.
- [ ] Structure tabs (Teams, Departments, Roles) load and switch smoothly.
- [ ] Org Chart loads with no errors.
- [ ] Insights accessible to Owner/Admin roles only.
- [ ] Permissions inspector works for each member.
- [ ] Custom roles assign/unassign successfully.
- [ ] Activity page shows recent events.
- [ ] Activity exports work (CSV/JSON).

---

## Error Handling

- [ ] OrgError boundary catches page errors gracefully.
- [ ] Force-disable mode works and shows fallback screen.
- [ ] No unhandled exceptions in console.
- [ ] API routes return proper error codes (403, 404, 500, 503).
- [ ] Monitoring logs structured events correctly.

---

## Activity & Auditing

- [ ] Role assignment events visible in Activity.
- [ ] Sign-ins / invites / structure changes show correctly.
- [ ] Payloads for custom roles readable and correct.
- [ ] Audit logs capture all sensitive mutations.

---

## Documentation

- [ ] Help panel links resolve (`/docs/org/*`).
- [ ] Public-facing docs complete and accurate.
- [ ] Diagnostics page accessible to Org Owners (`/org/diagnostics`).
- [ ] Launch checklist reviewed and signed off.

---

## Monitoring & Observability

- [ ] API monitoring logs structured events.
- [ ] Error tracking configured (Sentry/Logtail/etc).
- [ ] Healthcheck endpoint responds correctly.
- [ ] Force-disable flag tested and working.

---

## Final Sign-off

- [ ] Owner flows validated.
- [ ] Admin flows validated.
- [ ] Member flows validated.
- [ ] Non-member behavior validated.
- [ ] Monitoring active and logging structured events.
- [ ] Emergency disable procedure documented and tested.

---

## Post-Launch

- [ ] Monitor error rates for first 24 hours.
- [ ] Check diagnostics page for any org-specific issues.
- [ ] Review activity logs for unexpected patterns.
- [ ] Gather user feedback from beta users (if applicable).

---

## Emergency Procedures

If issues arise:

1. **Immediate disable**: Set `ORG_CENTER_FORCE_DISABLED=true` in environment.
2. **Check diagnostics**: Visit `/org/diagnostics` as Owner to see feature flags and context.
3. **Review logs**: Check structured logs for `org_api_hit` and `org_api_error` events.
4. **Healthcheck**: Verify `/api/org/health` endpoint status.

---

**Last updated**: L21 implementation
**Next review**: After first production deployment

