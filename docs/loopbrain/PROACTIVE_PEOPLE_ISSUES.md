# Loopbrain: Proactive People-Issues (Cron / Job)

Proactive runs compute people_issues suggestions on a schedule and store them (suggest-only). Apply remains explicit via `POST /api/org/issues/apply`.

## Internal API

**POST /api/internal/loopbrain/people-issues/run**

- **Body:** `{ "workspaceId": "..." }` or `{ "workspaceIds": ["...", "..."] }`
- **Auth:** Set `LOOPBRAIN_CRON_SECRET` or `CRON_SECRET` in the environment. Send it in the request:
  - Header `x-cron-secret: <secret>` or
  - Header `Authorization: Bearer <secret>`
- If the secret is not set in **production**, the route returns 403. In **development**, if no secret is set, the route allows the request (for local testing).

## Rollout and safety

- For each workspace, the runner checks **OrgLoopBrainRollout** (scope `people_issues`). If rollout is disabled or not configured, the run is skipped for that workspace.
- The engine runs in suggest-only mode: it writes to **OrgSuggestionRun** only. No OrgPosition or other data is updated.
- Apply continues to require an explicit call to `POST /api/org/issues/apply` with user auth and `requireEdit`.

## Scheduling

- Use a cron (e.g. Vercel Cron, GitHub Actions, or node-cron) to call this endpoint periodically (e.g. daily).
- Example (Vercel): add to `vercel.json`:
  ```json
  "crons": [{ "path": "/api/internal/loopbrain/people-issues/run", "schedule": "0 6 * * *" }]
  ```
  and ensure the cron runner sends the secret header.
- Or call from an external scheduler (e.g. cron job on a server) with `curl -X POST -H "x-cron-secret: $LOOPBRAIN_CRON_SECRET" -H "Content-Type: application/json" -d '{"workspaceId":"..."}' https://your-app/api/internal/loopbrain/people-issues/run`.

## Server module

- **runPeopleIssuesSuggestionsForOrg** in `src/server/loopbrain/runPeopleIssuesSuggestions.ts` — checks rollout, loads positions, runs the engine, creates OrgSuggestionRun. Can be called from the API route or from another server-side job.
