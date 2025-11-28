"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import Link from "next/link"
import { useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { useWorkspace } from "@/lib/workspace-context"
import dynamic from "next/dynamic"
import {
  Plus,
  BookOpen,
  Bot,
  FileText,
  Clock,
  Star,
  TrendingUp,
  Users,
  Settings,
  Bell,
  ChevronRight,
  Sparkles,
  Zap,
  Lightbulb,
  Calendar,
  Building2,
  Target,
  Activity,
  CheckCircle,
  AlertCircle,
  Video,
  Phone,
  User,
  Calendar as CalendarIcon,
  FileText as DocumentText,
  BarChart3,
  Grid,
  Search,
  Filter
} from "lucide-react"
import { ContextMenu, contextMenuItems } from "@/components/ui/context-menu"
import { useTheme } from "@/components/theme-provider"
// Lazy load heavy components for better initial page load
const MeetingsCard = dynamic(() => import("@/components/dashboard/meetings-card").then(mod => ({ default: mod.MeetingsCard })), {
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

// Mock data for disconnected systems

const mockTasks = [
  {
    id: "1",
    title: "Review Q4 roadmap",
    priority: "HIGH",
    category: "Product Strategy",
    dueDate: "Today",
    completed: false
  },
  {
    id: "2",
    title: "Update user documentation",
    priority: "MEDIUM", 
    category: "Documentation",
    dueDate: "Tomorrow",
    completed: false
  },
  {
    id: "3",
    title: "Code review for auth module",
    priority: "HIGH",
    category: "Authentication", 
    dueDate: "Friday",
    completed: false
  }
]

const mockAnalytics = [
  { label: "Productivity", value: 85, color: "bg-green-500" },
  { label: "Focus Time", value: 6.5, color: "bg-blue-500", unit: "h" },
  { label: "Team Collaboration", value: 92, color: "bg-purple-500" }
]

export default function HomePage() {
  const { currentWorkspace, userRole, canCreateProjects, canViewAnalytics, isLoading: workspaceLoading } = useWorkspace()
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

  const completedTasks = mockTasks.filter(task => task.completed).length
  const totalTasks = mockTasks.length

  // Use React Query for automatic caching, deduplication, and better performance
  const { data: pagesData, isLoading: isLoadingRecentPages } = useQuery({
    queryKey: ['wiki-pages', currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace) return []
      const response = await fetch(`/api/wiki/pages?workspaceId=${currentWorkspace.id}`)
      if (!response.ok) return []
      const result = await response.json()
      const data = result.data || result
      if (Array.isArray(data)) {
        return data
          .sort((a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
          .slice(0, 4)
      }
      return []
    },
    enabled: !!currentWorkspace,
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: false,
  })

  const { data: projectsData, isLoading: isLoadingProjects } = useQuery({
    queryKey: ['projects', currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace) return []
      const response = await fetch(`/api/projects?workspaceId=${currentWorkspace.id}`)
      if (!response.ok) return []
      const result = await response.json()
      const data = result.data || result
      if (Array.isArray(data)) {
        return data
          .sort((a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
          .slice(0, 6)
      }
      return []
    },
    enabled: !!currentWorkspace,
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: false,
  })

  const recentPages = (pagesData || []) as RecentPage[]
  const recentProjects = (projectsData || []) as Project[]

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
    <div className="min-h-screen bg-background">
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
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
                    strokeDasharray={`${(completedTasks / totalTasks) * 100}, 100`}
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-sm font-medium" style={{ color: themeConfig.foreground }}>
                    {completedTasks}/{totalTasks}
                  </span>
                </div>
              </div>
              <p className="text-sm font-medium" style={{ color: themeConfig.foreground }}>Tasks</p>
              <div className="flex items-center justify-center space-x-1 mt-1">
                <CheckCircle className="h-3 w-3 text-green-600" />
                <span className="text-xs" style={{ color: themeConfig.mutedForeground }}>On Track</span>
              </div>
            </div>

            {/* Weekly Goal */}
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
                    className="text-green-500"
                    stroke="currentColor"
                    strokeWidth="3"
                    fill="none"
                    strokeDasharray="75, 100"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-sm font-semibold" style={{ color: themeConfig.foreground }}>75%</span>
                </div>
              </div>
              <p className="text-sm font-medium" style={{ color: themeConfig.foreground }}>Weekly Goal</p>
              <p className="text-xs" style={{ color: themeConfig.mutedForeground }}>On track</p>
            </div>
          </div>
        </div>

        {/* Dashboard Grid */}
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {/* Today's Meetings - Google Calendar Integration */}
          <MeetingsCard className="lg:col-span-1" />


          {/* Today's Tasks - Placeholder */}
          <Card className="lg:col-span-1">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center justify-between">
                <span>Today's Tasks</span>
                <Badge variant="outline" className="text-xs">{mockTasks.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 max-h-[340px] overflow-y-auto dashboard-card-scroll">
              {mockTasks.map((task) => (
                <div key={task.id} className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted transition-colors">
                  <div className="flex-shrink-0">
                    <div className={`w-4 h-4 rounded-full border-2 ${
                      task.completed ? 'bg-green-500 border-green-500' : 'border-border'
                    } flex items-center justify-center`}>
                      {task.completed && <CheckCircle className="h-3 w-3 text-white" />}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: themeConfig.foreground }}>
                      {task.title}
                    </p>
                    <div className="flex items-center space-x-2 text-xs" style={{ color: themeConfig.mutedForeground }}>
                      <Badge 
                        variant={task.priority === 'HIGH' ? 'destructive' : 'secondary'}
                        className="text-xs"
                      >
                        {task.priority}
                      </Badge>
                      <span>{task.category}</span>
                      <span>•</span>
                      <span>{task.dueDate}</span>
                    </div>
                  </div>
                </div>
              ))}
              <div className="text-center py-4">
                <p className="text-xs text-muted-foreground">Task management coming soon</p>
              </div>
            </CardContent>
          </Card>

          {/* Active Projects - Real Data */}
          <Card className="lg:col-span-1">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center justify-between">
                <span>Active Projects</span>
                <Badge variant="outline" className="text-xs">{recentProjects.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 max-h-[340px] overflow-y-auto dashboard-card-scroll">
              {isLoadingProjects ? (
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
                recentProjects.slice(0, 3).map((project) => (
                  <div key={project.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full ${
                          project.status === 'active' ? 'bg-green-500' : 'bg-yellow-500'
                        }`} />
                        <span className="text-sm font-medium" style={{ color: themeConfig.foreground }}>
                          {project.name}
                        </span>
                      </div>
                      <Badge 
                        variant={project.status === 'active' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {project.status}
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs" style={{ color: themeConfig.mutedForeground }}>
                        <span>Progress tracking coming soon</span>
                        <span>{project.taskCount || 0} tasks</span>
                      </div>
                      <Progress value={0} className="h-1" />
                      <div className="text-xs" style={{ color: themeConfig.mutedForeground }}>
                        Updated: {getTimeAgo(project.updatedAt)}
                      </div>
                    </div>
                  </div>
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

          {/* Analytics - Placeholder */}
          <Card className="lg:col-span-1">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Analytics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {mockAnalytics.map((metric, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium" style={{ color: themeConfig.foreground }}>
                      {metric.label}
                    </span>
                    <span className="text-sm font-semibold" style={{ color: themeConfig.foreground }}>
                      {metric.value}{metric.unit || '%'}
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${metric.color}`}
                      style={{ width: `${metric.value}%` }}
                    />
                  </div>
                </div>
              ))}
              <div className="text-center py-2">
                <p className="text-xs text-muted-foreground">Analytics dashboard coming soon</p>
              </div>
            </CardContent>
          </Card>

          {/* This Week Calendar - Placeholder */}
          <Card className="lg:col-span-1">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">This Week</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-2">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => (
                  <div key={day} className="text-center">
                    <div className="text-xs font-medium mb-1" style={{ color: themeConfig.mutedForeground }}>
                      {day}
                    </div>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs ${
                      index === 0 ? 'bg-primary/10 text-primary' : ''
                    }`}>
                      {index + 1}
                    </div>
                    {index === 0 && <div className="w-1 h-1 bg-primary rounded-full mx-auto mt-1" />}
                  </div>
                ))}
              </div>
              <div className="text-center py-4">
                <p className="text-xs text-muted-foreground">Calendar integration coming soon</p>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="lg:col-span-1">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <Link href="/wiki/new">
                  <Button variant="outline" size="sm" className="h-12 w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    New Page
                  </Button>
                </Link>
                <Button variant="outline" size="sm" className="h-12" disabled>
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  Schedule
                </Button>
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

        {/* AI Suggestions */}
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
                  <Lightbulb className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium mb-2" style={{ color: themeConfig.foreground }}>
                    AI Suggestion: Focus on High-Priority Tasks
                  </h4>
                  <p className="text-sm mb-3" style={{ color: themeConfig.mutedForeground }}>
                    Based on your current workload, consider tackling the "Review Q4 roadmap" task first, as it's blocking other strategic decisions.
                  </p>
                  <div className="flex space-x-2">
                    <Link href="/ask">
                      <Button size="sm" className="bg-purple-600 hover:bg-purple-700">
                        <Zap className="h-4 w-4 mr-2" />
                        Get AI Help
                      </Button>
                    </Link>
                    <Button size="sm" variant="outline">
                      Learn more
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

