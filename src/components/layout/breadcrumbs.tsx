"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { ChevronRight, Home, FolderOpen, CheckSquare } from "lucide-react"
import { cn } from "@/lib/utils"

interface BreadcrumbItem {
  label: string
  href?: string
  icon?: React.ComponentType<{ className?: string }>
  current?: boolean
}

interface BreadcrumbsProps {
  className?: string
  items?: BreadcrumbItem[]
}

export function Breadcrumbs({ className, items }: BreadcrumbsProps) {
  const pathname = usePathname()
  const [projectName, setProjectName] = useState<string | null>(null)
  const [isLoadingProject, setIsLoadingProject] = useState(false)
  
  // Auto-generate breadcrumbs from pathname if not provided
  const breadcrumbItems = items || generateBreadcrumbsFromPath(pathname, projectName, isLoadingProject)

  // Fetch project name if we're on a project page
  useEffect(() => {
    const segments = pathname.split('/').filter(Boolean)
    let projectId: string | null = null
    
    // Check for legacy route: /projects/[id]
    if (segments[0] === 'projects' && segments[1] && segments[1] !== 'new') {
      projectId = segments[1]
    }
    // Check for workspace-scoped route: /w/[slug]/projects/[id]
    else if (segments[0] === 'w' && segments[2] === 'projects' && segments[3] && segments[3] !== 'new') {
      projectId = segments[3]
    }
    
    if (projectId) {
      setIsLoadingProject(true)
      // Fetch project name
      fetch(`/api/projects/${projectId}`)
        .then(res => res.json())
        .then(data => {
          if (data.name) {
            setProjectName(data.name)
          }
        })
        .catch(error => {
          console.error('Failed to fetch project name:', error)
        })
        .finally(() => {
          setIsLoadingProject(false)
        })
    } else {
      setProjectName(null)
      setIsLoadingProject(false)
    }
  }, [pathname])

  if (breadcrumbItems.length <= 1) {
    return null
  }

  return (
    <nav className={cn("flex items-center space-x-1 text-sm text-muted-foreground", className)}>
      {breadcrumbItems.map((item, index) => (
        <div key={index} className="flex items-center space-x-1">
          {index > 0 && (
            <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
          )}
          
          {item.href && !item.current ? (
            <Link
              href={item.href}
              className="flex items-center space-x-1 hover:text-foreground transition-colors"
            >
              {item.icon && <item.icon className="h-4 w-4" />}
              <span>{item.label}</span>
            </Link>
          ) : (
            <div className="flex items-center space-x-1 text-muted-foreground">
              {item.icon && <item.icon className="h-4 w-4" />}
              <span>{item.label}</span>
            </div>
          )}
        </div>
      ))}
    </nav>
  )
}

function generateBreadcrumbsFromPath(pathname: string, projectName?: string | null, isLoadingProject?: boolean): BreadcrumbItem[] {
  const segments = pathname.split('/').filter(Boolean)
  const breadcrumbs: BreadcrumbItem[] = []

  // Always start with home
  breadcrumbs.push({
    label: "Dashboard",
    href: "/",
    icon: Home
  })

  // Handle different route patterns
  if (segments.length === 0) {
    return breadcrumbs
  }

  // Handle workspace-scoped routes: /w/[workspaceSlug]/...
  if (segments[0] === 'w' && segments[1]) {
    const workspaceSlug = segments[1]
    
    // Workspace-scoped projects: /w/[slug]/projects
    if (segments[2] === 'projects') {
      breadcrumbs.push({
        label: "Projects",
        href: `/w/${workspaceSlug}/projects`,
        icon: FolderOpen
      })

      // Specific project
      if (segments[3] && segments[3] !== 'new') {
        const projectId = segments[3]
        let displayName: string
        if (isLoadingProject) {
          displayName = "Loading..."
        } else if (projectName) {
          displayName = projectName
        } else {
          displayName = `Project ${projectId.slice(0, 8)}...`
        }
        
        breadcrumbs.push({
          label: displayName,
          href: `/w/${workspaceSlug}/projects/${projectId}`,
          current: segments.length === 4
        })

        // Project sub-pages
        if (segments[4]) {
          if (segments[4] === 'tasks') {
            breadcrumbs.push({
              label: "Tasks",
              href: `/w/${workspaceSlug}/projects/${projectId}/tasks`,
              icon: CheckSquare,
              current: segments.length === 5
            })
          } else if (segments[4] === 'settings') {
            breadcrumbs.push({
              label: "Settings",
              current: true
            })
          }
        }
      } else if (segments[3] === 'new') {
        breadcrumbs.push({
          label: "New Project",
          current: true
        })
      }
    }
    // Workspace-scoped spaces: /w/[slug]/spaces
    else if (segments[2] === 'spaces') {
      breadcrumbs.push({
        label: "Spaces",
        href: `/w/${workspaceSlug}/spaces/home`,
        icon: FolderOpen
      })
      
      if (segments[3] === 'home') {
        breadcrumbs.push({
          label: "Home",
          current: true
        })
      }
    }
    // Other workspace-scoped routes
    else if (segments[2]) {
      const sectionName = segments[2].charAt(0).toUpperCase() + segments[2].slice(1)
      breadcrumbs.push({
        label: sectionName,
        href: `/w/${workspaceSlug}/${segments[2]}`,
        current: segments.length === 3
      })
    }
  }
  // Legacy projects section: /projects
  else if (segments[0] === 'projects') {
    breadcrumbs.push({
      label: "Projects",
      href: "/projects",
      icon: FolderOpen
    })

    // Specific project
    if (segments[1] && segments[1] !== 'new') {
      let displayName: string
      if (isLoadingProject) {
        displayName = "Loading..."
      } else if (projectName) {
        displayName = projectName
      } else {
        displayName = `Project ${segments[1].slice(0, 8)}...`
      }
      
      breadcrumbs.push({
        label: displayName,
        href: `/projects/${segments[1]}`,
        current: segments.length === 2
      })

      // Project sub-pages
      if (segments[2]) {
        if (segments[2] === 'tasks') {
          breadcrumbs.push({
            label: "Tasks",
            href: `/projects/${segments[1]}/tasks`,
            icon: CheckSquare,
            current: segments.length === 3
          })
        } else if (segments[2] === 'settings') {
          breadcrumbs.push({
            label: "Settings",
            current: true
          })
        }
      }
    } else if (segments[1] === 'new') {
      breadcrumbs.push({
        label: "New Project",
        current: true
      })
    }
  }
  // Wiki section
  else if (segments[0] === 'wiki') {
    breadcrumbs.push({
      label: "Wiki",
      href: "/wiki",
      icon: FolderOpen,
      current: segments.length === 1
    })
  }
  // Admin section
  else if (segments[0] === 'admin') {
    breadcrumbs.push({
      label: "Admin",
      href: "/admin",
      current: segments.length === 1
    })
  }
  // Settings section
  else if (segments[0] === 'settings') {
    breadcrumbs.push({
      label: "Settings",
      href: "/settings",
      current: true
    })
  }
  // Other sections
  else {
    const sectionName = segments[0].charAt(0).toUpperCase() + segments[0].slice(1)
    breadcrumbs.push({
      label: sectionName,
      href: `/${segments[0]}`,
      current: segments.length === 1
    })
  }

  return breadcrumbs
}
