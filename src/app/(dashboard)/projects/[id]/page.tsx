"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { 
  ArrowLeft, 
  Target, 
  Calendar,
  Users,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  Plus,
  Edit,
  MoreHorizontal,
  TrendingUp,
  User,
  Link as LinkIcon,
  FileText,
  ExternalLink,
  Maximize2,
  Search,
  X,
  BarChart3
} from "lucide-react"
import Link from "next/link"
import { useWorkspace } from "@/lib/workspace-context"
import dynamic from "next/dynamic"
import { useTheme } from "@/components/theme-provider"

// Keep essential imports at top for faster initial render
import ReactMarkdown from "react-markdown"
import TaskList from "@/components/tasks/task-list"
import type { ViewMode } from "@/components/tasks/view-switcher"
import { ViewSwitcher } from "@/components/tasks/view-switcher"

// Dynamic imports for heavy components to reduce initial bundle size
const KanbanBoard = dynamic(() => import("@/components/kanban/kanban-board").then(mod => ({ default: mod.KanbanBoard })), { ssr: false })
const InlineWikiViewer = dynamic(() => import("@/components/projects/inline-wiki-viewer").then(mod => ({ default: mod.InlineWikiViewer })), { ssr: false })
const EmbedContentRenderer = dynamic(() => import("@/components/wiki/embed-content-renderer").then(mod => ({ default: mod.EmbedContentRenderer })), { ssr: false })
const ProjectEditDialog = dynamic(() => import("@/components/projects/project-edit-dialog").then(mod => ({ default: mod.ProjectEditDialog })), { ssr: false })
const LiveTaskList = dynamic(() => import("@/components/realtime/live-task-list").then(mod => ({ default: mod.LiveTaskList })), { ssr: false })
const PresenceIndicator = dynamic(() => import("@/components/realtime/presence-indicator").then(mod => ({ default: mod.PresenceIndicator })), { ssr: false })
const NotificationToast = dynamic(() => import("@/components/realtime/notification-toast").then(mod => ({ default: mod.NotificationToast })), { ssr: false })
const NotificationBell = dynamic(() => import("@/components/realtime/notification-toast").then(mod => ({ default: mod.NotificationBell })), { ssr: false })
const ConnectionStatus = dynamic(() => import("@/components/realtime/connection-status").then(mod => ({ default: mod.ConnectionStatus })), { ssr: false })
const Celebration = dynamic(() => import("@/components/ui/celebration").then(mod => ({ default: mod.Celebration })), { ssr: false })
const TaskSearchFilter = dynamic(() => import("@/components/search/task-search-filter").then(mod => ({ default: mod.TaskSearchFilter })), { ssr: false })
const ProjectHeader = dynamic(() => import("@/components/projects/project-header").then(mod => ({ default: mod.ProjectHeader })), { ssr: false })
const CalendarView = dynamic(() => import("@/components/tasks/calendar-view"), { ssr: false })
const EpicsView = dynamic(() => import("@/components/projects/epics-view").then(mod => ({ default: mod.EpicsView })), { ssr: false })
const WikiLayout = dynamic(() => import("@/components/wiki/wiki-layout").then(mod => ({ default: mod.WikiLayout })), { ssr: false })
const CreateItemDialog = dynamic(() => import("@/components/projects/create-item-dialog").then(mod => ({ default: mod.CreateItemDialog })), { ssr: false })
const LoopbrainAssistantLauncher = dynamic(() => import("@/components/loopbrain/assistant-launcher").then(mod => ({ default: mod.LoopbrainAssistantLauncher })), { ssr: false })

interface Project {
  id: string
  name: string
  description?: string
  status: 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED'
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  startDate?: string
  endDate?: string
  color?: string
  ownerId?: string
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
  assignees: Array<{
    id: string
    user: {
      id: string
      name: string
      email: string
    }
  }>
  owner?: {
    id: string
    name: string
    email: string
  }
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
  _count: {
    tasks: number
  }
  wikiPage?: {
    id: string
    title: string
    slug: string
    content?: string
    updatedAt: string
  }
}

export default function ProjectDetailPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params?.id as string
  const { themeConfig } = useTheme()
  const { currentWorkspace } = useWorkspace()
  
  const [project, setProject] = useState<Project | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isUpdatingWiki, setIsUpdatingWiki] = useState(false)
  const [isWikiDialogOpen, setIsWikiDialogOpen] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isCreatingSampleTasks, setIsCreatingSampleTasks] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isTaskListFullscreen, setIsTaskListFullscreen] = useState(false)
  const [taskViewMode, setTaskViewMode] = useState<'live' | 'kanban'>('kanban')
  const [currentView, setCurrentView] = useState<ViewMode>('board')
  const [headerView, setHeaderView] = useState<'board' | 'epics' | 'tasks' | 'calendar' | 'timeline' | 'files'>('board')
  const [showCelebration, setShowCelebration] = useState(false)
  const [wasCompleted, setWasCompleted] = useState(false)
  const [filteredTasks, setFilteredTasks] = useState<any[]>([])
  const [isFiltered, setIsFiltered] = useState(false)
  const [isSearchExpanded, setIsSearchExpanded] = useState(false)
  const [selectedEpicId, setSelectedEpicId] = useState<string | undefined>(undefined)
  const [epics, setEpics] = useState<Array<{id: string, title: string, color?: string}>>([])
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isCreateEpicOpen, setIsCreateEpicOpen] = useState(false)
  const [newEpicTitle, setNewEpicTitle] = useState('')
  const [newEpicDescription, setNewEpicDescription] = useState('')
  const [newEpicColor, setNewEpicColor] = useState('#3B82F6')

  // Use theme-based colors
  const colors = {
    primary: themeConfig.primary,
    primaryLight: themeConfig.accent,
    primaryDark: themeConfig.secondary,
    success: '#059669',
    successLight: '#d1fae5',
    warning: '#d97706',
    warningLight: '#fef3c7',
    error: themeConfig.destructive,
    errorLight: '#fee2e2',
    background: themeConfig.background,
    surface: themeConfig.card,
    text: themeConfig.foreground,
    textSecondary: themeConfig.mutedForeground,
    textMuted: themeConfig.mutedForeground,
    border: themeConfig.border,
    borderLight: themeConfig.muted
  }

  const loadProject = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/projects/${projectId}`)
      
      if (response.ok) {
        const data = await response.json()
        setProject(data)
      } else if (response.status === 404) {
        setError('Project not found')
      } else {
        setError('Failed to load project')
      }
    } catch (error) {
      console.error('Error loading project:', error)
      setError('Failed to load project')
    } finally {
      setIsLoading(false)
    }
  }

  const loadEpics = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/epics`)
      if (response.ok) {
        const data = await response.json()
        setEpics(data)
      }
    } catch (error) {
      console.error('Error loading epics:', error)
    }
  }

  const handleWikiPageUpdate = async (wikiPageId: string | null) => {
    try {
      setIsUpdatingWiki(true)
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ wikiPageId }),
      })

      if (response.ok) {
        const updatedProject = await response.json()
        setProject(updatedProject)
      } else {
        console.error('Failed to update wiki page link')
      }
    } catch (error) {
      console.error('Error updating wiki page link:', error)
    } finally {
      setIsUpdatingWiki(false)
    }
  }

  const createSampleTasks = async () => {
    try {
      setIsCreatingSampleTasks(true)
      const response = await fetch(`/api/test-projects?projectId=${projectId}`, {
        method: 'POST',
      })

      if (response.ok) {
        // Reload project to get updated tasks
        await loadProject()
      } else {
        console.error('Failed to create sample tasks')
      }
    } catch (error) {
      console.error('Error creating sample tasks:', error)
    } finally {
      setIsCreatingSampleTasks(false)
    }
  }

  const handleProjectUpdate = (updatedProject: any) => {
    setProject(updatedProject)
  }

  // More menu handlers
  const handleExportCSV = () => {
    if (!project) return
    
    // Create CSV content
    const csvContent = [
      ['Task Title', 'Status', 'Priority', 'Assignee', 'Due Date'],
      ...(project.tasks || []).map(task => [
        task.title,
        task.status,
        task.priority || '',
        task.assignee?.name || '',
        task.dueDate ? new Date(task.dueDate).toLocaleDateString() : ''
      ])
    ].map(row => row.map(field => `"${field}"`).join(',')).join('\n')
    
    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${project.name}-tasks.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  const handleDuplicateProject = () => {
    if (!project) return
    // TODO: Implement project duplication
    console.log('Duplicate project:', project.name)
    alert('Project duplication feature coming soon!')
  }

  const handleShareProject = () => {
    if (!project) return
    // TODO: Implement project sharing
    console.log('Share project:', project.name)
    alert('Project sharing feature coming soon!')
  }

  const handleDeleteProject = async () => {
    if (!project) return
    
    const confirmed = window.confirm(
      `Are you sure you want to delete "${project.name}"? This action cannot be undone and will delete all tasks, comments, and project data.`
    )
    
    if (confirmed) {
      try {
        const response = await fetch(`/api/projects/${projectId}`, {
          method: 'DELETE',
        })

        if (response.ok) {
          // Successfully deleted, redirect to projects page
          router.push('/projects')
        } else {
          const errorData = await response.json()
          console.error('Failed to delete project:', errorData)
          alert(`Failed to delete project: ${errorData.error || 'Unknown error'}`)
        }
      } catch (error) {
        console.error('Error deleting project:', error)
        alert('Failed to delete project. Please try again.')
      }
    }
  }

  const handleFilterChange = (filteredTasks: any[]) => {
    setFilteredTasks(filteredTasks)
    setIsFiltered(true)
  }

  const handleCreateTask = () => {
    router.push(`/projects/${projectId}/tasks/new`)
  }

  const handleCreateEpic = () => {
    setIsCreateEpicOpen(true)
  }

  const createEpic = async () => {
    if (!newEpicTitle.trim()) return
    
    try {
      const response = await fetch(`/api/projects/${projectId}/epics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: newEpicTitle,
          description: newEpicDescription,
          color: newEpicColor,
        }),
      })

      if (response.ok) {
        const newEpic = await response.json()
        setEpics(prev => [...prev, newEpic])
        setNewEpicTitle('')
        setNewEpicDescription('')
        setNewEpicColor('#3B82F6')
        setIsCreateEpicOpen(false)
        await loadProject()
        await loadEpics()
      } else {
        console.error('Failed to create epic')
      }
    } catch (error) {
      console.error('Error creating epic:', error)
    }
  }

  const handleFilterReset = () => {
    setFilteredTasks([])
    setIsFiltered(false)
  }

  useEffect(() => {
    if (projectId) {
      loadProject()
      loadEpics()
    }
  }, [projectId])

  useEffect(() => {
    checkProjectCompletion()
  }, [project])

  // Sync headerView with currentView
  useEffect(() => {
    if (currentView === 'board') setHeaderView('board')
    else if (currentView === 'calendar') setHeaderView('calendar')
    else if (currentView === 'list') setHeaderView('tasks')
  }, [currentView])

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE": return "bg-green-100 text-green-800"
      case "ON_HOLD": return "bg-yellow-100 text-yellow-800"
      case "COMPLETED": return "bg-blue-100 text-blue-800"
      case "CANCELLED": return "bg-red-100 text-red-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "URGENT": return "bg-red-100 text-red-800"
      case "HIGH": return "bg-orange-100 text-orange-800"
      case "MEDIUM": return "bg-yellow-100 text-yellow-800"
      case "LOW": return "bg-green-100 text-green-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  const getTaskStatusCount = (status: string) => {
    if (!project) return 0
    return project.tasks.filter(task => task.status === status).length
  }

  const checkProjectCompletion = () => {
    if (!project) return
    
    const isCompleted = project._count.tasks > 0 && 
      (getTaskStatusCount('DONE') / project._count.tasks) * 100 === 100
    
    // Trigger celebration if project just became completed
    if (isCompleted && !wasCompleted) {
      setShowCelebration(true)
      setWasCompleted(true)
    } else if (!isCompleted) {
      setWasCompleted(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  // Clean content by removing HTML tags and fixing formatting
  const cleanContent = (content: string) => {
    if (!content) return ''
    
    // Remove HTML tags but preserve line breaks
    let cleaned = content
      .replace(/<div><br><\/div>/g, '\n\n') // Convert div breaks to double line breaks
      .replace(/<br\s*\/?>/g, '\n') // Convert br tags to line breaks
      .replace(/<div>/g, '\n') // Convert div opening to line break
      .replace(/<\/div>/g, '\n') // Convert div closing to line break
      .replace(/<[^>]*>/g, '') // Remove all other HTML tags
      .replace(/\n{3,}/g, '\n\n') // Replace multiple line breaks with double
      .trim()
    
    return cleaned
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: colors.background }}>
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" style={{ color: colors.primary }} />
          <p style={{ color: colors.textSecondary }}>Loading project...</p>
        </div>
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: colors.background }}>
        <div className="text-center">
          <AlertCircle className="h-12 w-12 mx-auto mb-4" style={{ color: colors.error }} />
          <h3 className="text-lg font-semibold mb-2" style={{ color: colors.text }}>Project Not Found</h3>
          <p className="mb-4" style={{ color: colors.textSecondary }}>
            {error || 'The project you are looking for does not exist.'}
          </p>
          <Button asChild style={{ backgroundColor: colors.primary }}>
            <Link href="/projects">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Projects
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <WikiLayout>
      <div className="min-h-screen" style={{ backgroundColor: colors.background }}>
        <Celebration 
          isVisible={showCelebration} 
          onComplete={() => setShowCelebration(false)}
        />
      
      {/* Conditional Header Layout */}
      {true ? (
        <>
          <ProjectHeader
            project={project}
            tasks={project?.tasks || []}
            colors={colors}
            currentView={headerView}
            onViewChange={(view) => {
              setHeaderView(view)
              // Map header views to ViewMode for compatibility
              if (view === 'board') setCurrentView('board')
              else if (view === 'calendar') setCurrentView('calendar')
              else if (view === 'tasks') setCurrentView('list')
              // TODO: Handle epics, timeline, files views
            }}
            onMoreClick={() => {
              // TODO: Implement more menu
            }}
          />
          
        </>
      ) : (
        /* Original Professional Header Layout */
        <div className="max-w-[1600px] mx-auto px-6 py-8">
        <div className="flex items-start justify-between">
          {/* Left Side - Project Title & Description */}
          <div className="flex-1 pr-8">
            <div className="flex items-center space-x-3 mb-3">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: project?.color || colors.primary }}
              />
              <h1 className="text-3xl font-semibold" style={{ color: colors.text }}>{project?.name}</h1>
            </div>
            <p className="text-base leading-relaxed" style={{ color: colors.textSecondary }}>
              {project?.description || 'No description available'}
            </p>
          </div>
          
          {/* Right Side - Project Details */}
          <div className="flex-shrink-0">
            <div className="grid grid-cols-3 gap-6 w-96">
              {/* Team */}
              <Card className="border-0 shadow-sm" style={{ backgroundColor: colors.surface }}>
                <CardContent className="p-4">
                  <div className="text-center">
                    <h3 className="text-sm font-medium mb-3" style={{ color: colors.text }}>Team</h3>
                    <div className="space-y-2">
                      {project?.members.slice(0, 3).map((member) => (
                        <div key={member.id} className="flex items-center space-x-2">
                          <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: colors.borderLight }}>
                            <User className="h-3 w-3" style={{ color: colors.textSecondary }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate" style={{ color: colors.text }}>{member.user.name}</p>
                            <p className="text-xs truncate" style={{ color: colors.textSecondary }}>{member.role}</p>
                          </div>
                        </div>
                      ))}
                      {project && project.members && project.members.length > 3 && (
                        <p className="text-xs" style={{ color: colors.textSecondary }}>
                          +{project.members.length - 3} more
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Progress */}
              <Card className="border-0 shadow-sm" style={{ backgroundColor: colors.surface }}>
                <CardContent className="p-4">
                  <div className="text-center">
                    <h3 className="text-sm font-medium mb-3" style={{ color: colors.text }}>Progress</h3>
                    <div className="w-full rounded-full h-2 mb-2" style={{ backgroundColor: colors.border }}>
                      <div 
                        className="h-2 rounded-full" 
                        style={{ 
                          backgroundColor: project && project._count && project._count.tasks > 0 && (getTaskStatusCount('DONE') / project._count.tasks) * 100 === 100 
                            ? colors.success 
                            : colors.primary, 
                          width: `${project && project._count && project._count.tasks > 0 ? (getTaskStatusCount('DONE') / project._count.tasks) * 100 : 0}%` 
                        }}
                      ></div>
                    </div>
                    <p className="text-xs" style={{ color: colors.textSecondary }}>
                      {getTaskStatusCount('DONE')} of {project?._count.tasks || 0}
                    </p>
                    <p className="text-xs font-medium mt-1" style={{ 
                      color: project && project._count && project._count.tasks > 0 && (getTaskStatusCount('DONE') / project._count.tasks) * 100 === 100 
                        ? colors.success 
                        : colors.primary 
                    }}>
                      {project && project._count && project._count.tasks > 0 ? Math.round((getTaskStatusCount('DONE') / project._count.tasks) * 100) : 0}%
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Status */}
              <Card className="border-0 shadow-sm" style={{ backgroundColor: colors.surface }}>
                <CardContent className="p-4">
                  <div className="text-center">
                    <h3 className="text-sm font-medium mb-3" style={{ color: colors.text }}>Status</h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs" style={{ color: colors.textSecondary }}>To Do</span>
                        <span className="text-sm font-medium" style={{ color: colors.text }}>{getTaskStatusCount('TODO')}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs" style={{ color: colors.textSecondary }}>In Progress</span>
                        <span className="text-sm font-medium" style={{ color: colors.text }}>{getTaskStatusCount('IN_PROGRESS')}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs" style={{ color: colors.textSecondary }}>In Review</span>
                        <span className="text-sm font-medium" style={{ color: colors.text }}>{getTaskStatusCount('IN_REVIEW')}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs" style={{ color: colors.textSecondary }}>Done</span>
                        <span className="text-sm font-medium" style={{ color: colors.text }}>{getTaskStatusCount('DONE')}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs" style={{ color: colors.textSecondary }}>Blocked</span>
                        <span className="text-sm font-medium" style={{ color: colors.text }}>{getTaskStatusCount('BLOCKED')}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-[1600px] mx-auto px-6 pb-8">
        <div className="space-y-6">
          {/* Tasks Section */}
          <>
            {headerView === 'epics' ? (
              <div>
                <EpicsView 
                  projectId={projectId} 
                  workspaceId={currentWorkspace?.id || 'workspace-1'}
                  colors={colors}
                  onCreateEpic={handleCreateEpic}
                />
              </div>
            ) : (
              <Card className="border-0 shadow-sm" style={{ backgroundColor: colors.surface }}>
                <CardContent className="p-0">
                  {/* Collapsible Search Bar */}
                  {isSearchExpanded && (
                    <div className="p-4 border-b" style={{ borderColor: colors.border }}>
                      <TaskSearchFilter
                        tasks={project?.tasks || []}
                        onFilterChange={handleFilterChange}
                        onFilterReset={handleFilterReset}
                      />
                    </div>
                  )}
                  
                  {/* Render appropriate view based on headerView */}
                  {headerView === 'board' && (
                    <KanbanBoard 
                      projectId={projectId} 
                      workspaceId={currentWorkspace?.id || 'workspace-1'}
                      onTasksUpdated={loadProject}
                      filteredTasks={isFiltered ? filteredTasks : undefined}
                      epicId={selectedEpicId}
                    />
                  )}
                  
                  {headerView === 'tasks' && (
                    <TaskList 
                      projectId={projectId} 
                      workspaceId={currentWorkspace?.id || 'workspace-1'}
                      isFullscreen={false}
                      onToggleFullscreen={() => setIsTaskListFullscreen(true)}
                    />
                  )}
                  
                  {headerView === 'calendar' && (
                    <CalendarView 
                      projectId={projectId} 
                      workspaceId={currentWorkspace?.id || 'workspace-1'}
                    />
                  )}
                  
                  {(headerView === 'timeline' || headerView === 'files') && (
                    <div className="flex items-center justify-center h-64">
                      <p className="text-muted-foreground">Coming soon</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            </>


        </div>
      </div>

      {/* Wiki Page Selection Dialog */}
      <Dialog open={isWikiDialogOpen} onOpenChange={setIsWikiDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col" style={{ backgroundColor: colors.surface }}>
          <DialogHeader>
            <DialogTitle style={{ color: colors.text }}>Select Wiki Page</DialogTitle>
            <DialogDescription style={{ color: colors.textSecondary }}>
              Choose a wiki page to display as project documentation
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-4">
            <InlineWikiViewer
              currentWikiPageId={project?.wikiPage?.id}
              onWikiPageSelect={(wikiPageId) => {
                handleWikiPageUpdate(wikiPageId)
                setIsWikiDialogOpen(false)
              }}
              isLoading={isUpdatingWiki}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Fullscreen Wiki Modal */}
      {isFullscreen && project?.wikiPage && (
        <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col" style={{ backgroundColor: colors.surface }}>
            <DialogHeader>
              <DialogTitle style={{ color: colors.text }}>{project.wikiPage.title}</DialogTitle>
              <DialogDescription style={{ color: colors.textSecondary }}>
                Last updated: {new Date(project.wikiPage.updatedAt).toLocaleDateString()}
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto p-4">
              <div className="prose prose-lg max-w-none">
                <div style={{ color: colors.text }}>
                  <ReactMarkdown 
                    components={{
                      // Custom components to handle HTML tags properly
                      p: ({ children }) => <p className="mb-4 leading-relaxed text-base" style={{ color: colors.text }}>{children}</p>,
                      ul: ({ children }) => <ul className="mb-6 pl-6 space-y-2">{children}</ul>,
                      ol: ({ children }) => <ol className="mb-6 pl-6 space-y-2">{children}</ol>,
                      li: ({ children }) => <li className="leading-relaxed text-base" style={{ color: colors.text }}>{children}</li>,
                      h1: ({ children }) => <h1 className="text-2xl font-bold mb-6 mt-8 border-b-2 pb-3" style={{ color: colors.text, borderColor: colors.border }}>{children}</h1>,
                      h2: ({ children }) => <h2 className="text-xl font-bold mb-4 mt-8" style={{ color: colors.text }}>{children}</h2>,
                      h3: ({ children }) => <h3 className="text-lg font-bold mb-3 mt-6" style={{ color: colors.textSecondary }}>{children}</h3>,
                      strong: ({ children }) => <strong className="font-bold" style={{ color: colors.text }}>{children}</strong>,
                      em: ({ children }) => <em className="italic" style={{ color: colors.textSecondary }}>{children}</em>,
                      code: ({ children }) => <code className="px-2 py-1 rounded text-sm font-mono font-semibold" style={{ backgroundColor: colors.borderLight, color: colors.primary }}>{children}</code>,
                      pre: ({ children }) => <pre className="border rounded-lg p-4 my-6 overflow-x-auto" style={{ backgroundColor: colors.borderLight, borderColor: colors.border }}>{children}</pre>,
                      blockquote: ({ children }) => <blockquote className="border-l-4 pl-4 italic my-6" style={{ borderColor: colors.primary, color: colors.textSecondary }}>{children}</blockquote>,
                      hr: () => <hr className="my-8" style={{ borderColor: colors.border }} />
                    }}
                  >
                    {cleanContent(project.wikiPage.content || '')}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Project Edit Dialog */}
      <ProjectEditDialog
        isOpen={isEditDialogOpen}
        onClose={() => setIsEditDialogOpen(false)}
        project={project}
        onSave={handleProjectUpdate}
        workspaceId={currentWorkspace?.id || 'workspace-1'}
      />

      {/* Fullscreen Task List */}
      {isTaskListFullscreen && (
        <div className="fixed inset-0 z-50 overflow-auto p-4" style={{ backgroundColor: colors.background }}>
          <TaskList 
            projectId={projectId} 
            workspaceId={currentWorkspace?.id || 'workspace-1'} 
            isFullscreen={isTaskListFullscreen}
            onToggleFullscreen={() => setIsTaskListFullscreen(!isTaskListFullscreen)}
          />
        </div>
      )}

        {/* Real-time Notifications */}
        <NotificationToast />
        
        {/* Create Item Dialog */}
        <CreateItemDialog
          isOpen={isCreateDialogOpen}
          onClose={() => setIsCreateDialogOpen(false)}
          onCreateTask={handleCreateTask}
          onCreateEpic={handleCreateEpic}
        />
        
        {/* Create Epic Dialog */}
        <Dialog open={isCreateEpicOpen} onOpenChange={setIsCreateEpicOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Epic</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="epic-title">Title</Label>
                <Input
                  id="epic-title"
                  value={newEpicTitle}
                  onChange={(e) => setNewEpicTitle(e.target.value)}
                  placeholder="Epic title"
                />
              </div>
              <div>
                <Label htmlFor="epic-description">Description</Label>
                <Textarea
                  id="epic-description"
                  value={newEpicDescription}
                  onChange={(e) => setNewEpicDescription(e.target.value)}
                  placeholder="Epic description"
                />
              </div>
              <div>
                <Label htmlFor="epic-color">Color</Label>
                <Input
                  id="epic-color"
                  type="color"
                  value={newEpicColor}
                  onChange={(e) => setNewEpicColor(e.target.value)}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsCreateEpicOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={createEpic} disabled={!newEpicTitle.trim()}>
                  Create Epic
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Global Loopbrain Assistant */}
      <LoopbrainAssistantLauncher 
        mode="spaces" 
        anchors={{ projectId }} 
      />
    </WikiLayout>
  )
}
