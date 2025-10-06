"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import {
  Home,
  BookOpen,
  Bot,
  Users,
  Building2,
  Settings
} from "lucide-react"

const navigationItems = [
  {
    name: "Dashboard",
    href: "/",
    icon: Home,
    description: "Overview and quick actions"
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
  }
]

export function Navigation() {
  const pathname = usePathname()
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
    <nav className={cn(
      "bg-white border-b border-gray-200 px-6 transition-transform duration-300 ease-in-out",
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
                    ? "bg-blue-50 text-blue-700 border border-blue-200"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                )}
                title={item.description}
              >
                <item.icon className={cn(
                  "h-4 w-4 transition-colors",
                  isActive ? "text-blue-600" : "text-gray-500 group-hover:text-gray-700"
                )} />
                <span className="hidden sm:inline">{item.name}</span>
                
                {/* Active indicator */}
                {isActive && (
                  <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-blue-600 rounded-full" />
                )}
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}

