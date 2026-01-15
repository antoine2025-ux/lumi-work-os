# Org Current State Report (Phase 1 – Step 1.1)

Generated: 2025-12-27T15:20:35.805Z

## Executive Summary

- Files scanned: 471
- Org pages detected: 14
- Org API routes detected: 130
- Violations detected: 390
- Hardcode/placeholder signals: 57

## MVP Questions Coverage (Trimmed UI Intent)

Current MVP intent covers:
- Who is in the org?
- Where do they sit?
- Who owns what?
- Who reports to whom?

Missing from original core set (must be addressed for MVP-ready):
- Who is available / overloaded? (minimal, honest inputs + states)

## Org Pages Inventory

| Route | File | Data Source (heuristic) |
|------|------|--------------------------|
| /org | src/app/org/page.tsx | Unknown (needs manual review) |
| /org/activity | src/app/org/activity/page.tsx | Unknown (needs manual review) |
| /org/chart | src/app/org/chart/page.tsx | Unknown (needs manual review) |
| /org/chart/departments/[departmentId] | src/app/org/chart/departments/[departmentId]/page.tsx | Unknown (needs manual review) |
| /org/dev | src/app/org/dev/page.tsx | Unknown (needs manual review) |
| /org/dev-smoke | src/app/org/dev-smoke/page.tsx | API-backed (likely) |
| /org/dev/loopbrain-status | src/app/org/dev/loopbrain-status/page.tsx | Unknown (needs manual review) |
| /org/diagnostics | src/app/org/diagnostics/page.tsx | API-backed (likely) |
| /org/insights | src/app/org/insights/page.tsx | API-backed (likely) |
| /org/ownership | src/app/org/ownership/page.tsx | Unknown (needs manual review) |
| /org/people | src/app/org/people/page.tsx | Unknown (needs manual review) |
| /org/qa-visual | src/app/org/qa-visual/page.tsx | Unknown (needs manual review) |
| /org/settings | src/app/org/settings/page.tsx | Unknown (needs manual review) |
| /org/structure | src/app/org/structure/page.tsx | Unknown (needs manual review) |

## Org API Routes Inventory

| Route | File | Auth Pattern OK | workspaceId Intake OK | Missing Auth Pieces | Forbidden workspaceId Reads |
|------|------|------------------|------------------------|----------------------|----------------------------|
| /api/org/[orgId]/activity/admin | src/app/api/org/[orgId]/activity/admin/route.ts | No | Yes | Missing required: getUnifiedAuth(request); Missing required: assertAccess(...); Missing required: setWorkspaceContext(workspaceId) | - |
| /api/org/[orgId]/activity/export | src/app/api/org/[orgId]/activity/export/route.ts | No | Yes | Missing required: getUnifiedAuth(request); Missing required: assertAccess(...); Missing required: setWorkspaceContext(workspaceId) | - |
| /api/org/[orgId]/chart | src/app/api/org/[orgId]/chart/route.ts | No | Yes | Missing required: getUnifiedAuth(request); Missing required: assertAccess(...); Missing required: setWorkspaceContext(workspaceId) | - |
| /api/org/[orgId]/invites | src/app/api/org/[orgId]/invites/route.ts | No | Yes | Missing required: assertAccess(...); Missing required: setWorkspaceContext(workspaceId) | - |
| /api/org/[orgId]/overview | src/app/api/org/[orgId]/overview/route.ts | No | Yes | Missing required: getUnifiedAuth(request); Missing required: assertAccess(...); Missing required: setWorkspaceContext(workspaceId) | - |
| /api/org/[orgId]/people | src/app/api/org/[orgId]/people/route.ts | No | Yes | Missing required: getUnifiedAuth(request); Missing required: assertAccess(...); Missing required: setWorkspaceContext(workspaceId) | - |
| /api/org/[orgId]/structure | src/app/api/org/[orgId]/structure/route.ts | No | Yes | Missing required: getUnifiedAuth(request); Missing required: assertAccess(...); Missing required: setWorkspaceContext(workspaceId) | - |
| /api/org/[orgId]/structure/departments | src/app/api/org/[orgId]/structure/departments/route.ts | No | Yes | Missing required: getUnifiedAuth(request); Missing required: assertAccess(...); Missing required: setWorkspaceContext(workspaceId) | - |
| /api/org/[orgId]/structure/teams | src/app/api/org/[orgId]/structure/teams/route.ts | No | Yes | Missing required: getUnifiedAuth(request); Missing required: assertAccess(...); Missing required: setWorkspaceContext(workspaceId) | - |
| /api/org/activity | src/app/api/org/activity/route.ts | No | No | Missing required: getUnifiedAuth(request); Missing required: assertAccess(...); Missing required: setWorkspaceContext(workspaceId) | Forbidden: workspaceId read from searchParams |
| /api/org/activity/export | src/app/api/org/activity/export/route.ts | No | No | Missing required: getUnifiedAuth(request); Missing required: assertAccess(...); Missing required: setWorkspaceContext(workspaceId) | Forbidden: workspaceId read from searchParams |
| /api/org/audit | src/app/api/org/audit/route.ts | No | Yes | Missing required: getUnifiedAuth(request); Missing required: assertAccess(...); Missing required: setWorkspaceContext(workspaceId) | - |
| /api/org/contracts/snapshot-v1 | src/app/api/org/contracts/snapshot-v1/route.ts | No | Yes | Missing required: getUnifiedAuth(request); Missing required: assertAccess(...); Missing required: setWorkspaceContext(workspaceId) | - |
| /api/org/current | src/app/api/org/current/route.ts | No | Yes | Missing required: getUnifiedAuth(request); Missing required: assertAccess(...); Missing required: setWorkspaceContext(workspaceId) | - |
| /api/org/custom-roles | src/app/api/org/custom-roles/route.ts | No | Yes | Missing required: getUnifiedAuth(request); Missing required: assertAccess(...); Missing required: setWorkspaceContext(workspaceId) | - |
| /api/org/custom-roles/[roleId] | src/app/api/org/custom-roles/[roleId]/route.ts | No | Yes | Missing required: getUnifiedAuth(request); Missing required: assertAccess(...); Missing required: setWorkspaceContext(workspaceId) | - |
| /api/org/danger | src/app/api/org/danger/route.ts | No | Yes | Missing required: getUnifiedAuth(request); Missing required: assertAccess(...); Missing required: setWorkspaceContext(workspaceId) | - |
| /api/org/data-quality/adjust-allocation | src/app/api/org/data-quality/adjust-allocation/route.ts | No | Yes | Missing required: getUnifiedAuth(request); Missing required: assertAccess(...); Missing required: setWorkspaceContext(workspaceId) | - |
| /api/org/data-quality/refresh-availability | src/app/api/org/data-quality/refresh-availability/route.ts | No | Yes | Missing required: getUnifiedAuth(request); Missing required: assertAccess(...); Missing required: setWorkspaceContext(workspaceId) | - |
| /api/org/data-quality/resolve-manager-conflicts | src/app/api/org/data-quality/resolve-manager-conflicts/route.ts | No | Yes | Missing required: getUnifiedAuth(request); Missing required: assertAccess(...); Missing required: setWorkspaceContext(workspaceId) | - |
| /api/org/debug-permissions | src/app/api/org/debug-permissions/route.ts | No | Yes | Missing required: getUnifiedAuth(request); Missing required: assertAccess(...); Missing required: setWorkspaceContext(workspaceId) | - |
| /api/org/debug/full | src/app/api/org/debug/full/route.ts | No | Yes | Missing required: getUnifiedAuth(request); Missing required: assertAccess(...); Missing required: setWorkspaceContext(workspaceId) | - |
| /api/org/default-view | src/app/api/org/default-view/route.ts | No | Yes | Missing required: getUnifiedAuth(request); Missing required: assertAccess(...); Missing required: setWorkspaceContext(workspaceId) | - |
| /api/org/delete | src/app/api/org/delete/route.ts | No | Yes | Missing required: getUnifiedAuth(request); Missing required: assertAccess(...); Missing required: setWorkspaceContext(workspaceId) | - |
| /api/org/departments | src/app/api/org/departments/route.ts | No | Yes | Missing required: getUnifiedAuth(request); Missing required: assertAccess(...); Missing required: setWorkspaceContext(workspaceId) | - |
| /api/org/departments/[id] | src/app/api/org/departments/[id]/route.ts | No | Yes | Missing required: getUnifiedAuth(request); Missing required: assertAccess(...); Missing required: setWorkspaceContext(workspaceId) | - |
| /api/org/digest/config | src/app/api/org/digest/config/route.ts | No | Yes | Missing required: getUnifiedAuth(request); Missing required: assertAccess(...); Missing required: setWorkspaceContext(workspaceId) | - |
| /api/org/digest/preview | src/app/api/org/digest/preview/route.ts | No | Yes | Missing required: getUnifiedAuth(request); Missing required: assertAccess(...); Missing required: setWorkspaceContext(workspaceId) | - |
| /api/org/domains | src/app/api/org/domains/route.ts | No | Yes | Missing required: getUnifiedAuth(request); Missing required: assertAccess(...); Missing required: setWorkspaceContext(workspaceId) | - |
| /api/org/duplicates | src/app/api/org/duplicates/route.ts | No | Yes | Missing required: getUnifiedAuth(request); Missing required: assertAccess(...); Missing required: setWorkspaceContext(workspaceId) | - |
| /api/org/duplicates/dismiss | src/app/api/org/duplicates/dismiss/route.ts | No | Yes | Missing required: getUnifiedAuth(request); Missing required: assertAccess(...); Missing required: setWorkspaceContext(workspaceId) | - |
| /api/org/duplicates/merge | src/app/api/org/duplicates/merge/route.ts | No | Yes | Missing required: getUnifiedAuth(request); Missing required: assertAccess(...); Missing required: setWorkspaceContext(workspaceId) | - |
| /api/org/duplicates/sync | src/app/api/org/duplicates/sync/route.ts | No | Yes | Missing required: getUnifiedAuth(request); Missing required: assertAccess(...); Missing required: setWorkspaceContext(workspaceId) | - |
| /api/org/duplicates/undo | src/app/api/org/duplicates/undo/route.ts | No | Yes | Missing required: getUnifiedAuth(request); Missing required: assertAccess(...); Missing required: setWorkspaceContext(workspaceId) | - |
| /api/org/entities | src/app/api/org/entities/route.ts | No | Yes | Missing required: getUnifiedAuth(request); Missing required: assertAccess(...); Missing required: setWorkspaceContext(workspaceId) | - |
| /api/org/fix-events | src/app/api/org/fix-events/route.ts | No | Yes | Missing required: getUnifiedAuth(request); Missing required: assertAccess(...); Missing required: setWorkspaceContext(workspaceId) | - |
| /api/org/guidance | src/app/api/org/guidance/route.ts | No | Yes | Missing required: getUnifiedAuth(request); Missing required: assertAccess(...); Missing required: setWorkspaceContext(workspaceId) | - |
| /api/org/health | src/app/api/org/health/route.ts | No | Yes | Missing required: getUnifiedAuth(request); Missing required: assertAccess(...); Missing required: setWorkspaceContext(workspaceId) | - |
| /api/org/health/capacity | src/app/api/org/health/capacity/route.ts | No | Yes | Missing required: getUnifiedAuth(request); Missing required: assertAccess(...); Missing required: setWorkspaceContext(workspaceId) | - |
| /api/org/health/management-load | src/app/api/org/health/management-load/route.ts | No | Yes | Missing required: getUnifiedAuth(request); Missing required: assertAccess(...); Missing required: setWorkspaceContext(workspaceId) | - |
| /api/org/health/measure | src/app/api/org/health/measure/route.ts | No | Yes | Missing required: getUnifiedAuth(request); Missing required: assertAccess(...); Missing required: setWorkspaceContext(workspaceId) | - |
| /api/org/health/minimal | src/app/api/org/health/minimal/route.ts | No | Yes | Missing required: getUnifiedAuth(request); Missing required: assertAccess(...); Missing required: setWorkspaceContext(workspaceId) | - |
| /api/org/health/ownership | src/app/api/org/health/ownership/route.ts | No | Yes | Missing required: getUnifiedAuth(request); Missing required: assertAccess(...); Missing required: setWorkspaceContext(workspaceId) | - |
| /api/org/health/setup | src/app/api/org/health/setup/route.ts | No | Yes | Missing required: getUnifiedAuth(request); Missing required: assertAccess(...); Missing required: setWorkspaceContext(workspaceId) | - |
| /api/org/health/signals/[id] | src/app/api/org/health/signals/[id]/route.ts | No | Yes | Missing required: getUnifiedAuth(request); Missing required: assertAccess(...); Missing required: setWorkspaceContext(workspaceId) | - |
| /api/org/import/apply | src/app/api/org/import/apply/route.ts | No | Yes | Missing required: getUnifiedAuth(request); Missing required: assertAccess(...); Missing required: setWorkspaceContext(workspaceId) | - |
| /api/org/import/preview | src/app/api/org/import/preview/route.ts | No | Yes | Missing required: getUnifiedAuth(request); Missing required: assertAccess(...); Missing required: setWorkspaceContext(workspaceId) | - |
| /api/org/insights | src/app/api/org/insights/route.ts | No | Yes | Missing required: getUnifiedAuth(request); Missing required: assertAccess(...); Missing required: setWorkspaceContext(workspaceId) | - |
| /api/org/insights/overview | src/app/api/org/insights/overview/route.ts | No | Yes | Missing required: getUnifiedAuth(request); Missing required: assertAccess(...); Missing required: setWorkspaceContext(workspaceId) | - |
| /api/org/invitations | src/app/api/org/invitations/route.ts | No | Yes | Missing required: getUnifiedAuth(request); Missing required: assertAccess(...); Missing required: setWorkspaceContext(workspaceId) | - |
| /api/org/invitations/accept | src/app/api/org/invitations/accept/route.ts | No | Yes | Missing required: getUnifiedAuth(request); Missing required: assertAccess(...); Missing required: setWorkspaceContext(workspaceId) | - |
| /api/org/invitations/cancel | src/app/api/org/invitations/cancel/route.ts | No | Yes | Missing required: getUnifiedAuth(request); Missing required: assertAccess(...); Missing required: setWorkspaceContext(workspaceId) | - |
| /api/org/invitations/create | src/app/api/org/invitations/create/route.ts | No | Yes | Missing required: getUnifiedAuth(request); Missing required: assertAccess(...); Missing required: setWorkspaceContext(workspaceId) | - |
| /api/org/invitations/resend | src/app/api/org/invitations/resend/route.ts | No | Yes | Missing required: getUnifiedAuth(request); Missing required: assertAccess(...); Missing required: setWorkspaceContext(workspaceId) | - |
| /api/org/invitations/resolve | src/app/api/org/invitations/resolve/route.ts | No | Yes | Missing required: getUnifiedAuth(request); Missing required: assertAccess(...); Missing required: setWorkspaceContext(workspaceId) | - |
| /api/org/invitations/respond | src/app/api/org/invitations/respond/route.ts | No | Yes | Missing required: getUnifiedAuth(request); Missing required: assertAccess(...); Missing required: setWorkspaceContext(workspaceId) | - |
| /api/org/invitations/revoke | src/app/api/org/invitations/revoke/route.ts | No | Yes | Missing required: getUnifiedAuth(request); Missing required: assertAccess(...); Missing required: setWorkspaceContext(workspaceId) | - |
| /api/org/issues | src/app/api/org/issues/route.ts | No | Yes | Missing required: getUnifiedAuth(request); Missing required: assertAccess(...); Missing required: setWorkspaceContext(workspaceId) | - |
| /api/org/issues/apply | src/app/api/org/issues/apply/route.ts | No | Yes | Missing required: getUnifiedAuth(request); Missing required: assertAccess(...); Missing required: setWorkspaceContext(workspaceId) | - |
| /api/org/issues/preview | src/app/api/org/issues/preview/route.ts | No | Yes | Missing required: getUnifiedAuth(request); Missing required: assertAccess(...); Missing required: setWorkspaceContext(workspaceId) | - |
| /api/org/issues/sync | src/app/api/org/issues/sync/route.ts | No | Yes | Missing required: getUnifiedAuth(request); Missing required: assertAccess(...); Missing required: setWorkspaceContext(workspaceId) | - |
| /api/org/list | src/app/api/org/list/route.ts | No | Yes | Missing required: getUnifiedAuth(request); Missing required: assertAccess(...); Missing required: setWorkspaceContext(workspaceId) | - |
| /api/org/loopbrain/engines | src/app/api/org/loopbrain/engines/route.ts | No | Yes | Missing required: getUnifiedAuth(request); Missing required: assertAccess(...); Missing required: setWorkspaceContext(workspaceId) | - |
| /api/org/loopbrain/feedback | src/app/api/org/loopbrain/feedback/route.ts | No | Yes | Missing required: getUnifiedAuth(request); Missing required: assertAccess(...); Missing required: setWorkspaceContext(workspaceId) | - |
| /api/org/loopbrain/metrics | src/app/api/org/loopbrain/metrics/route.ts | No | Yes | Missing required: getUnifiedAuth(request); Missing required: assertAccess(...); Missing required: setWorkspaceContext(workspaceId) | - |
| /api/org/loopbrain/rollout | src/app/api/org/loopbrain/rollout/route.ts | No | Yes | Missing required: getUnifiedAuth(request); Missing required: assertAccess(...); Missing required: setWorkspaceContext(workspaceId) | - |
| /api/org/maintenance/dedup | src/app/api/org/maintenance/dedup/route.ts | No | Yes | Missing required: getUnifiedAuth(request); Missing required: assertAccess(...); Missing required: setWorkspaceContext(workspaceId) | - |
| /api/org/management/link | src/app/api/org/management/link/route.ts | No | Yes | Missing required: getUnifiedAuth(request); Missing required: assertAccess(...); Missing required: setWorkspaceContext(workspaceId) | - |
| /api/org/members | src/app/api/org/members/route.ts | No | Yes | Missing required: getUnifiedAuth(request); Missing required: assertAccess(...); Missing required: setWorkspaceContext(workspaceId) | - |
| /api/org/members/[memberId]/custom-role | src/app/api/org/members/[memberId]/custom-role/route.ts | No | Yes | Missing required: getUnifiedAuth(request); Missing required: assertAccess(...); Missing required: setWorkspaceContext(workspaceId) | - |
| /api/org/members/leave | src/app/api/org/members/leave/route.ts | No | Yes | Missing required: getUnifiedAuth(request); Missing required: assertAccess(...); Missing required: setWorkspaceContext(workspaceId) | - |
| /api/org/members/remove | src/app/api/org/members/remove/route.ts | No | Yes | Missing required: getUnifiedAuth(request); Missing required: assertAccess(...); Missing required: setWorkspaceContext(workspaceId) | - |
| /api/org/members/update-role | src/app/api/org/members/update-role/route.ts | No | Yes | Missing required: getUnifiedAuth(request); Missing required: assertAccess(...); Missing required: setWorkspaceContext(workspaceId) | - |
| /api/org/merges | src/app/api/org/merges/route.ts | No | Yes | Missing required: getUnifiedAuth(request); Missing required: assertAccess(...); Missing required: setWorkspaceContext(workspaceId) | - |
| /api/org/onboarding/complete | src/app/api/org/onboarding/complete/route.ts | No | Yes | Missing required: getUnifiedAuth(request); Missing required: assertAccess(...); Missing required: setWorkspaceContext(workspaceId) | - |
| /api/org/ownership/assign | src/app/api/org/ownership/assign/route.ts | No | Yes | Missing required: getUnifiedAuth(request); Missing required: assertAccess(...); Missing required: setWorkspaceContext(workspaceId) | - |
| /api/org/ownership/bulk-assign | src/app/api/org/ownership/bulk-assign/route.ts | No | Yes | Missing required: getUnifiedAuth(request); Missing required: assertAccess(...); Missing required: setWorkspaceContext(workspaceId) | - |
| /api/org/ownership/transfer | src/app/api/org/ownership/transfer/route.ts | No | Yes | Missing required: getUnifiedAuth(request); Missing required: assertAccess(...); Missing required: setWorkspaceContext(workspaceId) | - |
| /api/org/ownership/unowned | src/app/api/org/ownership/unowned/route.ts | No | Yes | Missing required: getUnifiedAuth(request); Missing required: assertAccess(...); Missing required: setWorkspaceContext(workspaceId) | - |
| /api/org/people | src/app/api/org/people/route.ts | No | Yes | Missing required: getUnifiedAuth(request); Missing required: assertAccess(...); Missing required: setWorkspaceContext(workspaceId) | - |
| /api/org/people/[id] | src/app/api/org/people/[id]/route.ts | No | Yes | Missing required: getUnifiedAuth(request); Missing required: assertAccess(...); Missing required: setWorkspaceContext(workspaceId) | - |
| /api/org/people/[id]/decision-path | src/app/api/org/people/[id]/decision-path/route.ts | No | Yes | Missing required: assertAccess(...); Missing required: setWorkspaceContext(workspaceId) | - |
| /api/org/people/[id]/impact-radius | src/app/api/org/people/[id]/impact-radius/route.ts | No | Yes | Missing required: assertAccess(...); Missing required: setWorkspaceContext(workspaceId) | - |
| /api/org/people/[id]/update | src/app/api/org/people/[id]/update/route.ts | No | Yes | Missing required: getUnifiedAuth(request); Missing required: assertAccess(...); Missing required: setWorkspaceContext(workspaceId) | - |
| /api/org/people/archived | src/app/api/org/people/archived/route.ts | No | Yes | Missing required: getUnifiedAuth(request); Missing required: assertAccess(...); Missing required: setWorkspaceContext(workspaceId) | - |
| /api/org/people/archived/restore | src/app/api/org/people/archived/restore/route.ts | No | Yes | Missing required: getUnifiedAuth(request); Missing required: assertAccess(...); Missing required: setWorkspaceContext(workspaceId) | - |
| /api/org/people/availability | src/app/api/org/people/availability/route.ts | No | Yes | Missing required: getUnifiedAuth(request); Missing required: assertAccess(...); Missing required: setWorkspaceContext(workspaceId) | - |
| /api/org/people/bulk | src/app/api/org/people/bulk/route.ts | No | Yes | Missing required: assertAccess(...); Missing required: setWorkspaceContext(workspaceId) | - |
| /api/org/people/directory | src/app/api/org/people/directory/route.ts | No | Yes | Missing required: getUnifiedAuth(request); Missing required: assertAccess(...); Missing required: setWorkspaceContext(workspaceId) | - |
| /api/org/people/export | src/app/api/org/people/export/route.ts | No | Yes | Missing required: assertAccess(...); Missing required: setWorkspaceContext(workspaceId) | - |
| /api/org/people/health | src/app/api/org/people/health/route.ts | No | Yes | Missing required: assertAccess(...); Missing required: setWorkspaceContext(workspaceId) | - |
| /api/org/people/manager | src/app/api/org/people/manager/route.ts | No | Yes | Missing required: assertAccess(...); Missing required: setWorkspaceContext(workspaceId) | - |
| /api/org/people/manager/edge | src/app/api/org/people/manager/edge/route.ts | No | Yes | Missing required: assertAccess(...); Missing required: setWorkspaceContext(workspaceId) | - |
| /api/org/people/profile | src/app/api/org/people/profile/route.ts | No | Yes | Missing required: getUnifiedAuth(request); Missing required: assertAccess(...); Missing required: setWorkspaceContext(workspaceId) | - |
| /api/org/people/roles | src/app/api/org/people/roles/route.ts | No | Yes | Missing required: getUnifiedAuth(request); Missing required: assertAccess(...); Missing required: setWorkspaceContext(workspaceId) | - |
| /api/org/people/structure | src/app/api/org/people/structure/route.ts | No | Yes | Missing required: assertAccess(...); Missing required: setWorkspaceContext(workspaceId) | - |
| /api/org/people/structure/detail | src/app/api/org/people/structure/detail/route.ts | No | Yes | Missing required: assertAccess(...); Missing required: setWorkspaceContext(workspaceId) | - |
| /api/org/people/structure/validate | src/app/api/org/people/structure/validate/route.ts | No | Yes | Missing required: assertAccess(...); Missing required: setWorkspaceContext(workspaceId) | - |
| /api/org/people/update | src/app/api/org/people/update/route.ts | No | Yes | Missing required: getUnifiedAuth(request); Missing required: assertAccess(...); Missing required: setWorkspaceContext(workspaceId) | - |
| /api/org/people/update-profile | src/app/api/org/people/update-profile/route.ts | No | Yes | Missing required: getUnifiedAuth(request); Missing required: assertAccess(...); Missing required: setWorkspaceContext(workspaceId) | - |
| /api/org/permissions | src/app/api/org/permissions/route.ts | No | Yes | Missing required: getUnifiedAuth(request); Missing required: assertAccess(...); Missing required: setWorkspaceContext(workspaceId) | - |
| /api/org/positions | src/app/api/org/positions/route.ts | No | Yes | Missing required: getUnifiedAuth(request); Missing required: assertAccess(...); Missing required: setWorkspaceContext(workspaceId) | - |
| /api/org/positions/[id] | src/app/api/org/positions/[id]/route.ts | Yes | Yes | - | - |
| /api/org/preferences/get | src/app/api/org/preferences/get/route.ts | No | Yes | Missing required: getUnifiedAuth(request); Missing required: assertAccess(...); Missing required: setWorkspaceContext(workspaceId) | - |
| /api/org/preferences/update | src/app/api/org/preferences/update/route.ts | No | Yes | Missing required: getUnifiedAuth(request); Missing required: assertAccess(...); Missing required: setWorkspaceContext(workspaceId) | - |
| /api/org/projects | src/app/api/org/projects/route.ts | No | Yes | Missing required: getUnifiedAuth(request); Missing required: assertAccess(...); Missing required: setWorkspaceContext(workspaceId) | - |
| /api/org/rankings | src/app/api/org/rankings/route.ts | No | Yes | Missing required: getUnifiedAuth(request); Missing required: assertAccess(...); Missing required: setWorkspaceContext(workspaceId) | - |
| /api/org/readiness | src/app/api/org/readiness/route.ts | No | Yes | Missing required: assertAccess(...); Missing required: setWorkspaceContext(workspaceId) | - |
| /api/org/role-cards/[id]/position | src/app/api/org/role-cards/[id]/position/route.ts | No | Yes | Missing required: getUnifiedAuth(request); Missing required: assertAccess(...); Missing required: setWorkspaceContext(workspaceId) | - |
| /api/org/roles | src/app/api/org/roles/route.ts | No | Yes | Missing required: getUnifiedAuth(request); Missing required: assertAccess(...); Missing required: setWorkspaceContext(workspaceId) | - |
| /api/org/roles/[id] | src/app/api/org/roles/[id]/route.ts | No | Yes | Missing required: getUnifiedAuth(request); Missing required: assertAccess(...); Missing required: setWorkspaceContext(workspaceId) | - |
| /api/org/roles/assign | src/app/api/org/roles/assign/route.ts | No | Yes | Missing required: getUnifiedAuth(request); Missing required: assertAccess(...); Missing required: setWorkspaceContext(workspaceId) | - |
| /api/org/roles/capabilities | src/app/api/org/roles/capabilities/route.ts | No | Yes | Missing required: getUnifiedAuth(request); Missing required: assertAccess(...); Missing required: setWorkspaceContext(workspaceId) | - |
| /api/org/setup-status | src/app/api/org/setup-status/route.ts | No | Yes | Missing required: getUnifiedAuth(request); Missing required: assertAccess(...); Missing required: setWorkspaceContext(workspaceId) | - |
| /api/org/structure/departments | src/app/api/org/structure/departments/route.ts | No | Yes | Missing required: getUnifiedAuth(request); Missing required: assertAccess(...); Missing required: setWorkspaceContext(workspaceId) | - |
| /api/org/switch | src/app/api/org/switch/route.ts | No | Yes | Missing required: getUnifiedAuth(request); Missing required: assertAccess(...); Missing required: setWorkspaceContext(workspaceId) | - |
| /api/org/systems | src/app/api/org/systems/route.ts | No | Yes | Missing required: getUnifiedAuth(request); Missing required: assertAccess(...); Missing required: setWorkspaceContext(workspaceId) | - |
| /api/org/taxonomy/roles | src/app/api/org/taxonomy/roles/route.ts | No | Yes | Missing required: getUnifiedAuth(request); Missing required: assertAccess(...); Missing required: setWorkspaceContext(workspaceId) | - |
| /api/org/taxonomy/skills | src/app/api/org/taxonomy/skills/route.ts | No | Yes | Missing required: getUnifiedAuth(request); Missing required: assertAccess(...); Missing required: setWorkspaceContext(workspaceId) | - |
| /api/org/taxonomy/upsert | src/app/api/org/taxonomy/upsert/route.ts | No | Yes | Missing required: getUnifiedAuth(request); Missing required: assertAccess(...); Missing required: setWorkspaceContext(workspaceId) | - |
| /api/org/teams | src/app/api/org/teams/route.ts | No | Yes | Missing required: getUnifiedAuth(request); Missing required: assertAccess(...); Missing required: setWorkspaceContext(workspaceId) | - |
| /api/org/teams/[id] | src/app/api/org/teams/[id]/route.ts | No | Yes | Missing required: getUnifiedAuth(request); Missing required: assertAccess(...); Missing required: setWorkspaceContext(workspaceId) | - |
| /api/org/teams/reorder | src/app/api/org/teams/reorder/route.ts | No | Yes | Missing required: getUnifiedAuth(request); Missing required: assertAccess(...); Missing required: setWorkspaceContext(workspaceId) | - |
| /api/org/teams/roles | src/app/api/org/teams/roles/route.ts | No | Yes | Missing required: getUnifiedAuth(request); Missing required: assertAccess(...); Missing required: setWorkspaceContext(workspaceId) | - |
| /api/org/track | src/app/api/org/track/route.ts | No | Yes | Missing required: getUnifiedAuth(request); Missing required: assertAccess(...); Missing required: setWorkspaceContext(workspaceId) | - |
| /api/org/users | src/app/api/org/users/route.ts | Yes | Yes | - | - |
| /api/org/views | src/app/api/org/views/route.ts | No | Yes | Missing required: assertAccess(...); Missing required: setWorkspaceContext(workspaceId) | - |
| /api/org/views/[viewId] | src/app/api/org/views/[viewId]/route.ts | No | Yes | Missing required: assertAccess(...); Missing required: setWorkspaceContext(workspaceId) | - |
| /api/org/views/default | src/app/api/org/views/default/route.ts | No | Yes | Missing required: getUnifiedAuth(request); Missing required: assertAccess(...); Missing required: setWorkspaceContext(workspaceId) | - |
| /api/org/views/pin | src/app/api/org/views/pin/route.ts | No | Yes | Missing required: getUnifiedAuth(request); Missing required: assertAccess(...); Missing required: setWorkspaceContext(workspaceId) | - |

## Ground Rules Violations (Must Fix)

- Forbidden: deprecated Org model usage — src/app/org/OrgOverviewClient.tsx (lines: 292, 453, 651, 716, 738, 752, 769)
- Forbidden: orgId identifier — src/app/org/OrgOverviewContent.tsx (lines: 30, 35, 43, 47, 75, 123)
- Violation: UI imports from src/server/* — src/app/org/OrgOverviewContent.tsx (lines: 12, 13)
- Forbidden: orgId identifier — src/app/org/activity/ActivityContent.tsx (lines: 22, 24, 51)
- Violation: UI imports from src/server/* — src/app/org/activity/ActivityContent.tsx (lines: 8)
- Forbidden: orgId identifier — src/app/org/activity/ActivityExportsClient.tsx (lines: 23, 45, 71, 77)
- Forbidden: deprecated Org model usage — src/app/org/activity/page.tsx (lines: 2, 48, 60)
- Forbidden: orgId identifier — src/app/org/chart/OrgChartClient.tsx (lines: 14, 78)
- Forbidden: deprecated Org model usage — src/app/org/chart/OrgChartClient.tsx (lines: 290)
- Forbidden: orgId identifier — src/app/org/chart/departments/[departmentId]/page.tsx (lines: 21)
- Forbidden: deprecated Org model usage — src/app/org/chart/departments/[departmentId]/page.tsx (lines: 69)
- Violation: Prisma referenced in UI/org components — src/app/org/chart/departments/[departmentId]/page.tsx (lines: 4, 24, 37)
- Forbidden: deprecated Org model usage — src/app/org/chart/page.tsx (lines: 2, 94)
- Violation: Prisma referenced in UI/org components — src/app/org/chart/page.tsx (lines: 17, 49, 59)
- Violation: UI imports from src/server/* — src/app/org/chart/page.tsx (lines: 20)
- Forbidden: deprecated Org model usage — src/app/org/dev/page.tsx (lines: 8, 20)
- Forbidden: orgId identifier — src/app/org/dev-smoke/page.tsx (lines: 34)
- Forbidden: deprecated Org model usage — src/app/org/dev-smoke/page.tsx (lines: 11, 20, 23, 30, 31, 34, 44, 59)
- Forbidden: orgId identifier — src/app/org/diagnostics/page.tsx (lines: 32, 53, 106)
- Forbidden: deprecated Org model usage — src/app/org/diagnostics/page.tsx (lines: 2, 4, 36, 39, 40, 51, 97)
- Forbidden: deprecated Org model usage — src/app/org/insights/page.tsx (lines: 2, 38, 52, 65)
- Forbidden: orgId identifier — src/app/org/layout.tsx (lines: 58, 144)
- Forbidden: deprecated Org model usage — src/app/org/layout.tsx (lines: 2, 40, 47, 50, 90, 107, 126, 180)
- Violation: Prisma referenced in UI/org components — src/app/org/layout.tsx (lines: 23, 141, 143)
- Forbidden: orgId identifier — src/app/org/ownership/page.tsx (lines: 31, 51, 55)
- Forbidden: deprecated Org model usage — src/app/org/ownership/page.tsx (lines: 2, 59)
- Violation: UI imports from src/server/* — src/app/org/ownership/page.tsx (lines: 15, 16)
- Forbidden: deprecated Org model usage — src/app/org/page.tsx (lines: 2, 12, 13, 51, 54, 68)
- Forbidden: orgId identifier — src/app/org/people/PeopleContent.tsx (lines: 19, 49)
- Forbidden: orgId identifier — src/app/org/people/PeoplePageClient.tsx (lines: 46, 54, 777)
- Forbidden: deprecated Org model usage — src/app/org/people/PeoplePageClient.tsx (lines: 681, 730)
- Forbidden: deprecated Org model usage — src/app/org/people/page.tsx (lines: 2, 46)
- Forbidden: deprecated Org model usage — src/app/org/qa-visual/page.tsx (lines: 4)
- Forbidden: orgId identifier — src/app/org/settings/OrgSettingsClient.tsx (lines: 26, 38, 76, 84, 87, 90)
- Forbidden: deprecated Org model usage — src/app/org/settings/OrgSettingsClient.tsx (lines: 2, 62)
- Forbidden: orgId identifier — src/app/org/settings/page.tsx (lines: 46, 66, 72, 98)
- Forbidden: deprecated Org model usage — src/app/org/settings/page.tsx (lines: 19, 96)
- Violation: Prisma referenced in UI/org components — src/app/org/settings/page.tsx (lines: 7, 44, 71)
- Violation: UI imports from src/server/* — src/app/org/settings/page.tsx (lines: 8)
- Forbidden: orgId identifier — src/app/org/structure/StructureContent.tsx (lines: 21, 30, 62)
- Forbidden: orgId identifier — src/app/org/structure/StructurePageClient.tsx (lines: 40, 49)
- Forbidden: deprecated Org model usage — src/app/org/structure/StructurePageClient.tsx (lines: 422)
- Forbidden: deprecated Org model usage — src/app/org/structure/page.tsx (lines: 2, 50)
- Forbidden: orgId identifier — src/app/api/org/[orgId]/activity/admin/route.ts (lines: 25, 28, 30, 59, 60, 73)
- Forbidden: orgId identifier — src/app/api/org/[orgId]/activity/export/route.ts (lines: 64, 67, 69, 107, 108, 121, 128, 162)
- Forbidden: orgId identifier — src/app/api/org/[orgId]/chart/route.ts (lines: 32, 35, 37, 48, 51)
- Forbidden: orgId identifier — src/app/api/org/[orgId]/invites/route.ts (lines: 18, 21, 23, 52, 53, 91, 113, 135, 146, 177, 180, 183, 185, 214, 215, 229)
- Forbidden: orgId identifier — src/app/api/org/[orgId]/overview/route.ts (lines: 27, 30, 32, 40, 53, 59, 64, 67, 70, 74, 89, 105, 119)
- Forbidden: deprecated Org model usage — src/app/api/org/[orgId]/overview/route.ts (lines: 49)
- Forbidden: orgId identifier — src/app/api/org/[orgId]/people/route.ts (lines: 21, 24, 26, 43, 56, 74)
- Forbidden: orgId identifier — src/app/api/org/[orgId]/structure/departments/route.ts (lines: 17, 20, 22, 52, 54, 55, 84, 104, 114)
- Forbidden: orgId identifier — src/app/api/org/[orgId]/structure/route.ts (lines: 29, 32, 34, 45, 57, 69, 106)
- Forbidden: orgId identifier — src/app/api/org/[orgId]/structure/teams/route.ts (lines: 17, 20, 22, 52, 54, 55, 86, 120, 141, 151)
- Forbidden: orgId identifier — src/app/api/org/activity/export/route.ts (lines: 46)
- Forbidden: orgId identifier — src/app/api/org/activity/route.ts (lines: 30, 60)
- Forbidden: orgId identifier — src/app/api/org/audit/route.ts (lines: 11, 12, 14, 18, 41, 42, 60, 69)
- Forbidden: orgId identifier — src/app/api/org/contracts/snapshot-v1/route.ts (lines: 9, 10)
- Forbidden: requireActiveOrgId — src/app/api/org/contracts/snapshot-v1/route.ts (lines: 2, 9)
- Forbidden: orgId identifier — src/app/api/org/custom-roles/[roleId]/route.ts (lines: 22, 28, 81, 87, 96)
- Forbidden: orgId identifier — src/app/api/org/custom-roles/route.ts (lines: 15, 20, 63, 67)
- Forbidden: orgId identifier — src/app/api/org/danger/route.ts (lines: 29, 61, 80)
- Forbidden: orgId identifier — src/app/api/org/data-quality/adjust-allocation/route.ts (lines: 12, 22, 43)
- Forbidden: requireActiveOrgId — src/app/api/org/data-quality/adjust-allocation/route.ts (lines: 3, 12)
- Forbidden: orgId identifier — src/app/api/org/data-quality/refresh-availability/route.ts (lines: 13, 21, 25, 27, 35)
- Forbidden: requireActiveOrgId — src/app/api/org/data-quality/refresh-availability/route.ts (lines: 3, 13)
- Forbidden: orgId identifier — src/app/api/org/data-quality/resolve-manager-conflicts/route.ts (lines: 12, 20, 26)
- Forbidden: requireActiveOrgId — src/app/api/org/data-quality/resolve-manager-conflicts/route.ts (lines: 3, 12)
- Forbidden: orgId identifier — src/app/api/org/default-view/route.ts (lines: 8, 10, 21)
- Forbidden: orgId identifier — src/app/api/org/departments/route.ts (lines: 51, 69, 90, 100)
- Forbidden: orgId identifier — src/app/api/org/digest/config/route.ts (lines: 8, 12, 20, 29, 32, 41)
- Forbidden: deprecated Org model usage — src/app/api/org/digest/config/route.ts (lines: 46)
- Forbidden: orgId identifier — src/app/api/org/digest/preview/route.ts (lines: 8, 11)
- Forbidden: orgId identifier — src/app/api/org/domains/route.ts (lines: 7, 9, 22, 28, 39)
- Forbidden: requireActiveOrgId — src/app/api/org/domains/route.ts (lines: 3, 7, 22, 39)
- Forbidden: orgId identifier — src/app/api/org/duplicates/dismiss/route.ts (lines: 8)
- Forbidden: orgId identifier — src/app/api/org/duplicates/merge/route.ts (lines: 9, 26, 122, 177)
- Forbidden: orgId identifier — src/app/api/org/duplicates/route.ts (lines: 9, 18)
- Forbidden: orgId identifier — src/app/api/org/duplicates/sync/route.ts (lines: 34, 129, 135, 137)
- Forbidden: orgId identifier — src/app/api/org/duplicates/undo/route.ts (lines: 9, 18, 63)
- Forbidden: orgId identifier — src/app/api/org/entities/route.ts (lines: 7, 15)
- Forbidden: requireActiveOrgId — src/app/api/org/entities/route.ts (lines: 2, 7)
- Forbidden: orgId identifier — src/app/api/org/fix-events/route.ts (lines: 11, 21, 26, 27, 30, 68, 84, 113, 126, 134, 146, 172)
- Forbidden: orgId identifier — src/app/api/org/guidance/route.ts (lines: 8, 10)
- Forbidden: orgId identifier — src/app/api/org/health/capacity/route.ts (lines: 94, 97, 114, 163)
- Forbidden: orgId identifier — src/app/api/org/health/management-load/route.ts (lines: 62, 65, 77)
- Forbidden: orgId identifier — src/app/api/org/health/measure/route.ts (lines: 8, 11)
- Forbidden: orgId identifier — src/app/api/org/health/minimal/route.ts (lines: 7, 8)
- Forbidden: requireActiveOrgId — src/app/api/org/health/minimal/route.ts (lines: 2, 7)
- Forbidden: orgId identifier — src/app/api/org/health/ownership/route.ts (lines: 66, 72, 84, 95, 133, 166)
- Forbidden: orgId identifier — src/app/api/org/health/route.ts (lines: 9, 11, 39, 59, 60)
- Forbidden: requireActiveOrgId — src/app/api/org/health/route.ts (lines: 3, 9, 59)
- Forbidden: orgId identifier — src/app/api/org/health/setup/route.ts (lines: 7, 8)
- Forbidden: requireActiveOrgId — src/app/api/org/health/setup/route.ts (lines: 2, 7)
- Forbidden: orgId identifier — src/app/api/org/health/signals/[id]/route.ts (lines: 13, 24)
- Forbidden: requireActiveOrgId — src/app/api/org/health/signals/[id]/route.ts (lines: 4, 13)
- Forbidden: orgId identifier — src/app/api/org/import/apply/route.ts (lines: 11, 18, 38, 64, 75, 99, 110, 112, 132, 143)
- Forbidden: requireActiveOrgId — src/app/api/org/import/apply/route.ts (lines: 3, 11)
- Forbidden: orgId identifier — src/app/api/org/import/preview/route.ts (lines: 15, 22)
- Forbidden: requireActiveOrgId — src/app/api/org/import/preview/route.ts (lines: 2, 15)
- Forbidden: orgId identifier — src/app/api/org/insights/overview/route.ts (lines: 35, 37, 50, 60, 66)
- Forbidden: deprecated Org model usage — src/app/api/org/insights/overview/route.ts (lines: 8, 11)
- Forbidden: orgId identifier — src/app/api/org/insights/route.ts (lines: 29, 31)
- Forbidden: deprecated Org model usage — src/app/api/org/insights/route.ts (lines: 22, 48, 61)
- Forbidden: orgId identifier — src/app/api/org/invitations/resend/route.ts (lines: 10, 26)
- Forbidden: orgId identifier — src/app/api/org/invitations/respond/route.ts (lines: 24, 25, 28, 30, 35, 39)
- Forbidden: orgId identifier — src/app/api/org/invitations/revoke/route.ts (lines: 9)
- Forbidden: orgId identifier — src/app/api/org/invitations/route.ts (lines: 14, 17, 29, 35, 44)
- Forbidden: orgId identifier — src/app/api/org/issues/apply/route.ts (lines: 12, 28, 82, 96, 104, 108, 118, 121, 122)
- Forbidden: orgId identifier — src/app/api/org/issues/preview/route.ts (lines: 15, 121, 123, 160, 163)
- Forbidden: orgId identifier — src/app/api/org/issues/route.ts (lines: 9, 26)
- Forbidden: orgId identifier — src/app/api/org/issues/sync/route.ts (lines: 9, 37, 40, 52, 64, 67, 80, 83, 95)
- Forbidden: orgId identifier — src/app/api/org/loopbrain/engines/route.ts (lines: 9, 14, 22, 28, 30, 35)
- Forbidden: orgId identifier — src/app/api/org/loopbrain/feedback/route.ts (lines: 8, 21)
- Forbidden: orgId identifier — src/app/api/org/loopbrain/metrics/route.ts (lines: 8, 16, 21, 53)
- Forbidden: orgId identifier — src/app/api/org/loopbrain/rollout/route.ts (lines: 8, 12, 20, 30, 37, 47)
- Forbidden: orgId identifier — src/app/api/org/maintenance/dedup/route.ts (lines: 7, 8)
- Forbidden: requireActiveOrgId — src/app/api/org/maintenance/dedup/route.ts (lines: 2, 7)
- Forbidden: orgId identifier — src/app/api/org/management/link/route.ts (lines: 12, 22, 26, 35, 44)
- Forbidden: requireActiveOrgId — src/app/api/org/management/link/route.ts (lines: 3, 12)
- Forbidden: orgId identifier — src/app/api/org/members/[memberId]/custom-role/route.ts (lines: 36, 39, 54, 92, 118, 159)
- Forbidden: orgId identifier — src/app/api/org/members/route.ts (lines: 8, 11, 29, 34, 36)
- Forbidden: orgId identifier — src/app/api/org/merges/route.ts (lines: 8, 11)
- Forbidden: orgId identifier — src/app/api/org/onboarding/complete/route.ts (lines: 30)
- Forbidden: orgId identifier — src/app/api/org/ownership/assign/route.ts (lines: 14, 24, 32, 40, 49, 59, 71)
- Forbidden: requireActiveOrgId — src/app/api/org/ownership/assign/route.ts (lines: 3, 14)
- Forbidden: orgId identifier — src/app/api/org/ownership/bulk-assign/route.ts (lines: 15, 32, 39, 51)
- Forbidden: requireActiveOrgId — src/app/api/org/ownership/bulk-assign/route.ts (lines: 4, 15)
- Forbidden: orgId identifier — src/app/api/org/ownership/unowned/route.ts (lines: 8, 11, 22)
- Forbidden: requireActiveOrgId — src/app/api/org/ownership/unowned/route.ts (lines: 2, 8)
- Forbidden: orgId identifier — src/app/api/org/people/archived/restore/route.ts (lines: 8, 26)
- Forbidden: orgId identifier — src/app/api/org/people/archived/route.ts (lines: 9)
- Forbidden: orgId identifier — src/app/api/org/people/availability/route.ts (lines: 8, 12, 14, 32)
- Forbidden: requireActiveOrgId — src/app/api/org/people/availability/route.ts (lines: 4, 8)
- Forbidden: deprecated Org model usage — src/app/api/org/people/availability/route.ts (lines: 1)
- Forbidden: orgId identifier — src/app/api/org/people/bulk/route.ts (lines: 25)
- Forbidden: orgId identifier — src/app/api/org/people/export/route.ts (lines: 27)
- Forbidden: orgId identifier — src/app/api/org/people/health/route.ts (lines: 21)
- Forbidden: orgId identifier — src/app/api/org/people/manager/edge/route.ts (lines: 25)
- Forbidden: orgId identifier — src/app/api/org/people/manager/route.ts (lines: 25)
- Forbidden: orgId identifier — src/app/api/org/people/profile/route.ts (lines: 7, 11)
- Forbidden: requireActiveOrgId — src/app/api/org/people/profile/route.ts (lines: 2, 7)
- Forbidden: deprecated Org model usage — src/app/api/org/people/roles/route.ts (lines: 32)
- Forbidden: orgId identifier — src/app/api/org/people/route.ts (lines: 17, 21, 36)
- Forbidden: requireActiveOrgId — src/app/api/org/people/route.ts (lines: 5, 17)
- Forbidden: orgId identifier — src/app/api/org/people/structure/detail/route.ts (lines: 21)
- Forbidden: orgId identifier — src/app/api/org/people/structure/route.ts (lines: 21)
- Forbidden: orgId identifier — src/app/api/org/people/structure/validate/route.ts (lines: 21)
- Forbidden: orgId identifier — src/app/api/org/people/update/route.ts (lines: 18, 101, 110, 111)
- Forbidden: orgId identifier — src/app/api/org/people/update-profile/route.ts (lines: 19, 37, 39, 50, 55, 58, 74, 79, 82)
- Forbidden: requireActiveOrgId — src/app/api/org/people/update-profile/route.ts (lines: 4, 19)
- Forbidden: orgId identifier — src/app/api/org/permissions/route.ts (lines: 14)
- Forbidden: orgId identifier — src/app/api/org/preferences/get/route.ts (lines: 10)
- Forbidden: orgId identifier — src/app/api/org/preferences/update/route.ts (lines: 29, 33)
- Forbidden: deprecated Org model usage — src/app/api/org/preferences/update/route.ts (lines: 14)
- Forbidden: orgId identifier — src/app/api/org/projects/route.ts (lines: 9, 10, 15, 16, 67, 136)
- Forbidden: deprecated Org model usage — src/app/api/org/rankings/route.ts (lines: 13, 92)
- Forbidden: orgId identifier — src/app/api/org/readiness/route.ts (lines: 176)
- Forbidden: deprecated Org model usage — src/app/api/org/readiness/route.ts (lines: 480)
- Forbidden: deprecated Org model usage — src/app/api/org/role-cards/[id]/position/route.ts (lines: 37)
- Forbidden: orgId identifier — src/app/api/org/roles/[id]/route.ts (lines: 78, 79, 100, 110, 176, 177, 189, 199)
- Forbidden: orgId identifier — src/app/api/org/roles/assign/route.ts (lines: 13, 23, 30)
- Forbidden: requireActiveOrgId — src/app/api/org/roles/assign/route.ts (lines: 3, 13)
- Forbidden: orgId identifier — src/app/api/org/roles/route.ts (lines: 15, 16, 25, 76, 77, 97)
- Forbidden: orgId identifier — src/app/api/org/setup-status/route.ts (lines: 7, 8)
- Forbidden: requireActiveOrgId — src/app/api/org/setup-status/route.ts (lines: 2, 7)
- Forbidden: orgId identifier — src/app/api/org/structure/departments/route.ts (lines: 36, 38, 39)
- Forbidden: orgId identifier — src/app/api/org/switch/route.ts (lines: 6, 11, 12, 16)
- Forbidden: orgId identifier — src/app/api/org/systems/route.ts (lines: 7, 9, 22, 28, 39)
- Forbidden: requireActiveOrgId — src/app/api/org/systems/route.ts (lines: 3, 7, 22, 39)
- Forbidden: orgId identifier — src/app/api/org/taxonomy/roles/route.ts (lines: 10, 11, 18)
- Forbidden: requireActiveOrgId — src/app/api/org/taxonomy/roles/route.ts (lines: 3, 10)
- Forbidden: orgId identifier — src/app/api/org/taxonomy/skills/route.ts (lines: 10, 11, 18)
- Forbidden: requireActiveOrgId — src/app/api/org/taxonomy/skills/route.ts (lines: 3, 10)
- Forbidden: orgId identifier — src/app/api/org/taxonomy/upsert/route.ts (lines: 12, 22, 29)
- Forbidden: requireActiveOrgId — src/app/api/org/taxonomy/upsert/route.ts (lines: 4, 12)
- Forbidden: orgId identifier — src/app/api/org/teams/reorder/route.ts (lines: 30, 44, 50)
- Forbidden: deprecated Org model usage — src/app/api/org/teams/reorder/route.ts (lines: 15)
- Forbidden: deprecated Org model usage — src/app/api/org/teams/roles/route.ts (lines: 31)
- Forbidden: orgId identifier — src/app/api/org/teams/route.ts (lines: 53, 87, 107, 129, 140)
- Forbidden: orgId identifier — src/app/api/org/track/route.ts (lines: 28, 46, 55)
- Forbidden: deprecated Org model usage — src/app/api/org/track/route.ts (lines: 14, 23, 61)
- Forbidden: orgId identifier — src/app/api/org/views/[viewId]/route.ts (lines: 25)
- Forbidden: orgId identifier — src/app/api/org/views/default/route.ts (lines: 9, 15, 18)
- Forbidden: orgId identifier — src/app/api/org/views/pin/route.ts (lines: 9, 13)
- Forbidden: orgId identifier — src/app/api/org/views/route.ts (lines: 56)
- Forbidden: deprecated Org model usage — src/components/org/ConditionalWorkspaceHint.tsx (lines: 31)
- Forbidden: deprecated Org model usage — src/components/org/DepartmentLoopbrainPanel.tsx (lines: 47)
- Forbidden: deprecated Org model usage — src/components/org/DepartmentOrgRow.tsx (lines: 24, 125)
- Forbidden: deprecated Org model usage — src/components/org/OrgAnnouncementBanner.tsx (lines: 13)
- Forbidden: deprecated Org model usage — src/components/org/OrgAskLoopbrainPanel.tsx (lines: 61, 63, 67, 113)
- Forbidden: deprecated Org model usage — src/components/org/OrgCenterDisabled.tsx (lines: 6, 9)
- Forbidden: deprecated Org model usage — src/components/org/OrgChartDepartmentRow.tsx (lines: 43)
- Forbidden: deprecated Org model usage — src/components/org/OrgChartEmptyState.tsx (lines: 50)
- Forbidden: deprecated Org model usage — src/components/org/OrgChartFilters.tsx (lines: 13)
- Forbidden: deprecated Org model usage — src/components/org/OrgChartTree.tsx (lines: 12, 28, 29, 38)
- Forbidden: deprecated Org model usage — src/components/org/OrgContextProvider.tsx (lines: 2)
- Forbidden: deprecated Org model usage — src/components/org/OrgCrossTabLink.tsx (lines: 18)
- Forbidden: deprecated Org model usage — src/components/org/OrgDebugPanel.tsx (lines: 32, 82)
- Forbidden: deprecated Org model usage — src/components/org/OrgDepartmentRow.tsx (lines: 9, 45)
- Forbidden: deprecated Org model usage — src/components/org/OrgHealthCard.tsx (lines: 56, 96)
- Forbidden: deprecated Org model usage — src/components/org/OrgLayoutClient.tsx (lines: 32)
- Forbidden: deprecated Org model usage — src/components/org/OrgNoAccessState.tsx (lines: 11, 37)
- Forbidden: deprecated Org model usage — src/components/org/OrgPageHeader.tsx (lines: 64)
- Forbidden: deprecated Org model usage — src/components/org/OrgPageTransition.tsx (lines: 11)
- Forbidden: deprecated Org model usage — src/components/org/OrgPersonLoopbrainPanel.tsx (lines: 47)
- Forbidden: deprecated Org model usage — src/components/org/OrgQaPanel.tsx (lines: 17, 86)
- Forbidden: deprecated Org model usage — src/components/org/OrgQaStatusList.tsx (lines: 44, 59, 75, 84, 96)
- Forbidden: deprecated Org model usage — src/components/org/OrgQnaHistoryPanel.tsx (lines: 20, 70, 72, 93)
- Forbidden: deprecated Org model usage — src/components/org/OrgQnaSummaryStrip.tsx (lines: 76, 78, 98, 131)
- Forbidden: deprecated Org model usage — src/components/org/PersonRolesCard.tsx (lines: 26, 48)
- Forbidden: deprecated Org model usage — src/components/org/README.md (lines: 1)
- Forbidden: deprecated Org model usage — src/components/org/RoleLoopbrainPanel.tsx (lines: 47)
- Forbidden: deprecated Org model usage — src/components/org/TeamLoopbrainPanel.tsx (lines: 44)
- Forbidden: deprecated Org model usage — src/components/org/TeamRolesCard.tsx (lines: 28, 50)
- Forbidden: orgId identifier — src/components/org/activity/ActivitySection.tsx (lines: 9, 34, 35, 48, 53)
- Forbidden: deprecated Org model usage — src/components/org/activity/ActivitySection.tsx (lines: 29)
- Forbidden: orgId identifier — src/components/org/activity/ExportsSection.tsx (lines: 3, 6, 14, 15, 26)
- Forbidden: deprecated Org model usage — src/components/org/activity/ExportsSection.tsx (lines: 10, 12)
- Forbidden: deprecated Org model usage — src/components/org/debug/OrgPermissionsDiagnostic.tsx (lines: 29, 37)
- Forbidden: deprecated Org model usage — src/components/org/feedback/OrgFeedbackDialog.tsx (lines: 43, 56, 65)
- Forbidden: deprecated Org model usage — src/components/org/health/OrgHealthCard.tsx (lines: 35)
- Forbidden: deprecated Org model usage — src/components/org/health/OrgHealthDetails.tsx (lines: 57, 84, 98, 105, 147)
- Forbidden: orgId identifier — src/components/org/health/OrgHealthSection.tsx (lines: 7, 10, 32)
- Forbidden: requireActiveOrgId — src/components/org/health/OrgHealthSection.tsx (lines: 2, 7)
- Forbidden: deprecated Org model usage — src/components/org/health/OrgHealthSection.tsx (lines: 54)
- Violation: UI imports from src/server/* — src/components/org/health/OrgHealthSection.tsx (lines: 2, 3, 4)
- Forbidden: orgId identifier — src/components/org/health/OrgHealthSummary.tsx (lines: 18, 19)
- Forbidden: deprecated Org model usage — src/components/org/health/OrgHealthSummary.tsx (lines: 2, 27)
- Violation: UI imports from src/server/* — src/components/org/health/OrgHealthSummary.tsx (lines: 15)
- Forbidden: deprecated Org model usage — src/components/org/health/deepdives/DeepDiveLayout.tsx (lines: 27)
- Forbidden: deprecated Org model usage — src/components/org/health/deepdives/StructureDeepDive.tsx (lines: 26, 41)
- Forbidden: deprecated Org model usage — src/components/org/health/setup/SetupWizard.tsx (lines: 572)
- Forbidden: deprecated Org model usage — src/components/org/help/OrgHelpArticleContent.tsx (lines: 4, 34, 37, 76, 202)
- Forbidden: deprecated Org model usage — src/components/org/help/OrgHelpPanel.tsx (lines: 17, 32)
- Forbidden: orgId identifier — src/components/org/insights/OrgInsightsChartsSection.tsx (lines: 14)
- Forbidden: deprecated Org model usage — src/components/org/insights/OrgInsightsChartsSection.tsx (lines: 34)
- Forbidden: orgId identifier — src/components/org/insights/OrgInsightsView.tsx (lines: 43)
- Forbidden: deprecated Org model usage — src/components/org/insights/OrgOverviewInsightsStrip.tsx (lines: 22)
- Forbidden: orgId identifier — src/components/org/insights/OrgOverviewInsightsStripServer.tsx (lines: 16)
- Forbidden: deprecated Org model usage — src/components/org/onboarding/OrgWelcomeOverlay.tsx (lines: 21, 29, 53)
- Forbidden: deprecated Org model usage — src/components/org/org-styles.ts (lines: 2)
- Forbidden: deprecated Org model usage — src/components/org/orgAnswerEntityHelpers.ts (lines: 2)
- Forbidden: deprecated Org model usage — src/components/org/overview/OrgOverviewStatsRibbon.tsx (lines: 15, 39)
- Forbidden: deprecated Org model usage — src/components/org/people/EditProfileForm.tsx (lines: 85)
- Forbidden: deprecated Org model usage — src/components/org/people/PeopleFiltersBar.tsx (lines: 35)
- Forbidden: deprecated Org model usage — src/components/org/people/PeopleInsightsPanel.tsx (lines: 217, 221, 290)
- Forbidden: deprecated Org model usage — src/components/org/people/PeopleTableCard.tsx (lines: 14)
- Forbidden: orgId identifier — src/components/org/people/PersonProfileDrawer.tsx (lines: 22, 72, 200, 226)
- Forbidden: deprecated Org model usage — src/components/org/people/PersonProfileDrawer.tsx (lines: 232, 244)
- Forbidden: deprecated Org model usage — src/components/org/people/PersonProfilePanel.tsx (lines: 144)
- Forbidden: orgId identifier — src/components/org/people/ProfileHeader.tsx (lines: 16, 33)
- Forbidden: deprecated Org model usage — src/components/org/people/README.md (lines: 3, 28, 43)
- Forbidden: deprecated Org model usage — src/components/org/people/RoleCard.tsx (lines: 134)
- Forbidden: deprecated Org model usage — src/components/org/people/SavedViewsDropdown.tsx (lines: 25)
- Forbidden: legacy SavedView usage — src/components/org/people/SavedViewsDropdown.tsx (lines: 12, 22, 64, 69, 76, 103, 107, 117, 157)
- Forbidden: deprecated Org model usage — src/components/org/people/people-styles.ts (lines: 3, 8)
- Forbidden: deprecated Org model usage — src/components/org/people/profile/ContextStrip.tsx (lines: 64)
- Forbidden: deprecated Org model usage — src/components/org/people/profile/OrgPlacement.tsx (lines: 46)
- Forbidden: deprecated Org model usage — src/components/org/people/profile/ProfileHeader.tsx (lines: 121)
- Forbidden: deprecated Org model usage — src/components/org/people/profile/ProfileHero.tsx (lines: 192)
- Forbidden: orgId identifier — src/components/org/settings/DangerZoneSection.tsx (lines: 11, 14, 85, 87)
- Forbidden: orgId identifier — src/components/org/settings/GeneralSettingsSection.tsx (lines: 10, 13, 14, 22, 34)
- Forbidden: orgId identifier — src/components/org/settings/InvitesSection.tsx (lines: 11, 21, 26, 63, 100, 167)
- Forbidden: deprecated Org model usage — src/components/org/settings/InvitesSection.tsx (lines: 16)
- Forbidden: orgId identifier — src/components/org/settings/MembersSection.tsx (lines: 10, 22, 29)
- Forbidden: deprecated Org model usage — src/components/org/settings/MembersSection.tsx (lines: 17, 57)
- Forbidden: deprecated Org model usage — src/components/org/settings/PermissionsOverview.tsx (lines: 13, 71)
- Forbidden: deprecated Org model usage — src/components/org/skeletons/OrgActivitySkeleton.tsx (lines: 2)
- Forbidden: deprecated Org model usage — src/components/org/skeletons/OrgInsightsSkeleton.tsx (lines: 2)
- Forbidden: deprecated Org model usage — src/components/org/skeletons/OrgOverviewSkeleton.tsx (lines: 2)
- Forbidden: deprecated Org model usage — src/components/org/skeletons/OrgPeopleSkeleton.tsx (lines: 2)
- Forbidden: deprecated Org model usage — src/components/org/structure/OrganizationStructureSection.tsx (lines: 72)
- Forbidden: deprecated Org model usage — src/components/org/ui/tokens.ts (lines: 1)
- Forbidden: orgId identifier — src/server/org/README.md (lines: 40)
- Forbidden: deprecated Org model usage — src/server/org/README.md (lines: 1, 3, 24, 30)
- Forbidden: deprecated OrgMembership usage — src/server/org/README.md (lines: 31)
- Forbidden: legacy SavedView usage — src/server/org/README.md (lines: 32)
- Forbidden: orgId identifier — src/server/org/auth.ts (lines: 11)
- Forbidden: deprecated Org model usage — src/server/org/auth.ts (lines: 9, 13, 47)
- Forbidden: orgId identifier — src/server/org/completeness/check.ts (lines: 10, 13, 14, 18)
- Forbidden: orgId identifier — src/server/org/context.ts (lines: 8, 10, 13, 18, 23, 24)
- Forbidden: requireActiveOrgId — src/server/org/context.ts (lines: 16)
- Forbidden: orgId identifier — src/server/org/contracts/build-org-snapshot-v1.ts (lines: 5, 8, 18, 21, 22, 27, 43, 48, 53, 57, 58, 62, 69, 73, 78, 82, 180)
- Forbidden: orgId identifier — src/server/org/entities/list.ts (lines: 5, 8, 18, 28)
- Forbidden: orgId identifier — src/server/org/health/capacity/team-metrics.ts (lines: 22, 25, 32, 36, 44, 54, 69, 76)
- Forbidden: orgId identifier — src/server/org/health/compute-minimal.ts (lines: 5, 20, 61, 62, 63, 74, 81, 91)
- Forbidden: orgId identifier — src/server/org/health/compute.ts (lines: 15, 53, 55, 64, 73, 90, 96, 140, 199, 264, 307, 321, 356, 433, 479, 540, 556, 608)
- Forbidden: deprecated Org model usage — src/server/org/health/compute.ts (lines: 56, 407, 417, 545, 629)
- Forbidden: orgId identifier — src/server/org/health/data-quality-score.ts (lines: 7, 13)
- Forbidden: orgId identifier — src/server/org/health/data-quality.ts (lines: 4, 5, 11, 35, 68)
- Forbidden: deprecated Org model usage — src/server/org/health/data-quality.ts (lines: 102)
- Forbidden: orgId identifier — src/server/org/health/deepdives.ts (lines: 17, 18, 23, 32, 49, 55, 116, 166, 168, 208, 209, 234, 235, 239)
- Forbidden: orgId identifier — src/server/org/health/freshness.ts (lines: 3, 10)
- Forbidden: orgId identifier — src/server/org/health/management/metrics.ts (lines: 15, 24, 29, 59, 74)
- Forbidden: orgId identifier — src/server/org/health/ownership/scan.ts (lines: 9, 23, 38, 63, 69, 75)
- Forbidden: orgId identifier — src/server/org/health/ownership/score.ts (lines: 3, 6, 7, 8, 19)
- Forbidden: deprecated Org model usage — src/server/org/health/phaseC.ts (lines: 14)
- Forbidden: orgId identifier — src/server/org/health/refresh.ts (lines: 4, 5, 6)
- Forbidden: orgId identifier — src/server/org/health/setup/completeness.ts (lines: 12, 27, 30, 33, 34, 36, 37, 40, 43)
- Forbidden: deprecated Org model usage — src/server/org/health/setup/completeness.ts (lines: 58)
- Forbidden: orgId identifier — src/server/org/health/store.ts (lines: 5, 14, 18, 40, 52, 72, 80, 82, 89, 97, 99, 107, 109, 117, 119, 126, 128)
- Forbidden: orgId identifier — src/server/org/health/structure/layers.ts (lines: 28, 34, 40)
- Forbidden: orgId identifier — src/server/org/health/structure/metrics.ts (lines: 16, 19, 22, 35, 36, 37, 38, 42, 67)
- Forbidden: deprecated Org model usage — src/server/org/health/structure/metrics.ts (lines: 83)
- Forbidden: orgId identifier — src/server/org/health/team-membership.ts (lines: 13, 18, 26, 32, 38, 44)
- Forbidden: orgId identifier — src/server/org/import/lookup.ts (lines: 3, 10, 21, 24)
- Forbidden: orgId identifier — src/server/org/maintenance/dedup.ts (lines: 5, 6, 8, 32, 33, 35, 56, 57, 59, 80, 81, 83, 104, 106, 107, 108, 109)
- Forbidden: orgId identifier — src/server/org/overview/summary.ts (lines: 9, 12, 15, 17, 19, 24, 28)
- Forbidden: deprecated Org model usage — src/server/org/overview/summary.ts (lines: 7)
- Forbidden: orgId identifier — src/server/org/people/identity.ts (lines: 9, 13)
- Forbidden: deprecated Org model usage — src/server/org/people/profile-contract.md (lines: 3, 34, 58, 248, 252)
- Forbidden: orgId identifier — src/server/org/people/profile.ts (lines: 4, 9, 38, 44, 52, 59, 69)
- Forbidden: orgId identifier — src/server/org/people/search.ts (lines: 7, 11)
- Forbidden: orgId identifier — src/server/org/setup/status.ts (lines: 4, 7, 8, 12)
- Forbidden: orgId identifier — src/server/org/taxonomy/seed.ts (lines: 4, 29, 30, 35, 42)
- Forbidden: deprecated Org model usage — src/server/org/workspace.ts (lines: 4, 5)
- Forbidden: deprecated Org model usage — src/server/org/writes/guard.ts (lines: 4)
- Forbidden: orgId identifier — prisma/schema.prisma (lines: 714, 748, 1430, 1431, 1446, 1486, 1497, 1498, 1499, 1505, 1514, 1515, 1521, 1531, 1532, 1538, 1548, 1549, 1555, 1563, 1564, 1570, 1577, 1578, 1596, 1607, 1613, 1621, 1627, 1635, 1641, 1653, 1659, 1678, 1679, 1699, 1707, 1713, 1722, 1723, 1729, 1734, 1740, 1748, 1754, 1762, 1764, 1770, 1776, 1778)
- Forbidden: deprecated Org model usage — prisma/schema.prisma (lines: 123, 714, 1357, 1378, 1379, 1400, 1430, 1462, 1762, 1776, 1785, 1839)
- Forbidden: deprecated OrgMembership usage — prisma/schema.prisma (lines: 1468, 1768)
- Forbidden: legacy SavedView usage — prisma/schema.prisma (lines: 1484)
- Forbidden: orgId identifier — prisma/seed/loopbrain_fixtures.ts (lines: 57, 154, 167, 180, 420, 446, 471, 496, 527, 537, 548, 558, 570)
- Forbidden: deprecated Org model usage — prisma/seed/loopbrain_fixtures.ts (lines: 46, 52, 59, 61, 67, 70, 72)
- Forbidden: orgId identifier — prisma/seed/org_golden_path.ts (lines: 46, 72, 85, 209, 258, 269)
- Forbidden: deprecated Org model usage — prisma/seed/org_golden_path.ts (lines: 6, 8, 9, 18, 35, 37, 41, 48, 50, 56, 59, 61, 284)
- Forbidden: orgId identifier — prisma/seed.js (lines: 7, 82, 86, 92, 96, 102, 104, 111, 117, 119, 126, 132, 135, 142, 148, 154, 172, 182, 184, 186, 190, 193, 200, 209, 211, 221, 226, 229, 230, 236, 240, 243, 244, 245, 250, 255, 256, 257, 260, 271, 272, 274, 278, 288, 289, 301, 312, 325, 391, 420)
- Forbidden: deprecated Org model usage — prisma/seed.js (lines: 3, 67, 289)
- Forbidden: deprecated Org model usage — prisma/seed.ts (lines: 313)
- Forbidden: orgId identifier — docs/ORG_CURSOR_PROMPT_TEMPLATE.md (lines: 9, 75)
- Forbidden: requireActiveOrgId — docs/ORG_CURSOR_PROMPT_TEMPLATE.md (lines: 76)
- Forbidden: deprecated Org model usage — docs/ORG_CURSOR_PROMPT_TEMPLATE.md (lines: 1, 3, 15, 16, 24, 36, 79, 83, 122)
- Forbidden: deprecated OrgMembership usage — docs/ORG_CURSOR_PROMPT_TEMPLATE.md (lines: 15, 83)
- Forbidden: legacy SavedView usage — docs/ORG_CURSOR_PROMPT_TEMPLATE.md (lines: 15, 83)
- Forbidden: orgId identifier — docs/ORG_ENFORCEMENT_SETUP_SUMMARY.md (lines: 50, 65, 149)
- Forbidden: requireActiveOrgId — docs/ORG_ENFORCEMENT_SETUP_SUMMARY.md (lines: 51, 150)
- Forbidden: deprecated Org model usage — docs/ORG_ENFORCEMENT_SETUP_SUMMARY.md (lines: 1, 3, 12, 16, 52, 53, 69, 87, 92, 127)
- Forbidden: deprecated OrgMembership usage — docs/ORG_ENFORCEMENT_SETUP_SUMMARY.md (lines: 52, 88)
- Forbidden: legacy SavedView usage — docs/ORG_ENFORCEMENT_SETUP_SUMMARY.md (lines: 52, 89)
- Forbidden: orgId identifier — docs/ORG_ENFORCEMENT_SYSTEM.md (lines: 41, 49, 59, 149)
- Forbidden: requireActiveOrgId — docs/ORG_ENFORCEMENT_SYSTEM.md (lines: 42, 60, 150)
- Forbidden: deprecated Org model usage — docs/ORG_ENFORCEMENT_SYSTEM.md (lines: 1, 3, 43, 44, 70, 89, 97, 133)
- Forbidden: deprecated OrgMembership usage — docs/ORG_ENFORCEMENT_SYSTEM.md (lines: 43)
- Forbidden: legacy SavedView usage — docs/ORG_ENFORCEMENT_SYSTEM.md (lines: 43)
- Forbidden: orgId identifier — docs/ORG_ENGINEERING_GROUND_RULES.md (lines: 16, 19, 28, 35, 172)
- Forbidden: requireActiveOrgId — docs/ORG_ENGINEERING_GROUND_RULES.md (lines: 21)
- Forbidden: deprecated Org model usage — docs/ORG_ENGINEERING_GROUND_RULES.md (lines: 1, 6, 25, 42, 106, 110, 123, 128, 150, 170, 177)
- Forbidden: deprecated OrgMembership usage — docs/ORG_ENGINEERING_GROUND_RULES.md (lines: 111, 177)
- Forbidden: legacy SavedView usage — docs/ORG_ENGINEERING_GROUND_RULES.md (lines: 112, 177)
- Forbidden: orgId identifier — docs/ORG_PHASE_PLAN.md (lines: 30)
- Forbidden: requireActiveOrgId — docs/ORG_PHASE_PLAN.md (lines: 31)
- Forbidden: deprecated Org model usage — docs/ORG_PHASE_PLAN.md (lines: 1, 3, 30, 48, 53, 59, 62, 68, 70, 98, 108, 140)
- Forbidden: deprecated OrgMembership usage — docs/ORG_PHASE_PLAN.md (lines: 53)
- Forbidden: legacy SavedView usage — docs/ORG_PHASE_PLAN.md (lines: 53)
- Forbidden: deprecated Org model usage — docs/ORG_UI_RULES.md (lines: 1, 3, 52, 54, 56)
- Forbidden: deprecated Org model usage — docs/dev/api-debug-overlay.md (lines: 41, 43, 52)
- Forbidden: deprecated Org model usage — docs/loopbrain/FIXTURE_SCENARIOS.md (lines: 5, 7)
- Forbidden: deprecated Org model usage — docs/loopbrain/QUESTIONS_ROADMAP.md (lines: 1, 5, 92, 119, 124)
- Forbidden: deprecated Org model usage — docs/org/IMPLEMENTATION_STATUS.md (lines: 1)
- Forbidden: deprecated Org model usage — docs/org/L4-STEP2-IMPLEMENTATION.md (lines: 3, 78)
- Forbidden: deprecated Org model usage — docs/org/L4-STEP3-IMPLEMENTATION.md (lines: 3, 91, 109, 150, 151, 154, 176)
- Forbidden: deprecated Org model usage — docs/org/L4-STEP4-IMPLEMENTATION.md (lines: 158, 160, 169)
- Forbidden: deprecated Org model usage — docs/org/L4-STEP5-IMPLEMENTATION.md (lines: 164, 166, 175, 217)
- Forbidden: deprecated Org model usage — docs/org/L4-STEP6-REGRESSION-QA.md (lines: 3, 21, 87, 92, 97, 102, 110, 112, 116, 117, 121, 148)
- Forbidden: deprecated Org model usage — docs/org/L4-focused-fix-plan.md (lines: 21, 30, 184, 222)
- Forbidden: deprecated Org model usage — docs/org/ORG_GOLDEN_PATH_CHECKLIST.md (lines: 1, 4, 65, 158, 212, 254, 255)
- Forbidden: deprecated Org model usage — docs/org/ORG_LOOPBRAIN_CONSUMPTION.md (lines: 1, 5, 7, 13, 15, 139, 170, 172, 180, 199, 217, 230, 236, 255, 266, 272, 288, 290, 303, 304, 305, 311, 313, 335, 339, 345, 346, 347, 353, 364, 366, 368, 369, 370, 372)
- Forbidden: deprecated Org model usage — docs/org/ORG_LOOPBRAIN_QUESTIONS_MAP.md (lines: 1, 4, 5, 10, 23, 37, 38, 40, 47, 52, 62, 68, 81, 92, 93, 99, 107, 113, 127, 128, 130, 143, 157, 158, 164, 171, 172, 173, 174, 176, 181, 187, 191, 193)
- Forbidden: deprecated Org model usage — docs/org/ORG_READ_MODEL.md (lines: 1, 5, 15, 31, 41, 47, 65, 69, 72, 78, 83, 93, 102, 110, 116, 118, 120, 126, 129, 130, 132, 134, 138, 140, 154, 160)
- Forbidden: deprecated Org model usage — docs/org/ORG_V1_DECISION.md (lines: 1, 3, 5, 11, 21, 22, 23, 24, 29, 30, 31, 32, 34, 41, 43, 51, 57, 61, 63, 69)
- Forbidden: deprecated Org model usage — docs/org/ORG_V1_DECLARATION.md (lines: 1, 3, 5, 7, 9, 11, 15, 17, 21, 74, 80, 82)
- Forbidden: deprecated Org model usage — docs/org/PROJECT_ACCOUNTABILITY_RULES.md (lines: 20, 21, 22, 23, 30, 35, 46)
- Forbidden: deprecated Org model usage — docs/org/README.md (lines: 1, 3)
- Forbidden: deprecated Org model usage — docs/org/failure-analysis/L4-step10-category-c-fixes.md (lines: 10, 16, 18, 22, 24, 27, 55, 112, 114, 131, 146, 182, 184, 194)
- Forbidden: deprecated Org model usage — docs/org/failure-analysis/L4-step11-configurable-bundling.md (lines: 1, 10, 16, 92, 123, 165, 186, 198)
- Forbidden: deprecated Org model usage — docs/org/failure-analysis/L4-step12-qa-dashboard.md (lines: 1, 10, 16, 48, 62, 71, 92, 101, 102, 120, 149, 170, 188)
- Forbidden: deprecated Org model usage — docs/org/failure-analysis/L4-step13-drill-down.md (lines: 10)
- Forbidden: deprecated Org model usage — docs/org/failure-analysis/L4-step14-runtime-status-sync.md (lines: 10, 229)
- Forbidden: deprecated Org model usage — docs/org/failure-analysis/L4-step15-qa-export.md (lines: 1, 10, 97, 100, 112)
- Forbidden: deprecated Org model usage — docs/org/failure-analysis/L4-step18-smoke-route.md (lines: 1, 10, 16, 35, 36, 37, 47, 91, 97, 103, 119, 137)
- Forbidden: deprecated Org model usage — docs/org/failure-analysis/L4-step19-run-all-control.md (lines: 1, 10, 53)
- Forbidden: deprecated Org model usage — docs/org/failure-analysis/L4-step20-per-question-run.md (lines: 10)
- Forbidden: deprecated Org model usage — docs/org/failure-analysis/L4-step21-catalog-refactor.md (lines: 1, 10, 16, 20, 70, 186)
- Forbidden: deprecated Org model usage — docs/org/failure-analysis/L4-step7-root-causes.md (lines: 5, 54, 113, 114, 134, 136, 184)
- Forbidden: deprecated Org model usage — docs/org/failure-analysis/L4-step8-category-a-fixes.md (lines: 107, 114)
- Forbidden: deprecated Org model usage — docs/org/failure-analysis/L4-step9-category-b-fixes.md (lines: 16, 36, 124, 154, 172)
- Forbidden: deprecated Org model usage — docs/org/failure-analysis/L5-step1-context-types.md (lines: 1, 10, 62, 109, 113, 143, 161, 183, 218, 271)
- Forbidden: deprecated Org model usage — docs/org/org-flows-qa-checklist.md (lines: 1, 3, 9, 12, 80, 139, 140, 141, 160)
- Forbidden: deprecated Org model usage — docs/org/org-loopbrain-smoke-test-log.md (lines: 1, 3, 7, 17, 18, 19, 39, 52, 54, 59, 103, 143, 149, 155, 161, 183, 184, 188, 189, 207)
- Forbidden: deprecated Org model usage — docs/org-context.md (lines: 1, 3, 8, 9, 49, 212, 213, 215, 222, 235)
- Forbidden: deprecated Org model usage — docs/org-performance-notes.md (lines: 1, 3, 7, 9, 36)

## Hardcoded / Placeholder Signals (Kill List Candidates)

- Hardcode signal: mock/stub/placeholder keywords — src/app/org/chart/OrgChartClient.tsx (lines: 184, 185)
- Hardcode signal: TODO/FIXME — src/app/org/chart/OrgChartClient.tsx (lines: 67, 70, 71, 72)
- Hardcode signal: mock/stub/placeholder keywords — src/app/org/chart/OrgChartView.tsx (lines: 76, 77)
- Hardcode signal: TODO/FIXME — src/app/org/people/PeoplePageClient.tsx (lines: 266, 283, 287, 510, 517, 836)
- Hardcode signal: mock/stub/placeholder keywords — src/components/org/DepartmentLoopbrainPanel.tsx (lines: 53)
- Hardcode signal: mock/stub/placeholder keywords — src/components/org/OrgAskLoopbrainPanel.tsx (lines: 75)
- Hardcode signal: mock/stub/placeholder keywords — src/components/org/OrgPersonLoopbrainPanel.tsx (lines: 53)
- Hardcode signal: mock/stub/placeholder keywords — src/components/org/OrgQaPanel.tsx (lines: 25, 33, 41, 49)
- Hardcode signal: mock/stub/placeholder keywords — src/components/org/OrgQaStatusPill.tsx (lines: 16, 27)
- Hardcode signal: mock/stub/placeholder keywords — src/components/org/RoleLoopbrainPanel.tsx (lines: 53)
- Hardcode signal: mock/stub/placeholder keywords — src/components/org/TeamLoopbrainPanel.tsx (lines: 50)
- Hardcode signal: mock/stub/placeholder keywords — src/components/org/create-role-card-dialog.tsx (lines: 128, 143, 163, 183, 200)
- Hardcode signal: mock/stub/placeholder keywords — src/components/org/department-form.tsx (lines: 177, 190)
- Hardcode signal: mock/stub/placeholder keywords — src/components/org/entities/DomainsManager.tsx (lines: 58, 67)
- Hardcode signal: mock/stub/placeholder keywords — src/components/org/entities/SystemsManager.tsx (lines: 58, 67)
- Hardcode signal: mock/stub/placeholder keywords — src/components/org/feedback/OrgFeedbackDialog.tsx (lines: 91)
- Hardcode signal: mock/stub/placeholder keywords — src/components/org/health/deepdives/OwnershipDeepDive.tsx (lines: 75, 205)
- Hardcode signal: mock/stub/placeholder keywords — src/components/org/health/setup/SetupWizard.tsx (lines: 86, 166, 470, 845, 915, 917, 919)
- Hardcode signal: mock/stub/placeholder keywords — src/components/org/invite-member-form.tsx (lines: 76)
- Hardcode signal: mock/stub/placeholder keywords — src/components/org/invite-user-dialog.tsx (lines: 120)
- Hardcode signal: TODO/FIXME — src/components/org/people/ActivityMiniTimeline.tsx (lines: 19, 33)
- Hardcode signal: TODO/FIXME — src/components/org/people/CompareModal.tsx (lines: 73)
- Hardcode signal: TODO/FIXME — src/components/org/people/Connections.tsx (lines: 35, 40)
- Hardcode signal: TODO/FIXME — src/components/org/people/DetailsGrid.tsx (lines: 202)
- Hardcode signal: mock/stub/placeholder keywords — src/components/org/people/EditProfileForm.tsx (lines: 102, 127, 147)
- Hardcode signal: mock/stub/placeholder keywords — src/components/org/people/PeopleActionsMenu.tsx (lines: 33)
- Hardcode signal: TODO/FIXME — src/components/org/people/PeopleCardsGrid.tsx (lines: 65, 75)
- Hardcode signal: mock/stub/placeholder keywords — src/components/org/people/PeopleControls.tsx (lines: 65, 69)
- Hardcode signal: mock/stub/placeholder keywords — src/components/org/people/PeopleDirectoryHeader.tsx (lines: 68, 69)
- Hardcode signal: mock/stub/placeholder keywords — src/components/org/people/PeopleFiltersBar.tsx (lines: 123, 128)
- Hardcode signal: TODO/FIXME — src/components/org/people/PeopleInsights.tsx (lines: 20, 55)
- Hardcode signal: TODO/FIXME — src/components/org/people/PeopleInsightsPanel.tsx (lines: 101, 105, 116, 154)
- Hardcode signal: TODO/FIXME — src/components/org/people/PersonProfileDrawer.tsx (lines: 123, 126)
- Hardcode signal: mock/stub/placeholder keywords — src/components/org/people/PersonProfilePanel.tsx (lines: 232, 267)
- Hardcode signal: TODO/FIXME — src/components/org/people/ReportingChain.tsx (lines: 31)
- Hardcode signal: mock/stub/placeholder keywords — src/components/org/people/RolePicker.tsx (lines: 8, 27)
- Hardcode signal: mock/stub/placeholder keywords — src/components/org/people/SavedViewsDropdown.tsx (lines: 283, 319)
- Hardcode signal: mock/stub/placeholder keywords — src/components/org/people/ShortlistModal.tsx (lines: 56)
- Hardcode signal: mock/stub/placeholder keywords — src/components/org/people/SkillPicker.tsx (lines: 50)
- Hardcode signal: TODO/FIXME — src/components/org/people/profile/PersonProfile.tsx (lines: 204, 205)
- Hardcode signal: mock/stub/placeholder keywords — src/components/org/position-form-simple.tsx (lines: 182, 207, 235)
- Hardcode signal: mock/stub/placeholder keywords — src/components/org/position-form.tsx (lines: 188, 200, 240, 258)
- Hardcode signal: mock/stub/placeholder keywords — src/components/org/role-card-form.tsx (lines: 237, 265, 295, 333, 348, 367, 401)
- Hardcode signal: mock/stub/placeholder keywords — src/components/org/role-form.tsx (lines: 223, 235, 275, 295, 316, 362, 405, 448, 497, 507, 517)
- Hardcode signal: mock/stub/placeholder keywords — src/components/org/settings/CustomRolesSection.tsx (lines: 149, 162, 177)
- Hardcode signal: TODO/FIXME — src/components/org/settings/DangerZoneSection.tsx (lines: 91)
- Hardcode signal: TODO/FIXME — src/components/org/settings/GeneralSettingsSection.tsx (lines: 22, 44)
- Hardcode signal: mock/stub/placeholder keywords — src/components/org/structure/CreateDepartmentDialog.tsx (lines: 170, 171, 187, 188)
- Hardcode signal: mock/stub/placeholder keywords — src/components/org/structure/CreateRoleDialog.tsx (lines: 174, 175, 191, 192, 211, 212)
- Hardcode signal: mock/stub/placeholder keywords — src/components/org/structure/CreateTeamDialog.tsx (lines: 195, 196, 248, 249)
- Hardcode signal: mock/stub/placeholder keywords — src/components/org/structure/normalize.ts (lines: 36)
- Hardcode signal: mock/stub/placeholder keywords — src/components/org/structure/utils.ts (lines: 40)
- Hardcode signal: mock/stub/placeholder keywords — src/components/org/team-form.tsx (lines: 111, 134, 146)
- Hardcode signal: mock/stub/placeholder keywords — src/components/org/user-assignment-modal.tsx (lines: 180)
- Hardcode signal: mock/stub/placeholder keywords — src/components/org/user-profile-form.tsx (lines: 309, 321, 332, 342, 353, 375, 396, 439, 482, 535, 560, 628, 638, 648)
- Hardcode signal: mock/stub/placeholder keywords — src/server/org/health/compute.ts (lines: 80)
- Hardcode signal: mock/stub/placeholder keywords — src/server/org/import/validators.ts (lines: 6)

## Recommended Next Actions

1) Phase 1.2 — Schema truth: confirm required tables exist; add migrations where missing (no defensive fallbacks).
2) Phase 1.3/1.4 — API route backbone: ensure all /api/org routes follow getUnifiedAuth → assertAccess → setWorkspaceContext → Prisma.
3) Phase 1.5 — UI wiring: remove remaining hardcoded data; UI reads via /api/org only.
4) Phase 2 — Add minimal availability inputs/states to satisfy the missing MVP question.
