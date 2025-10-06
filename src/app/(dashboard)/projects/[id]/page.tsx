"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
  BarChart3,
  Link as LinkIcon,
  FileText,
  ExternalLink,
  Maximize2,
  X
} from "lucide-react"
import Link from "next/link"
import TaskList from "@/components/tasks/task-list"
import { InlineWikiViewer } from "@/components/projects/inline-wiki-viewer"

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
  const projectId = params.id as string
  
  const [project, setProject] = useState<Project | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isUpdatingWiki, setIsUpdatingWiki] = useState(false)

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
    <div className="p-6 space-y-6">
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
          <Button variant="outline">
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
          {/* Tasks */}
          <TaskList projectId={projectId} workspaceId="workspace-1" />
          
          {/* Project Timeline - Full Width */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Project Timeline
              </CardTitle>
              <CardDescription>
                Visualize project progress with a Gantt chart
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {project.startDate && project.endDate ? (
                      <>
                        {formatDate(project.startDate)} - {formatDate(project.endDate)}
                      </>
                    ) : (
                      "No timeline set"
                    )}
                  </div>
                  <Button variant="outline" size="sm">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Create Gantt Chart
                  </Button>
                </div>
                
                {/* Placeholder for Gantt Chart */}
                <div className="h-48 bg-gray-50 dark:bg-gray-800 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600">
                  <div className="text-center">
                    <BarChart3 className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-lg font-medium text-gray-500 dark:text-gray-400 mb-2">
                      Project Timeline
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Gantt chart will appear here
                    </p>
                  </div>
                </div>
              </div>
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
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {/* Add open dialog logic */}}
                    className="h-8 px-3 text-xs border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                  >
                    <LinkIcon className="h-3 w-3 mr-1" />
                    Change Page
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {/* Add fullscreen logic */}}
                    className="h-8 px-3 text-xs border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                  >
                    <Maximize2 className="h-3 w-3 mr-1" />
                    Fullscreen
                  </Button>
                  <Button asChild variant="outline" size="sm" className="h-8 px-3 text-xs border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800">
                    <Link href={`/wiki/some-slug`}>
                      <Edit className="h-3 w-3 mr-1" />
                      Edit
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {/* Add close logic */}}
                    className="h-8 px-3 text-xs border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <InlineWikiViewer
                currentWikiPageId={project.wikiPage?.id}
                onWikiPageSelect={handleWikiPageUpdate}
                isLoading={isUpdatingWiki}
              />
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
    </div>
  )
}
