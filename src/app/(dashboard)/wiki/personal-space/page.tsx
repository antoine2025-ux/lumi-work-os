"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { 
  Plus, 
  FileText,
  Loader2,
  Lock,
  Shield,
  Target
} from "lucide-react"
import { useRouter, usePathname } from "next/navigation"
import { useUserStatus } from "@/hooks/use-user-status"
import { WikiAIAssistant } from "@/components/wiki/wiki-ai-assistant"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface WorkspaceItem {
  id: string
  title: string
  type: 'page' | 'project'
  updatedAt: string
  url: string
  icon: React.ReactNode
  color?: string
}

export default function PersonalWorkspacePage() {
  const router = useRouter()
  const pathname = usePathname()
  const { userStatus, loading: userStatusLoading } = useUserStatus()
  const [isLoading, setIsLoading] = useState(true)
  const [personalPages, setPersonalPages] = useState<any[]>([])
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
      <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
        <Lock className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
      </div>
    )
  }

  const loadWorkspaceData = useCallback(async () => {
    try {
      setIsLoading(true)
      if (!userStatus?.workspaceId) {
        console.log('No workspace ID available')
        return
      }
      
      // Fetch recent pages - use the same endpoint as sidebar for consistency
      const pagesResponse = await fetch('/api/wiki/recent-pages?limit=100')
      if (pagesResponse.ok) {
        const pages = await pagesResponse.json()
        
        if (Array.isArray(pages)) {
          // Filter for personal space pages - match the EXACT same logic as sidebar
          const personal = pages.filter((page: any) => {
            const pageWorkspaceType = page.workspace_type
            const pagePermissionLevel = page.permissionLevel
            
            // Primary match: workspace_type is explicitly 'personal'
            if (pageWorkspaceType === 'personal') {
              return true
            }
            
            // Legacy match: If workspace_type is null/undefined, check permissionLevel
            if (!pageWorkspaceType || pageWorkspaceType === null || pageWorkspaceType === undefined || pageWorkspaceType === '') {
              return pagePermissionLevel === 'personal'
            }
            
            return false
          })
          
          setPersonalPages(personal)
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

    // Add personal pages
    personalPages.forEach(page => {
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
  }, [personalPages, projects])

  useEffect(() => {
    if (!userStatusLoading && userStatus) {
      loadWorkspaceData()
    }
  }, [userStatus, userStatusLoading, loadWorkspaceData])

  // Refresh when navigating back to this page
  useEffect(() => {
    if (pathname === '/wiki/personal-space' && !userStatusLoading && userStatus) {
      loadWorkspaceData()
    }
  }, [pathname, userStatus, userStatusLoading, loadWorkspaceData])

  // Listen for page creation/update events to refresh the list
  useEffect(() => {
    const handlePageRefresh = () => {
      console.log('🔄 workspacePagesRefreshed event received, refreshing Personal Space')
      setTimeout(() => {
        loadWorkspaceData()
      }, 500)
      setTimeout(() => {
        loadWorkspaceData()
      }, 1500)
    }

    // Listen for workspace pages refreshed event (fired when a page is created)
    window.addEventListener('workspacePagesRefreshed', handlePageRefresh)
    // Also listen for page deleted event
    window.addEventListener('pageDeleted', handlePageRefresh)

    // Refresh when component becomes visible (user navigates back)
    const handleVisibilityChange = () => {
      if (!document.hidden && pathname === '/wiki/personal-space') {
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
    // Trigger create page from parent layout with personal workspace
    if (typeof window !== 'undefined' && (window as any).triggerCreatePageWithWorkspace) {
      (window as any).triggerCreatePageWithWorkspace('personal-space')
    }
  }

  if (userStatusLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!userStatus?.workspaceId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-foreground mb-2">No workspace found</h2>
          <p className="text-muted-foreground">Please ensure you're properly authenticated.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 min-h-screen bg-background">
      {/* Centered Content */}
      <div className="max-w-3xl mx-auto px-8 py-16">
        {/* Minimal Header */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
              <Lock className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h1 className="text-3xl font-semibold text-foreground">Personal Space</h1>
              <p className="text-sm text-muted-foreground mt-1">Your confidential knowledge vault</p>
            </div>
          </div>
        </div>

        {/* Simple Info Box */}
        <div className="mb-12 p-4 bg-card border border-border rounded-lg">
          <div className="flex items-start gap-3">
            <Lock className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground leading-relaxed">
              A private space for your personal notes, thoughts, and documentation. 
              These pages are only visible to you and remain confidential within your workspace.
            </p>
          </div>
        </div>

        {/* Content Area */}
        {workspaceItems.length === 0 ? (
          <div className="space-y-8">
            {/* Empty State */}
            <div className="space-y-6 text-center">
              <div className="flex justify-center">
                <div className="w-16 h-16 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                  <Shield className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
                </div>
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-semibold text-foreground">Your personal vault is empty</h2>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  Create confidential pages for your private notes, thoughts, and personal documentation. 
                  These pages are only visible to you.
                </p>
              </div>
            </div>

            {/* Minimal Feature Cards */}
            <div className="grid grid-cols-2 gap-3 max-w-lg mx-auto">
              <Card className="p-4 bg-card border-border">
                <div className="flex items-center gap-2 mb-1">
                  <Lock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">Private by default</span>
                </div>
                <p className="text-xs text-muted-foreground">Only you can see these pages</p>
              </Card>
              <Card className="p-4 bg-card border-border">
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">Personal notes</span>
                </div>
                <p className="text-xs text-muted-foreground">Keep your thoughts secure</p>
              </Card>
            </div>

            {/* CTA Button */}
            <div className="flex justify-center pt-4">
              <Button 
                size="lg" 
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-8"
                onClick={handleCreatePage}
              >
                <Plus className="h-5 w-5 mr-2" />
                Create Your First Private Page
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
              Create New Private Page
            </Button>
          </div>
        )}
      </div>

      {/* AI Assistant - Floating Button Mode */}
      <WikiAIAssistant 
        currentTitle="Personal Space"
        mode="floating-button"
      />
    </div>
  )
}
