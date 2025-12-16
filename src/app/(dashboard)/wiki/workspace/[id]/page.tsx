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
import { LoopbrainAssistantLauncher } from "@/components/loopbrain/assistant-launcher"

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

      // Load all data in parallel for better performance
      // Pass workspace_type to filter pages server-side
      const [workspacesResponse, pagesResponse, projectsResponse] = await Promise.all([
        fetch('/api/wiki/workspaces'),
        fetch(`/api/wiki/recent-pages?limit=100&workspace_type=${encodeURIComponent(resolvedParams.id)}`),
        fetch(`/api/projects?workspaceId=${userStatus.workspaceId}`)
      ])

      // Process workspace response
      if (workspacesResponse.ok) {
        const workspacesData = await workspacesResponse.json()
        const foundWorkspace = workspacesData.find((w: any) => w.id === resolvedParams.id)
        setWorkspace(foundWorkspace)
      }

      // Process pages response
      // Pages are already filtered server-side by workspace_type
      if (pagesResponse.ok) {
        const pages = await pagesResponse.json()
        
        if (Array.isArray(pages)) {
          // Double-check filtering (defensive programming)
          const filtered = pages.filter((page: any) => {
            const pageWorkspaceType = page.workspace_type
            return pageWorkspaceType === resolvedParams.id
          })
          
          setWorkspacePages(filtered)
        }
      }

      // Process projects response
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
    <>
      <div className="min-h-screen" style={{ backgroundColor: colors.background }}>
        {/* Zen-style Header */}
        <div className="px-16 py-8 space-y-4">
          <div className="flex items-center space-x-3">
            <h1 className="text-4xl font-light" style={{ color: colors.text }}>{workspace.name}</h1>
          </div>
          <p className="text-lg max-w-2xl" style={{ color: colors.textSecondary }}>
            {workspace.description || 'Your custom workspace'}
          </p>
        </div>

        {/* Stats Overview - Zen Style */}
        <div className="px-16 mb-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl font-light mb-2" style={{ color: colors.text }}>{workspacePages.length}</div>
              <div className="text-sm" style={{ color: colors.textSecondary }}>Total Pages</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-light mb-2" style={{ color: colors.success }}>{projects.length}</div>
              <div className="text-sm" style={{ color: colors.textSecondary }}>Projects</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-light mb-2" style={{ color: colors.primary }}>{workspaceItems.length}</div>
              <div className="text-sm" style={{ color: colors.textSecondary }}>Total Items</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-light mb-2" style={{ color: colors.text }}>Custom</div>
              <div className="text-sm" style={{ color: colors.textSecondary }}>Workspace</div>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="px-16">
          {workspaceItems.length === 0 ? (
            <div className="space-y-8">
              {/* Empty State */}
              <div className="space-y-6 text-center">
                <div className="flex justify-center">
                  <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center">
                    <Shield className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
                <div className="space-y-2">
                  <h2 className="text-xl font-light" style={{ color: colors.text }}>This workspace is empty</h2>
                  <p className="text-sm max-w-md mx-auto" style={{ color: colors.textSecondary }}>
                    Create pages to organize content in this workspace. Pages created here will be associated with this workspace.
                  </p>
                </div>
              </div>

              {/* Single CTA */}
              <div className="flex justify-center pt-4">
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {workspaceItems.map((item) => (
                    <Card
                      key={item.id}
                      className={cn(
                        "cursor-pointer transition-all duration-200",
                        "hover:shadow-lg hover:border-primary/50",
                        "group"
                      )}
                      style={{ backgroundColor: colors.surface, borderColor: colors.border }}
                      onClick={() => router.push(item.url)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3 mb-4">
                          {item.icon}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium truncate mb-1 group-hover:text-primary transition-colors" style={{ color: colors.text }}>
                              {item.title}
                            </h3>
                            <p className="text-xs" style={{ color: colors.textSecondary }}>
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
                className="w-full"
                style={{ borderColor: colors.border }}
                onClick={handleCreatePage}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create New Page
              </Button>
            </div>
          )}
        </div>
      </div>
      
      {/* Global Loopbrain Assistant */}
      <LoopbrainAssistantLauncher mode="spaces" />
    </>
  )
}

