"use client"

// Conditionally render OrgShell based on pathname
// Profile pages and Ownership pages should NOT show OrgShell
// NOTE: OrgShell was removed from org-legacy. This component now just renders children.
export function ConditionalOrgShell({ children }: { children: React.ReactNode }) {
  // OrgShell removed - just render children directly
  return <>{children}</>
}

