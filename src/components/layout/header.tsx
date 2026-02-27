"use client"

import { usePathname, useRouter } from "next/navigation"
import { useEffect } from "react"
import { useWorkspace } from "@/lib/workspace-context"
import { NavTab } from "@/components/navigation/NavTab"
import { Clock } from "@/components/navigation/Clock"
import { Search } from "lucide-react"
import { cn } from "@/lib/utils"

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

  const openSearch = () => {
    document.dispatchEvent(new CustomEvent("openCommandPalette"))
  }

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

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={openSearch}
          className={cn(
            "flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-muted-foreground",
            "hover:bg-muted hover:text-foreground transition-colors"
          )}
          aria-label="Search"
        >
          <Search className="h-4 w-4" />
          <span className="hidden sm:inline">Search</span>
          <kbd className="hidden sm:inline pointer-events-none h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
            <span className="text-xs">⌘</span>K
          </kbd>
        </button>
        <Clock />
      </div>
    </header>
  )
}
