"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Logo } from "@/components/logo"
import { useWorkspace } from "@/lib/workspace-context"
import { 
  LayoutDashboard, 
  Users, 
  BookOpen, 
  MessageSquare, 
  Settings,
  Download,
  Target,
  Shield
} from "lucide-react"

const navigation = [
  { name: "Dashboard", href: "/home", icon: LayoutDashboard },
  { name: "Spaces", href: "/spaces/home", icon: Target },
  { name: "Org Chart", href: "/org", icon: Users },
  { name: "Admin", href: "/admin", icon: Shield },
  { name: "Wiki", href: "/wiki", icon: BookOpen },
  { name: "Ask Wiki", href: "/ask", icon: MessageSquare },
  { name: "Migration Review", href: "/migrations/review", icon: Download },
]

export function Sidebar() {
  const pathname = usePathname()
  const { currentWorkspace } = useWorkspace()

  return (
    <div className="flex h-full w-64 flex-col bg-card border-r">
      <div className="flex h-16 items-center px-6 border-b">
        <div className="flex items-center space-x-2">
          <Logo 
            width={32} 
            height={32} 
            className="h-8 w-8"
            priority
          />
          <span className="text-xl font-semibold">Loopwell</span>
        </div>
      </div>
      
      <nav className="flex-1 space-y-1 p-4">
        {navigation.map((item) => {
          // Build workspace-scoped href for workspace-aware routes
          const slugHref = currentWorkspace?.slug 
            ? `/w/${currentWorkspace.slug}${item.href === '/home' ? '' : item.href}`
            : item.href // Fallback to original if no workspace
          
          const isActive = pathname === slugHref || pathname === item.href
          return (
            <Link
              key={item.name}
              href={slugHref}
              className={cn(
                "flex items-center space-x-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.name}</span>
            </Link>
          )
        })}
        {/* DEV ONLY shortcut */}
        {process.env.NODE_ENV === "development" && (
          <Link
            href="/org/dev/loopbrain-status"
            className="text-xs text-muted-foreground hover:text-foreground block px-3 py-2"
          >
            Org QA (Dev)
          </Link>
        )}
      </nav>
      
      <div className="p-4 border-t">
        <Link
          href="/settings"
          className={cn(
            "flex items-center space-x-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
            pathname === "/settings"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          )}
        >
          <Settings className="h-5 w-5" />
          <span>Settings</span>
        </Link>
      </div>
    </div>
  )
}
