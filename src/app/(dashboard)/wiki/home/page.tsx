"use client"

import { useMemo } from "react"
import { useRouter } from "next/navigation"
import { useUserStatus } from "@/hooks/use-user-status"
import { useWorkspaces } from "@/hooks/use-workspaces"
import { useRecentPages } from "@/hooks/use-wiki-pages"
import { useProjects } from "@/hooks/use-projects"
import { useDrafts } from "@/hooks/use-drafts"
import { 
  Clock, 
  FileText, 
  Folder, 
  Target,
  Plus,
  Globe,
  Users,
  Loader2,
  Brain,
  Edit3,
  Sparkles,
  ChevronRight
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { WikiAIAssistant } from "@/components/wiki/wiki-ai-assistant"

interface RecentPage {
  id: string
  title: string
  slug: string
  updatedAt: string
  author: string
  permissionLevel?: string
  workspace_type?: string
}

interface Project {
  id: string
  name: string
  description?: string
  status: string
  color?: string
  updatedAt?: string
  createdAt?: string
}

interface WikiWorkspace {
  id: string
  name: string
  type: 'personal' | 'team' | 'project' | null
  color?: string
  description?: string
  pageCount?: number
  lastUpdated?: string
  memberCount?: number
}

interface Draft {
  id: string
  title: string
  type: 'page' | 'session'
  updatedAt: string
  url?: string
  excerpt?: string
}

interface AISuggestion {
  id: string
  type: 'summary' | 'incomplete' | 'outdated' | 'blocked'
  title: string
  description: string
  action?: string
}

export default function SpacesHomePage() {
  const router = useRouter()
  const { userStatus, loading: userStatusLoading } = useUserStatus()
  
  // Use React Query hooks for instant, cached data fetching
  const { data: workspacesData = [], isLoading: workspacesLoading } = useWorkspaces()
  const { data: recentPagesData = [], isLoading: pagesLoading } = useRecentPages(20)
  const { data: projectsData = [], isLoading: projectsLoading } = useProjects()
  const { data: draftsData = [], isLoading: draftsLoading } = useDrafts()
  
  const isLoading = userStatusLoading || workspacesLoading || pagesLoading || projectsLoading || draftsLoading

  // Use CSS variables for consistent theming
  const colors = {
    primary: 'var(--primary)',
    success: '#10b981',
    warning: '#f59e0b',
    error: 'var(--destructive)',
    background: 'var(--background)',
    surface: 'var(--card)',
    text: 'var(--foreground)',
    textSecondary: 'var(--muted-foreground)',
    border: 'var(--border)',
    borderLight: 'var(--muted)'
  }

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
      return 'yesterday'
    } else if (diffInDays < 7) {
      return `${diffInDays}d ago`
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }
  }

  const getWorkspaceIcon = (workspace: WikiWorkspace) => {
    if (workspace.type === 'personal') {
      return <FileText className="h-5 w-5 text-indigo-600" />
    } else if (workspace.type === 'team') {
      return <Users className="h-5 w-5 text-blue-600" />
    } else {
      return <Globe className="h-5 w-5 text-blue-600" />
    }
  }

  const getWorkspaceRoute = (workspace: WikiWorkspace): string => {
    if (workspace.type === 'personal') {
      return '/wiki/personal-space'
    } else if (workspace.type === 'team') {
      return '/wiki/team-workspace'
    } else {
      return `/wiki/workspace/${workspace.id}`
    }
  }

  // Enrich workspaces with page counts and last updated (memoized)
  const workspaces = useMemo(() => {
    return workspacesData.map(ws => {
      // Count pages for this workspace from recent pages
      const workspacePages = recentPagesData.filter(p => 
        p.workspace_type === ws.type || 
        p.workspace_type === ws.id ||
        (ws.type === 'personal' && p.workspace_type === 'personal') ||
        (ws.type === 'team' && p.workspace_type === 'team')
      )
      
      const lastUpdated = workspacePages.length > 0
        ? workspacePages.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0]?.updatedAt
        : null

      return {
        ...ws,
        pageCount: workspacePages.length,
        lastUpdated: lastUpdated || undefined
      }
    })
  }, [workspacesData, recentPagesData])

  // Generate AI suggestions based on actual data (memoized)
  const aiSuggestions = useMemo(() => {
    const suggestions: AISuggestion[] = []
    
    // Check for workspace activity - suggest summaries for active workspaces
    if (workspaces.length > 0) {
      const activeWorkspaces = workspaces.filter(ws => ws.pageCount && ws.pageCount >= 5)
      activeWorkspaces.forEach((ws, index) => {
        if (index < 2) { // Limit to 2 suggestions
          suggestions.push({
            id: `summary-${ws.id}`,
            type: 'summary',
            title: `Weekly summary for ${ws.name}`,
            description: `You have ${ws.pageCount} pages in ${ws.name} — want a summary?`,
            action: 'Generate summary'
          })
        }
      })
    }

    // Check for drafts - suggest continuing work
    if (draftsData.length > 0) {
      suggestions.push({
        id: 'drafts-1',
        type: 'incomplete',
        title: `${draftsData.length} ${draftsData.length === 1 ? 'draft' : 'drafts'} waiting`,
        description: 'You have unfinished work that might need attention.',
        action: 'View drafts'
      })
    }

    // Check for recent activity - suggest organization
    if (recentPagesData.length > 10) {
      suggestions.push({
        id: 'organize-1',
        type: 'outdated',
        title: 'Organize your content',
        description: `You have ${recentPagesData.length} pages. Consider organizing them into workspaces.`,
        action: 'Organize'
      })
    }

    return suggestions.slice(0, 3) // Limit to 3 suggestions
  }, [workspaces, draftsData, recentPagesData])

  // Get recent work items (pages + projects) - memoized
  const recentWork = useMemo(() => {
    return [
      ...recentPagesData.slice(0, 6).map(page => ({
        id: page.id,
        title: page.title,
        type: 'page' as const,
        updatedAt: page.updatedAt,
        url: `/wiki/${page.slug}`,
        icon: <FileText className="h-4 w-4" />
      })),
      ...projectsData.slice(0, 3).map(project => ({
        id: project.id,
        title: project.name,
        type: 'project' as const,
        updatedAt: project.updatedAt || project.createdAt || new Date().toISOString(),
        url: `/projects/${project.id}`,
        icon: <Target className="h-4 w-4" />
      }))
    ].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 8)
  }, [recentPagesData, projectsData])

  if (userStatusLoading || isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const handleCreatePage = () => {
    if (typeof window !== 'undefined' && (window as any).triggerCreatePage) {
      (window as any).triggerCreatePage()
    }
  }

  const handleCreateWorkspace = () => {
    router.push('/wiki')
  }

  const handleCreateProject = () => {
    router.push('/projects/new')
  }

  return (
    <>
      <div className="min-h-screen bg-slate-900">
        {/* Header */}
        <div className="px-16 py-8 space-y-2">
          <h1 className="text-4xl font-light text-gray-200">Home</h1>
          <p className="text-lg font-light text-slate-400">
            Welcome back{userStatus?.user?.name ? `, ${userStatus.user.name.split(' ')[0]}` : ''}.
          </p>
        </div>

        {/* Content Area */}
        <div className="px-16 pb-16 space-y-12">
          {/* Section 1: Your Spaces */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-light text-gray-200">Your Spaces</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCreateWorkspace}
                className="font-light text-sm h-8 px-3"
              >
                <Plus className="h-4 w-4 mr-1" />
                New Space
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {workspaces.map((workspace) => (
                <Card
                  key={workspace.id}
                  className={cn(
                    "cursor-pointer transition-all duration-200",
                    "hover:shadow-lg hover:border-primary/50",
                    "group"
                  )}
                  className="bg-slate-800 border-slate-700"
                  onClick={() => router.push(getWorkspaceRoute(workspace))}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" 
                        style={{ backgroundColor: workspace.color ? `${workspace.color}20` : '#3B82F620' }}>
                        {getWorkspaceIcon(workspace)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-light truncate mb-1 group-hover:text-blue-400 transition-colors text-gray-200">
                          {workspace.name}
                        </h3>
                        <div className="flex items-center gap-3 text-xs text-slate-400">
                          {workspace.pageCount !== undefined && (
                            <span>{workspace.pageCount} {workspace.pageCount === 1 ? 'page' : 'pages'}</span>
                          )}
                          {workspace.memberCount !== undefined && workspace.memberCount > 0 && (
                            <span>{workspace.memberCount} {workspace.memberCount === 1 ? 'member' : 'members'}</span>
                          )}
                        </div>
                        {workspace.lastUpdated && (
                          <p className="text-xs mt-1 text-slate-400">
                            Updated {formatTimeAgo(workspace.lastUpdated)}
                          </p>
                        )}
                      </div>
                      <ChevronRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Section 2: Your Work / Recent */}
          {recentWork.length > 0 && (
            <div>
              <h2 className="text-xl font-light mb-6 text-gray-200">Recent</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {recentWork.map((item) => (
                  <Card
                    key={item.id}
                    className={cn(
                      "cursor-pointer transition-all duration-200",
                      "hover:shadow-lg hover:border-primary/50",
                      "group"
                    )}
                    className="bg-slate-800 border-slate-700"
                    onClick={() => router.push(item.url)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-slate-700">
                          {item.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-light truncate mb-1 group-hover:text-blue-400 transition-colors text-gray-200">
                            {item.title}
                          </h3>
                          <p className="text-xs text-slate-400">
                            {formatTimeAgo(item.updatedAt)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Section 3: Drafts */}
          {draftsData.length > 0 && (
            <div>
              <h2 className="text-xl font-light mb-6 text-gray-200">Continue Writing</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {draftsData.map((draft) => (
                  <Card
                    key={draft.id}
                    className={cn(
                      "cursor-pointer transition-all duration-200",
                      "hover:shadow-lg hover:border-primary/50",
                      "group border-dashed"
                    )}
                    className="bg-slate-800 border-slate-700"
                    onClick={() => {
                      if (draft.type === 'session') {
                        router.push(`/assistant?session=${draft.id}`)
                      } else if (draft.url) {
                        router.push(draft.url)
                      }
                    }}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Edit3 className="h-4 w-4 mt-1 text-slate-400" />
                        <div className="flex-1 min-w-0">
                          <h3 className="font-light truncate mb-1 group-hover:text-blue-400 transition-colors text-gray-200">
                            {draft.title}
                          </h3>
                          {draft.excerpt && (
                            <p className="text-xs mt-1 line-clamp-2 text-slate-400">
                              {draft.excerpt}
                            </p>
                          )}
                          <p className="text-xs mt-2 text-slate-400">
                            {formatTimeAgo(draft.updatedAt)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Section 4: LoopBrain Suggestions */}
          {aiSuggestions.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-6">
                <Brain className="h-5 w-5 text-blue-500" />
                <h2 className="text-xl font-light text-gray-200">LoopBrain Suggestions</h2>
              </div>
              <div className="space-y-3">
                {aiSuggestions.map((suggestion) => (
                  <Card
                    key={suggestion.id}
                    className={cn(
                      "transition-all duration-200",
                      "hover:shadow-md hover:border-primary/30",
                      "border-l-4"
                    )}
                    className="bg-slate-800 border-blue-500 border-l-4"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Sparkles className="h-4 w-4 mt-1 flex-shrink-0 text-blue-500" />
                        <div className="flex-1 min-w-0">
                          <h3 className="font-light mb-1 text-gray-200">
                            {suggestion.title}
                          </h3>
                          <p className="text-sm text-slate-400">
                            {suggestion.description}
                          </p>
                          {suggestion.action && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="mt-2 font-light text-xs h-7"
                              onClick={() => {
                                // Handle suggestion action
                                console.log('Suggestion action:', suggestion.action)
                              }}
                            >
                              {suggestion.action}
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Section 5: Create New (Bottom) */}
          <div>
            <h2 className="text-xl font-light mb-6 text-gray-200">Create New</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Create Page */}
              <Card
                className={cn(
                  "cursor-pointer transition-all duration-200 border-2 border-dashed",
                  "hover:border-primary hover:bg-accent/50",
                  "group"
                )}
                style={{ backgroundColor: colors.surface, borderColor: colors.border }}
                onClick={handleCreatePage}
              >
                <CardContent className="p-6 flex flex-col items-center justify-center min-h-[100px]">
                  <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center mb-2 group-hover:bg-indigo-200 dark:group-hover:bg-indigo-800/50 transition-colors">
                    <FileText className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <h3 className="font-light text-center text-sm text-gray-200">
                    New Page
                  </h3>
                </CardContent>
              </Card>

              {/* Create Workspace */}
              <Card
                className={cn(
                  "cursor-pointer transition-all duration-200 border-2 border-dashed",
                  "hover:border-primary hover:bg-accent/50",
                  "group"
                )}
                style={{ backgroundColor: colors.surface, borderColor: colors.border }}
                onClick={handleCreateWorkspace}
              >
                <CardContent className="p-6 flex flex-col items-center justify-center min-h-[100px]">
                  <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-2 group-hover:bg-blue-200 dark:group-hover:bg-blue-800/50 transition-colors">
                    <Globe className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="font-light text-center text-sm text-gray-200">
                    New Space
                  </h3>
                </CardContent>
              </Card>

              {/* Create Project */}
              <Card
                className={cn(
                  "cursor-pointer transition-all duration-200 border-2 border-dashed",
                  "hover:border-primary hover:bg-accent/50",
                  "group"
                )}
                style={{ backgroundColor: colors.surface, borderColor: colors.border }}
                onClick={handleCreateProject}
              >
                <CardContent className="p-6 flex flex-col items-center justify-center min-h-[100px]">
                  <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-2 group-hover:bg-green-200 dark:group-hover:bg-green-800/50 transition-colors">
                    <Target className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <h3 className="font-light text-center text-sm text-gray-200">
                    New Project
                  </h3>
                </CardContent>
              </Card>

              {/* Placeholder */}
              <Card
                className={cn(
                  "border-2 border-dashed opacity-50",
                )}
                style={{ backgroundColor: colors.surface, borderColor: colors.border }}
              >
                <CardContent className="p-6 flex flex-col items-center justify-center min-h-[100px]">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center mb-2 bg-slate-700">
                    <Plus className="h-5 w-5 text-slate-400" />
                  </div>
                  <h3 className="font-light text-center text-sm text-slate-400">
                    More coming
                  </h3>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
      
      {/* AI Assistant - Floating Button Mode */}
      <WikiAIAssistant 
        currentTitle="Home"
        mode="floating-button"
      />
    </>
  )
}
