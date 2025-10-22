"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
import ReactMarkdown from "react-markdown"
import TaskList from "@/components/tasks/task-list"
import { KanbanBoard } from "@/components/kanban/kanban-board"
import { InlineWikiViewer } from "@/components/projects/inline-wiki-viewer"
import { EmbedContentRenderer } from "@/components/wiki/embed-content-renderer"
import { ProjectEditDialog } from "@/components/projects/project-edit-dialog"
import { LiveTaskList } from "@/components/realtime/live-task-list"
import { PresenceIndicator } from "@/components/realtime/presence-indicator"
import { NotificationToast, NotificationBell } from "@/components/realtime/notification-toast"
import { ConnectionStatus } from "@/components/realtime/connection-status"
import { useTheme } from "@/components/theme-provider"
import { Celebration } from "@/components/ui/celebration"
import { TaskSearchFilter } from "@/components/search/task-search-filter"
import { ProjectHeader } from "@/components/projects/project-header"
import { ViewSwitcher, ViewMode } from "@/components/tasks/view-switcher"
import CalendarView from "@/components/tasks/calendar-view"
import { ProjectDailySummaries } from "@/components/projects/project-daily-summaries"
import ProjectLayout from "@/components/projects/project-layout"

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
  dailySummaryEnabled?: boolean
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
  const [showCelebration, setShowCelebration] = useState(false)
  const [wasCompleted, setWasCompleted] = useState(false)
  const [filteredTasks, setFilteredTasks] = useState<any[]>([])
  const [isFiltered, setIsFiltered] = useState(false)
  const [isSearchExpanded, setIsSearchExpanded] = useState(false)
  const [dailySummaryEnabled, setDailySummaryEnabled] = useState(false)
  const [selectedEpicId, setSelectedEpicId] = useState<string | undefined>(undefined)
  const [epics, setEpics] = useState<Array<{id: string, title: string, color?: string}>>([])

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
    setDailySummaryEnabled(updatedProject.dailySummaryEnabled || false)
  }

  const handleToggleDailySummary = (enabled: boolean) => {
    setDailySummaryEnabled(enabled)
    if (project) {
      setProject({ ...project, dailySummaryEnabled: enabled })
    }
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
    if (project) {
      setDailySummaryEnabled(project.dailySummaryEnabled || false)
    }
  }, [project])

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
    <ProjectLayout projectId={projectId} projectName={project?.name || 'Project'}>
      <div className="min-h-screen" style={{ backgroundColor: colors.background }}>
        <Celebration 
          isVisible={showCelebration} 
          onComplete={() => setShowCelebration(false)}
        />
      
      {/* Conditional Header Layout */}
      {true ? (
        <ProjectHeader
          project={project}
          tasks={project?.tasks || []}
          colors={colors}
          onTaskDrawerOpen={() => {/* TODO: Implement */}}
          onKanbanOptionsOpen={() => setIsSearchExpanded(!isSearchExpanded)}
          onNotificationsOpen={() => {/* TODO: Implement */}}
          onMoreMenuOpen={() => {/* TODO: Implement */}}
          onCommandPaletteOpen={() => {/* TODO: Implement */}}
          onProjectSettings={() => setIsEditDialogOpen(true)}
          onExportCSV={() => handleExportCSV()}
          onDuplicateProject={() => handleDuplicateProject()}
          onShareProject={() => handleShareProject()}
          onDeleteProject={() => handleDeleteProject()}
        />
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
            <Card className="border-0 shadow-sm" style={{ backgroundColor: colors.surface }}>
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {/* Epic Filter */}
                      <Select value={selectedEpicId || 'all'} onValueChange={(value) => setSelectedEpicId(value === 'all' ? undefined : value)}>
                        <SelectTrigger className="w-48">
                          <SelectValue placeholder="Filter by Epic" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">
                            <span className="text-muted-foreground">All Epics</span>
                          </SelectItem>
                          {epics.map((epic) => (
                            <SelectItem key={epic.id} value={epic.id}>
                              <div className="flex items-center space-x-2">
                                <div 
                                  className="w-3 h-3 rounded-full" 
                                  style={{ backgroundColor: epic.color || '#3B82F6' }}
                                ></div>
                                <span>{epic.title}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {/* Minimalistic Fullscreen Button - Always visible */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsTaskListFullscreen(true)}
                        className="h-8 w-8 p-0"
                        style={{ borderColor: colors.border }}
                      >
                        <Maximize2 className="h-3 w-3" />
                      </Button>
                      {/* Collapsible Search Button */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsSearchExpanded(!isSearchExpanded)}
                        className="h-8 px-3 text-xs"
                        style={{ borderColor: colors.border }}
                      >
                        <Search className="h-3 w-3 mr-1" />
                        Search
                      </Button>
                    </div>
                  </div>
                </CardHeader>
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
                  
                  {/* Render appropriate view based on currentView */}
                  {currentView === 'board' && (
                    <KanbanBoard 
                      projectId={projectId} 
                      workspaceId={currentWorkspace?.id || 'workspace-1'}
                      onTasksUpdated={loadProject}
                      filteredTasks={isFiltered ? filteredTasks : undefined}
                      epicId={selectedEpicId}
                    />
                  )}
                  
                  {currentView === 'list' && (
                    <TaskList 
                      projectId={projectId} 
                      workspaceId={currentWorkspace?.id || 'workspace-1'}
                      isFullscreen={false}
                      onToggleFullscreen={() => setIsTaskListFullscreen(true)}
                    />
                  )}
                  
                  {currentView === 'calendar' && (
                    <CalendarView 
                      projectId={projectId} 
                      workspaceId={currentWorkspace?.id || 'workspace-1'}
                    />
                  )}
                </CardContent>
              </Card>

              {/* Daily Summaries Section */}
              <ProjectDailySummaries
                projectId={projectId}
                projectName={project?.name || ''}
                dailySummaryEnabled={dailySummaryEnabled}
                onToggleDailySummary={handleToggleDailySummary}
              />
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
      </div>
    </ProjectLayout>
  )
}
