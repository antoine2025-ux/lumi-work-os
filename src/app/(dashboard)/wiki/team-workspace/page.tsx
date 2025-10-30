"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { 
  Plus, 
  FileText,
  Loader2,
  Users as TeamIcon,
  Shield,
  Target
} from "lucide-react"
import { useRouter, usePathname } from "next/navigation"
import { useUserStatus } from "@/hooks/use-user-status"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { WikiAIAssistant } from "@/components/wiki/wiki-ai-assistant"

interface WorkspaceItem {
  id: string
  title: string
  type: 'page' | 'project'
  updatedAt: string
  url: string
  icon: React.ReactNode
  color?: string
}

export default function TeamWorkspacePage() {
  const router = useRouter()
  const pathname = usePathname()
  const { userStatus, loading: userStatusLoading } = useUserStatus()
  const [isLoading, setIsLoading] = useState(true)
  const [teamPages, setTeamPages] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [workspaceItems, setWorkspaceItems] = useState<WorkspaceItem[]>([])

  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInMs = now.getTime() - date.getTime()
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60))
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60))
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24))

    if (diffInMinutes < 1) {
      return 'Just now'
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`
    } else if (diffInDays === 1) {
      return '1d ago'
    } else if (diffInDays < 7) {
      return `${diffInDays}d ago`
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }
  }

  const getIcon = (type: 'page' | 'project', color?: string) => {
    if (type === 'project') {
      return (
        <div 
          className="w-8 h-8 rounded-lg flex items-center justify-center dark:bg-indigo-900/30"
          style={{ backgroundColor: color ? `${color}20` : undefined }}
        >
          <Target 
            className="h-4 w-4" 
            style={{ color: color || undefined }}
          />
        </div>
      )
    }
    return (
      <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
        <TeamIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
      </div>
    )
  }

  const loadWorkspaceData = useCallback(async () => {
    try {
      setIsLoading(true)
      if (!userStatus?.workspaceId) {
        return
      }

      // Fetch recent pages - use the same endpoint as sidebar for consistency
      const pagesResponse = await fetch('/api/wiki/recent-pages?limit=100')
      if (pagesResponse.ok) {
        const pages = await pagesResponse.json()
        
        if (Array.isArray(pages)) {
          // Filter for team workspace pages - match the EXACT same logic as sidebar
          const team = pages.filter((page: any) => {
            const pageWorkspaceType = page.workspace_type
            const pagePermissionLevel = page.permissionLevel
            
            // Exclude personal pages explicitly
            if (pageWorkspaceType === 'personal') {
              return false
            }
            
            // Exclude if permissionLevel is 'personal' (unless workspace_type is explicitly 'team')
            if (pagePermissionLevel === 'personal' && pageWorkspaceType !== 'team') {
              return false
            }
            
            // Include if workspace_type is 'team'
            if (pageWorkspaceType === 'team') {
              return true
            }
            
            // Include legacy pages (null/undefined workspace_type) if not personal
            if (!pageWorkspaceType || pageWorkspaceType === null || pageWorkspaceType === undefined || pageWorkspaceType === '') {
              return pagePermissionLevel !== 'personal'
            }
            
            // Don't include custom workspace pages
            return false
          })
          
          setTeamPages(team)
        }
      }

      // Fetch all projects (they belong to the main workspace)
      const projectsResponse = await fetch(`/api/projects?workspaceId=${userStatus.workspaceId}`)
      if (projectsResponse.ok) {
        const projectsData = await projectsResponse.json()
        const projectsList = Array.isArray(projectsData) ? projectsData : (projectsData.data || projectsData.projects || [])
        setProjects(projectsList)
      }
    } catch (error) {
      console.error('Error loading workspace data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [userStatus?.workspaceId])

  // Combine pages and projects into workspace items
  useEffect(() => {
    const items: WorkspaceItem[] = []

    // Add team pages
    teamPages.forEach(page => {
      items.push({
        id: page.id,
        title: page.title,
        type: 'page',
        updatedAt: page.updatedAt,
        url: `/wiki/${page.slug}`,
        icon: getIcon('page'),
        color: undefined
      })
    })

    // Add projects
    projects.forEach(project => {
      items.push({
        id: project.id,
        title: project.name,
        type: 'project',
        updatedAt: project.updatedAt || project.createdAt || new Date().toISOString(),
        url: `/projects/${project.id}`,
        icon: getIcon('project', project.color),
        color: project.color
      })
    })

    // Sort by updatedAt descending
    items.sort((a, b) => {
      const dateA = new Date(a.updatedAt).getTime()
      const dateB = new Date(b.updatedAt).getTime()
      return dateB - dateA
    })

    setWorkspaceItems(items)
  }, [teamPages, projects])

  useEffect(() => {
    if (!userStatusLoading && userStatus) {
      loadWorkspaceData()
    }
  }, [userStatus, userStatusLoading, loadWorkspaceData])

  // Refresh when navigating back to this page
  useEffect(() => {
    if (pathname === '/wiki/team-workspace' && !userStatusLoading && userStatus) {
      loadWorkspaceData()
    }
  }, [pathname, userStatus, userStatusLoading, loadWorkspaceData])

  // Listen for page creation/update events to refresh the list
  useEffect(() => {
    const handlePageRefresh = () => {
      setTimeout(() => {
        loadWorkspaceData()
      }, 500)
      setTimeout(() => {
        loadWorkspaceData()
      }, 1500)
    }

    window.addEventListener('workspacePagesRefreshed', handlePageRefresh)
    window.addEventListener('pageDeleted', handlePageRefresh)

    const handleVisibilityChange = () => {
      if (!document.hidden && pathname === '/wiki/team-workspace') {
        loadWorkspaceData()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('workspacePagesRefreshed', handlePageRefresh)
      window.removeEventListener('pageDeleted', handlePageRefresh)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [pathname, loadWorkspaceData])

  const handleCreatePage = () => {
    if (typeof window !== 'undefined' && (window as any).triggerCreatePageWithWorkspace) {
      (window as any).triggerCreatePageWithWorkspace('team-workspace')
    }
  }

  if (userStatusLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="flex-1 min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-8 py-16">
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <TeamIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-3xl font-semibold text-foreground">Team Workspace</h1>
              <p className="text-sm text-muted-foreground mt-1">Your collaborative knowledge hub</p>
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div className="mb-12 p-4 bg-card border border-border rounded-lg">
          <div className="flex items-start gap-3">
            <TeamIcon className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground leading-relaxed">
              A shared space where your team can collaborate on documentation, notes, and knowledge. 
              All team members can view and contribute to pages in this workspace.
            </p>
          </div>
        </div>

        {/* Content Area */}
        {workspaceItems.length === 0 ? (
          <div className="space-y-8">
            {/* Empty State */}
            <div className="space-y-6 text-center">
              <div className="flex justify-center">
                <div className="w-16 h-16 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <Shield className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-semibold text-foreground">Your team workspace is empty</h2>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  Create collaborative pages for your team's documentation, notes, and shared knowledge. 
                  All team members can view and contribute to these pages.
                </p>
              </div>
            </div>

            {/* Feature Cards */}
            <div className="grid grid-cols-2 gap-3 max-w-lg mx-auto">
              <Card className="p-4 bg-card border-border">
                <div className="flex items-center gap-2 mb-1">
                  <TeamIcon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">Team collaboration</span>
                </div>
                <p className="text-xs text-muted-foreground">Work together with your team</p>
              </Card>
              <Card className="p-4 bg-card border-border">
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">Shared knowledge</span>
                </div>
                <p className="text-xs text-muted-foreground">Centralize team resources</p>
              </Card>
            </div>

            {/* CTA Button */}
            <div className="flex justify-center pt-4">
              <Button 
                size="lg" 
                className="bg-blue-600 hover:bg-blue-700 text-white px-8"
                onClick={handleCreatePage}
              >
                <Plus className="h-5 w-5 mr-2" />
                Create Your First Team Page
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Workspace Items */}
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-6">
                Pages & Projects
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {workspaceItems.map((item) => (
                  <Card
                    key={item.id}
                    className={cn(
                      "cursor-pointer transition-all duration-200",
                      "hover:shadow-lg hover:border-primary/50 bg-card border-border",
                      "group"
                    )}
                    onClick={() => router.push(item.url)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3 mb-4">
                        {item.icon}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-foreground truncate mb-1 group-hover:text-primary transition-colors">
                            {item.title}
                          </h3>
                          <p className="text-xs text-muted-foreground">
                            {formatTimeAgo(item.updatedAt)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Create Button */}
            <Button 
              variant="outline" 
              className="w-full border-border"
              onClick={handleCreatePage}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create New Team Page
            </Button>
          </div>
        )}
      </div>
      
      {/* AI Assistant - Floating Button Mode */}
      <WikiAIAssistant 
        currentTitle="Team Workspace"
        mode="floating-button"
      />
    </div>
  )
}
