"use client"

import type { ReactNode } from "react"

interface SpacesLayoutShellProps {
  children: ReactNode
}

/**
 * Pass-through wrapper for spaces content.
 * Sidebar and Loopbrain are now provided by the root DashboardLayoutClient.
 */
export function SpacesLayoutShell({ children }: SpacesLayoutShellProps) {
  return <>{children}</>
}
