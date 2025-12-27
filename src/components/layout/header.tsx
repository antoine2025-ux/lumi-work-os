"use client"

import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { useWorkspace } from "@/lib/workspace-context"
import { WorkspaceAccountMenu } from "@/components/layout/workspace-account-menu"
import { LayoutDashboard, FolderKanban, Brain, Network } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Logo } from "@/components/logo"

// Prefetch common routes on mount for instant navigation
function prefetchRoutes() {
  const commonRoutes = [
    '/wiki/home',
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
    name: "Projects",
    href: "/projects", // Will be prefixed with /w/[slug] in component
    icon: FolderKanban,
    description: "Project management and tasks"
  },
  {
    name: "LoopBrain",
    href: "/ask", // Will be prefixed with /w/[slug] in component
    icon: Brain,
    description: "AI-powered assistance"
  },
  {
    name: "Org",
    href: "/org", // Will be prefixed with /w/[slug] in component
    icon: Network,
    description: "Organization chart and structure"
  }
]

export function Header() {
  const pathname = usePathname()
  const router = useRouter()
  const { currentWorkspace } = useWorkspace()
  const [isVisible, setIsVisible] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)

  // Prefetch all common routes on mount for instant navigation
  useEffect(() => {
    if (currentWorkspace?.slug) {
      const commonRoutes = [
        `/w/${currentWorkspace.slug}`,
        `/w/${currentWorkspace.slug}/projects`,
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
        </div>
      </header>
    </TooltipProvider>
  )
}
