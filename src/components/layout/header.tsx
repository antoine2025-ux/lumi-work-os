"use client"

import { useSession, signOut } from "next-auth/react"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { useTheme } from "@/components/theme-provider"
import { useWorkspace } from "@/lib/workspace-context"
import { Breadcrumbs } from "@/components/layout/breadcrumbs"
import { Bell, Sparkles, Home, BookOpen, Bot, Users, Building2, Settings, Target, Network } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

const navigationItems = [
  {
    name: "Dashboard",
    href: "/",
    icon: Home,
    description: "Overview and quick actions"
  },
  {
    name: "Projects",
    href: "/projects",
    icon: Target,
    description: "Project management and task tracking"
  },
  {
    name: "Wiki",
    href: "/wiki",
    icon: BookOpen,
    description: "Knowledge base and documentation"
  },
  {
    name: "Ask AI",
    href: "/ask",
    icon: Bot,
    description: "AI-powered assistance"
  },
  {
    name: "Onboarding",
    href: "/onboarding",
    icon: Users,
    description: "Team onboarding and training"
  },
  {
    name: "Org",
    href: "/org",
    icon: Building2,
    description: "Organization chart and structure"
  },
  {
    name: "Settings",
    href: "/settings",
    icon: Settings,
    description: "Workspace configuration"
  },
  {
    name: "Architecture",
    href: "/architecture",
    icon: Network,
    description: "System architecture and documentation"
  }
]

export function Header() {
  const { data: session } = useSession()
  const pathname = usePathname()
  const { themeConfig } = useTheme()
  const { currentWorkspace, userRole } = useWorkspace()
  const [isVisible, setIsVisible] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)

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
        "h-16 border-b transition-transform duration-300 ease-in-out sticky top-0 z-50",
        isVisible ? "translate-y-0" : "-translate-y-full"
      )}
      style={{ backgroundColor: themeConfig.background }}
      >
        <div className="flex h-full items-center px-6">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <div 
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ 
                background: `linear-gradient(135deg, ${themeConfig.primary}, ${themeConfig.accent})` 
              }}
            >
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-semibold text-foreground">Lumi</span>
          </div>
          
          {/* Navigation Items - Centered */}
          <div className="flex-1 flex items-center justify-center">
            <div className="flex items-center space-x-1">
            {navigationItems.map((item) => {
              const isActive = pathname === item.href || 
                (item.href !== "/" && pathname?.startsWith(item.href))
              
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 ease-in-out group relative overflow-hidden",
                    isActive
                      ? "text-primary-foreground border min-w-[120px]"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted min-w-[44px] hover:min-w-[120px]"
                  )}
                  style={isActive ? {
                    backgroundColor: themeConfig.primary,
                    borderColor: themeConfig.primary
                  } : {}}
                  title={item.description}
                >
                  <item.icon className={cn(
                    "h-4 w-4 transition-colors flex-shrink-0",
                    isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
                  )} />
                  
                  {/* Page title with smooth animation */}
                  <span className={cn(
                    "text-sm font-medium transition-all duration-300 ease-in-out whitespace-nowrap",
                    isActive 
                      ? "opacity-100 translate-x-0 w-auto" 
                      : "opacity-0 -translate-x-2 w-0 group-hover:opacity-100 group-hover:translate-x-0 group-hover:w-auto"
                  )}>
                    {item.name}
                  </span>
                  
                  {/* Active indicator */}
                  {isActive && (
                    <div 
                      className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 rounded-full"
                      style={{ backgroundColor: themeConfig.primary }}
                    />
                  )}
                </Link>
              )
            })}
            </div>
          </div>
          
          {/* User Controls */}
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="icon">
              <Bell className="h-5 w-5" />
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={session?.user?.image || ""} alt={session?.user?.name || ""} />
                    <AvatarFallback>
                      {session?.user?.name?.charAt(0) || "U"}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
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
                <DropdownMenuItem onClick={() => signOut()}>
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>
      
      {/* Breadcrumbs - Hide for project pages */}
      {!pathname?.startsWith('/projects') && (
        <div className="border-b bg-muted/50 px-6 py-2">
          <Breadcrumbs />
        </div>
      )}
    </TooltipProvider>
  )
}
