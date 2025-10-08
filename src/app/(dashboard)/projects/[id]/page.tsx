"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
  X
} from "lucide-react"
import Link from "next/link"
import ReactMarkdown from "react-markdown"
import TaskList from "@/components/tasks/task-list"
import { InlineWikiViewer } from "@/components/projects/inline-wiki-viewer"
import { EmbedContentRenderer } from "@/components/wiki/embed-content-renderer"
import { ProjectEditDialog } from "@/components/projects/project-edit-dialog"
import { LiveTaskList } from "@/components/realtime/live-task-list"
import { PresenceIndicator } from "@/components/realtime/presence-indicator"
import { NotificationToast, NotificationBell } from "@/components/realtime/notification-toast"

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

  useEffect(() => {
    if (projectId) {
      loadProject()
    }
  }, [projectId])

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
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading project...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Project Not Found</h3>
            <p className="text-muted-foreground mb-4">
              {error || 'The project you are looking for does not exist.'}
            </p>
            <Button asChild>
              <Link href="/projects">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Projects
              </Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Main Content - Hidden when fullscreen */}
      <div className={`p-6 space-y-6 ${isTaskListFullscreen ? 'hidden' : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/projects">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center space-x-3">
              <div 
                className="w-4 h-4 rounded-full" 
                style={{ backgroundColor: project.color || '#3b82f6' }}
              />
              <h1 className="text-3xl font-bold">{project.name}</h1>
            </div>
            <p className="text-muted-foreground mt-1">
              {project.description || 'No description'}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <PresenceIndicator projectId={projectId} />
          <NotificationBell />
          <Button variant="outline" onClick={() => setIsEditDialogOpen(true)}>
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
          <Button variant="outline" size="icon">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content - Takes up 2/3 of the width */}
        <div className="lg:col-span-2 space-y-6">
          {/* Tasks - Kanban Board or Live Updates */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">
                  {taskViewMode === 'kanban' ? 'Project Tasks' : 'Live Project Updates'}
                </CardTitle>
                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
                    <Button
                      variant={taskViewMode === 'kanban' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setTaskViewMode('kanban')}
                      className="h-7 px-3 text-xs"
                    >
                      Board
                    </Button>
                    <Button
                      variant={taskViewMode === 'live' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setTaskViewMode('live')}
                      className="h-7 px-3 text-xs"
                    >
                      Live
                    </Button>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsTaskListFullscreen(true)}
                    className="h-8 px-3 text-xs"
                  >
                    <Maximize2 className="h-3 w-3 mr-1" />
                    Fullscreen
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {taskViewMode === 'kanban' ? (
                <TaskList 
                  projectId={projectId} 
                  workspaceId="workspace-1" 
                  isFullscreen={false}
                />
              ) : (
                <LiveTaskList 
                  projectId={projectId}
                  className="min-h-[400px]"
                />
              )}
            </CardContent>
          </Card>
          
          {/* Project Documentation - Full Width */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Documentation
                  </CardTitle>
                  <CardDescription>
                    Project documentation and wiki pages
                  </CardDescription>
                </div>
                {project.wikiPage && (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsWikiDialogOpen(true)}
                      className="h-8 px-3 text-xs border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                    >
                      <LinkIcon className="h-3 w-3 mr-1" />
                      Change Page
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsFullscreen(true)}
                      className="h-8 px-3 text-xs border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                    >
                      <Maximize2 className="h-3 w-3 mr-1" />
                      Fullscreen
                    </Button>
                    <Button asChild variant="outline" size="sm" className="h-8 px-3 text-xs border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800">
                      <Link href={`/wiki/${project.wikiPage.slug}`}>
                        <Edit className="h-3 w-3 mr-1" />
                        Edit
                      </Link>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleWikiPageUpdate(null)}
                      className="h-8 px-3 text-xs border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-4">
              {project.wikiPage ? (
                <InlineWikiViewer
                  currentWikiPageId={project.wikiPage.id}
                  onWikiPageSelect={handleWikiPageUpdate}
                  isLoading={isUpdatingWiki}
                />
              ) : (
                <div className="text-center py-8 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                  <div className="flex flex-col items-center">
                    <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-full mb-3">
                      <FileText className="h-8 w-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      No Page Selected
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-4 max-w-md text-sm">
                      Select a wiki page to display project documentation inline.
                    </p>
                    <Button
                      onClick={() => setIsWikiDialogOpen(true)}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <LinkIcon className="h-4 w-4 mr-2" />
                      Select Page
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Project Info Sidebar - Takes up 1/3 of the width */}
        <div className="space-y-6">
          {/* Project Status & Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Project Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Status</span>
                <Badge className={getStatusColor(project.status)}>
                  {project.status}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Priority</span>
                <Badge className={getPriorityColor(project.priority)}>
                  {project.priority}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Timeline</span>
                <div className="flex items-center text-sm text-muted-foreground">
                  <Calendar className="mr-1 h-4 w-4" />
                  {project.startDate && formatDate(project.startDate)}
                  {project.startDate && project.endDate && ' - '}
                  {project.endDate && formatDate(project.endDate)}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Task Statistics */}
          <Card>
            <CardHeader>
              <CardTitle>Task Statistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Target className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Total Tasks</span>
                </div>
                <span className="text-2xl font-bold">{project._count.tasks}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium">Completed</span>
                </div>
                <span className="text-2xl font-bold text-green-600">{getTaskStatusCount('DONE')}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium">In Progress</span>
                </div>
                <span className="text-2xl font-bold text-blue-600">{getTaskStatusCount('IN_PROGRESS')}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm font-medium">To Do</span>
                </div>
                <span className="text-2xl font-bold text-yellow-600">{getTaskStatusCount('TODO')}</span>
              </div>
            </CardContent>
          </Card>

          {/* Team Members */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Team Members</span>
                <Badge variant="outline">{project.members.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {project.members.length > 0 ? (
                <div className="space-y-3">
                  {project.members.map((member) => (
                    <div key={member.id} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                          <User className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{member.user.name}</p>
                          <p className="text-xs text-muted-foreground">{member.user.email}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">{member.role}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">No team members yet</p>
              )}
            </CardContent>
          </Card>

          {/* Project Assignees */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Assignees</span>
                <Badge variant="outline">{project.assignees?.length || 0}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {project.assignees && project.assignees.length > 0 ? (
                <div className="space-y-3">
                  {project.assignees.map((assignee) => (
                    <div key={assignee.id} className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-purple-200 rounded-full flex items-center justify-center">
                        <User className="h-4 w-4 text-purple-600" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{assignee.user.name}</p>
                        <p className="text-xs text-muted-foreground">{assignee.user.email}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">No assignees yet</p>
              )}
            </CardContent>
          </Card>

          {/* Project Owner */}
          {project.owner && (
            <Card>
              <CardHeader>
                <CardTitle>Project Owner</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-200 rounded-full flex items-center justify-center">
                    <User className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{project.owner.name}</p>
                    <p className="text-xs text-muted-foreground">{project.owner.email}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Project Information */}
          <Card>
            <CardHeader>
              <CardTitle>Project Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Created by</label>
                <p className="text-sm">{project.createdBy.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Created on</label>
                <p className="text-sm">{formatDate(project.createdAt)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Last updated</label>
                <p className="text-sm">{formatDate(project.updatedAt)}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Wiki Page Selection Dialog */}
      <Dialog open={isWikiDialogOpen} onOpenChange={setIsWikiDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Select Wiki Page</DialogTitle>
            <DialogDescription>
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
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>{project.wikiPage.title}</DialogTitle>
              <DialogDescription>
                Last updated: {new Date(project.wikiPage.updatedAt).toLocaleDateString()}
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto p-4">
              <div className="prose prose-lg max-w-none">
                <div style={{ color: '#111827 !important' }}>
                  <ReactMarkdown 
                    components={{
                      // Custom components to handle HTML tags properly
                      p: ({ children }) => <p className="mb-4 leading-relaxed text-base" style={{ color: '#111827 !important' }}>{children}</p>,
                      ul: ({ children }) => <ul className="mb-6 pl-6 space-y-2">{children}</ul>,
                      ol: ({ children }) => <ol className="mb-6 pl-6 space-y-2">{children}</ol>,
                      li: ({ children }) => <li className="leading-relaxed text-base" style={{ color: '#111827 !important' }}>{children}</li>,
                      h1: ({ children }) => <h1 className="text-2xl font-bold mb-6 mt-8 border-b-2 border-gray-300 pb-3" style={{ color: '#111827 !important' }}>{children}</h1>,
                      h2: ({ children }) => <h2 className="text-xl font-bold mb-4 mt-8" style={{ color: '#111827 !important' }}>{children}</h2>,
                      h3: ({ children }) => <h3 className="text-lg font-bold mb-3 mt-6" style={{ color: '#374151 !important' }}>{children}</h3>,
                      strong: ({ children }) => <strong className="font-bold" style={{ color: '#111827 !important' }}>{children}</strong>,
                      em: ({ children }) => <em className="italic" style={{ color: '#374151 !important' }}>{children}</em>,
                      code: ({ children }) => <code className="bg-blue-50 px-2 py-1 rounded text-sm font-mono font-semibold" style={{ color: '#1d4ed8 !important' }}>{children}</code>,
                      pre: ({ children }) => <pre className="bg-gray-50 border border-gray-200 rounded-lg p-4 my-6 overflow-x-auto">{children}</pre>,
                      blockquote: ({ children }) => <blockquote className="border-l-4 border-blue-300 pl-4 italic my-6" style={{ color: '#374151 !important' }}>{children}</blockquote>,
                      hr: () => <hr className="my-8 border-gray-300" />
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

      </div>

      {/* Fullscreen Task List */}
      {isTaskListFullscreen && (
        <div className="fixed inset-0 z-50 bg-white overflow-auto p-4">
          <TaskList 
            projectId={projectId} 
            workspaceId="workspace-1" 
            isFullscreen={isTaskListFullscreen}
            onToggleFullscreen={() => setIsTaskListFullscreen(!isTaskListFullscreen)}
          />
        </div>
      )}

      {/* Real-time Notifications */}
      <NotificationToast />
    </>
  )
}
