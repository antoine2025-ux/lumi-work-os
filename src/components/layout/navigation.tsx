"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  Home,
  BookOpen,
  Bot,
  Users,
  Building2,
  Plug,
  Shield,
  Settings,
  Sparkles
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
    name: "Integrations",
    href: "/integrations",
    icon: Plug,
    description: "Third-party integrations"
  },
  {
    name: "Permissions",
    href: "/permissions",
    icon: Shield,
    description: "Access control and security"
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

  return (
    <nav className="bg-white border-b border-gray-200 px-6">
      <div className="flex items-center justify-between h-16">
        {/* Logo */}
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-semibold text-gray-900">Lumi</span>
        </div>

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

        {/* Mobile menu button */}
        <div className="sm:hidden">
          <button className="p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-50">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>
    </nav>
  )
}

