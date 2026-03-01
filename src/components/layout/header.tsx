"use client"

import Link from "next/link"
import { usePathname, useParams, useRouter } from "next/navigation"
import { useEffect } from "react"
import { useSession, signOut } from "next-auth/react"
import { useWorkspace } from "@/lib/workspace-context"
import { NavTab } from "@/components/navigation/NavTab"
import { Clock } from "@/components/navigation/Clock"
import { NotificationCenter } from "@/components/notifications/NotificationCenter"
import { Search, Menu, User, Settings, LogOut } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface HeaderProps {
  onMenuToggle?: () => void
}

function getInitials(name: string | null | undefined, email: string | null | undefined): string {
  if (name) {
    const parts = name.trim().split(/\s+/)
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase().slice(0, 2)
    }
    return name.slice(0, 2).toUpperCase()
  }
  if (email) return email.slice(0, 2).toUpperCase()
  return "U"
}

export function Header({ onMenuToggle }: HeaderProps = {}) {
  const pathname = usePathname()
  const router = useRouter()
  const params = useParams()
  const { data: session } = useSession()
  const { currentWorkspace } = useWorkspace()

  const slug = (params?.workspaceSlug as string) ?? currentWorkspace?.slug ?? null
  const profileHref = slug ? `/w/${slug}/org/profile` : "/org/profile"
  const settingsHref = slug ? `/w/${slug}/settings` : "/settings"

  // Prefetch common routes on mount for instant navigation
  useEffect(() => {
    if (slug) {
      const commonRoutes = [
        `/w/${slug}`,
        `/w/${slug}/spaces/home`,
        `/w/${slug}/org`,
      ]
      commonRoutes.forEach((route) => {
        router.prefetch(route)
      })
    }
  }, [router, slug])

  const slugRoot = slug ? `/w/${slug}` : "/home"
  const dashboardHref = slug ? `/w/${slug}` : "/home"
  const spacesHref = slug ? `/w/${slug}/spaces/home` : "/spaces/home"
  const orgHref = slug ? `/w/${slug}/org` : "/org"

  const isDashboardActive =
    pathname === slugRoot || pathname === "/home" || pathname === "/"
  const isSpacesActive = pathname?.includes("/spaces") ?? false
  const isOrgActive = pathname?.startsWith("/org") ?? false

  const openSearch = () => {
    document.dispatchEvent(new CustomEvent("openCommandPalette"))
  }

  return (
    <header className="flex items-center justify-between px-6 py-3 border-b border-border/50 sticky top-0 z-50 bg-card">
      <div className="flex items-center gap-4">
        {onMenuToggle && !pathname?.includes("/org") && (
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={onMenuToggle}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}
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
      </div>

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
        <NotificationCenter />
        <Clock />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="relative h-8 w-8 rounded-full"
              aria-label="User menu"
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={session?.user?.image ?? undefined} alt={session?.user?.name ?? ""} />
                <AvatarFallback className="bg-muted text-xs">
                  {getInitials(session?.user?.name, session?.user?.email ?? undefined)}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem asChild>
              <Link href={profileHref} className="flex items-center gap-2">
                <User className="h-4 w-4" />
                My Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={settingsHref} className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onSelect={() => signOut({ callbackUrl: "/login" })}
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
