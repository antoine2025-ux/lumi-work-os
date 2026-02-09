"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { useWorkspace } from "@/lib/workspace-context"
import { DashboardBootstrap } from "@/lib/types/dashboard-bootstrap"
import dynamic from "next/dynamic"
import {
  Plus,
  BookOpen,
  Bot,
  ChevronRight,
  Sparkles,
  CheckCircle,
  AlertCircle,
  BarChart3,
  CheckSquare,
} from "lucide-react"
import { useTheme } from "@/components/theme-provider"
import { LoopbrainAssistantLauncher } from "@/components/loopbrain/assistant-launcher"
import { OrgSetupBanner } from "@/components/onboarding/org-setup-banner"
// Lazy load heavy components for better initial page load
const MeetingsCard = dynamic(() => import("@/components/dashboard/meetings-card").then(mod => ({ default: mod.MeetingsCard })), {
  loading: () => <div className="h-64 bg-muted animate-pulse rounded-lg" />,
  ssr: false
})

// Lazy load Todo components
const TodaysTodosCard = dynamic(() => import("@/components/dashboard/todays-todos-card").then(mod => ({ default: mod.TodaysTodosCard })), {
  loading: () => <div className="h-64 bg-muted animate-pulse rounded-lg" />,
  ssr: false
})

interface RecentPage {
  id: string
  title: string
  slug: string
  updatedAt: string
  category: string
}

interface Project {
  id: string
  name: string
  description?: string
  status: string
  createdAt: string
  updatedAt: string
  taskCount?: number
}

export default function HomePage() {
  const { currentWorkspace, isLoading: workspaceLoading } = useWorkspace()
  const { theme, themeConfig } = useTheme()
  const [currentTime, setCurrentTime] = useState(new Date())

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Helper functions
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
  }

  const getGreeting = () => {
    const hour = currentTime.getHours()
    if (hour < 12) return "Good morning!"
    if (hour < 17) return "Good afternoon!"
    return "Good evening!"
  }

  // Use bootstrap endpoint for initial dashboard load (single API call)
  const { data: bootstrapData, isLoading: isLoadingBootstrap } = useQuery({
    queryKey: ['dashboard-bootstrap', currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace) return null
      const response = await fetch('/api/dashboard/bootstrap')
      if (!response.ok) throw new Error('Bootstrap failed')
      return response.json() as Promise<DashboardBootstrap>
    },
    enabled: !!currentWorkspace,
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: false,
  })

  // Extract data from bootstrap response
  const recentPages = (bootstrapData?.wikiPages || []) as RecentPage[]
  const recentProjects = (bootstrapData?.projects || []) as Project[]
  const todaysTodos = bootstrapData?.todos || []
  const completedTodos = todaysTodos.filter((todo: any) => todo.status === 'DONE').length
  const totalTodos = todaysTodos.length
  const taskSummary = bootstrapData?.taskSummary || { total: 0, todo: 0, inProgress: 0, done: 0, overdue: 0 }
  const taskCompletionPct = taskSummary.total > 0 ? Math.round((taskSummary.done / taskSummary.total) * 100) : 0
  
  // Loading state combines all bootstrap data
  const isLoadingProjects = isLoadingBootstrap

  // Helper function to format time ago
  const getTimeAgo = (dateString: string) => {
    const now = new Date()
    const date = new Date(dateString)
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
    
    if (diffInSeconds < 60) return 'Just now'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`
    return `${Math.floor(diffInSeconds / 604800)} weeks ago`
  }

  // Show loading skeleton if workspace is still loading
  if (workspaceLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="mb-8">
            <div className="h-8 w-64 bg-muted rounded animate-pulse mb-2"></div>
            <div className="h-6 w-96 bg-muted rounded animate-pulse"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-card rounded-lg p-6 animate-pulse">
                <div className="h-6 w-3/4 bg-muted rounded mb-4"></div>
                <div className="h-4 w-full bg-muted rounded mb-2"></div>
                <div className="h-4 w-2/3 bg-muted rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background" data-testid="dashboard-container">
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Onboarding Banner */}
        {currentWorkspace?.slug && (
          <OrgSetupBanner workspaceSlug={currentWorkspace.slug} />
        )}
        
        {/* Welcome Section */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-light mb-2" style={{ color: themeConfig.foreground }}>
              {getGreeting()} 👋
            </h2>
            <p className="text-lg" style={{ color: themeConfig.mutedForeground }}>
              {formatDate(currentTime)}
            </p>
          </div>
          
          {/* Progress Gauges */}
          <div className="flex items-center space-x-6">
            {/* Task Summary */}
            <div className="text-center">
              <div className="relative w-16 h-16 mb-2">
                <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-muted"
                    stroke="currentColor"
                    strokeWidth="3"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="text-primary"
                    stroke="currentColor"
                    strokeWidth="3"
                    fill="none"
                    strokeDasharray={`${totalTodos > 0 ? (completedTodos / totalTodos) * 100 : 0}, 100`}
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-sm font-medium" style={{ color: themeConfig.foreground }}>
                    {completedTodos}/{totalTodos}
                  </span>
                </div>
              </div>
              <p className="text-sm font-medium" style={{ color: themeConfig.foreground }}>To-dos</p>
              <div className="flex items-center justify-center space-x-1 mt-1">
                <CheckCircle className="h-3 w-3 text-green-400" />
                <span className="text-xs" style={{ color: themeConfig.mutedForeground }}>On Track</span>
              </div>
            </div>

            {/* Task Completion */}
            <div className="text-center">
              <div className="relative w-16 h-16 mb-2">
                <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-muted"
                    stroke="currentColor"
                    strokeWidth="3"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className={taskSummary.overdue > 0 ? "text-red-500" : "text-green-500"}
                    stroke="currentColor"
                    strokeWidth="3"
                    fill="none"
                    strokeDasharray={`${taskCompletionPct}, 100`}
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-sm font-semibold" style={{ color: themeConfig.foreground }}>
                    {taskSummary.total > 0 ? `${taskCompletionPct}%` : '--'}
                  </span>
                </div>
              </div>
              <p className="text-sm font-medium" style={{ color: themeConfig.foreground }}>Tasks Done</p>
              {taskSummary.overdue > 0 ? (
                <div className="flex items-center justify-center space-x-1 mt-1">
                  <AlertCircle className="h-3 w-3 text-red-400" />
                  <span className="text-xs text-red-400">{taskSummary.overdue} overdue</span>
                </div>
              ) : (
                <p className="text-xs mt-1" style={{ color: themeConfig.mutedForeground }}>
                  {taskSummary.done}/{taskSummary.total}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Dashboard Grid */}
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {/* Today's Meetings - Google Calendar Integration */}
          <MeetingsCard className="lg:col-span-1" />


          {/* Today's To-dos */}
          <TodaysTodosCard className="lg:col-span-1" />

          {/* Active Projects - Real Data */}
          <Card className="lg:col-span-1">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center justify-between">
                <span>Active Projects</span>
                <Badge variant="outline" className="text-xs">{recentProjects.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 max-h-[340px] overflow-y-auto dashboard-card-scroll">
              {(isLoadingProjects || isLoadingBootstrap) ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-muted rounded-full animate-pulse"></div>
                          <div className="h-4 bg-muted rounded animate-pulse w-24"></div>
                        </div>
                        <div className="h-4 bg-muted rounded animate-pulse w-16"></div>
                      </div>
                      <div className="h-2 bg-muted rounded animate-pulse"></div>
                    </div>
                  ))}
                </div>
              ) : recentProjects.length > 0 ? (
                recentProjects.slice(0, 5).map((project) => (
                  <Link key={project.id} href={`/projects/${project.id}`} className="block">
                    <div className="space-y-1 p-2 rounded-lg hover:bg-muted transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 min-w-0">
                          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                            project.status === 'ACTIVE' ? 'bg-green-500' :
                            project.status === 'ON_HOLD' ? 'bg-yellow-500' :
                            project.status === 'COMPLETED' ? 'bg-blue-500' : 'bg-muted-foreground'
                          }`} />
                          <span className="text-sm font-medium truncate" style={{ color: themeConfig.foreground }}>
                            {project.name}
                          </span>
                        </div>
                        <Badge 
                          variant={project.status === 'ACTIVE' ? 'default' : 'secondary'}
                          className="text-xs flex-shrink-0 ml-2"
                        >
                          {project.status === 'ACTIVE' ? 'Active' :
                           project.status === 'ON_HOLD' ? 'On Hold' :
                           project.status === 'COMPLETED' ? 'Done' :
                           project.status === 'CANCELLED' ? 'Cancelled' : project.status}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-xs" style={{ color: themeConfig.mutedForeground }}>
                        <span>{project.taskCount || 0} tasks</span>
                        <span>{getTimeAgo(project.updatedAt)}</span>
                      </div>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground mb-2">No projects yet</p>
                  <Link href="/projects/new">
                    <Button size="sm" variant="outline">
                      <Plus className="h-4 w-4 mr-1" />
                      Create Project
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* My Task Signals - Real Data */}
          <Card className="lg:col-span-1">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center justify-between">
                <span>My Tasks</span>
                <Badge variant="outline" className="text-xs">{taskSummary.total}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoadingBootstrap ? (
                <div className="space-y-3">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="h-4 bg-muted rounded animate-pulse w-24" />
                      <div className="h-4 bg-muted rounded animate-pulse w-8" />
                    </div>
                  ))}
                </div>
              ) : taskSummary.total > 0 ? (
                <>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                      <span className="text-sm" style={{ color: themeConfig.foreground }}>To do</span>
                    </div>
                    <span className="text-sm font-semibold" style={{ color: themeConfig.foreground }}>
                      {taskSummary.todo}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 rounded-full bg-yellow-500" />
                      <span className="text-sm" style={{ color: themeConfig.foreground }}>In progress</span>
                    </div>
                    <span className="text-sm font-semibold" style={{ color: themeConfig.foreground }}>
                      {taskSummary.inProgress}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      <span className="text-sm" style={{ color: themeConfig.foreground }}>Completed</span>
                    </div>
                    <span className="text-sm font-semibold" style={{ color: themeConfig.foreground }}>
                      {taskSummary.done}
                    </span>
                  </div>
                  {taskSummary.overdue > 0 && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 rounded-full bg-red-500" />
                        <span className="text-sm text-red-400">Overdue</span>
                      </div>
                      <span className="text-sm font-semibold text-red-400">
                        {taskSummary.overdue}
                      </span>
                    </div>
                  )}
                  <Link href="/my-tasks" className="block pt-2">
                    <Button variant="ghost" size="sm" className="w-full justify-center text-muted-foreground hover:text-foreground">
                      View all tasks
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </Link>
                </>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground">No tasks assigned to you yet</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Wiki Pages - Real Data */}
          <Card className="lg:col-span-1">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center justify-between">
                <span>Recent Pages</span>
                <Badge variant="outline" className="text-xs">{recentPages.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 max-h-[340px] overflow-y-auto dashboard-card-scroll">
              {isLoadingBootstrap ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center space-x-3 p-2 rounded-lg animate-pulse">
                      <div className="w-4 h-4 bg-muted rounded" />
                      <div className="flex-1 space-y-1">
                        <div className="h-4 bg-muted rounded w-3/4" />
                        <div className="h-3 bg-muted rounded w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : recentPages.length > 0 ? (
                recentPages.map((page) => (
                  <Link key={page.id} href={`/wiki/${page.slug}`} className="block">
                    <div className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted transition-colors">
                      <BookOpen className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: themeConfig.foreground }}>
                          {page.title}
                        </p>
                        <p className="text-xs" style={{ color: themeConfig.mutedForeground }}>
                          {getTimeAgo(page.updatedAt)}
                          {page.category && ` · ${page.category}`}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="text-center py-4">
                  <BookOpen className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mb-2">No wiki pages yet</p>
                  <Link href="/wiki/new">
                    <Button size="sm" variant="outline">
                      <Plus className="h-4 w-4 mr-1" />
                      Create Page
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="lg:col-span-1">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <Link href="/todos">
                  <Button variant="outline" size="sm" className="h-12 w-full">
                    <CheckSquare className="h-4 w-4 mr-2" />
                    Add To-do
                  </Button>
                </Link>
                <Link href="/wiki/new">
                  <Button variant="outline" size="sm" className="h-12 w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    New Page
                  </Button>
                </Link>
                <Link href="/ask">
                  <Button variant="outline" size="sm" className="h-12 w-full">
                    <Bot className="h-4 w-4 mr-2" />
                    LoopBrain
                  </Button>
                </Link>
                <Button variant="outline" size="sm" className="h-12" disabled>
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Analytics
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Ask Loopbrain CTA */}
        <div className="mt-8">
          <Card style={{ 
            background: theme === 'dark' 
              ? 'linear-gradient(to right, rgba(88, 28, 135, 0.3), rgba(37, 99, 235, 0.3))' 
              : 'linear-gradient(to right, rgba(243, 232, 255, 1), rgba(219, 234, 254, 1))',
            borderColor: theme === 'dark' ? 'rgba(126, 34, 206, 0.5)' : 'rgba(196, 181, 253, 1)'
          }}>
            <CardContent className="p-6">
              <div className="flex items-start space-x-4">
                <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                  <Bot className="h-5 w-5 text-foreground" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium mb-2" style={{ color: themeConfig.foreground }}>
                    Ask Loopbrain
                  </h4>
                  <p className="text-sm mb-3" style={{ color: themeConfig.mutedForeground }}>
                    Get AI-powered insights about your workspace, tasks, and projects.
                  </p>
                  <Link href="/ask">
                    <Button size="sm" className="bg-purple-500 hover:bg-purple-600">
                      <Sparkles className="h-4 w-4 mr-2" />
                      Ask Loopbrain
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Global Loopbrain Assistant */}
      <LoopbrainAssistantLauncher mode="dashboard" />
    </div>
  )
}

