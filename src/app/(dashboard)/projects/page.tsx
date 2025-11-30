"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  Plus, 
  Search, 
  Filter,
  Grid,
  List,
  Calendar,
  Users,
  CheckCircle,
  Clock,
  AlertCircle,
  MoreHorizontal,
  Folder,
  Loader2,
  Target,
  TrendingUp,
  Eye,
  Edit,
  Trash2,
  User,
  FolderOpen,
  Layers,
  Activity,
  ChevronRight,
  Zap,
  Star,
  ArrowRight,
  BarChart3
} from "lucide-react"
import Link from "next/link"
import { useWorkspace } from "@/lib/workspace-context"
import { motion, AnimatePresence } from "framer-motion"
import { WikiLayout } from "@/components/wiki/wiki-layout"

interface Project {
  id: string
  name: string
  description?: string
  status: 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED'
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  startDate?: string
  endDate?: string
  color?: string
  createdAt: string
  updatedAt: string
  createdBy: {
    id: string
    name: string
    email: string
  }
  members: Array<{
    id: string
    role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER'
    user: {
      id: string
      name: string
      email: string
    }
  }>
  tasks: Array<{
    id: string
    title: string
    status: 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'BLOCKED'
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
    dueDate?: string
    assignee?: {
      id: string
      name: string
    }
  }>
  epics?: Array<{
    id: string
    title: string
    description?: string
    status: 'PLANNING' | 'IN_PROGRESS' | 'REVIEW' | 'DONE'
    progress: number
    dueDate?: string
    taskCount: number
    completedTasks: number
  }>
  _count: {
    tasks: number
  }
}

interface Epic {
  id: string
  title: string
  description?: string
  status: 'PLANNING' | 'IN_PROGRESS' | 'REVIEW' | 'DONE'
  progress: number
  dueDate?: string
  projectId: string
  projectName: string
  taskCount: number
  completedTasks: number
  color?: string
}

interface Task {
  id: string
  title: string
  description?: string
  status: 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'BLOCKED'
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  dueDate?: string
  projectId: string
  projectName: string
  epicId?: string
  epicTitle?: string
  assignee?: {
    id: string
    name: string
    email: string
  }
}

type ViewMode = 'projects' | 'epics' | 'tasks' | 'team-initiatives' | 'my-epics' | 'my-tasks' | 'team-board' | 'reports'

export default function ProjectsDashboard() {
  const { currentWorkspace } = useWorkspace()
  const searchParams = useSearchParams()
  const [viewMode, setViewMode] = useState<ViewMode>('projects')
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [projects, setProjects] = useState<Project[]>([])
  const [epics, setEpics] = useState<Epic[]>([])
  const [tasks, setTasks] = useState<Task[]>([])

  // Handle URL parameters for view mode
  useEffect(() => {
    const viewParam = searchParams.get('view')
    if (viewParam && ['my-epics', 'my-tasks', 'team-board', 'reports'].includes(viewParam)) {
      setViewMode(viewParam as ViewMode)
    } else {
      setViewMode('projects')
    }
  }, [searchParams])

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

  // Load data from API
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true)
        const wsId = currentWorkspace?.id || 'workspace-1'
        
        // Load projects
        const projectsResponse = await fetch(`/api/projects?workspaceId=${wsId}`)
        if (projectsResponse.ok) {
          const projectsResult = await projectsResponse.json()
          // Handle new response shape: { projects: Project[], contextObjects: ContextObject[] }
          const projectsData = Array.isArray(projectsResult) 
            ? projectsResult 
            : (projectsResult.projects || projectsResult.data || [])
          setProjects(Array.isArray(projectsData) ? projectsData : [])
        }

        // Load epics for all projects
        const epicsPromises = projects.map(project => 
          fetch(`/api/projects/${project.id}/epics`)
            .then(res => res.ok ? res.json() : [])
            .catch(() => [])
        )
        const epicsResults = await Promise.all(epicsPromises)
        const allEpics = epicsResults.flat().map(epic => ({
          ...epic,
          projectName: projects.find(p => p.id === epic.projectId)?.name || 'Unknown Project'
        }))
        setEpics(allEpics)

        // Load tasks for all projects
        const tasksPromises = projects.map(project => 
          fetch(`/api/projects/${project.id}/tasks`)
            .then(res => res.ok ? res.json() : [])
            .catch(() => [])
        )
        const tasksResults = await Promise.all(tasksPromises)
        const allTasks = tasksResults.flat().map(task => ({
          ...task,
          projectName: projects.find(p => p.id === task.projectId)?.name || 'Unknown Project',
          epicTitle: allEpics.find(e => e.id === task.epicId)?.title
        }))
        setTasks(allTasks)

      } catch (error) {
        console.error('Error loading data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [currentWorkspace?.id])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    })
  }

  const getDaysUntilDue = (dateString: string) => {
    const dueDate = new Date(dateString)
    const today = new Date()
    const diffTime = dueDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "URGENT": return "bg-red-100 text-red-800"
      case "HIGH": return "bg-orange-100 text-orange-800"
      case "MEDIUM": return "bg-yellow-100 text-yellow-800"
      case "LOW": return "bg-green-100 text-green-800"
      default: return "bg-muted text-foreground"
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE": return "bg-green-100 text-green-800"
      case "ON_HOLD": return "bg-yellow-500/20 text-yellow-400"
      case "COMPLETED": return "bg-blue-500/20 text-blue-400"
      case "CANCELLED": return "bg-red-500/20 text-red-400"
      case "IN_PROGRESS": return "bg-blue-500/20 text-blue-400"
      case "DONE": return "bg-green-500/20 text-green-400"
      case "TODO": return "bg-muted text-foreground"
      case "BLOCKED": return "bg-red-500/20 text-red-400"
      default: return "bg-muted text-foreground"
    }
  }

  // Filter data based on search
  const filteredProjects = projects.filter(project => 
    project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (project.description && project.description.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const filteredEpics = epics.filter(epic => 
    epic.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    epic.projectName.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredTasks = tasks.filter(task => 
    task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    task.projectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (task.epicTitle && task.epicTitle.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  // Get top 5 tasks sorted by due date and priority
  const topTasks = filteredTasks
    .filter(task => task.status !== 'DONE')
    .sort((a, b) => {
      // Sort by due date first, then by priority
      if (a.dueDate && b.dueDate) {
        const dateA = new Date(a.dueDate).getTime()
        const dateB = new Date(b.dueDate).getTime()
        if (dateA !== dateB) return dateA - dateB
      }
      
      const priorityOrder = { 'URGENT': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 }
      return (priorityOrder[b.priority as keyof typeof priorityOrder] || 0) - (priorityOrder[a.priority as keyof typeof priorityOrder] || 0)
    })
    .slice(0, 5)

  const viewModes = [
    { id: 'projects', label: 'My Projects', icon: FolderOpen },
    { id: 'epics', label: 'My Epics', icon: Layers },
    { id: 'tasks', label: 'My Tasks', icon: Target },
    { id: 'team-initiatives', label: 'Team Initiatives', icon: Users }
  ] as const

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" style={{ color: colors.primary }} />
          <p style={{ color: colors.textSecondary }}>Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <WikiLayout>
      <div className="min-h-screen bg-slate-950">
      {/* Zen-style Header */}
      <div className="px-16 py-8 space-y-4">
        <div className="flex items-center space-x-3">
          <h1 className="text-4xl font-light" style={{ color: colors.text }}>Projects</h1>
        </div>
        <p className="text-lg max-w-2xl" style={{ color: colors.textSecondary }}>
          Manage your team's projects and tasks with calm productivity
        </p>
      </div>

      {/* Stats Overview - Zen Style */}
      <div className="px-16 mb-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-3xl font-light mb-2" style={{ color: colors.text }}>{projects.length}</div>
            <div className="text-sm" style={{ color: colors.textSecondary }}>Total Projects</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-light mb-2" style={{ color: colors.success }}>{projects.filter(p => p.status === 'ACTIVE').length}</div>
            <div className="text-sm" style={{ color: colors.textSecondary }}>Active</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-light mb-2" style={{ color: colors.primary }}>{epics.length}</div>
            <div className="text-sm" style={{ color: colors.textSecondary }}>Epics</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-light mb-2" style={{ color: colors.text }}>{tasks.length}</div>
            <div className="text-sm" style={{ color: colors.textSecondary }}>Total Tasks</div>
          </div>
        </div>
      </div>


      {/* Search Bar */}
      <div className="px-16 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: colors.textSecondary }} />
          <Input
            placeholder={`Search ${viewMode}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 border-0 rounded-lg"
            style={{ backgroundColor: colors.surface, color: colors.text }}
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="px-16 pb-12">
        <AnimatePresence mode="wait">
          <motion.div
            key={viewMode}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {/* My Projects View */}
            {viewMode === 'projects' && (
              <div className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {filteredProjects.map((project) => (
                    <Card 
                      key={project.id}
                      className="hover:shadow-lg transition-all duration-200 cursor-pointer border-0 rounded-xl overflow-hidden group" 
                      style={{ backgroundColor: colors.surface }}
                      onClick={() => window.location.href = `/projects/${project.id}`}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-center space-x-3 mb-4">
                          <div 
                            className="w-2 h-2 rounded-full" 
                            style={{ backgroundColor: project.color || colors.primary }}
                          />
                          <h3 className="text-lg font-bold group-hover:opacity-80 transition-all" style={{ color: colors.text }}>
                            {project.name}
                          </h3>
                        </div>

                        <div className="mb-4">
                          <div className="w-full rounded-full h-1" style={{ backgroundColor: colors.border }}>
                            <div 
                              className="h-1 rounded-full transition-all duration-300" 
                              style={{ 
                                backgroundColor: colors.primary, 
                                width: `${project._count.tasks > 0 ? (project.tasks.filter(t => t.status === 'DONE').length / project._count.tasks) * 100 : 0}%` 
                              }}
                            ></div>
                          </div>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs" style={{ color: colors.textSecondary }}>
                              {project.tasks.filter(t => t.status === 'DONE').length} of {project._count.tasks} tasks
                            </span>
                            <Badge className={`text-xs ${getStatusColor(project.status)}`}>
                              {project.status}
                            </Badge>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-1">
                            <Users className="h-3 w-3" style={{ color: colors.textSecondary }} />
                            <span className="text-xs" style={{ color: colors.textSecondary }}>
                              {project.members.length}
                            </span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Clock className="h-3 w-3" style={{ color: colors.textSecondary }} />
                            <span className="text-xs" style={{ color: colors.textSecondary }}>
                              {formatDate(project.createdAt)}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Future Placeholder Cards */}
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  <Card className="border-0 rounded-xl opacity-50" style={{ backgroundColor: colors.surface }}>
                    <CardContent className="p-6">
                      <div className="flex items-center space-x-3 mb-4">
                        <div className="w-2 h-2 rounded-full bg-muted-foreground/50" />
                        <h3 className="text-lg font-bold text-muted-foreground">My Initiatives</h3>
                      </div>
                      <p className="text-sm text-muted-foreground">Coming soon...</p>
                    </CardContent>
                  </Card>

                  <Card className="border-0 rounded-xl opacity-50" style={{ backgroundColor: colors.surface }}>
                    <CardContent className="p-6">
                      <div className="flex items-center space-x-3 mb-4">
                        <div className="w-2 h-2 rounded-full bg-muted-foreground/50" />
                        <h3 className="text-lg font-bold text-muted-foreground">Team Initiatives</h3>
                      </div>
                      <p className="text-sm text-muted-foreground">Coming soon...</p>
                    </CardContent>
                  </Card>

                  <Card className="border-0 rounded-xl opacity-50" style={{ backgroundColor: colors.surface }}>
                    <CardContent className="p-6">
                      <div className="flex items-center space-x-3 mb-4">
                        <div className="w-2 h-2 rounded-full bg-muted-foreground/50" />
                        <h3 className="text-lg font-bold text-muted-foreground">Role Initiatives</h3>
                      </div>
                      <p className="text-sm text-muted-foreground">Coming soon...</p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {/* My Epics View */}
            {viewMode === 'epics' && (
              <div className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {filteredEpics.map((epic) => (
                    <Card 
                      key={epic.id}
                      className="hover:shadow-lg transition-all duration-200 cursor-pointer border-0 rounded-xl overflow-hidden group" 
                      style={{ backgroundColor: colors.surface }}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-center space-x-3 mb-4">
                          <div 
                            className="w-2 h-2 rounded-full" 
                            style={{ backgroundColor: epic.color || colors.primary }}
                          />
                          <h3 className="text-lg font-bold group-hover:opacity-80 transition-all" style={{ color: colors.text }}>
                            {epic.title}
                          </h3>
                        </div>

                        <div className="mb-4">
                          <div className="w-full rounded-full h-1" style={{ backgroundColor: colors.border }}>
                            <div 
                              className="h-1 rounded-full transition-all duration-300" 
                              style={{ 
                                backgroundColor: colors.primary, 
                                width: `${epic.progress}%` 
                              }}
                            ></div>
                          </div>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs" style={{ color: colors.textSecondary }}>
                              {epic.completedTasks} of {epic.taskCount} tasks
                            </span>
                            <span className="text-xs font-medium" style={{ color: colors.primary }}>
                              {epic.progress}%
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-1">
                            <Folder className="h-3 w-3" style={{ color: colors.textSecondary }} />
                            <span className="text-xs" style={{ color: colors.textSecondary }}>
                              {epic.projectName}
                            </span>
                          </div>
                          {epic.dueDate && (
                            <div className="flex items-center space-x-1">
                              <Calendar className="h-3 w-3" style={{ color: colors.textSecondary }} />
                              <span className="text-xs" style={{ color: colors.textSecondary }}>
                                {formatDate(epic.dueDate)}
                              </span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* My Tasks View */}
            {viewMode === 'tasks' && (
              <div className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {topTasks.map((task) => (
                    <Card 
                      key={task.id}
                      className="hover:shadow-lg transition-all duration-200 cursor-pointer border-0 rounded-xl overflow-hidden group" 
                      style={{ backgroundColor: colors.surface }}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-center space-x-3 mb-4">
                          <div 
                            className="w-2 h-2 rounded-full" 
                            style={{ backgroundColor: colors.primary }}
                          />
                          <h3 className="text-lg font-bold group-hover:opacity-80 transition-all" style={{ color: colors.text }}>
                            {task.title}
                          </h3>
                        </div>

                        <div className="mb-4">
                          <div className="flex items-center justify-between mb-2">
                            <Badge className={`text-xs ${getPriorityColor(task.priority)}`}>
                              {task.priority}
                            </Badge>
                            <Badge className={`text-xs ${getStatusColor(task.status)}`}>
                              {task.status.replace('_', ' ')}
                            </Badge>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-1">
                            <Folder className="h-3 w-3" style={{ color: colors.textSecondary }} />
                            <span className="text-xs" style={{ color: colors.textSecondary }}>
                              {task.projectName}
                            </span>
                          </div>
                          {task.dueDate && (
                            <div className="flex items-center space-x-1">
                              <Calendar className="h-3 w-3" style={{ color: colors.textSecondary }} />
                              <span className="text-xs" style={{ color: colors.textSecondary }}>
                                {formatDate(task.dueDate)}
                              </span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Team Initiatives View */}
            {viewMode === 'team-initiatives' && (
              <div className="space-y-6">
                <div className="text-center py-16">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: colors.borderLight }}>
                    <Users className="h-8 w-8" style={{ color: colors.textSecondary }} />
                  </div>
                  <h3 className="text-lg font-medium mb-2" style={{ color: colors.text }}>Team Initiatives</h3>
                  <p className="mb-6" style={{ color: colors.textSecondary }}>
                    This feature is coming soon. You'll be able to view and manage team-wide initiatives here.
                  </p>
                </div>
              </div>
            )}

            {/* My Epics View (URL parameter) */}
            {viewMode === 'my-epics' && (
              <div className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {filteredEpics.map((epic) => (
                    <Card 
                      key={epic.id}
                      className="hover:shadow-lg transition-all duration-200 cursor-pointer border-0 rounded-xl overflow-hidden group" 
                      style={{ backgroundColor: colors.surface }}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-center space-x-3 mb-4">
                          <div 
                            className="w-2 h-2 rounded-full" 
                            style={{ backgroundColor: colors.primary }}
                          />
                          <h3 className="text-lg font-bold group-hover:opacity-80 transition-all" style={{ color: colors.text }}>
                            {epic.name}
                          </h3>
                        </div>

                        <div className="mb-4">
                          <div className="w-full rounded-full h-1" style={{ backgroundColor: colors.border }}>
                            <div 
                              className="h-1 rounded-full transition-all duration-300" 
                              style={{ 
                                backgroundColor: colors.primary, 
                                width: `${epic._count.tasks > 0 ? (epic.tasks.filter(t => t.status === 'DONE').length / epic._count.tasks) * 100 : 0}%` 
                              }}
                            ></div>
                          </div>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs" style={{ color: colors.textSecondary }}>
                              {epic.tasks.filter(t => t.status === 'DONE').length} of {epic._count.tasks} tasks
                            </span>
                            <Badge className={`text-xs ${getStatusColor(epic.status)}`}>
                              {epic.status}
                            </Badge>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-1">
                            <Folder className="h-3 w-3" style={{ color: colors.textSecondary }} />
                            <span className="text-xs" style={{ color: colors.textSecondary }}>
                              {epic.project?.name || 'No project'}
                            </span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-3 w-3" style={{ color: colors.textSecondary }} />
                            <span className="text-xs" style={{ color: colors.textSecondary }}>
                              {epic.endDate ? new Date(epic.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'No due date'}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* My Tasks View (URL parameter) */}
            {viewMode === 'my-tasks' && (
              <div className="space-y-6">
                <div className="grid gap-4">
                  {filteredTasks.map((task) => (
                    <Card 
                      key={task.id}
                      className="hover:shadow-lg transition-all duration-200 cursor-pointer border-0 rounded-xl overflow-hidden group" 
                      style={{ backgroundColor: colors.surface }}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div 
                              className="w-2 h-2 rounded-full" 
                              style={{ backgroundColor: colors.primary }}
                            />
                            <h3 className="text-lg font-bold group-hover:opacity-80 transition-all" style={{ color: colors.text }}>
                              {task.title}
                            </h3>
                          </div>
                          <Badge className={`text-xs ${getStatusColor(task.status)}`}>
                            {task.status}
                          </Badge>
                        </div>
                        
                        <div className="mt-3 flex items-center justify-between">
                          <div className="flex items-center space-x-1">
                            <Folder className="h-3 w-3" style={{ color: colors.textSecondary }} />
                            <span className="text-xs" style={{ color: colors.textSecondary }}>
                              {task.project?.name || 'No project'}
                            </span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-3 w-3" style={{ color: colors.textSecondary }} />
                            <span className="text-xs" style={{ color: colors.textSecondary }}>
                              {task.dueDate ? new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'No due date'}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Team Board View (URL parameter) */}
            {viewMode === 'team-board' && (
              <div className="space-y-6">
                <div className="text-center py-16">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: colors.borderLight }}>
                    <Users className="h-8 w-8" style={{ color: colors.textSecondary }} />
                  </div>
                  <h3 className="text-lg font-medium mb-2" style={{ color: colors.text }}>Team Board</h3>
                  <p className="mb-6" style={{ color: colors.textSecondary }}>
                    This feature is coming soon. You'll be able to view and manage team-wide initiatives here.
                  </p>
                </div>
              </div>
            )}

            {/* Reports View (URL parameter) */}
            {viewMode === 'reports' && (
              <div className="space-y-6">
                <div className="text-center py-16">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: colors.borderLight }}>
                    <BarChart3 className="h-8 w-8" style={{ color: colors.textSecondary }} />
                  </div>
                  <h3 className="text-lg font-medium mb-2" style={{ color: colors.text }}>Reports</h3>
                  <p className="mb-6" style={{ color: colors.textSecondary }}>
                    This feature is coming soon. You'll be able to view and generate reports based on projects and epics here.
                  </p>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

          {/* Empty State */}
          {((viewMode === 'projects' && filteredProjects.length === 0) ||
            (viewMode === 'epics' && filteredEpics.length === 0) ||
            (viewMode === 'my-epics' && filteredEpics.length === 0) ||
            (viewMode === 'tasks' && filteredTasks.length === 0) ||
            (viewMode === 'my-tasks' && filteredTasks.length === 0)) && (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: colors.borderLight }}>
              <Target className="h-8 w-8" style={{ color: colors.textSecondary }} />
            </div>
            <h3 className="text-lg font-medium mb-2" style={{ color: colors.text }}>No {viewMode} found</h3>
            <p className="mb-6" style={{ color: colors.textSecondary }}>
              {searchQuery ? "Try adjusting your search terms" : "Create your first project to get started"}
            </p>
            <Button asChild className="rounded-lg" style={{ backgroundColor: colors.primary }}>
              <Link href="/projects/new">
                <Plus className="mr-2 h-4 w-4" />
                New Project
              </Link>
            </Button>
          </div>
        )}
      </div>
      </div>
    </WikiLayout>
  )
}