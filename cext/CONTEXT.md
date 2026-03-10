# CONTEXT.md — AI Session Context Loader

> **Read this file first in every AI-assisted session.**
> It tells you which files to load based on what you're about to do.

---

## Always Include

Every session, regardless of task type:

```
RULES.md          — Non-negotiable development constraints
ARCHITECTURE.md   — System architecture and module boundaries
```

Read both before writing any code.

---

## By Task Type

### API Route / Backend Work

```
RULES.md
ARCHITECTURE.md
features/[relevant-feature].md    — If working on a specific module
```

**Before you start:** Check `src/lib/validations/` for existing Zod schemas. Check `src/app/api/` for the nearest existing route in the same module — match its pattern exactly.

### Frontend / UI Component

```
RULES.md
ARCHITECTURE.md
features/[relevant-feature].md
```

**Before you start:** Check `src/components/ui/` for existing shadcn primitives. Check the target module's component directory for existing patterns. Use `cn()` for classNames, `cva` for variants, org tokens for org module styling.

### Prisma Schema / Database Changes

```
RULES.md
ARCHITECTURE.md
```

**Before you start:** Review the new model checklist in RULES.md §3. Verify the model will be added to `WORKSPACE_SCOPED_MODELS`. Consider Loopbrain accessibility per RULES.md §2.

### Loopbrain / AI Changes

```
RULES.md
ARCHITECTURE.md
features/loopbrain.md
```

**Before you start:** Understand the dual execution path (agent-loop vs orchestrator). Check existing tools in `src/lib/loopbrain/agent/tool-registry.ts` before creating new ones. Never modify canonical contracts without approval.

### Security / Auth Changes

```
RULES.md
ARCHITECTURE.md
```

**Before you start:** This touches stable seams. Full test suite required after changes. Do not create alternative auth patterns.

### Cross-Module Integration

```
RULES.md
ARCHITECTURE.md
features/[source-module].md
features/[target-module].md
```

**Before you start:** Review the integration matrix in ARCHITECTURE.md. Modules communicate via API routes or shared service functions — not direct cross-module imports (exception: Loopbrain context builders).

---

## Feature Files

One file per major module. Include only when working on that module.

| File | When to Include |
|------|----------------|
| `features/spaces.md` | Wiki pages, collaborative editing, spaces, project containers |
| `features/org.md` | People, teams, departments, positions, capacity, decisions, health |
| `features/loopbrain.md` | AI agent, tools, context sources, contracts, reasoning pipelines, policies |
| `features/dashboard.md` | Home page, widgets, bootstrap, activity feed |
| `features/projects.md` | Project management, tasks, epics, milestones, boards |
| `features/integrations.md` | Gmail, Calendar, Slack, Google Drive OAuth and sync |
| `features/onboarding.md` | Workspace setup wizard, first-time user flow |

<!-- Parked: goals.md — to be generated when Goals module work begins -->

---

## Skills Files

Reusable execution patterns. Include when performing that type of work.

| File | When to Include |
|------|----------------|
| `skills/api-route.md` | Creating or modifying any API route |
| `skills/prisma-model.md` | Adding or changing database models |
| `skills/loopbrain-tool.md` | Adding a new Loopbrain agent tool |
| `skills/ui-component.md` | Building new UI components |
| `skills/integration.md` | Adding external service integrations |

---

## File Locations

All context files live in the project root under `/cext/`:

```
/cext/
├── CONTEXT.md              ← You are here
├── RULES.md                ← Always include
├── ARCHITECTURE.md         ← Always include
├── features/
│   ├── spaces.md
│   ├── org.md
│   ├── loopbrain.md
│   ├── dashboard.md
│   ├── projects.md
│   ├── integrations.md
│   └── onboarding.md
└── skills/
    ├── api-route.md
    ├── prisma-model.md
    ├── loopbrain-tool.md
    ├── ui-component.md
    └── integration.md
```

---

## Prompt Template

When starting a Cursor Composer or Claude Code session, use this pattern:

```
@cext/CONTEXT.md @cext/RULES.md @cext/ARCHITECTURE.md @cext/features/[module].md

[Your task description here]
```

For tasks touching multiple modules:

```
@cext/CONTEXT.md @cext/RULES.md @cext/ARCHITECTURE.md @cext/features/[module-a].md @cext/features/[module-b].md

[Your task description here]
```

---

*This file is the entry point. If you're an AI reading this: load the files listed for your task type before writing any code.*