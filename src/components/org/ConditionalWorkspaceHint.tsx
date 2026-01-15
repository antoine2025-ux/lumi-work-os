"use client"

import { usePathname } from "next/navigation"
import React from "react"

/**
 * Conditionally renders the workspace ID hint ONLY on non-profile pages.
 * Profile pages should not show internal workspace identifiers - they should be human-centric.
 */
export function ConditionalWorkspaceHint({ workspaceId }: { workspaceId: string | null }) {
  const pathname = usePathname()
  
  // Hide on profile pages, health pages, and setup page - use same pattern as ConditionalOrgShell for consistency
  // Match /org/people/[id] and /org/people/[id]/skills (but not /org/people itself)
  // Match /org/health and /org/health/ownership (health and ownership pages)
  // Match /org/setup (setup checklist page should not show debug metadata)
  const isHiddenPage = pathname ? (
    /^\/org\/people\/[^/]+$/.test(pathname) || 
    /^\/org\/people\/[^/]+\/skills$/.test(pathname) ||
    /^\/org\/health$/.test(pathname) ||
    /^\/org\/health\/ownership$/.test(pathname) ||
    pathname === "/org/setup"
  ) : false

  if (!workspaceId || process.env.NODE_ENV !== "development" || isHiddenPage) {
    return null
  }

  return (
    <div className="mb-2 px-6 pt-4 text-xs text-muted-foreground">
      Org workspace: <span className="font-mono">{workspaceId}</span>
    </div>
  )
}

