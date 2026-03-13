# Loopwell Design System Specification

> **Purpose**: Single source of truth for UI redesign. Use this document as the reference when implementing design changes across the Loopwell codebase.
>
> **Source**: Extracted from v0.dev prototypes (March 6, 2026) — Dashboard, Spaces, and Org/People views.
>
> **Stack**: Next.js 15, React 19, Tailwind CSS, shadcn/ui, Lucide icons, cva (class-variance-authority)

---

## 1. Layout Architecture

### 1.1 Global Layout Pattern

```
┌─────────────────────────────────────────────────────────┐
│  GlobalNav (fixed, h-12, z-50, full width)              │
├──────────┬──────────────────────────────────────────────┤
│ Module   │  PageHeader (border-b, bg-card, px-6 py-4)  │
│ Sidebar  ├──────────────────────────────────────────────┤
│ (200px)  │                                              │
│ optional │  Content Area (flex-1, overflow-y-auto)      │
│          │  padding: p-6, max-w: 1400px                 │
│          │                                              │
└──────────┴──────────────────────────────────────────────┘
```

### 1.2 WorkspaceLayout Shell

```tsx
// Root: flex flex-col h-screen bg-background overflow-hidden
// GlobalNav: fixed top-0, h-12
// Body: flex flex-1 pt-12 overflow-hidden
// Sidebar: conditional, left side
// Main: flex-1 flex flex-col min-w-0 overflow-hidden
```

**Three layout modes:**

| Mode | When | Sidebar | Content Width |
|------|------|---------|---------------|
| Full width | Dashboard, Loopbrain | None | 100% (max-w-[1400px]) |
| Module sidebar | Org module | 200px, border-r | Remaining space |
| Tree sidebar | Spaces module | 200px, border-r, with tree nav | Remaining space |

### 1.3 Dimensions

| Element | Value |
|---------|-------|
| GlobalNav height | `h-12` (48px) |
| Module sidebar width | `w-[200px]` |
| Content padding | `p-6` (24px) |
| Content max-width | `max-w-[1400px]` or `max-w-6xl` (1152px) |
| Page header padding | `px-6 py-4` |

---

## 2. GlobalNav (Top Navigation Bar)

### 2.1 Structure

```tsx
// Container: fixed top-0 left-0 right-0 z-50
//   flex items-center h-12 px-4
//   bg-background border-b border-border
```

### 2.2 Sections

**Left — Logo + Workspace Name:**
```tsx
// Logo: w-6 h-6 rounded bg-primary text-primary-foreground
//   font-semibold text-[11px], centered
// Workspace name: text-[13px] font-medium text-foreground
// Gap: gap-2.5, margin-right: mr-8
```

**Center — Navigation Tabs:**
```tsx
// Container: flex items-center gap-1
// Each tab: px-3 py-1.5 text-[13px] rounded-md transition-colors
// Active: text-foreground bg-accent font-medium
// Inactive: text-muted-foreground hover:text-foreground hover:bg-accent/50
```

**Right — Actions:**
```tsx
// Container: flex items-center gap-1 ml-auto
// Icon buttons: variant="ghost" h-8 w-8
//   text-muted-foreground hover:text-foreground
// Notification dot: absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-primary rounded-full
// Avatar: h-7 w-7, in ghost button h-8 w-8 rounded-full p-0 ml-1
// Avatar fallback: text-[10px] bg-accent text-accent-foreground
```

### 2.3 Active Tab Tabs

- **Dashboard**, **Spaces**, **Org** — these are the three primary modules
- Active tab uses `bg-accent font-medium text-foreground`
- Inactive uses `text-muted-foreground` with hover states

---

## 3. Page Header

### 3.1 Structure

```tsx
// Container: flex items-center justify-between px-6 py-4 border-b border-border bg-card
// Title: text-lg font-semibold text-foreground tracking-tight
// Description: text-sm text-muted-foreground mt-0.5
// Actions: flex items-center gap-2 (right side)
```

### 3.2 Primary Action Button Pattern

```tsx
// Standard page action: size="sm" className="h-8 gap-1.5 text-sm"
// Icon inside: h-4 w-4 (for Plus icon etc.)
// Uses default Button (primary variant) for main CTA
// Uses variant="outline" for secondary actions (e.g., "Customize")
```

---

## 4. Module Sidebars

### 4.1 Org Sidebar

```tsx
// Container: w-[200px] flex-shrink-0 border-r border-border bg-card h-full overflow-y-auto
// Nav padding: py-3
```

**Section Labels:**
```tsx
// text-[10px] font-medium text-muted-foreground/60 uppercase tracking-widest
// Container: px-3 mb-1.5
```

**Nav Items:**
```tsx
// Container: flex items-center gap-2 px-3 py-1.5 mx-2 text-[13px] rounded-md
// Active: bg-accent/70 text-foreground font-medium
// Active icon: text-primary
// Inactive: text-muted-foreground hover:bg-accent/50 hover:text-foreground
// Inactive icon: text-muted-foreground/70
// Icon size: w-[14px] h-[14px]
```

**Section Spacing:**
```tsx
// Section gap: mb-4 (between sections), mt-5 (for non-first sections)
// Item spacing: space-y-0.5
```

### 4.2 Org Sidebar Navigation Structure

```
[no section label]
  My Profile          → /org/profile      (User icon)
  My Team             → /org/team         (Users icon)

ORGANIZATION
  Org Chart           → /org/chart        (Network icon)
  People              → /org/people       (Users icon)
  Capacity            → /org/capacity     (BarChart3 icon)

ADMIN
  Management          → /org/management   (Shield icon)
  Health              → /org/health       (Activity icon)
  Settings            → /org/settings     (Settings icon)
```

### 4.3 Spaces Sidebar

```
Search bar            → Search input at top
MY SPACE              → with + button
  My Work             (active state)
  Personal Notes
  Drafts
TEAM SPACES           → with + button
  Engineering         (expandable folder)
  Design              (expandable folder)
  Marketing           (expandable folder)
  Product             (expandable folder)
SHARED                → with + button
  Company Wiki
  Templates
```

Tree navigation with expand/collapse chevrons on folders.

---

## 5. Typography Scale

| Usage | Classes |
|-------|---------|
| Page title | `text-lg font-semibold tracking-tight` |
| Section heading | `text-sm font-medium text-foreground` |
| Nav tab | `text-[13px]` (active: `font-medium`) |
| Nav item | `text-[13px]` |
| Sidebar section label | `text-[10px] font-medium uppercase tracking-widest` |
| Logo text | `text-[13px] font-medium` |
| Logo letter | `text-[11px] font-semibold` |
| Body text | `text-sm` (14px) |
| Small/meta text | `text-xs` (12px) |
| Stat card value | `text-2xl font-semibold tracking-tight` |
| Stat card label | `text-sm text-muted-foreground` |
| Stat card subtext | `text-xs text-muted-foreground` |
| Table header | `text-xs font-medium text-muted-foreground` |
| Table body | `text-sm` |
| Table email | `text-xs text-muted-foreground` |
| Avatar fallback | `text-[10px]` |
| Badge text | `text-xs font-medium` |

---

## 6. Color System

Uses shadcn/ui CSS variables (semantic tokens). All colors reference these variables:

| Token | Usage |
|-------|-------|
| `bg-background` | App background, content area |
| `bg-card` | Page header, sidebar, elevated surfaces |
| `bg-accent` | Active nav items, icon containers, hover states |
| `bg-accent/50` | Hover states (lighter) |
| `bg-accent/70` | Active sidebar items |
| `bg-primary` | Logo, primary buttons, notification dots |
| `text-foreground` | Primary text, active items |
| `text-muted-foreground` | Secondary text, inactive nav, descriptions |
| `text-muted-foreground/60` | Section labels |
| `text-muted-foreground/70` | Inactive icons |
| `text-primary` | Active sidebar icons |
| `text-primary-foreground` | Text on primary background |
| `text-accent-foreground` | Text/icons on accent background |
| `border-border` | All borders (nav bottom, sidebar right, cards, table rows) |

### 6.1 Accent Color

From v0 output: indigo range (`#6366F1` area — oklch based). This maps to shadcn/ui's `--primary` variable.

### 6.2 Status Badge Colors

| Status | Style |
|--------|-------|
| Active | Green — `bg-emerald-50 text-emerald-700 border-emerald-200` |
| Away | Amber — `bg-amber-50 text-amber-700 border-amber-200` |
| Offline | Gray — `bg-gray-100 text-gray-600 border-gray-200` |
| On Track | Green (same as Active) |
| At Risk | Red — `bg-red-50 text-red-700 border-red-200` |
| In Progress | Blue — `bg-blue-50 text-blue-700 border-blue-200` |
| In Review | Purple — `bg-purple-50 text-purple-700 border-purple-200` |
| Todo | Gray (same as Offline) |

---

## 7. Component Patterns

### 7.1 Stat Cards

```tsx
// Container: bg-card rounded-lg border border-border p-5
// Icon container: flex items-center justify-center w-9 h-9 rounded-lg bg-accent
// Icon: w-4 h-4 text-accent-foreground
// Label: text-sm text-muted-foreground (next to icon, gap-3)
// Value: text-2xl font-semibold text-foreground tracking-tight mb-1
// Subtext: text-xs text-muted-foreground
// Layout: Grid grid-cols-1 md:grid-cols-3 gap-4 mb-8
```

### 7.2 Widget Cards (Dashboard)

```tsx
// Container: bg-card rounded-lg border border-border
// Header: flex items-center justify-between p-4 pb-0
//   Icon + title: flex items-center gap-2
//   Icon: w-4 h-4 text-muted-foreground
//   Title: text-sm font-medium
//   Actions: icon buttons (refresh, expand) — ghost variant, h-7 w-7
// Content: p-4
// Grid: grid grid-cols-3 gap-4 (3x2 layout for dashboard)
```

### 7.3 Data Tables

```tsx
// Container: border border-border rounded-lg overflow-hidden
// Header row: bg-muted/30
//   Cell: text-xs font-medium text-muted-foreground px-4 py-3
// Body row: border-t border-border hover:bg-accent/30 transition-colors
//   Cell: px-4 py-3 text-sm
// Name cell: flex items-center gap-3
//   Avatar: h-8 w-8
//   Name: text-sm font-medium text-foreground
//   Email: text-xs text-muted-foreground
```

### 7.4 Status Badges

```tsx
// Container: inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
//   border variant (subtle): bg-{color}-50 text-{color}-700 border border-{color}-200
```

### 7.5 Project Health Banner

```tsx
// Container: bg-card rounded-lg border border-border p-4
// Layout: flex items-center justify-between
// Left: icon + text (project count, status summary)
// Right: stat values (on-time %, active tasks, avg cycle time) + "View Report" button
```

### 7.6 Working On Cards (Spaces)

```tsx
// Container: bg-card rounded-lg border border-border p-5
// Title: text-sm font-medium
// Description: text-xs text-muted-foreground
// Progress bar: h-1.5 rounded-full bg-muted, fill with bg-primary
// Meta row: avatar stack + time estimate
// Grid: grid grid-cols-3 gap-4
```

### 7.7 Activity Feed

```tsx
// Each item: flex gap, text-sm
// Actor: font-medium text-foreground
// Action verb: text-muted-foreground
// Target: text-primary (linked)
// Timestamp: text-xs text-muted-foreground
```

### 7.8 Empty States

```tsx
// Centered container with icon, title, description, CTA button
// Icon: text-muted-foreground, larger size (w-10 h-10)
// Title: text-sm font-medium
// Description: text-sm text-muted-foreground
// CTA: primary button
```

---

## 8. Spacing Scale

Based on Tailwind defaults, the v0 output uses these consistently:

| Token | Value | Usage |
|-------|-------|-------|
| `gap-0.5` | 2px | Between nav items (space-y-0.5) |
| `gap-1` | 4px | Between nav tabs, action buttons |
| `gap-1.5` | 6px | Button icon-to-text gap |
| `gap-2` | 8px | Nav item icon-to-label, logo elements |
| `gap-2.5` | 10px | Logo icon to workspace name |
| `gap-3` | 12px | Stat card icon to label, table name cell |
| `gap-4` | 16px | Grid gaps, card spacing, section spacing |
| `p-4` | 16px | Widget card padding, banner padding |
| `p-5` | 20px | Stat card padding, working-on card padding |
| `p-6` | 24px | Content area padding, page header horizontal |
| `mb-4` | 16px | Between sidebar sections |
| `mb-8` | 32px | Below stat cards row |
| `mt-5` | 20px | Top margin for non-first sidebar sections |
| `space-y-6` | 24px | Vertical gap between content sections |

---

## 9. Border & Shadow

| Element | Border |
|---------|--------|
| GlobalNav bottom | `border-b border-border` |
| Sidebar right | `border-r border-border` |
| Page header bottom | `border-b border-border` |
| Cards | `border border-border rounded-lg` |
| Table container | `border border-border rounded-lg` |
| Table rows | `border-t border-border` |

**Shadows:** None used in the v0 output. The design relies entirely on borders for elevation. This is intentional — keeps the UI flat and clean.

**Border radius:** `rounded-lg` (8px) for cards, `rounded-md` (6px) for nav items and buttons, `rounded-full` for badges and avatars.

---

## 10. Icon System

All icons from **Lucide React**.

| Context | Icon Size |
|---------|-----------|
| Sidebar nav items | `w-[14px] h-[14px]` |
| GlobalNav action buttons | `h-4 w-4` (16px) |
| Stat card icons | `w-4 h-4` inside `w-9 h-9` container |
| Widget card header icons | `w-4 h-4` |
| Button inline icons | `h-4 w-4` or `h-3.5 w-3.5` |
| Notification dot | `w-1.5 h-1.5` |

---

## 11. Implementation Mapping

### 11.1 Files to Create/Refactor

| New Component | Replaces | Location |
|---------------|----------|----------|
| `GlobalNav` | Current top nav implementation | `src/components/layout/GlobalNav.tsx` |
| `WorkspaceLayout` | Current per-module layout wrappers | `src/components/layout/WorkspaceLayout.tsx` |
| `PageHeader` | `OrgPageHeader` + other headers | `src/components/layout/PageHeader.tsx` |
| `ModuleSidebar` | `OrgSidebar` (generalized) | `src/components/layout/ModuleSidebar.tsx` |
| `StatCardRow` | Ad-hoc stat cards per page | `src/components/shared/StatCardRow.tsx` |
| `DataTable` | Various table implementations | `src/components/shared/DataTable.tsx` |
| `StatusBadge` | Various badge implementations | `src/components/shared/StatusBadge.tsx` |
| `WidgetCard` | Dashboard widget containers | `src/components/shared/WidgetCard.tsx` |
| `ActivityFeed` | Various activity displays | `src/components/shared/ActivityFeed.tsx` |

### 11.2 Existing Tokens File

Extend `src/components/org/ui/tokens.ts` into a global design system file at `src/lib/design-tokens.ts` that covers all modules, not just Org.

### 11.3 Tailwind Config Updates

Ensure these shadcn/ui CSS variables are properly configured in `tailwind.config.ts` and `globals.css`:

- `--background`, `--foreground`
- `--card`, `--card-foreground`
- `--accent`, `--accent-foreground`
- `--primary`, `--primary-foreground` (indigo/blue-violet)
- `--muted`, `--muted-foreground`
- `--border`
- `--destructive`, `--destructive-foreground`

---

## 12. Implementation Priority

1. **GlobalNav + WorkspaceLayout** — Every page uses these. Highest impact.
2. **PageHeader** — Used on every page. Unifies the top of every view.
3. **Org Sidebar refactor** — Already closest to v0 output; refine to match spec exactly.
4. **Stat cards + Status badges** — Shared across Org, Dashboard, Projects.
5. **Data tables** — People, Projects, Tasks, Goals all use tables.
6. **Dashboard widget grid** — High visibility page.
7. **Spaces sidebar + content** — Tree nav pattern.
8. **Activity feeds, empty states, loading skeletons** — Polish pass.

---

## 13. What NOT to Change

- **Prisma schema / API routes / backend logic** — This is purely a frontend reskin
- **Auth flow / middleware** — No changes
- **Loopbrain orchestration** — No changes to AI logic
- **TipTap editor** — Wiki editor internals stay as-is (container/chrome changes only)
- **react-d3-tree** — Org chart visualization stays; only style the node cards
- **Business logic in components** — Extract and preserve; only change presentation layer

---

*Last updated: March 6, 2026*
*Source: v0.dev prototypes + Loopwell codebase audit*