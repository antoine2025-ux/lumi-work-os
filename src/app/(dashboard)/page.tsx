"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import Link from "next/link"
import { useState, useEffect } from "react"
import { useWorkspace } from "@/lib/workspace-context"
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
import { MeetingsCard } from "@/components/dashboard/meetings-card"

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
  const { themeConfig } = useTheme()
  const [recentPages, setRecentPages] = useState<RecentPage[]>([])
  const [recentProjects, setRecentProjects] = useState<Project[]>([])
  const [isLoadingRecentPages, setIsLoadingRecentPages] = useState(true)
  const [isLoadingProjects, setIsLoadingProjects] = useState(true)
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

  // Load recent pages from API
  useEffect(() => {
    const loadRecentPages = async () => {
      if (!currentWorkspace) return // Wait for workspace to load
      
      try {
        const response = await fetch(`/api/wiki/pages?workspaceId=${currentWorkspace.id}`)
        if (response.ok) {
          const result = await response.json()
          // Handle paginated response - data is in result.data
          const data = result.data || result
          // Ensure data is an array before sorting
          if (Array.isArray(data)) {
            // Sort by updatedAt and take the 4 most recent
            const sortedPages = data
              .sort((a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
              .slice(0, 4)
            setRecentPages(sortedPages)
          } else {
            console.warn('Expected array but got:', typeof data, data)
            setRecentPages([])
          }
        } else if (response.status === 401) {
          // User not authenticated, show empty state
          console.log('User not authenticated, showing empty state')
          setRecentPages([])
        } else {
          console.error('Failed to load recent pages:', response.status)
          setRecentPages([])
        }
      } catch (error) {
        console.error('Error loading recent pages:', error)
        setRecentPages([])
      } finally {
        setIsLoadingRecentPages(false)
      }
    }

    loadRecentPages()
  }, [currentWorkspace]) // Depend on currentWorkspace instead of empty array

  // Load recent projects from API
  useEffect(() => {
    const loadRecentProjects = async () => {
      if (!currentWorkspace) return // Wait for workspace to load
      
      try {
        const response = await fetch(`/api/projects?workspaceId=${currentWorkspace.id}`)
        if (response.ok) {
          const result = await response.json()
          // Handle both paginated and direct array responses
          const data = result.data || result
          // Ensure data is an array before sorting
          if (Array.isArray(data)) {
            // Sort by updatedAt and take the 6 most recent
            const sortedProjects = data
              .sort((a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
              .slice(0, 6)
            setRecentProjects(sortedProjects)
          } else {
            console.warn('Expected array but got:', typeof data, data)
            setRecentProjects([])
          }
        } else {
          setRecentProjects([])
        }
      } catch (error) {
        console.error('Error loading recent projects:', error)
        setRecentProjects([])
      } finally {
        setIsLoadingProjects(false)
      }
    }

    loadRecentProjects()
  }, [currentWorkspace]) // Depend on currentWorkspace instead of empty array

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

  // Show loading state if workspace is still loading
  if (workspaceLoading) {
    return (
      <div className="p-8">
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-2" style={{color:'#0f172a'}}>Loading workspace...</h2>
          <p style={{color:'#475569'}}>Please wait while we load your workspace.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: themeConfig.background }}>
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Welcome Section */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h2 className="text-3xl font-light mb-2" style={{ color: themeConfig.foreground }}>
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
                    className="text-gray-200"
                    stroke="currentColor"
                    strokeWidth="3"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="text-blue-500"
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
                    className="text-gray-200"
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
            <CardContent className="space-y-3">
              {mockTasks.map((task) => (
                <div key={task.id} className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex-shrink-0">
                    <div className={`w-4 h-4 rounded-full border-2 ${
                      task.completed ? 'bg-green-500 border-green-500' : 'border-gray-300'
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
                <p className="text-xs text-gray-500">Task management coming soon</p>
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
            <CardContent className="space-y-4">
              {isLoadingProjects ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-gray-200 rounded-full animate-pulse"></div>
                          <div className="h-4 bg-gray-200 rounded animate-pulse w-24"></div>
                        </div>
                        <div className="h-4 bg-gray-200 rounded animate-pulse w-16"></div>
                      </div>
                      <div className="h-2 bg-gray-200 rounded animate-pulse"></div>
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
                  <p className="text-sm text-gray-500 mb-2">No projects yet</p>
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
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${metric.color}`}
                      style={{ width: `${metric.value}%` }}
                    />
                  </div>
                </div>
              ))}
              <div className="text-center py-2">
                <p className="text-xs text-gray-500">Analytics dashboard coming soon</p>
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
                      index === 0 ? 'bg-blue-100 text-blue-600' : ''
                    }`}>
                      {index + 1}
                    </div>
                    {index === 0 && <div className="w-1 h-1 bg-blue-500 rounded-full mx-auto mt-1" />}
                  </div>
                ))}
              </div>
              <div className="text-center py-4">
                <p className="text-xs text-gray-500">Calendar integration coming soon</p>
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
                    Ask AI
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
          <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
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

