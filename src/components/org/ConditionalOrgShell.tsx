"use client"

import { usePathname } from "next/navigation"
import OrgShell from "@/app/(dashboard)/org-legacy/org-shell"

// Conditionally render OrgShell based on pathname
// Profile pages and Ownership pages should NOT show OrgShell
export function ConditionalOrgShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  
  // Match /org/people/[id] but not /org/people/[id]/edit
  const isProfilePage = /^\/org\/people\/[^/]+$/.test(pathname) || /^\/org\/people\/[^/]+\/skills$/.test(pathname)
  
  // Match /org/health and /org/health/ownership (health and ownership pages)
  const isHealthPage = /^\/org\/health$/.test(pathname) || /^\/org\/health\/ownership$/.test(pathname)
  
  // Match /org/setup (setup checklist page should not show OrgShell mega-header)
  const isSetupPage = pathname === "/org/setup"

  if (isProfilePage || isHealthPage || isSetupPage) {
    // Profile pages, Health pages, and Setup page: no OrgShell, just render children
    return <>{children}</>
  }

  // All other org pages: wrap in OrgShell
  return <OrgShell>{children}</OrgShell>
}

