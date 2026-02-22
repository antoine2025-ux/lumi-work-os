"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Home,
  Layers,
  Target,
  BarChart3,
  FileText,
  Settings,
  Users,
  Calendar,
  Activity,
} from "lucide-react"
import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"

interface ProjectNavItem {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  href: string
  badge?: string
  badgeColor?: string
}

interface ProjectSidebarProps {
  projectId: string
  projectName?: string
  workspaceSlug?: string
  isHovered?: boolean
  onHoverChange?: (hovered: boolean) => void
  className?: string
}

function buildHref(base: string, workspaceSlug?: string): string {
  return workspaceSlug ? `/w/${workspaceSlug}${base}` : base
}

export default function ProjectSidebar({ 
  projectId, 
  projectName: _projectName = '',
  workspaceSlug, 
  isHovered: externalIsHovered, 
  onHoverChange, 
  className = '' 
}: ProjectSidebarProps) {
  const [internalIsHovered, setInternalIsHovered] = useState(false)
  const isHovered = externalIsHovered ?? internalIsHovered
  const setIsHovered = onHoverChange ?? setInternalIsHovered
  const pathname = usePathname()
  const searchParams = useSearchParams()

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
  
  const baseNavItems: Omit<ProjectNavItem, 'href'>[] = isMainProjectsPage ? [
    { id: 'dashboard', label: 'Project Dashboard', icon: Home },
    { id: 'my-epics', label: 'My Epics', icon: Layers },
    { id: 'my-tasks', label: 'My Tasks', icon: Target },
    { id: 'team-board', label: 'Team Board', icon: Users },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
  ] : [
    { id: 'dashboard', label: 'Project Dashboard', icon: Home },
    { id: 'epics', label: 'Epics', icon: Layers },
    { id: 'tasks', label: 'Tasks', icon: Target },
    { id: 'documentation', label: 'Documentation', icon: FileText },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'calendar', label: 'Calendar', icon: Calendar },
    { id: 'activity', label: 'Activity', icon: Activity },
    { id: 'settings', label: 'Project Settings', icon: Settings },
  ]

  const navItems: ProjectNavItem[] = baseNavItems.map((item) => {
    const baseHref = item.id === 'dashboard' ? '/projects'
      : item.id === 'my-epics' ? '/projects?view=my-epics'
      : item.id === 'my-tasks' ? '/projects?view=my-tasks'
      : item.id === 'team-board' ? '/projects?view=team-board'
      : item.id === 'reports' && isMainProjectsPage ? '/projects?view=reports'
      : item.id === 'reports' ? `/projects/${projectId}/reports`
      : `/projects/${projectId}/${item.id}`
    return { ...item, href: buildHref(baseHref, workspaceSlug) }
  })

  // Check if current path matches nav item
  const isActive = (href: string) => {
    const baseHref = workspaceSlug ? href.replace(`/w/${workspaceSlug}`, '') : href
    if (isMainProjectsPage) {
      if (baseHref === '/projects' || baseHref.startsWith('/projects?')) {
        if (baseHref === '/projects') {
          return pathname.endsWith('/projects') && searchParams.toString() === ''
        }
        const viewParam = baseHref.includes('?') ? baseHref.split('?')[1]?.split('=')[1] : null
        return viewParam != null && searchParams.get('view') === viewParam
      }
    }
    if (baseHref === '/projects') {
      return pathname === href || (workspaceSlug && pathname === `/w/${workspaceSlug}/projects`)
    }
    return pathname === href || pathname.startsWith(href + '/')
  }

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
      className={`h-full flex-shrink-0 transition-all duration-300 ease-in-out flex flex-col ${
        isHovered ? 'w-64' : 'w-16'
      } ${className}`}
      style={{ backgroundColor: colors.surface, borderRight: `1px solid ${colors.border}` }}
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
