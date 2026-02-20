"use client"

import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { useWorkspace } from "@/lib/workspace-context"
import { WorkspaceAccountMenu } from "@/components/layout/workspace-account-menu"
import { LayoutDashboard, FolderKanban, Network, Sliders, Users, Bell, Target } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Logo } from "@/components/logo"
import { useSession, signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { clearUserStatusCache } from "@/hooks/use-user-status"

// Prefetch common routes on mount for instant navigation
function prefetchRoutes() {
  const commonRoutes = [
    '/spaces/home',
    '/ask',
    '/settings',
    '/org'
  ]
  
  commonRoutes.forEach(route => {
    // Use dynamic import to prefetch in background
    if (typeof window !== 'undefined') {
      const router = require('next/router').default
      router.prefetch(route).catch(() => {
        // Silently fail if route doesn't exist yet
      })
    }
  })
}

// Navigation items - hrefs will be made slug-aware in the component
const navigationItems = [
  {
    name: "Dashboard",
    href: "/", // Will be prefixed with /w/[slug] in component
    icon: LayoutDashboard,
    description: "Overview and quick actions"
  },
  {
    name: "Spaces",
    href: "/spaces/home",
    icon: FolderKanban,
    description: "Project management and tasks"
  },
  {
    name: "Org",
    href: "/org", // Will be prefixed with /w/[slug] in component
    icon: Network,
    description: "Organization chart and structure"
  },
  {
    name: "Goals",
    href: "/goals", // Will be prefixed with /w/[slug] in component
    icon: Target,
    description: "Goals and OKRs tracking"
  },
  // Part from Org repo
  // {
  //   name: "Settings",
  //   href: "/settings", // Will be prefixed with /w/[slug] in component
  //   icon: Sliders,
  //   description: "Workspace configuration"
  //   },
  // {
  //   name: "Members",
  //   href: "/org/settings/members",
  //   icon: Users,
  //   description: "Manage org members and roles",
  //   requiresAdmin: true
  // },
  // {
  //   name: "Invitations",
  //   href: "/org/settings/invitations",
  //   icon: Users,
  //   description: "Manage org invitations",
  //   requiresAdmin: true
  // }
]

export function Header() {
  const pathname = usePathname()
  const router = useRouter()
  const { currentWorkspace, userRole } = useWorkspace()
  const { data: session } = useSession()
  const [isVisible, setIsVisible] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)
  const [userRoleFromPermissions, setUserRoleFromPermissions] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  // Fetch user permissions to check admin role
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/org/permissions", { cache: "no-store" });
        const data = await res.json();
        if (data?.ok) {
          setUserRoleFromPermissions(data.role);
        }
      } catch {
        // Silently fail
      }
    })();
  }, []);

  // Set mounted state to prevent hydration mismatch with Radix UI
  useEffect(() => {
    setMounted(true)
  }, [])

  // Prefetch all common routes on mount for instant navigation
  useEffect(() => {
    if (currentWorkspace?.slug) {
      const commonRoutes = [
        `/w/${currentWorkspace.slug}`,
        `/w/${currentWorkspace.slug}/spaces/home`,
        `/w/${currentWorkspace.slug}/ask`,
        `/w/${currentWorkspace.slug}/settings`,
        `/w/${currentWorkspace.slug}/org`
      ]
      commonRoutes.forEach(route => {
        router.prefetch(route)
      })
    }
  }, [router, currentWorkspace])

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY
      
      if (currentScrollY < lastScrollY || currentScrollY < 10) {
        // Scrolling up or at the top
        setIsVisible(true)
      } else if (currentScrollY > lastScrollY && currentScrollY > 100) {
        // Scrolling down and past 100px
        setIsVisible(false)
      }
      
      setLastScrollY(currentScrollY)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [lastScrollY])

  return (
    <TooltipProvider>
      <header className={cn(
        "h-16 transition-transform duration-300 ease-in-out sticky top-0 z-50 bg-card border-b border-border",
        isVisible ? "translate-y-0" : "-translate-y-full"
      )}
      >
        <div className="flex h-full items-center px-6 relative">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <Logo 
              width={32} 
              height={32} 
              className="w-8 h-8"
              priority
            />
            <span className="text-xl font-semibold text-foreground">Loopwell</span>
          </div>
          
          {/* Navigation Items - Centered */}
          <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center justify-center">
            <div className="flex items-center space-x-1">
            {navigationItems.map((item) => {
              // Part from Org repo
              // Hide admin-only items if user is not admin
              // if (item.requiresAdmin && userRoleFromPermissions !== "ADMIN") {
              //   return null;
              // }
              
              // Build slug-aware href
              const slugHref = currentWorkspace?.slug 
                ? `/w/${currentWorkspace.slug}${item.href === '/' ? '' : item.href}`
                : item.href // Fallback to original if no workspace
              
              // Check if current pathname matches the navigation item
              // Support both slug-based and legacy paths for active state
              const isActive = pathname === slugHref || 
                pathname === item.href ||
                (item.href !== "/" && (pathname?.startsWith(slugHref) || pathname?.startsWith(item.href)))
              
              return (
                <Link
                  key={item.name}
                  href={slugHref}
                  prefetch={true}
                  className={cn(
                    "flex items-center space-x-2 px-4 py-2.5 rounded-lg text-base font-medium transition-all duration-300 ease-in-out group relative overflow-hidden",
                    isActive
                      ? "text-white bg-primary border border-primary min-w-[140px]"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted min-w-[52px] hover:min-w-[140px]"
                  )}
                  title={item.description}
                >
                  <item.icon className={cn(
                    "h-5 w-5 transition-colors flex-shrink-0",
                    isActive ? "text-white" : "text-muted-foreground group-hover:text-foreground"
                  )} />
                  
                  {/* Page title with smooth animation */}
                  <span className={cn(
                    "text-base font-medium transition-all duration-300 ease-in-out whitespace-nowrap",
                    isActive 
                      ? "opacity-100 translate-x-0 w-auto" 
                      : "opacity-0 -translate-x-2 w-0 group-hover:opacity-100 group-hover:translate-x-0 group-hover:w-auto"
                  )}>
                    {item.name}
                  </span>
                  
                  {/* Active indicator */}
                  {isActive && (
                    <div 
                      className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 rounded-full bg-primary"
                    />
                  )}
                </Link>
              )
            })}
            </div>
          </div>

          {/* Spacer to balance layout */}
          <div className="flex-1"></div>

          {/* Workspace Account Menu */}
          <WorkspaceAccountMenu />
          
          {/* Part from Org repo */}
          {/* User Controls
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground hover:bg-muted">
              <Bell className="h-5 w-5" />
            </Button>
            
            {mounted ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-9 w-9 rounded-full hover:bg-muted">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={session?.user?.image || ""} alt={session?.user?.name || ""} />
                      <AvatarFallback className="bg-muted text-foreground">
                        {session?.user?.name?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{session?.user?.name || "Demo User"}</p>
                      <p className="text-xs leading-none text-muted-foreground">
                      {session?.user?.email || "demo@example.com"}
                      </p>
                      {userRole && (
                        <p className="text-xs leading-none text-muted-foreground">
                          {currentWorkspace?.name} • {userRole}
                        </p>
                      )}
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={async () => {
                    // STEP 1: Clear user status cache immediately
                    clearUserStatusCache()
                    
                    // STEP 2: Sign out from NextAuth first (this clears server-side session)
                    try {
                      await signOut({ redirect: false })
                    } catch (e) {
                      console.log('Sign out error (continuing anyway):', e)
                    }
                  // STEP 3: Set logout flag BEFORE clearing storage
                  sessionStorage.setItem('__logout_flag__', 'true')
                    
                  // STEP 4: Clear all local storage (except the logout flag)
                  localStorage.clear()
                  // Don't clear sessionStorage completely - we need the flag!
                  // But clear other items
                  Object.keys(sessionStorage).forEach(key => {
                    if (key !== '__logout_flag__') {
                      sessionStorage.removeItem(key)
                    }
                  })
                  
                  // STEP 5: Clear all cookies including NextAuth and Google OAuth cookies
                  const cookies = document.cookie.split(";")
                  cookies.forEach(function(c) { 
                    const eqPos = c.indexOf('=')
                    const name = eqPos > -1 ? c.substr(0, eqPos).trim() : c.trim()
                    // Clear all cookies
                    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`
                    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname}`
                    // Try to clear Google cookies (may not work due to cross-domain, but worth trying)
                    if (name.includes('google') || name.includes('gid') || name.includes('GA') || name.includes('oauth')) {
                      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=.google.com`
                      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=.googleapis.com`
                      }
                    })
                    
                    // STEP 6: Clear NextAuth session storage
                    try {
                      // Clear any NextAuth session data
                      if (typeof window !== 'undefined') {
                        // Clear indexedDB if used by NextAuth
                        if ('indexedDB' in window) {
                          indexedDB.databases().then(databases => {
                            databases.forEach(db => {
                              if (db.name && db.name.includes('next-auth')) {
                                indexedDB.deleteDatabase(db.name)
                              }
                            })
                          }).catch(() => {})
                        }
                      }
                    } catch (e) {
                      console.log('Could not clear indexedDB:', e)
                    }
                  // STEP 7: Force redirect to login immediately
                    // Add a small delay to ensure cookies are cleared
                    setTimeout(() => {
                      window.location.href = '/login'
                    }, 100)
                  }}>
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button variant="ghost" className="relative h-9 w-9 rounded-full hover:bg-muted">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={session?.user?.image || ""} alt={session?.user?.name || ""} />
                  <AvatarFallback className="bg-muted text-foreground">
                    {session?.user?.name?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
              </Button>
            )}
          </div> */}
        </div>
      </header>
    </TooltipProvider>
  )
}
