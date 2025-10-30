"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { 
  Plus, 
  FileText,
  Loader2,
  ArrowRight,
  Globe,
  Target,
  Shield
} from "lucide-react"
import { useRouter, usePathname } from "next/navigation"
import { useUserStatus } from "@/hooks/use-user-status"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { WikiAIAssistant } from "@/components/wiki/wiki-ai-assistant"

interface WorkspacePageProps {
  params: Promise<{
    id: string
  }>
}

interface WorkspaceItem {
  id: string
  title: string
  type: 'page' | 'project'
  updatedAt: string
  url: string
  icon: React.ReactNode
  color?: string
}

export default function WorkspacePage({ params }: WorkspacePageProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { userStatus } = useUserStatus()
  const [resolvedParams, setResolvedParams] = useState<{ id: string } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [workspace, setWorkspace] = useState<any>(null)
  const [workspacePages, setWorkspacePages] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [workspaceItems, setWorkspaceItems] = useState<WorkspaceItem[]>([])

  useEffect(() => {
    const resolveParams = async () => {
      const resolved = await params
      setResolvedParams(resolved)
    }
    resolveParams()
  }, [params])

  const loadWorkspacePages = useCallback(async () => {
    if (!resolvedParams?.id || !userStatus?.workspaceId) return

    try {
      setIsLoading(true)

      // Load workspace details
      const workspacesResponse = await fetch('/api/wiki/workspaces')
      if (workspacesResponse.ok) {
        const workspacesData = await workspacesResponse.json()
        const foundWorkspace = workspacesData.find((w: any) => w.id === resolvedParams.id)
        setWorkspace(foundWorkspace)
      }

      // Fetch recent pages - use the same endpoint as sidebar for consistency
      const pagesResponse = await fetch('/api/wiki/recent-pages?limit=100')
      if (pagesResponse.ok) {
        const pages = await pagesResponse.json()
        
        if (Array.isArray(pages)) {
          // Filter for custom workspace pages - match the EXACT same logic as sidebar
          const filtered = pages.filter((page: any) => {
            const pageWorkspaceType = page.workspace_type
            return pageWorkspaceType === resolvedParams.id
          })
          
          setWorkspacePages(filtered)
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
  }, [resolvedParams?.id, userStatus?.workspaceId])

  useEffect(() => {
    if (resolvedParams?.id) {
      loadWorkspacePages()
    }
  }, [resolvedParams?.id, loadWorkspacePages])

  // Refresh when navigating back to this page
  useEffect(() => {
    if (pathname && pathname.includes(`/wiki/workspace/${resolvedParams?.id}`) && resolvedParams?.id) {
      loadWorkspacePages()
    }
  }, [pathname, resolvedParams?.id, loadWorkspacePages])

  // Listen for page creation/update events to refresh the list
  useEffect(() => {
    const handlePageRefresh = () => {
      console.log('🔄 workspacePagesRefreshed event received, refreshing workspace pages')
      // Multiple refresh attempts to ensure we catch the update
      setTimeout(() => {
        console.log('🔄 Attempting refresh 1 (500ms delay)')
        loadWorkspacePages()
      }, 500)
      setTimeout(() => {
        console.log('🔄 Attempting refresh 2 (1500ms delay)')
        loadWorkspacePages()
      }, 1500)
    }

    // Listen for workspace pages refreshed event (fired when a page is created)
    window.addEventListener('workspacePagesRefreshed', handlePageRefresh)
    // Also listen for page deleted event
    window.addEventListener('pageDeleted', handlePageRefresh)

    // Refresh when component becomes visible (user navigates back)
    const handleVisibilityChange = () => {
      if (!document.hidden && pathname && pathname.includes(`/wiki/workspace/${resolvedParams?.id}`) && resolvedParams?.id) {
        loadWorkspacePages()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('workspacePagesRefreshed', handlePageRefresh)
      window.removeEventListener('pageDeleted', handlePageRefresh)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [pathname, resolvedParams?.id, loadWorkspacePages])

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
        <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
      </div>
    )
  }

  // Combine pages and projects into workspace items
  useEffect(() => {
    const items: WorkspaceItem[] = []

    // Add workspace pages
    workspacePages.forEach(page => {
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
  }, [workspacePages, projects])

  const handleCreatePage = () => {
    if (typeof window !== 'undefined' && (window as any).triggerCreatePageWithWorkspace && resolvedParams?.id) {
      (window as any).triggerCreatePageWithWorkspace(resolvedParams.id)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading workspace...</p>
        </div>
      </div>
    )
  }

  if (!workspace) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-foreground mb-2">Workspace not found</h2>
          <p className="text-muted-foreground mb-6">The requested workspace does not exist.</p>
          <Button onClick={() => router.push('/wiki')}>Go to Wiki</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 p-8">
      {/* Main Content Container - Centered */}
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Globe className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-foreground">{workspace.name}</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {workspace.description || 'Your custom workspace'}
              </p>
            </div>
          </div>
          
          {/* Information Banner */}
          <div className="mt-6 p-4 bg-card border border-border rounded-lg">
            <div className="flex items-start gap-3">
              <Globe className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  This is a custom workspace for organizing your content. Create pages, collaborate with your team, and manage your documentation here.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div>
          {workspaceItems.length === 0 ? (
            <div className="space-y-8">
              {/* Empty State */}
              <div className="space-y-6">
                  <div className="space-y-4">
                    <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center">
                      <Shield className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="space-y-2">
                      <h2 className="text-xl font-medium text-foreground">This workspace is empty</h2>
                      <p className="text-muted-foreground max-w-md">
                        Create pages to organize content in this workspace. Pages created here will be associated with this workspace.
                      </p>
                    </div>
                  </div>

                {/* Features Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl">
                  <Card className="p-4 bg-card border-border">
                    <div className="flex items-center gap-2 mb-2">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium text-foreground">Custom organization</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Organize content by theme or project</p>
                  </Card>
                  <Card className="p-4 bg-card border-border">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium text-foreground">Workspace pages</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Keep related content together</p>
                  </Card>
                </div>

                {/* Single CTA */}
                <Button 
                  size="lg" 
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3"
                  onClick={handleCreatePage}
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Create Your First Page
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

              {/* Create New Page */}
              <Button 
                variant="outline" 
                className="w-full border-border"
                onClick={handleCreatePage}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create New Page
              </Button>
            </div>
          )}
        </div>
      </div>
      
      {/* AI Assistant - Floating Button Mode */}
      <WikiAIAssistant 
        currentTitle={workspace?.name || "Workspace"}
        mode="floating-button"
      />
    </div>
  )
}

