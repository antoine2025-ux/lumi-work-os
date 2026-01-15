export type OrgNavItem = {
  key: "overview" | "people" | "structure" | "ownership" | "settings"
  label: string
  href: string
  show: (ctx: { setupIncomplete: boolean }) => boolean
}

/**
 * MVP Navigation (max 4 tabs)
 * 
 * Final MVP tabs:
 * - Overview (with health signals as derived data)
 * - People (core MVP surface)
 * - Structure (departments, teams, roles)
 * - Ownership (who owns what)
 * 
 * Health is folded into Overview as derived signals.
 * Settings only shows when setup is incomplete.
 */
export const ORG_NAV: OrgNavItem[] = [
  { key: "overview", label: "Overview", href: "/org", show: () => true },
  { key: "people", label: "People", href: "/org/people", show: () => true },
  { key: "structure", label: "Structure", href: "/org/chart", show: () => true },
  { key: "ownership", label: "Ownership", href: "/org/ownership", show: () => true },
  // Settings exists but should be "quiet". Only show when setup is incomplete.
  { key: "settings", label: "Setup", href: "/org/setup", show: (ctx) => ctx.setupIncomplete },
]

