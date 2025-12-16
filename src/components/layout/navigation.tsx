"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { useWorkspace } from "@/lib/workspace-context"
import {
  Home,
  BookOpen,
  Bot,
  Users,
  Building2,
  Settings,
  Shield,
  Zap,
  BarChart3,
  Calendar,
  Clock,
  Workflow
} from "lucide-react"

// Core navigation items (always visible)
const coreNavigationItems = [
  {
    name: "Dashboard",
    href: "/",
    icon: Home,
    description: "Overview and quick actions",
    roles: ['OWNER', 'ADMIN', 'MEMBER']
  },
  {
    name: "Projects",
    href: "/projects",
    icon: Building2,
    description: "Project management and tasks",
    roles: ['OWNER', 'ADMIN', 'MEMBER']
  },
  {
    name: "Wiki",
    href: "/wiki",
    icon: BookOpen,
    description: "Knowledge base and documentation",
    roles: ['OWNER', 'ADMIN', 'MEMBER']
  }
]

// Feature-gated navigation items
const featureNavigationItems = [
  {
    name: "LoopBrain",
    href: "/ask",
    icon: Bot,
    description: "AI-powered document generation, project creation, and assistance",
    roles: ['OWNER', 'ADMIN', 'MEMBER'],
    featureFlag: "ai_assistant"
  },
  {
    name: "Analytics",
    href: "/analytics",
    icon: BarChart3,
    description: "Project analytics and insights",
    roles: ['OWNER', 'ADMIN'],
    featureFlag: "analytics"
  },
  {
    name: "Calendar",
    href: "/calendar",
    icon: Calendar,
    description: "Project timeline and scheduling",
    roles: ['OWNER', 'ADMIN', 'MEMBER'],
    featureFlag: "calendar"
  },
  {
    name: "Time Tracking",
    href: "/time-tracking",
    icon: Clock,
    description: "Track time spent on projects and tasks",
    roles: ['OWNER', 'ADMIN', 'MEMBER'],
    featureFlag: "time_tracking"
  },
  {
    name: "Automations",
    href: "/automations",
    icon: Workflow,
    description: "Automate workflows and notifications",
    roles: ['OWNER', 'ADMIN'],
    featureFlag: "automations"
  }
]

// Admin-only navigation items
const adminNavigationItems = [
  {
    name: "Admin",
    href: "/admin",
    icon: Shield,
    description: "User management and administration",
    roles: ['OWNER', 'ADMIN']
  },
  {
    name: "Settings",
    href: "/settings",
    icon: Settings,
    description: "Workspace configuration",
    roles: ['OWNER', 'ADMIN']
  }
]

// Demo/Development items (only in development)
const devNavigationItems = [
  {
    name: "Real-time Demo",
    href: "/realtime-demo",
    icon: Zap,
    description: "Live collaboration features demonstration",
    roles: ['OWNER', 'ADMIN', 'MEMBER'],
    devOnly: true
  },
  {
    name: "Clean UI Demo",
    href: "/clean-ui-demo",
    icon: Zap,
    description: "Clean, functional UI design demonstration",
    roles: ['OWNER', 'ADMIN', 'MEMBER'],
    devOnly: true
  }
]

export function Navigation() {
  const pathname = usePathname()
  const [isVisible, setIsVisible] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)
  const { userRole, canManageWorkspace, canViewAnalytics } = useWorkspace()
  
  // Filter navigation items based on user role and feature flags
  const getVisibleNavigationItems = () => {
    const isDev = process.env.NODE_ENV === 'development'
    
    return [
      ...coreNavigationItems.filter(item => 
        userRole && item.roles.includes(userRole)
      ),
      ...featureNavigationItems.filter(item => {
        if (!userRole || !item.roles.includes(userRole)) return false
        // TODO: Check feature flags when implemented
        return true
      }),
      ...adminNavigationItems.filter(item => 
        userRole && item.roles.includes(userRole)
      ),
      ...(isDev ? devNavigationItems.filter(item => 
        userRole && item.roles.includes(userRole)
      ) : [])
    ]
  }
  
  const navigationItems = getVisibleNavigationItems()

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
    <nav className={cn(
      "bg-card border-b border-border px-6 transition-transform duration-300 ease-in-out",
      isVisible ? "translate-y-0" : "-translate-y-full"
    )}>
      <div className="flex items-center justify-center h-16">
        {/* Navigation Items */}
        <div className="flex items-center space-x-1">
          {navigationItems.map((item) => {
            const isActive = pathname === item.href || 
              (item.href !== "/" && pathname.startsWith(item.href))
            
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 group relative",
                  isActive
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
                title={item.description}
              >
                <item.icon className={cn(
                  "h-4 w-4 transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                )} />
                <span className="hidden sm:inline">{item.name}</span>
                
                {/* Active indicator */}
                {isActive && (
                  <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-primary rounded-full" />
                )}
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}

