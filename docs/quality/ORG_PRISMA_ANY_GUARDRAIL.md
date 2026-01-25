# Org Prisma-Any Guardrail

## Why This Check Exists

The pattern `prisma as any` bypasses TypeScript's type safety, hiding potential runtime errors and making refactoring dangerous. In Org server modules (`src/server/org/**`), this pattern was historically used to explore which Prisma models exist at runtime.

This check prevents **new** `prisma as any` violations from being introduced while allowing existing legacy violations to be fixed incrementally.

## How the Baseline Works

The check uses a **baseline file** (`scripts/baselines/org-prisma-any.txt`) that lists all known violations:

```
src/server/org/contracts/build-org-snapshot-v1.ts:79
src/server/org/contracts/build-org-snapshot-v1.ts:80
...
```

**CI behavior:**
- Scans `src/server/org/**` for `prisma as any` patterns
- Compares current violations against the baseline
- **Passes** if no NEW violations (violations not in baseline)
- **Fails** if any NEW violation is found

This allows the codebase to have legacy debt while preventing it from growing.

## Commands

```bash
# Run the check (CI mode)
npm run check:org-prisma-any

# Update baseline after fixing violations (local only)
npm run check:org-prisma-any:update
```

## How to Fix Violations

When the check fails with a new violation:

1. **Preferred: Use typed Prisma models**
   ```typescript
   // Bad
   const result = await (prisma as any).someModel.findMany({...})
   
   // Good
   const result = await prisma.orgPosition.findMany({
     where: { workspaceId },
     select: { id: true, teamId: true },
   })
   ```

2. **If the model doesn't exist:** Check `prisma/schema.prisma` for the correct model name. Common mappings:
   - Team membership → `OrgPosition` (has `teamId`, `userId`)
   - Availability → `PersonAvailabilityHealth`
   - Departments/Teams → `OrgDepartment`, `OrgTeam`

3. **If truly unavoidable (rare):** Add to baseline locally and document why in a comment.

## Updating the Baseline

**Do NOT update baseline in CI.** The `--update-baseline` flag is blocked in CI environments.

To update locally after fixing violations:

```bash
# 1. Run the update command
npm run check:org-prisma-any:update

# 2. Review changes
git diff scripts/baselines/org-prisma-any.txt

# 3. Commit the updated baseline
git add scripts/baselines/org-prisma-any.txt
git commit -m "chore: update prisma-any baseline after fixing violations"
```

## Scope

Currently scans: `src/server/org/**`

This scope was chosen to focus on Org server modules where the pattern was most prevalent. Other parts of the codebase may still have `prisma as any` patterns that are not covered by this check.

## Troubleshooting

**"Baseline file not found"**
- Run `npm run check:org-prisma-any:update` locally
- Commit the generated file

**"--update-baseline is not allowed in CI"**
- Baseline updates must be done locally and committed
- This prevents accidentally hiding new violations

**False positive (violation is actually fixed)**
- The baseline may be stale
- Run `npm run check:org-prisma-any:update` locally to refresh
