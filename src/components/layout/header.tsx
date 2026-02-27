"use client"

import { usePathname, useRouter } from "next/navigation"
import { useEffect } from "react"
import { useWorkspace } from "@/lib/workspace-context"
import { NavTab } from "@/components/navigation/NavTab"
import { Clock } from "@/components/navigation/Clock"

export function Header() {
  const pathname = usePathname()
  const router = useRouter()
  const { currentWorkspace } = useWorkspace()

  // Prefetch common routes on mount for instant navigation
  useEffect(() => {
    if (currentWorkspace?.slug) {
      const commonRoutes = [
        `/w/${currentWorkspace.slug}`,
        `/w/${currentWorkspace.slug}/spaces/home`,
        `/w/${currentWorkspace.slug}/org`,
      ]
      commonRoutes.forEach((route) => {
        router.prefetch(route)
      })
    }
  }, [router, currentWorkspace])

  const slugRoot = currentWorkspace?.slug ? `/w/${currentWorkspace.slug}` : "/home"
  const dashboardHref = currentWorkspace?.slug ? `/w/${currentWorkspace.slug}` : "/home"
  const spacesHref = currentWorkspace?.slug
    ? `/w/${currentWorkspace.slug}/spaces/home`
    : "/spaces/home"
  const orgHref = currentWorkspace?.slug ? `/w/${currentWorkspace.slug}/org` : "/org"

  const isDashboardActive =
    pathname === slugRoot || pathname === "/home" || pathname === "/"
  const isSpacesActive = pathname?.includes("/spaces") ?? false
  const isOrgActive = pathname?.startsWith("/org") ?? false

  return (
    <header className="flex items-center justify-between px-6 py-3 border-b border-border/50 sticky top-0 z-50 bg-card">
      <nav className="flex items-center gap-6">
        <NavTab href={dashboardHref} active={isDashboardActive}>
          Dashboard
        </NavTab>
        <NavTab href={spacesHref} active={isSpacesActive}>
          Spaces
        </NavTab>
        <NavTab href={orgHref} active={isOrgActive}>
          Org
        </NavTab>
      </nav>

      <Clock />
    </header>
  )
}
