"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import Link from "next/link"
import { useState, useEffect } from "react"
import dynamic from "next/dynamic"
import {
  Plus,
  BookOpen,
  Bot,
  Sparkles,
  CheckCircle,
  AlertCircle,
  BarChart3,
  CheckSquare,
  TrendingUp,
} from "lucide-react"
import { useTheme } from "@/components/theme-provider"
import { LoopbrainAssistantLauncher } from "@/components/loopbrain/assistant-launcher"
import { OrgSetupBanner } from "@/components/onboarding/org-setup-banner"
import { LoopbrainWelcomeCard } from "@/components/dashboard/loopbrain-welcome-card"

// Lazy load heavy components
const MeetingsCard = dynamic(() => import("@/components/dashboard/meetings-card").then(mod => ({ default: mod.MeetingsCard })), {
  loading: () => <div className="h-64 bg-muted animate-pulse rounded-lg" />,
  ssr: false
})

const TodaysTodosCard = dynamic(() => import("@/components/dashboard/todays-todos-card").then(mod => ({ default: mod.TodaysTodosCard })), {
  loading: () => <div className="h-64 bg-muted animate-pulse rounded-lg" />,
  ssr: false
})

interface Task {
  id: string
  title: string
  status: string
  dueDate: Date | null
  projectId: string
  project?: {
    id: string
    name: string
  }
}

interface Project {
  id: string
  name: string
  status: string
  ownerId?: string | null
  updatedAt: Date
  members?: Array<{ role: string }>
  tasks?: Array<{ id: string; status: string }>
  userRole?: string
}

interface PendingApproval {
  id: string
  personId: string
  leaveType: string
  startDate: Date
  endDate: Date
}

interface RecentPage {
  id: string
  title: string
  slug: string
  updatedAt: Date
  category?: string | null
}

interface Todo {
  id: string
  title: string
  status: 'OPEN' | 'DONE'
  dueAt: Date | null
}

interface DashboardClientProps {
  user: {
    userId: string
    name?: string
    email: string
  }
  workspaceSlug: string
  companyType?: string | null
  capacity: {
    totalCapacity: number
    allocatedHours: number
    utilizationPct: number
  }
  tasks: {
    overdue: Task[]
    todo: Task[]
    inProgress: Task[]
    done: Task[]
    total: number
  }
  projects: Project[]
  pendingApprovals: PendingApproval[]
  recentPages: RecentPage[]
  taskSummary: {
    total: number
    todo: number
    inProgress: number
    done: number
    overdue: number
  }
  todos: Todo[]
}

export default function DashboardClient({
  user,
  workspaceSlug,
  companyType,
  capacity,
  tasks,
  projects,
  pendingApprovals,
  recentPages,
  taskSummary,
  todos,
}: DashboardClientProps) {
  const { theme, themeConfig } = useTheme()
  const [currentTime, setCurrentTime] = useState(new Date())

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

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
    if (hour < 12) return "Good morning"
    if (hour < 17) return "Good afternoon"
    return "Good evening"
  }

  const getTimeAgo = (date: Date) => {
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
    
    if (diffInSeconds < 60) return 'Just now'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`
    return `${Math.floor(diffInSeconds / 604800)} weeks ago`
  }

  const completedTodos = todos.filter((todo) => todo.status === 'DONE').length
  const totalTodos = todos.length
  const taskCompletionPct = taskSummary.total > 0 ? Math.round((taskSummary.done / taskSummary.total) * 100) : 0

  return (
    <div className="min-h-screen bg-background" data-testid="dashboard-container">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Onboarding Banner */}
        <OrgSetupBanner workspaceSlug={workspaceSlug} />

        {/* Loopbrain first-visit welcome */}
        <LoopbrainWelcomeCard
          companyType={companyType}
          userName={user.name}
          userId={user.userId}
          className="mb-6"
        />

        {/* Welcome Section */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-light mb-2" style={{ color: themeConfig.foreground }}>
              {getGreeting()}, {user.name || 'there'}! 👋
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

        {/* Metrics Row */}
        <div className="grid gap-4 md:grid-cols-3 mb-6">
          {/* My Capacity */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                My Capacity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold" style={{ color: themeConfig.foreground }}>
                    {capacity.utilizationPct}%
                  </span>
                  <span className="text-xs" style={{ color: themeConfig.mutedForeground }}>
                    {capacity.allocatedHours}h / {capacity.totalCapacity}h
                  </span>
                </div>
                <Progress 
                  value={Math.min(capacity.utilizationPct, 100)} 
                  className="h-2"
                />
                {capacity.utilizationPct > 100 && (
                  <p className="text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Overallocated by {capacity.utilizationPct - 100}%
                  </p>
                )}
                {capacity.utilizationPct <= 100 && capacity.utilizationPct > 80 && (
                  <p className="text-xs text-yellow-600 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Near capacity
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Actions Needed */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Actions Needed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {pendingApprovals.length > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Time Off Approvals</span>
                    <Badge variant="default">
                      {pendingApprovals.length}
                    </Badge>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-sm">Overdue Tasks</span>
                  <Badge variant={tasks.overdue.length > 0 ? 'destructive' : 'secondary'}>
                    {tasks.overdue.length}
                  </Badge>
                </div>
                {pendingApprovals.length > 0 && (
                  <Button asChild size="sm" variant="outline" className="w-full mt-2">
                    <Link href={`/w/${workspaceSlug}/org/my-team`}>Review Approvals</Link>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Task Summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <CheckSquare className="h-4 w-4" />
                My Tasks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span style={{ color: themeConfig.mutedForeground }}>To Do</span>
                  <span className="font-medium" style={{ color: themeConfig.foreground }}>
                    {tasks.todo.length}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span style={{ color: themeConfig.mutedForeground }}>In Progress</span>
                  <span className="font-medium" style={{ color: themeConfig.foreground }}>
                    {tasks.inProgress.length}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span style={{ color: themeConfig.mutedForeground }}>Done</span>
                  <span className="font-medium" style={{ color: themeConfig.foreground }}>
                    {tasks.done.length}
                  </span>
                </div>
                <Button asChild size="sm" variant="outline" className="w-full mt-2">
                  <Link href="/my-tasks">View All Tasks</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Dashboard Grid */}
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {/* Today's Meetings */}
          <MeetingsCard className="lg:col-span-1" />

          {/* Today's To-dos */}
          <TodaysTodosCard className="lg:col-span-1" />

          {/* My Tasks */}
          <Card className="lg:col-span-1">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center justify-between">
                <span>My Tasks</span>
                <Badge variant="outline" className="text-xs">{tasks.total}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 max-h-[340px] overflow-y-auto dashboard-card-scroll">
              {/* Overdue Section */}
              {tasks.overdue.length > 0 && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-950 rounded-lg border border-red-200 dark:border-red-800">
                  <p className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">
                    {tasks.overdue.length} Overdue {tasks.overdue.length === 1 ? 'Task' : 'Tasks'}
                  </p>
                  <div className="space-y-1">
                    {tasks.overdue.slice(0, 3).map((task) => (
                      <Link
                        key={task.id}
                        href={`/w/${workspaceSlug}/projects/${task.projectId}`}
                        className="block text-sm hover:underline text-red-700 dark:text-red-300 truncate"
                      >
                        {task.title}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Regular Tasks */}
              <div className="space-y-2">
                {[...tasks.todo, ...tasks.inProgress].slice(0, 8).map((task) => (
                  <Link
                    key={task.id}
                    href={`/w/${workspaceSlug}/projects/${task.projectId}`}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-muted transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: themeConfig.foreground }}>
                        {task.title}
                      </p>
                      <p className="text-xs" style={{ color: themeConfig.mutedForeground }}>
                        {task.project?.name || 'No project'}
                      </p>
                    </div>
                    <Badge variant={task.status === 'IN_PROGRESS' ? 'default' : 'secondary'} className="text-xs">
                      {task.status === 'IN_PROGRESS' ? 'In Progress' : 'To Do'}
                    </Badge>
                  </Link>
                ))}
                
                {tasks.total === 0 && (
                  <div className="text-center py-8" style={{ color: themeConfig.mutedForeground }}>
                    <CheckSquare className="h-12 w-12 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No tasks assigned</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* My Projects */}
          <Card className="lg:col-span-1">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center justify-between">
                <span>My Projects</span>
                <Badge variant="outline" className="text-xs">{projects.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 max-h-[340px] overflow-y-auto dashboard-card-scroll">
              {projects.length > 0 ? (
                projects.slice(0, 5).map((project) => {
                  const completedTasks = project.tasks?.filter((t) => t.status === 'DONE').length || 0
                  const totalTasks = project.tasks?.length || 0
                  const progressPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

                  return (
                    <Link key={project.id} href={`/w/${workspaceSlug}/projects/${project.id}`} className="block">
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
                            {project.userRole && (
                              <Badge
                                variant={project.userRole === 'OWNER' ? 'default' : 'secondary'}
                                className="text-xs flex-shrink-0"
                              >
                                {project.userRole === 'OWNER' ? 'Owner' : 'Member'}
                              </Badge>
                            )}
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
                        <div className="flex items-center gap-2">
                          <span className="text-xs" style={{ color: themeConfig.mutedForeground }}>
                            {completedTasks}/{totalTasks} tasks
                          </span>
                          {totalTasks > 0 && (
                            <div className="flex-1 max-w-[100px]">
                              <Progress value={progressPct} className="h-1" />
                            </div>
                          )}
                          <span className="text-xs" style={{ color: themeConfig.mutedForeground }}>
                            {getTimeAgo(project.updatedAt)}
                          </span>
                        </div>
                      </div>
                    </Link>
                  )
                })
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground mb-2">No projects yet</p>
                  <Link href={`/w/${workspaceSlug}/projects/new`}>
                    <Button size="sm" variant="outline">
                      <Plus className="h-4 w-4 mr-1" />
                      Create Project
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Wiki Pages */}
          <Card className="lg:col-span-1">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center justify-between">
                <span>Recent Pages</span>
                <Badge variant="outline" className="text-xs">{recentPages.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 max-h-[340px] overflow-y-auto dashboard-card-scroll">
              {recentPages.length > 0 ? (
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
