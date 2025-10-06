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
  TrendingUp
} from "lucide-react"
import Link from "next/link"

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
}

export default function ProjectDetailPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string
  
  const [project, setProject] = useState<Project | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
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

      {/* Status and Priority */}
      <div className="flex items-center space-x-4">
        <Badge className={getStatusColor(project.status)}>
          {project.status}
        </Badge>
        <Badge className={getPriorityColor(project.priority)}>
          {project.priority}
        </Badge>
        <div className="flex items-center text-sm text-muted-foreground">
          <Calendar className="mr-1 h-4 w-4" />
          {project.startDate && formatDate(project.startDate)}
          {project.startDate && project.endDate && ' - '}
          {project.endDate && formatDate(project.endDate)}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{project._count.tasks}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{getTaskStatusCount('DONE')}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{getTaskStatusCount('IN_PROGRESS')}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{project.members.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Task Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Task Status Overview</CardTitle>
          <CardDescription>
            Distribution of tasks across different statuses
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center">
              <div className="w-3 h-3 bg-gray-400 rounded-full mx-auto mb-2" />
              <div className="text-2xl font-bold">{getTaskStatusCount('TODO')}</div>
              <div className="text-sm text-muted-foreground">Todo</div>
            </div>
            <div className="text-center">
              <div className="w-3 h-3 bg-blue-400 rounded-full mx-auto mb-2" />
              <div className="text-2xl font-bold">{getTaskStatusCount('IN_PROGRESS')}</div>
              <div className="text-sm text-muted-foreground">In Progress</div>
            </div>
            <div className="text-center">
              <div className="w-3 h-3 bg-yellow-400 rounded-full mx-auto mb-2" />
              <div className="text-2xl font-bold">{getTaskStatusCount('IN_REVIEW')}</div>
              <div className="text-sm text-muted-foreground">In Review</div>
            </div>
            <div className="text-center">
              <div className="w-3 h-3 bg-green-400 rounded-full mx-auto mb-2" />
              <div className="text-2xl font-bold">{getTaskStatusCount('DONE')}</div>
              <div className="text-sm text-muted-foreground">Done</div>
            </div>
            <div className="text-center">
              <div className="w-3 h-3 bg-red-400 rounded-full mx-auto mb-2" />
              <div className="text-2xl font-bold">{getTaskStatusCount('BLOCKED')}</div>
              <div className="text-sm text-muted-foreground">Blocked</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Tasks */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Tasks</CardTitle>
              <CardDescription>
                Latest tasks in this project
              </CardDescription>
            </div>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Task
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {project.tasks.length > 0 ? (
            <div className="space-y-4">
              {project.tasks.slice(0, 5).map((task) => (
                <div key={task.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-gray-400 rounded-full" />
                    <div>
                      <h4 className="font-medium">{task.title}</h4>
                      {task.assignee && (
                        <p className="text-sm text-muted-foreground">
                          Assigned to {task.assignee.name}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className={getPriorityColor(task.priority)}>
                      {task.priority}
                    </Badge>
                    <Badge variant="outline">
                      {task.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No tasks yet</h3>
              <p className="text-muted-foreground mb-4">
                Get started by adding your first task to this project
              </p>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add First Task
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Project Info */}
      <div className="grid gap-4 md:grid-cols-2">
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

        <Card>
          <CardHeader>
            <CardTitle>Team Members</CardTitle>
          </CardHeader>
          <CardContent>
            {project.members.length > 0 ? (
              <div className="space-y-3">
                {project.members.map((member) => (
                  <div key={member.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{member.user.name}</p>
                      <p className="text-sm text-muted-foreground">{member.user.email}</p>
                    </div>
                    <Badge variant="outline">{member.role}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No team members yet</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
