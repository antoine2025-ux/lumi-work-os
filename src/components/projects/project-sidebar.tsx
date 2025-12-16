"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Home,
  FolderOpen,
  Layers,
  Target,
  BarChart3,
  FileText,
  Settings,
  Users,
  Calendar,
  Activity,
  Zap,
  Database,
  Shield,
  Cloud,
  Globe,
  Lightbulb,
  List,
  BookOpen,
  Puzzle
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"

interface ProjectNavItem {
  id: string
  label: string
  icon: any
  href: string
  badge?: string
  badgeColor?: string
}

interface ProjectSidebarProps {
  projectId: string
  projectName: string
  className?: string
  onHoverChange?: (isExpanded: boolean) => void
}

export default function ProjectSidebar({ projectId, projectName, className = '', onHoverChange }: ProjectSidebarProps) {
  const [isHovered, setIsHovered] = useState(false)
  const pathname = usePathname()

  // Use CSS variables for consistent theming
  const colors = {
    primary: 'var(--primary)',
    primaryLight: 'var(--accent)',
    primaryDark: 'var(--secondary)',
    success: '#10b981',
    successLight: '#d1fae5',
    warning: '#f59e0b',
    warningLight: '#fef3c7',
    error: 'var(--destructive)',
    errorLight: '#fee2e2',
    background: 'var(--background)',
    surface: 'var(--card)',
    text: 'var(--foreground)',
    textSecondary: 'var(--muted-foreground)',
    border: 'var(--border)',
    borderLight: 'var(--muted)'
  }

  // Determine navigation items based on context
  const isMainProjectsPage = projectId === 'dashboard'
  
  const navItems: ProjectNavItem[] = isMainProjectsPage ? [
    // Main Projects Page Navigation
    {
      id: 'dashboard',
      label: 'Project Dashboard',
      icon: Home,
      href: '/projects',
    },
    {
      id: 'my-epics',
      label: 'My Epics',
      icon: Layers,
      href: '/projects?view=my-epics',
    },
    {
      id: 'my-tasks',
      label: 'My Tasks',
      icon: Target,
      href: '/projects?view=my-tasks',
    },
    {
      id: 'team-board',
      label: 'Team Board',
      icon: Users,
      href: '/projects?view=team-board',
    },
    {
      id: 'reports',
      label: 'Reports',
      icon: BarChart3,
      href: '/projects?view=reports',
    }
  ] : [
    // Individual Project Page Navigation
    {
      id: 'dashboard',
      label: 'Project Dashboard',
      icon: Home,
      href: '/projects',
    },
    {
      id: 'epics',
      label: 'Epics',
      icon: Layers,
      href: `/projects/${projectId}/epics`,
    },
    {
      id: 'tasks',
      label: 'Tasks',
      icon: Target,
      href: `/projects/${projectId}/tasks`,
    },
    {
      id: 'documentation',
      label: 'Documentation',
      icon: FileText,
      href: `/projects/${projectId}/documentation`,
    },
    {
      id: 'reports',
      label: 'Reports',
      icon: BarChart3,
      href: `/projects/${projectId}/reports`,
    },
    {
      id: 'calendar',
      label: 'Calendar',
      icon: Calendar,
      href: `/projects/${projectId}/calendar`,
    },
    {
      id: 'activity',
      label: 'Activity',
      icon: Activity,
      href: `/projects/${projectId}/activity`,
    },
    {
      id: 'settings',
      label: 'Project Settings',
      icon: Settings,
      href: `/projects/${projectId}/settings`,
    }
  ]

  // Check if current path matches nav item
  const isActive = (href: string) => {
    if (isMainProjectsPage) {
      // For main projects page, check URL parameters
      if (href === '/projects') {
        return pathname === '/projects' && !window.location.search
      }
      return window.location.search.includes(href.split('?')[1])
    } else {
      // For individual project pages, check path
      if (href === '/projects') {
        return pathname === href
      }
      return pathname.startsWith(href)
    }
  }

  // Load collapsed state from localStorage
  useEffect(() => {
    // Always start collapsed (hover-based expansion)
    setIsHovered(false)
  }, [])

  // Handle hover events
  const handleMouseEnter = () => {
    setIsHovered(true)
    onHoverChange?.(true)
  }

  const handleMouseLeave = () => {
    setIsHovered(false)
    onHoverChange?.(false)
  }

  return (
    <div 
      className={`fixed left-0 top-16 h-[calc(100vh-4rem)] z-40 transition-all duration-300 ease-in-out ${
        isHovered ? 'w-64' : 'w-16'
      } ${className}`}
      style={{ backgroundColor: colors.surface }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Sidebar Header - Clean */}
      <div className="p-4 border-b" style={{ borderColor: colors.border }}>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 p-2 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href)
          
          return (
            <Link key={item.id} href={item.href}>
              <Button
                variant="ghost"
                className={`w-full justify-start h-10 px-3 transition-all duration-200 ${
                  active ? 'bg-blue-50' : 'hover:bg-gray-50'
                }`}
                style={{
                  backgroundColor: active ? colors.primaryLight : 'transparent',
                  color: active ? colors.primary : colors.textSecondary
                }}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                <AnimatePresence>
                  {isHovered && (
                    <motion.div
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ duration: 0.2 }}
                      className="flex items-center justify-between w-full ml-3 min-w-0"
                    >
                      <span className="text-sm font-medium truncate">{item.label}</span>
                      {item.badge && (
                        <Badge 
                          variant="secondary" 
                          className="text-xs ml-2 flex-shrink-0"
                          style={{ 
                            backgroundColor: item.badgeColor || colors.borderLight,
                            color: colors.textSecondary
                          }}
                        >
                          {item.badge}
                        </Badge>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </Button>
            </Link>
          )
        })}
      </nav>

      {/* Sidebar Footer - Removed */}
    </div>
  )
}
