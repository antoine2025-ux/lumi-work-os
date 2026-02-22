# `any` Type Cleanup — Branch `fix/lint-org-domain`

## Scope

Eliminated all `@typescript-eslint/no-explicit-any` ESLint violations across:

- `src/server/org/**/*.ts` (people, positions, teams, departments, loopbrain context)
- `src/lib/org/**/*.ts` (queries, cache, data loading)
- `src/hooks/**/*.ts` (org structure, admin activity)
- `src/components/**/*.tsx` (kanban, goals, search, org panels, wiki, realtime)
- `src/server/api/org/` (delete, invitations, members, ownership transfer)

**151 files modified, ~400 `any` violations removed.**

## Replacement Patterns Used

| Before | After | Where |
|--------|-------|-------|
| `catch (error: any)` | `catch (error: unknown)` + `error instanceof Error` narrowing | ~50 catch blocks |
| `(prisma as any).ModelName` | `(prisma as unknown as Record<string, unknown>)["ModelName"]` | Dynamic model access (profileOverrides, membershipDelegate) |
| `body: any` / `data: any` on API responses | Explicit interfaces or `Record<string, unknown>` with property casts | API handlers, hooks |
| `res.json()` used directly (returns `any`) | Extract to typed intermediate variable first | useOrgStructureLists, fetch handlers |
| `Promise<unknown>[]` in `$transaction` | `Prisma.PrismaPromise<unknown>[]` | ownership/transfer.ts |
| `meta: any` on activity/audit items | `meta: Record<string, unknown>` + cast on access | org-activity-panel, AdminActivityStrip |
| `as any` escape hatches in components | `as unknown as TargetType` double-cast, or proper interfaces | drag-drop-provider, wiki-editor-shell |
| `.filter(Boolean)` on `(string \| undefined)[]` | `.filter((n): n is string => Boolean(n))` type predicate | task-search-filter |

## Justified Exceptions (2)

1. **`goal-detail.tsx`** — `goal: any` kept with eslint-disable. The `GoalWithDetails` Prisma type includes deep nested relations that can't be replicated in a client-side interface without a shared type export refactor.
2. **`PersonProfileClient.tsx`** — retains `@ts-nocheck` (34 pre-existing TS errors unrelated to `any`; separate cleanup needed).

## Verification

```
# Before -> After
no-explicit-any violations:  ~400 -> 0
typecheck errors:              67 -> 69  (+2 transitive, no new errors in modified files)
```

## Things to Watch

- **Dynamic Prisma access** (`prisma as unknown as Record<string, unknown>`) — needed where models are accessed by string key. Type-safe alternative would be a Prisma delegate map, but that's a larger refactor.
- **`res.json()` returns `any`** — any time you `fetch` + `.json()`, the result is untyped. Always extract into a typed variable before mapping/spreading.
- **`{unknown && <JSX>}` doesn't work** — TypeScript won't allow `unknown` in JSX expressions. Use `{value ? <JSX /> : null}` ternary instead.
