"use client"

import { useState, useEffect, useMemo } from "react"
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { 
  ArrowLeft, 
  AlertCircle,
  Loader2,
  User,
} from "lucide-react"
import Link from "next/link"
import { useWorkspace } from "@/lib/workspace-context"
import dynamic from "next/dynamic"
import { useTheme } from "@/components/theme-provider"
import { useProjectSlackHints, setProjectSlackHints } from "@/lib/client-state/project-slack-hints"

// Keep essential imports at top for faster initial render
import ReactMarkdown from "react-markdown"
import TaskList from "@/components/tasks/task-list"
import { CreateTaskDialog } from "@/components/tasks/create-task-dialog"
import type { FilterableTask } from "@/components/search/task-search-filter"
import type { KanbanBoardProps } from "@/components/kanban/kanban-board"
type KanbanTask = NonNullable<KanbanBoardProps['filteredTasks']>[number]

// Dynamic imports for heavy components to reduce initial bundle size
const KanbanBoard = dynamic(() => import("@/components/kanban/kanban-board").then(mod => ({ default: mod.KanbanBoard })), { ssr: false })
const InlineWikiViewer = dynamic(() => import("@/components/projects/inline-wiki-viewer").then(mod => ({ default: mod.InlineWikiViewer })), { ssr: false })
const _EmbedContentRenderer = dynamic(() => import("@/components/wiki/embed-content-renderer").then(mod => ({ default: mod.EmbedContentRenderer })), { ssr: false })
const ProjectEditDialog = dynamic(() => import("@/components/projects/project-edit-dialog").then(mod => ({ default: mod.ProjectEditDialog })), { ssr: false })
const _LiveTaskList = dynamic(() => import("@/components/realtime/live-task-list").then(mod => ({ default: mod.LiveTaskList })), { ssr: false })
const _PresenceIndicator = dynamic(() => import("@/components/realtime/presence-indicator").then(mod => ({ default: mod.PresenceIndicator })), { ssr: false })
const NotificationToast = dynamic(() => import("@/components/realtime/notification-toast").then(mod => ({ default: mod.NotificationToast })), { ssr: false })
const _NotificationBell = dynamic(() => import("@/components/realtime/notification-toast").then(mod => ({ default: mod.NotificationBell })), { ssr: false })
const _ConnectionStatus = dynamic(() => import("@/components/realtime/connection-status").then(mod => ({ default: mod.ConnectionStatus })), { ssr: false })
const Celebration = dynamic(() => import("@/components/ui/celebration").then(mod => ({ default: mod.Celebration })), { ssr: false })
const TaskSearchFilter = dynamic(() => import("@/components/search/task-search-filter").then(mod => ({ default: mod.TaskSearchFilter })), { ssr: false })
const ProjectHeader = dynamic(() => import("@/components/projects/project-header").then(mod => ({ default: mod.ProjectHeader })), { ssr: false })
const CalendarView = dynamic(() => import("@/components/tasks/calendar-view"), { ssr: false })
const TimelineView = dynamic(() => import("@/components/tasks/timeline-view"), { ssr: false })
const EpicsView = dynamic(() => import("@/components/projects/epics-view").then(mod => ({ default: mod.EpicsView })), { ssr: false })
const WikiLayout = dynamic(() => import("@/components/wiki/wiki-layout").then(mod => ({ default: mod.WikiLayout })), { ssr: false })
const CreateItemDialog = dynamic(() => import("@/components/projects/create-item-dialog").then(mod => ({ default: mod.CreateItemDialog })), { ssr: false })
const LoopbrainAssistantLauncher = dynamic(() => import("@/components/loopbrain/assistant-launcher").then(mod => ({ default: mod.LoopbrainAssistantLauncher })), { ssr: false })
const ProjectDocumentationSection = dynamic(() => import("@/components/projects/project-documentation-section").then(mod => ({ default: mod.ProjectDocumentationSection })), { ssr: false })
const ProjectTodosSection = dynamic(() => import("@/components/todos/project-todos-section").then(mod => ({ default: mod.ProjectTodosSection })), { ssr: false })

import { ProjectOrgStatus } from '@/components/projects/project-org-status'
import type { TaskFilter } from '@/components/search/task-search-filter'
import { useQueryClient } from '@tanstack/react-query'
import { useProject, useProjectEpics } from '@/hooks/use-projects'
import { useInvalidateProject } from '@/hooks/useProjectMutations'

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
  workspaceId?: string
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
    orgPosition?: {
      id: string
      title: string | null
      department: string | null
      team: {
        name: string
      } | null
      workAllocations: Array<{
        hoursAllocated: number | null
        projectId: string | null
      }>
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
  tasks?: Array<{
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
  slackChannelHints?: string[] // From API (not persisted, but returned in response)
  taskPagination?: {
    totalTaskCount: number
    loadedTaskCount: number
    hasMoreTasks: boolean
    limit: number
  }
}

type HeaderView = 'board' | 'epics' | 'tasks' | 'calendar' | 'timeline' | 'files'
const VALID_HEADER_VIEWS: HeaderView[] = ['board', 'epics', 'tasks', 'calendar', 'timeline', 'files']

export default function ProjectDetailPage() {
  const params = useParams()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const projectId = params?.id as string
  const workspaceSlug = params?.workspaceSlug as string | undefined
  const { themeConfig } = useTheme()
  const { currentWorkspace } = useWorkspace()

  const tabParam = searchParams.get('tab')
  const headerView: HeaderView = VALID_HEADER_VIEWS.includes(tabParam as HeaderView) ? (tabParam as HeaderView) : 'board'

  const setHeaderView = (view: HeaderView) => {
    const nextParams = new URLSearchParams(searchParams.toString())
    if (view === 'board') {
      nextParams.delete('tab')
    } else {
      nextParams.set('tab', view)
    }
    const query = nextParams.toString()
    router.push(query ? `${pathname}?${query}` : pathname ?? '/', { scroll: false })
  }

  const initialFilters = useMemo((): Partial<TaskFilter> => {
    const q = searchParams.get('q') ?? searchParams.get('search') ?? ''
    const status = searchParams.get('status')?.split(',').filter(Boolean) ?? []
    const priority = searchParams.get('priority')?.split(',').filter(Boolean) ?? []
    const assignee = searchParams.get('assignee')?.split(',').filter(Boolean) ?? []
    const hasDeps = searchParams.get('hasDependencies')
    const isOverdue = searchParams.get('isOverdue')
    return {
      search: q,
      status,
      priority,
      assignee,
      hasDependencies: hasDeps === 'true' ? true : hasDeps === 'false' ? false : null,
      isOverdue: isOverdue === 'true' ? true : isOverdue === 'false' ? false : null
    }
  }, [searchParams])

  const setFiltersInUrl = (filters: TaskFilter) => {
    const nextParams = new URLSearchParams(searchParams.toString())
    if (filters.search) nextParams.set('q', filters.search)
    else nextParams.delete('q')
    if (filters.status.length > 0) nextParams.set('status', filters.status.join(','))
    else nextParams.delete('status')
    if (filters.priority.length > 0) nextParams.set('priority', filters.priority.join(','))
    else nextParams.delete('priority')
    if (filters.assignee.length > 0) nextParams.set('assignee', filters.assignee.join(','))
    else nextParams.delete('assignee')
    if (filters.hasDependencies === true) nextParams.set('hasDependencies', 'true')
    else if (filters.hasDependencies === false) nextParams.set('hasDependencies', 'false')
    else nextParams.delete('hasDependencies')
    if (filters.isOverdue === true) nextParams.set('isOverdue', 'true')
    else if (filters.isOverdue === false) nextParams.set('isOverdue', 'false')
    else nextParams.delete('isOverdue')
    const query = nextParams.toString()
    router.push(query ? `${pathname}?${query}` : pathname ?? '/', { scroll: false })
  }
  
  const queryClient = useQueryClient()
  const { data: projectData, isLoading: isLoadingProject, error: projectError, refetch: refetchProject } = useProject(projectId)
  const { data: epicsData, refetch: refetchEpics } = useProjectEpics(projectId)
  const { invalidateProject, invalidateEpics } = useInvalidateProject()

  const project = projectData as Project | null | undefined
  const _epics = (epicsData as Array<{ id: string; title: string; color?: string }>) ?? []
  const isLoading = isLoadingProject
  const error = projectError ? (projectError as Error).message : null

  const loadProject = async () => {
    await refetchProject()
  }

  const _loadEpics = async () => {
    await refetchEpics()
  }

  // Get channel hints from project (API response) or fallback to client-side store
  const { hints: localStorageHints, setHints: setLocalStorageHints } = useProjectSlackHints(projectId)
  const channelHints = project?.slackChannelHints || localStorageHints || []
  const [isUpdatingWiki, setIsUpdatingWiki] = useState(false)
  const [isWikiDialogOpen, setIsWikiDialogOpen] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [_isCreatingSampleTasks, setIsCreatingSampleTasks] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isTaskListFullscreen, setIsTaskListFullscreen] = useState(false)
  const [_taskViewMode, _setTaskViewMode] = useState<'live' | 'kanban'>('kanban')
  const [showCelebration, setShowCelebration] = useState(false)
  const [wasCompleted, setWasCompleted] = useState(false)
  const [filteredTasks, setFilteredTasks] = useState<KanbanTask[]>([])
  const [isFiltered, setIsFiltered] = useState(false)
  const [isSearchExpanded, _setIsSearchExpanded] = useState(false)
  const [selectedEpicId, _setSelectedEpicId] = useState<string | undefined>(undefined)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isCreateEpicOpen, setIsCreateEpicOpen] = useState(false)
  const [newEpicTitle, setNewEpicTitle] = useState('')
  const [newEpicDescription, setNewEpicDescription] = useState('')
  const [newEpicColor, setNewEpicColor] = useState('#3B82F6')
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false)

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
        queryClient.setQueryData(['project', projectId], updatedProject)
      } else {
        console.error('Failed to update wiki page link')
      }
    } catch (error) {
      console.error('Error updating wiki page link:', error)
    } finally {
      setIsUpdatingWiki(false)
    }
  }

  const _createSampleTasks = async () => {
    try {
      setIsCreatingSampleTasks(true)
      const response = await fetch(`/api/test-projects?projectId=${projectId}`, {
        method: 'POST',
      })

      if (response.ok) {
        invalidateProject(projectId)
      } else {
        console.error('Failed to create sample tasks')
      }
    } catch (error) {
      console.error('Error creating sample tasks:', error)
    } finally {
      setIsCreatingSampleTasks(false)
    }
  }

  const handleProjectUpdate = (updatedProject: Project) => {
    if (updatedProject.slackChannelHints && Array.isArray(updatedProject.slackChannelHints) && updatedProject.slackChannelHints.length > 0) {
      setLocalStorageHints(updatedProject.slackChannelHints)
    }
    queryClient.setQueryData(['project', projectId], updatedProject)
  }

  const handleDeleteProject = async () => {
    if (!project) return
    
    const confirmed = window.confirm(
      `Are you sure you want to delete "${project.name}"? This action cannot be undone and will delete all tasks, epics, and other project data.`
    )
    
    if (!confirmed) return

    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        // Remove channel hints from localStorage
        setProjectSlackHints(project.id, [])
        
        // Redirect to projects list
        router.push(workspaceSlug ? `/w/${workspaceSlug}/projects` : '/projects')
      } else {
        const errorData = await response.json().catch(() => ({}))
        alert(errorData.error || 'Failed to delete project')
      }
    } catch (error) {
      console.error('Error deleting project:', error)
      alert('An error occurred while deleting the project')
    }
  }

  // More menu handlers
  const _handleExportCSV = () => {
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


  const handleFilterChange = (filteredTasks: FilterableTask[]) => {
    setFilteredTasks(filteredTasks as unknown as KanbanTask[])
    setIsFiltered(true)
  }

  const handleCreateTask = () => {
    setIsCreateTaskOpen(true)
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
        setNewEpicTitle('')
        setNewEpicDescription('')
        setNewEpicColor('#3B82F6')
        setIsCreateEpicOpen(false)
        invalidateProject(projectId)
        invalidateEpics(projectId)
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
    checkProjectCompletion()
  }, [project])

  // Sync slackChannelHints from project response to localStorage when project loads
  // Only sync if project has slackChannelHints (from PUT response) and they're different from localStorage
  useEffect(() => {
    if (project?.slackChannelHints && Array.isArray(project.slackChannelHints) && project.slackChannelHints.length > 0) {
      // Only update if different to avoid unnecessary re-renders
      const currentHints = localStorageHints || []
      const projectHints = project.slackChannelHints
      if (JSON.stringify(currentHints.sort()) !== JSON.stringify(projectHints.sort())) {
        setLocalStorageHints(projectHints)
      }
    }
  }, [project?.slackChannelHints, setLocalStorageHints, localStorageHints])

  const _getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE": return "bg-green-100 text-green-800"
      case "ON_HOLD": return "bg-yellow-100 text-yellow-800"
      case "COMPLETED": return "bg-blue-100 text-blue-800"
      case "CANCELLED": return "bg-red-100 text-red-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  const _getPriorityColor = (priority: string) => {
    switch (priority) {
      case "URGENT": return "bg-red-100 text-red-800"
      case "HIGH": return "bg-orange-100 text-orange-800"
      case "MEDIUM": return "bg-yellow-100 text-yellow-800"
      case "LOW": return "bg-green-100 text-green-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  const getTaskStatusCount = (status: string) => {
    if (!project || !project.tasks) return 0
    return project.tasks.filter(task => task.status === status).length
  }

  const checkProjectCompletion = () => {
    if (!project) return
    
    // Safe calculation with intermediate variables
    const total = project?._count?.tasks ?? 0;
    const done = getTaskStatusCount('DONE');
    const isCompleted = total > 0 && (done / total) * 100 === 100
    
    // Trigger celebration if project just became completed
    if (isCompleted && !wasCompleted) {
      setShowCelebration(true)
      setWasCompleted(true)
    } else if (!isCompleted) {
      setWasCompleted(false)
    }
  }

  const _formatDate = (dateString: string) => {
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
    const cleaned = content
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
            <Link href={workspaceSlug ? `/w/${workspaceSlug}/projects` : '/projects'}>
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
            tasks={project?.tasks}
            colors={colors}
            currentView={headerView}
            channelHints={channelHints}
            onViewChange={setHeaderView}
            onEdit={() => {
              setIsEditDialogOpen(true)
            }}
            onDelete={handleDeleteProject}
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
            <p className="text-base leading-relaxed mb-3" style={{ color: colors.textSecondary }}>
              {project?.description || 'No description available'}
            </p>
            {channelHints.length > 0 && (
              <div className="mb-4 flex flex-wrap gap-2">
                {channelHints.map((channel) => (
                  <span
                    key={channel}
                    className="px-3 py-1 text-sm rounded-full bg-slate-800 text-slate-100 border border-slate-700"
                  >
                    #{channel}
                  </span>
                ))}
              </div>
            )}
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
                      {project?.members.slice(0, 3).map((member) => {
                        const totalHours = member.orgPosition?.workAllocations.reduce(
                          (sum, alloc) => sum + (alloc.hoursAllocated || 0),
                          0
                        ) || 0
                        const utilizationPct = Math.round((totalHours / 40) * 100)

                        return (
                          <div key={member.id} className="flex items-center justify-between space-x-2">
                            <div className="flex items-center space-x-2 flex-1 min-w-0">
                              <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: colors.borderLight }}>
                                <User className="h-3 w-3" style={{ color: colors.textSecondary }} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium truncate" style={{ color: colors.text }}>
                                  {member.user.name}
                                </p>
                                {member.orgPosition ? (
                                  <p className="text-xs truncate" style={{ color: colors.textSecondary }}>
                                    {member.orgPosition.title}
                                    {member.orgPosition.department && ` • ${member.orgPosition.department}`}
                                  </p>
                                ) : (
                                  <p className="text-xs italic truncate" style={{ color: colors.textSecondary }}>
                                    Not in org
                                  </p>
                                )}
                              </div>
                            </div>

                            {member.orgPosition && totalHours > 0 && (
                              <div className="flex items-center gap-1">
                                <div className="text-right">
                                  <p className="text-xs font-medium" style={{ color: colors.text }}>
                                    {utilizationPct}%
                                  </p>
                                </div>
                                <div
                                  className="h-1.5 w-12 rounded-full overflow-hidden"
                                  style={{ backgroundColor: colors.borderLight }}
                                >
                                  <div
                                    className="h-full transition-all"
                                    style={{
                                      width: `${Math.min(utilizationPct, 100)}%`,
                                      backgroundColor:
                                        utilizationPct > 100
                                          ? colors.error
                                          : utilizationPct > 80
                                            ? colors.warning
                                            : colors.success,
                                    }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                      {(project?.members?.length ?? 0) > 3 ? (
                        <p className="text-xs" style={{ color: colors.textSecondary }}>
                          +{(project?.members?.length ?? 0) - 3} more
                        </p>
                      ) : null}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Progress */}
              <Card className="border-0 shadow-sm" style={{ backgroundColor: colors.surface }}>
                <CardContent className="p-4">
                  <div className="text-center">
                    <h3 className="text-sm font-medium mb-3" style={{ color: colors.text }}>Progress</h3>
                    {(() => {
                      // Safe calculation with intermediate variables (no inline ternaries)
                      const total = project?._count?.tasks ?? 0;
                      const done = getTaskStatusCount('DONE');
                      const width = total > 0 ? (done / total) * 100 : 0;
                      const isCompleted = total > 0 && width === 100;
                      
                      return (
                        <>
                          <div className="w-full rounded-full h-2 mb-2" style={{ backgroundColor: colors.border }}>
                            <div 
                              className="h-2 rounded-full" 
                              style={{ 
                                backgroundColor: isCompleted ? colors.success : colors.primary, 
                                width: `${width}%` 
                              }}
                            ></div>
                          </div>
                          <p className="text-xs" style={{ color: colors.textSecondary }}>
                            {done} of {total}
                          </p>
                          <p className="text-xs font-medium mt-1" style={{ 
                            color: isCompleted ? colors.success : colors.primary 
                          }}>
                            {total > 0 ? Math.round(width) : 0}%
                          </p>
                        </>
                      );
                    })()}
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

      {/* Project-Org Status */}
      {project?.members && project.members.length > 0 && (
        <div className="max-w-[1600px] mx-auto px-6 py-2">
          <ProjectOrgStatus members={project.members} />
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
              <Card className="bg-background border-0 shadow-none rounded-none">
                <CardContent className="p-0">
                  {/* Collapsible Search Bar */}
                  {isSearchExpanded && (
                    <div className="p-4 border-b" style={{ borderColor: colors.border }}>
                      <TaskSearchFilter
                        tasks={project?.tasks || []}
                        onFilterChange={handleFilterChange}
                        onFilterReset={handleFilterReset}
                        initialFilters={initialFilters}
                        onFilterValuesChange={setFiltersInUrl}
                      />
                    </div>
                  )}
                  
                  {/* Task pagination notice */}
                  {project?.taskPagination?.hasMoreTasks && (
                    <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                          Showing first {project.taskPagination.loadedTaskCount} of {project.taskPagination.totalTaskCount} tasks
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            // TODO: Implement load all tasks functionality
                          }}
                        >
                          Load All Tasks
                        </Button>
                      </div>
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
                  
                  {headerView === 'timeline' && (
                    <TimelineView 
                      projectId={projectId} 
                      workspaceId={currentWorkspace?.id || 'workspace-1'}
                    />
                  )}
                  
                  {headerView === 'files' && project && currentWorkspace && (
                    <div className="px-6 pt-3 pb-6">
                      <ProjectDocumentationSection 
                        projectId={project.id} 
                        workspaceId={project.workspaceId || currentWorkspace.id} 
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            </>

          {/* Project To-dos Section */}
          {project && (
            <ProjectTodosSection projectId={projectId} />
          )}

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
        project={project ?? null}
        onSave={(p) => handleProjectUpdate(p as Project)}
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

      {/* Create Task Dialog */}
      <CreateTaskDialog
        open={isCreateTaskOpen}
        onOpenChange={setIsCreateTaskOpen}
        projectId={projectId}
        onTaskCreated={() => {
          invalidateProject(projectId)
        }}
      />
    </WikiLayout>
  )
}
