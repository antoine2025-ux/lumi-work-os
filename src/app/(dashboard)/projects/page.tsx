"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
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
  User
} from "lucide-react"
import Link from "next/link"
import { ContextMenu } from "@/components/ui/context-menu"

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

export default function ProjectsPage() {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("All")
  const [isLoading, setIsLoading] = useState(true)
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
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

  const handleDeleteProject = async (projectId: string, projectName: string) => {
    if (confirm(`Are you sure you want to delete "${projectName}"? This action cannot be undone.`)) {
      try {
        const response = await fetch(`/api/projects/${projectId}`, {
          method: 'DELETE',
        })

        if (response.ok) {
          // Remove project from local state
          setProjects(prevProjects => prevProjects.filter(p => p.id !== projectId))
          console.log('Project deleted successfully')
        } else {
          console.error('Failed to delete project:', response.statusText)
          alert('Failed to delete project. Please try again.')
        }
      } catch (error) {
        console.error('Error deleting project:', error)
        alert('An error occurred while deleting the project. Please try again.')
      }
    }
  }

  // Helper function to determine if a project is completed
  const isProjectCompleted = (project: Project) => {
    // If project status is explicitly COMPLETED, it's completed
    if (project.status === 'COMPLETED') {
      return true
    }
    
    // If project has tasks and all tasks are DONE, it's completed
    if (project._count.tasks > 0) {
      const completedTasks = project.tasks.filter(task => task.status === 'DONE').length
      return completedTasks === project._count.tasks
    }
    
    return false
  }

  // Load projects from API
  useEffect(() => {
    const loadProjects = async () => {
      try {
        setIsLoading(true)
        const response = await fetch('/api/projects?workspaceId=cmgl0f0wa00038otlodbw5jhn')
        if (response.ok) {
          const result = await response.json()
          // Handle paginated response - data is in result.data
          const data = result.data || result
          // Ensure data is an array before setting
          if (Array.isArray(data)) {
            setProjects(data)
          } else {
            console.warn('Expected array but got:', typeof data, data)
            setProjects([])
          }
        } else {
          setProjects([])
        }
      } catch (error) {
        console.error('Error loading projects:', error)
        setProjects([])
      } finally {
        setIsLoading(false)
      }
    }

    loadProjects()
  }, [])

  // Filter projects based on search and status
  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (project.description && project.description.toLowerCase().includes(searchQuery.toLowerCase()))
    const matchesStatus = statusFilter === "All" || project.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE": return "bg-green-100 text-green-800"
      case "ON_HOLD": return "bg-yellow-100 text-yellow-800"
      case "COMPLETED": return "bg-blue-100 text-blue-800"
      case "CANCELLED": return "bg-red-100 text-red-800"
      default: return "bg-muted text-foreground"
    }
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

  const getTaskStatusCount = (project: Project, status: string) => {
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
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: colors.background }}>
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" style={{ color: colors.primary }} />
          <p style={{ color: colors.textSecondary }}>Loading projects...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: colors.background }}>
      {/* Zen-style Header */}
      <div className="text-center py-12 space-y-6">
        <div className="flex items-center justify-center space-x-3">
          <div 
            className="w-3 h-3 rounded-full" 
            style={{ backgroundColor: colors.primary }}
          />
          <h1 className="text-4xl font-light" style={{ color: colors.text }}>Projects</h1>
        </div>
        <p className="text-lg max-w-2xl mx-auto" style={{ color: colors.textSecondary }}>
          Manage your team's projects and tasks with calm productivity
        </p>
      </div>

      {/* Stats Overview - Zen Style */}
      <div className="max-w-4xl mx-auto mb-12">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-3xl font-light mb-2" style={{ color: colors.text }}>{projects.length}</div>
            <div className="text-sm" style={{ color: colors.textSecondary }}>Total Projects</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-light mb-2" style={{ color: colors.success }}>{projects.filter(p => p.status === 'ACTIVE' && !isProjectCompleted(p)).length}</div>
            <div className="text-sm" style={{ color: colors.textSecondary }}>Active</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-light mb-2" style={{ color: colors.primary }}>{projects.filter(p => isProjectCompleted(p)).length}</div>
            <div className="text-sm" style={{ color: colors.textSecondary }}>Completed</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-light mb-2" style={{ color: colors.text }}>{projects.reduce((sum, project) => sum + project._count.tasks, 0)}</div>
            <div className="text-sm" style={{ color: colors.textSecondary }}>Total Tasks</div>
          </div>
        </div>
      </div>

      {/* Search and Filters - Minimal */}
      <div className="max-w-4xl mx-auto mb-8">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: colors.textSecondary }} />
            <Input
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 border-0 rounded-lg"
              style={{ backgroundColor: colors.surface, color: colors.text }}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40 border-0 rounded-lg" style={{ backgroundColor: colors.surface }}>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Status</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="ON_HOLD">On Hold</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Button asChild className="rounded-lg" style={{ backgroundColor: colors.primary }}>
            <Link href="/projects/new">
              <Plus className="mr-2 h-4 w-4" />
              New Project
            </Link>
          </Button>
        </div>
      </div>

      {/* Projects Grid - Zen Focus Style */}
      <div className="max-w-6xl mx-auto px-6 pb-12">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((project) => (
            <ContextMenu key={project.id} items={[
              {
                id: "details",
                label: "View Details",
                icon: () => <Eye className="h-4 w-4" />,
                action: () => {
                  setSelectedProject(project)
                  setIsDetailsOpen(true)
                }
              },
              {
                id: "open",
                label: "Open Project",
                icon: () => <Target className="h-4 w-4" />,
                action: () => {
                  window.location.href = `/projects/${project.id}`
                }
              },
              {
                id: "edit",
                label: "Edit",
                icon: () => <Edit className="h-4 w-4" />,
                action: () => console.log("Edit project", project.id)
              },
              { id: "separator-1", label: "", separator: true },
              {
                id: "delete",
                label: "Delete",
                icon: () => <Trash2 className="h-4 w-4" />,
                action: () => handleDeleteProject(project.id, project.name),
                destructive: true
              }
            ]}>
              <Card 
                className="hover:shadow-lg transition-all duration-200 cursor-pointer border-0 rounded-xl overflow-hidden group" 
                style={{ backgroundColor: colors.surface }}
                onClick={() => window.location.href = `/projects/${project.id}`}
              >
                <CardContent className="p-6">
                  {/* Project Header - Bold Title */}
                  <div className="flex items-center space-x-3 mb-4">
                    <div 
                      className="w-2 h-2 rounded-full" 
                      style={{ backgroundColor: project.color || colors.primary }}
                    />
                    <h3 className="text-lg font-bold group-hover:opacity-80 transition-all" style={{ color: colors.text }}>
                      {project.name}
                    </h3>
                  </div>

                  {/* Progress Bar - Clean */}
                  <div className="mb-4">
                    <div className="w-full rounded-full h-1" style={{ backgroundColor: colors.border }}>
                      <div 
                        className="h-1 rounded-full transition-all duration-300" 
                        style={{ 
                          backgroundColor: colors.primary, 
                          width: `${project._count.tasks > 0 ? (getTaskStatusCount(project, 'DONE') / project._count.tasks) * 100 : 0}%` 
                        }}
                      ></div>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs" style={{ color: colors.textSecondary }}>
                        {getTaskStatusCount(project, 'DONE')} of {project._count.tasks} tasks
                      </span>
                      <span className="text-xs font-medium" style={{ color: colors.textSecondary }}>
                        {project.status}
                      </span>
                    </div>
                  </div>

                  {/* Team Info - Minimal */}
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
            </ContextMenu>
          ))}
        </div>

        {/* Empty State */}
        {filteredProjects.length === 0 && !isLoading && (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: colors.borderLight }}>
              <Target className="h-8 w-8" style={{ color: colors.textSecondary }} />
            </div>
            <h3 className="text-lg font-medium mb-2" style={{ color: colors.text }}>No projects found</h3>
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

      {/* Project Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col" style={{ backgroundColor: colors.surface }}>
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-3">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: selectedProject?.color || colors.primary }}
              />
              <span style={{ color: colors.text }}>{selectedProject?.name}</span>
            </DialogTitle>
            <DialogDescription style={{ color: colors.textSecondary }}>
              {selectedProject?.description || 'No description available'}
            </DialogDescription>
          </DialogHeader>
          
          {selectedProject && (
            <div className="flex-1 overflow-y-auto space-y-6">
              {/* Project Overview */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium mb-2" style={{ color: colors.text }}>Status</h4>
                  <Badge className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: colors.borderLight, color: colors.textSecondary }}>
                    {selectedProject.status}
                  </Badge>
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-2" style={{ color: colors.text }}>Priority</h4>
                  <Badge className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: colors.borderLight, color: colors.textSecondary }}>
                    {selectedProject.priority}
                  </Badge>
                </div>
              </div>

              {/* Progress */}
              <div>
                <h4 className="text-sm font-medium mb-2" style={{ color: colors.text }}>Progress</h4>
                <div className="w-full rounded-full h-2" style={{ backgroundColor: colors.border }}>
                  <div 
                    className="h-2 rounded-full transition-all duration-300" 
                    style={{ 
                      backgroundColor: colors.primary, 
                      width: `${selectedProject._count.tasks > 0 ? (getTaskStatusCount(selectedProject, 'DONE') / selectedProject._count.tasks) * 100 : 0}%` 
                    }}
                  ></div>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-sm" style={{ color: colors.textSecondary }}>
                    {getTaskStatusCount(selectedProject, 'DONE')} of {selectedProject._count.tasks} tasks completed
                  </span>
                  <span className="text-sm font-medium" style={{ color: colors.primary }}>
                    {selectedProject._count.tasks > 0 ? Math.round((getTaskStatusCount(selectedProject, 'DONE') / selectedProject._count.tasks) * 100) : 0}%
                  </span>
                </div>
              </div>

              {/* Task Breakdown */}
              <div>
                <h4 className="text-sm font-medium mb-3" style={{ color: colors.text }}>Task Breakdown</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center justify-between p-2 rounded-lg" style={{ backgroundColor: colors.borderLight }}>
                    <span className="text-xs" style={{ color: colors.textSecondary }}>To Do</span>
                    <span className="text-sm font-medium" style={{ color: colors.text }}>{getTaskStatusCount(selectedProject, 'TODO')}</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg" style={{ backgroundColor: colors.borderLight }}>
                    <span className="text-xs" style={{ color: colors.textSecondary }}>In Progress</span>
                    <span className="text-sm font-medium" style={{ color: colors.text }}>{getTaskStatusCount(selectedProject, 'IN_PROGRESS')}</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg" style={{ backgroundColor: colors.borderLight }}>
                    <span className="text-xs" style={{ color: colors.textSecondary }}>In Review</span>
                    <span className="text-sm font-medium" style={{ color: colors.text }}>{getTaskStatusCount(selectedProject, 'IN_REVIEW')}</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg" style={{ backgroundColor: colors.borderLight }}>
                    <span className="text-xs" style={{ color: colors.textSecondary }}>Done</span>
                    <span className="text-sm font-medium" style={{ color: colors.text }}>{getTaskStatusCount(selectedProject, 'DONE')}</span>
                  </div>
                </div>
              </div>

              {/* Team Members */}
              <div>
                <h4 className="text-sm font-medium mb-3" style={{ color: colors.text }}>Team Members</h4>
                <div className="space-y-2">
                  {selectedProject.members.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-2 rounded-lg" style={{ backgroundColor: colors.borderLight }}>
                      <div className="flex items-center space-x-2">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: colors.primary }}>
                          <User className="h-3 w-3 text-white" />
                        </div>
                        <div>
                          <p className="text-sm font-medium" style={{ color: colors.text }}>{member.user.name}</p>
                          <p className="text-xs" style={{ color: colors.textSecondary }}>{member.user.email}</p>
                        </div>
                      </div>
                      <Badge className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: colors.surface, color: colors.textSecondary }}>
                        {member.role}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>

              {/* Project Info */}
              <div>
                <h4 className="text-sm font-medium mb-3" style={{ color: colors.text }}>Project Information</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2 rounded-lg" style={{ backgroundColor: colors.borderLight }}>
                    <span className="text-xs" style={{ color: colors.textSecondary }}>Created by</span>
                    <span className="text-sm" style={{ color: colors.text }}>{selectedProject.createdBy.name}</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg" style={{ backgroundColor: colors.borderLight }}>
                    <span className="text-xs" style={{ color: colors.textSecondary }}>Created on</span>
                    <span className="text-sm" style={{ color: colors.text }}>{formatDate(selectedProject.createdAt)}</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg" style={{ backgroundColor: colors.borderLight }}>
                    <span className="text-xs" style={{ color: colors.textSecondary }}>Last updated</span>
                    <span className="text-sm" style={{ color: colors.text }}>{formatDate(selectedProject.updatedAt)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end space-x-2 pt-4 border-t" style={{ borderColor: colors.border }}>
            <Button 
              variant="outline" 
              onClick={() => setIsDetailsOpen(false)}
              style={{ borderColor: colors.border, color: colors.textSecondary }}
            >
              Close
            </Button>
            <Button 
              onClick={() => {
                setIsDetailsOpen(false)
                window.location.href = `/projects/${selectedProject?.id}`
              }}
              style={{ backgroundColor: colors.primary }}
            >
              <Target className="h-4 w-4 mr-2" />
              Open Project
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

