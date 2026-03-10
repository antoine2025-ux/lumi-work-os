"use client"

import Link from "next/link"
import { usePathname, useParams } from "next/navigation"
import { useSession, signOut } from "next-auth/react"
import { useWorkspace } from "@/lib/workspace-context"
import { Search, User, Settings, LogOut } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { NotificationCenter } from "@/components/notifications/NotificationCenter"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

function getInitials(
  name: string | null | undefined,
  email: string | null | undefined
): string {
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

export function GlobalNav() {
  const pathname = usePathname()
  const params = useParams()
  const { data: session } = useSession()
  const { currentWorkspace } = useWorkspace()

  const slug =
    (params?.workspaceSlug as string) ?? currentWorkspace?.slug ?? null
  const basePath = slug ? `/w/${slug}` : ""
  const workspaceName = currentWorkspace?.name ?? "Workspace"

  const dashboardHref = basePath || "/home"
  const spacesHref = basePath ? `${basePath}/spaces` : "/spaces"
  const orgHref = basePath ? `${basePath}/org` : "/org"
  const profileHref = basePath ? `${basePath}/org/profile` : "/org/profile"
  const settingsHref = basePath ? `${basePath}/settings` : "/settings"

  const isDashboardActive = basePath
    ? pathname === basePath || (pathname?.startsWith(`${basePath}/dashboard`) ?? false)
    : pathname === "/home" || pathname === "/"
  const isSpacesActive = basePath
    ? pathname?.startsWith(`${basePath}/spaces`) ?? false
    : pathname?.includes("/spaces") ?? false
  const isOrgActive = basePath
    ? pathname?.startsWith(`${basePath}/org`) ?? false
    : pathname?.startsWith("/org") ?? false

  const openSearch = () => {
    document.dispatchEvent(new CustomEvent("openCommandPalette"))
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex items-center h-12 px-4 bg-background border-b border-border">
      {/* Left — Logo + Workspace Name */}
      <div className="flex items-center gap-2.5 mr-8">
        <div className="w-6 h-6 rounded flex items-center justify-center bg-primary text-primary-foreground font-semibold text-[11px]">
          L
        </div>
        <span className="text-[13px] font-medium text-foreground">
          {workspaceName}
        </span>
      </div>

      {/* Center — Navigation Tabs */}
      {/* Using <a> tags (not <Link>) to force a full page navigation.
          These links cross Next.js layout-group boundaries (home/ ↔ (dashboard)/w/[slug]/...)
          and RSC client-side routing cannot reconcile the layout trees, producing a blank page. */}
      <nav className="flex items-center gap-1">
        <a
          href={dashboardHref}
          className={cn(
            "px-3 py-1.5 text-[13px] rounded-md transition-colors",
            isDashboardActive
              ? "text-foreground bg-accent font-medium"
              : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
          )}
        >
          Dashboard
        </a>
        <a
          href={spacesHref}
          className={cn(
            "px-3 py-1.5 text-[13px] rounded-md transition-colors",
            isSpacesActive
              ? "text-foreground bg-accent font-medium"
              : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
          )}
        >
          Spaces
        </a>
        <a
          href={orgHref}
          className={cn(
            "px-3 py-1.5 text-[13px] rounded-md transition-colors",
            isOrgActive
              ? "text-foreground bg-accent font-medium"
              : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
          )}
        >
          Org
        </a>
      </nav>

      {/* Right — Actions */}
      <div className="flex items-center gap-1 ml-auto">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          onClick={openSearch}
          aria-label="Search"
        >
          <Search className="h-4 w-4" />
        </Button>
        <NotificationCenter />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="relative h-8 w-8 rounded-full p-0 ml-1 text-muted-foreground hover:text-foreground"
              aria-label="User menu"
            >
              <Avatar className="h-7 w-7">
                <AvatarImage
                  src={session?.user?.image ?? undefined}
                  alt={session?.user?.name ?? ""}
                />
                <AvatarFallback className="bg-accent text-accent-foreground text-[10px]">
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
