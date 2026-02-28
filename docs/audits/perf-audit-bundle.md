# Next.js Bundle Size Audit

**Date:** 2026-02-28
**Auditor:** Claude Code
**Build:** `NODE_OPTIONS=--max-old-space-size=8192 npm run build`
**Analyzer status:** `@next/bundle-analyzer` installed — interactive treemap requires `ANALYZE=true npm run build` with ≥8 GB Node heap (OOM at default 1.5 GB)

---

## Executive Summary

**Critical finding:** Every route in the app pays **769 kB of First Load JS** before any page-specific code is added. This is caused by a custom `webpack.optimization.splitChunks` config in `next.config.ts` that collapses all vendor packages into two mega-chunks instead of using Next.js's default granular code splitting. Combined with several heavy libraries loaded eagerly on core routes, the result is that the first paint of any authenticated page ships ≥769 kB of JavaScript.

**Industry target:** ≤150 kB First Load JS (Next.js recommendation); ≤250 kB for complex apps.
**Current baseline:** 769 kB (3–5× over target).

---

## Top 5 Routes by First Load JS Payload

All routes share 769 kB baseline. The table below shows route-specific chunk + total First Load JS.

| Rank | Route | Page Chunk | **Total First Load JS** |
|------|-------|-----------|------------------------|
| 1 | `/w/[workspaceSlug]/goals/[goalId]` | 11.7 kB | **781 kB** |
| 2 | `/w/[workspaceSlug]/org/people/[personId]` | 11 kB | **780 kB** |
| 3 | `/w/[workspaceSlug]/org/admin/health` | 9.28 kB | **779 kB** |
| 4 | `/w/[workspaceSlug]/org/admin/settings` | 8.27 kB | **778 kB** |
| 5 | `/w/[workspaceSlug]/settings` | 8.06 kB | **777 kB** |

> Note: The effective heaviest routes are all org/people detail views. The page-specific deltas (8–12 kB) are modest — the 769 kB shared baseline is the real problem.

**Shared chunk breakdown:**
```
chunks/common-caa0aba618baa320.js     513 kB   ← all "common" imports (2+ pages)
chunks/vendors-85869e7a74cb7ac8.js    253 kB   ← all node_modules
other shared chunks                   2.75 kB
```

---

## P0 — Root Cause: Broken splitChunks Override

**File:** `next.config.ts:34-51`

```ts
// CURRENT — causes 769 kB shared chunk
webpack: (config, { dev, isServer }) => {
  if (!dev && !isServer) {
    config.optimization.splitChunks = {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',       // ← single chunk for ALL node_modules
          chunks: 'all',
        },
        common: {
          name: 'common',
          minChunks: 2,          // ← any module used by 2+ pages goes here
          chunks: 'all',
          enforce: true,
        },
      },
    };
  }
  return config;
},
```

This overrides Next.js's built-in chunk strategy and packs all 250+ dependencies into `vendors` (253 kB) and every shared component into `common` (513 kB).

**Fix:** Remove the entire `webpack` block. Next.js 15's default chunking (per-package vendor splitting + granular shared chunks) will automatically produce smaller per-route payloads. Estimated savings: **300–450 kB off the shared baseline**.

---

## P1 — Dependencies to Replace or Lazy-Load

### Heavy Dependencies Found in `package.json`

| Package | Disk Size | Used In | Issue |
|---------|-----------|---------|-------|
| `lowlight` | 7.4 MB | `tiptap-editor.tsx` (syntax highlighting) | Eagerly imported in wiki editor; all 200+ language grammars load even if no code blocks are on page |
| `recharts` | 7.7 MB | `project-reports.tsx`, `OrgInsightsDeptHeadcountChart.tsx`, `OrgInsightsJoinTrendChart.tsx` | Charts imported statically in org insights; not behind dynamic import |
| `@tiptap/*` (8 packages) | 7.2 MB total | `tiptap-editor.tsx`, `wiki-editor-shell.tsx`, `rich-text-editor.tsx` | Full editor bundle loaded on every wiki page view, not just edit mode |
| `framer-motion` | 3.0 MB | 17 files (org structure, project sidebar, landing, celebration) | Used pervasively for `motion`/`AnimatePresence` across org routes — no lazy loading |
| `@uiw/react-md-editor` | 12 MB (disk) | Not directly imported in any component found | Likely orphaned dependency — verify before removing |
| `socket.io-client` | 1.5 MB | `src/lib/realtime/socket-client.ts` | Only used on realtime routes; check if it's in the shared chunk |
| `react-d3-tree` | 204 kB | `OrgChartTreeView.tsx` | Loaded on `/org/chart` without dynamic import |
| `googleapis` | 189 MB (disk) | `src/lib/google-calendar.ts`, `api/calendar/events/route.ts` | Server-only — verify it doesn't leak into client bundle |

### Lighter Alternatives

| Current | Alternative | Est. Savings |
|---------|-------------|-------------|
| `lowlight` (all langs) | Import only needed languages: `import { javascript, typescript, python } from 'lowlight'` | ~6 MB tree-shaken |
| `recharts` (full) | Already tree-shaken by ESM, but wrap all chart components in `next/dynamic` | Removes recharts from shared baseline |
| `framer-motion` | For simple fade/slide: CSS `@keyframes` or Tailwind `animate-*` | Removes 3 MB from shared chunk |
| `@uiw/react-md-editor` | If unused: `npm remove @uiw/react-md-editor` | 12 MB package removed |

---

## P2 — Missing `next/dynamic` Wrappers

These components load heavy libraries eagerly and should use `next/dynamic` with `ssr: false`:

### 1. TipTap Editor — Wiki Page Client (HIGHEST IMPACT)
**File:** `src/app/(dashboard)/wiki/[slug]/wiki-page-client.tsx:6-7`

```ts
// CURRENT — loads full TipTap stack on every wiki page (view AND edit)
import { RichTextEditor } from "@/components/wiki/rich-text-editor"
import { WikiEditorShell } from "@/components/wiki/wiki-editor-shell"
```

The `WikiEditorShell` transitively pulls in `tiptap-editor.tsx` which imports all tiptap extensions + `lowlight`. This runs even when users are just viewing a page (not editing).

**Fix:** The `WikiEditor` dynamic export already exists in `lazy-components.tsx`. Route the wiki page to use `WikiEditorShell` only when `isEditing === true`, and load it via dynamic import:
```ts
const WikiEditorShell = dynamic(
  () => import('@/components/wiki/wiki-editor-shell').then(m => ({ default: m.WikiEditorShell })),
  { ssr: false, loading: () => <div className="animate-pulse bg-gray-100 h-64 rounded-lg" /> }
)
```

### 2. OrgChartTreeView — react-d3-tree (NOT lazy-loaded)
**File:** `src/app/org/chart/OrgChartClient.tsx:13`

```ts
// CURRENT — loads react-d3-tree eagerly on /org/chart
import { OrgChartTreeView } from "@/components/org/OrgChartTreeView";
```

`OrgChartTreeView` is a `"use client"` component that directly imports `react-d3-tree`. The org chart page loads it statically.

**Fix:**
```ts
const OrgChartTreeView = dynamic(
  () => import('@/components/org/OrgChartTreeView').then(m => ({ default: m.OrgChartTreeView })),
  { ssr: false, loading: () => <div className="animate-pulse bg-gray-100 h-96 rounded-lg" /> }
)
```

### 3. Recharts Org Insights — Not Lazy-Loaded
**File:** `src/components/org/insights/OrgInsightsChartsSection.tsx:5-6`

```ts
// CURRENT — recharts loaded eagerly in org insights (no dynamic import)
import { OrgInsightsDeptHeadcountChart } from "./OrgInsightsDeptHeadcountChart";
import { OrgInsightsJoinTrendChart } from "./OrgInsightsJoinTrendChart";
```

**Fix:** Wrap both chart components in `next/dynamic` in `OrgInsightsChartsSection.tsx`.

### 4. Framer-Motion in Org Structure List Views
**Files:**
- `src/components/org/structure/OrgStructureListView.tsx:4` — `motion`, `AnimatePresence`
- `src/components/org/structure/OrganizationStructureSection.tsx:4` — `motion`, `AnimatePresence`
- `src/components/org/OrgPageTransition.tsx:3` — `motion`
- `src/components/projects/project-sidebar.tsx:19` — `motion`, `AnimatePresence`

These are not behind dynamic imports. Since framer-motion 12 supports tree-shaking via ESM, these won't bloat the bundle by themselves — but combined with the broken `splitChunks`, they end up in the `common` chunk shared by all pages.

**Fix (if not removing framer-motion):** No dynamic import needed once `splitChunks` override is removed — Next.js will route-split naturally. If bundle is still large after that fix, consider replacing with CSS animations.

### 5. Existing Lazy-Component Exports That Are Unused
**File:** `src/components/lazy-components.tsx`

The following dynamic imports exist but no page appears to import them:
- `LiveTaskList` — no consumers found in `src/app`
- `PresenceIndicator` — no consumers found in `src/app`
- `AdvancedSearch` — no consumers found in `src/app`
- `CalendarView` — no consumers found in `src/app`

Audit these: if unused, they can be removed. If they should be used, they need to be wired into the relevant pages.

---

## P3 — `optimizePackageImports` Gap

**File:** `next.config.ts:20`

```ts
experimental: {
  optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
},
```

`@radix-ui/react-icons` is not in `package.json` (unused entry). The following high-import packages are missing from the list and should be added:

```ts
optimizePackageImports: [
  'lucide-react',
  'recharts',         // used in charts
  'framer-motion',    // used in 17 files
  '@radix-ui/react-accordion',
  '@radix-ui/react-dialog',
  '@radix-ui/react-dropdown-menu',
  '@radix-ui/react-select',
  '@radix-ui/react-tabs',
  '@radix-ui/react-toast',
  '@radix-ui/react-tooltip',
  '@tanstack/react-query',
],
```

`optimizePackageImports` tells Next.js to automatically tree-shake barrel exports from these packages, reducing the client bundle without code changes.

---

## P4 — `@uiw/react-md-editor` (Likely Orphan)

`@uiw/react-md-editor` is in `package.json` (12 MB, ~300 kB gzipped) but no direct imports were found in `src/components/` or `src/app/`. It may be:
- Imported via a dynamic path not caught by static grep
- Genuinely orphaned

**Action:** Run `grep -r "@uiw/react-md-editor" src/` to confirm. If truly unused, remove it.

---

## P5 — Build Memory Issue

**Symptom:** `ANALYZE=true npm run build` OOMs at default Node heap (1.5 GB). The build requires `NODE_OPTIONS=--max-old-space-size=8192` to complete.

**Root cause:** The custom `splitChunks` config forces webpack to analyze all modules together for the single `common` chunk, which is extremely memory-intensive at 1,877 TS/TSX files.

**Fix:** Removing the `splitChunks` override (P0 above) should also fix the OOM — Next.js's default strategy uses incremental per-route analysis that is much more memory efficient.

---

## Recommended Fix Priority

| Priority | Action | Estimated First Load JS Reduction |
|----------|--------|----------------------------------|
| P0 | Remove `webpack.splitChunks` override from `next.config.ts` | **−300–450 kB** (shared baseline) |
| P1a | Dynamic import `WikiEditorShell` in `wiki-page-client.tsx` (view mode) | −80–120 kB (tiptap+lowlight removed from wiki page chunk) |
| P1b | Add missing `optimizePackageImports` entries | −20–50 kB (tree-shaking radix + recharts) |
| P1c | Dynamic import `OrgChartTreeView` in `OrgChartClient.tsx` | −15–25 kB (react-d3-tree) |
| P1d | Dynamic import recharts charts in `OrgInsightsChartsSection.tsx` | −30–50 kB (recharts moved to lazy chunk) |
| P2 | Remove/replace `framer-motion` with CSS on org structure routes | −40–60 kB |
| P3 | Remove `@uiw/react-md-editor` if unused | −12 MB disk, ~300 kB gzipped bundle |

**Combined P0+P1 target: ≤320 kB First Load JS** (from 769 kB current).

---

## Notes

- Build output confirmed via `next build` (Next.js 15.5.9, React 19.1.0)
- `@next/bundle-analyzer` is now installed as devDependency; run `NODE_OPTIONS=--max-old-space-size=8192 ANALYZE=true npm run build` for the interactive treemap
- `googleapis` (189 MB disk) is server-only (`src/lib/google-calendar.ts`); no client imports found — it should not appear in client bundles
- `socket.io-client` is only used in `src/lib/realtime/socket-client.ts`; check if this ends up in the shared chunk via the `common` splitChunks group
- Middleware size: 55.8 kB — within acceptable range
