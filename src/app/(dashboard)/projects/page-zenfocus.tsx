"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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

// Color theme system (same as demo)
const colorThemes = {
  default: {
    primary: '#3b82f6',
    primaryLight: '#dbeafe',
    primaryDark: '#1d4ed8',
    success: '#10b981',
    successLight: '#d1fae5',
    warning: '#f59e0b',
    warningLight: '#fef3c7',
    error: '#ef4444',
    errorLight: '#fee2e2',
    background: '#f9fafb',
    surface: '#ffffff',
    text: '#111827',
    textSecondary: '#6b7280',
    border: '#e5e7eb',
    borderLight: '#f3f4f6'
  },
  sage: {
    primary: '#6b7280',
    primaryLight: '#f3f4f6',
    primaryDark: '#374151',
    success: '#059669',
    successLight: '#d1fae5',
    warning: '#d97706',
    warningLight: '#fef3c7',
    error: '#dc2626',
    errorLight: '#fee2e2',
    background: '#f8fafc',
    surface: '#ffffff',
    text: '#0f172a',
    textSecondary: '#64748b',
    border: '#e2e8f0',
    borderLight: '#f1f5f9'
  },
  ocean: {
    primary: '#0ea5e9',
    primaryLight: '#e0f2fe',
    primaryDark: '#0284c7',
    success: '#06b6d4',
    successLight: '#cffafe',
    warning: '#f59e0b',
    warningLight: '#fef3c7',
    error: '#ef4444',
    errorLight: '#fee2e2',
    background: '#f0f9ff',
    surface: '#ffffff',
    text: '#0c4a6e',
    textSecondary: '#0369a1',
    border: '#bae6fd',
    borderLight: '#e0f2fe'
  },
  sunset: {
    primary: '#f97316',
    primaryLight: '#fed7aa',
    primaryDark: '#ea580c',
    success: '#22c55e',
    successLight: '#dcfce7',
    warning: '#eab308',
    warningLight: '#fef3c7',
    error: '#ef4444',
    errorLight: '#fee2e2',
    background: '#fff7ed',
    surface: '#ffffff',
    text: '#9a3412',
    textSecondary: '#c2410c',
    border: '#fed7aa',
    borderLight: '#fff7ed'
  },
  mist: {
    primary: '#8b5cf6',
    primaryLight: '#ede9fe',
    primaryDark: '#7c3aed',
    success: '#10b981',
    successLight: '#d1fae5',
    warning: '#f59e0b',
    warningLight: '#fef3c7',
    error: '#ef4444',
    errorLight: '#fee2e2',
    background: '#faf5ff',
    surface: '#ffffff',
    text: '#581c87',
    textSecondary: '#7c3aed',
    border: '#d8b4fe',
    borderLight: '#f3e8ff'
  }
}

export default function ProjectsPageZenFocus() {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("All")
  const [isLoading, setIsLoading] = useState(true)
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedTheme, setSelectedTheme] = useState<'default' | 'sage' | 'ocean' | 'sunset' | 'mist'>('default')

  const colors = colorThemes[selectedTheme]

  const handleDeleteProject = async (projectId: string, projectName: string) => {
    if (confirm(`Are you sure you want to delete "${projectName}"? This action cannot be undone.`)) {
      try {
        const response = await fetch(`/api/projects/${projectId}`, {
          method: 'DELETE',
        })

        if (response.ok) {
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

  // Load projects from API
  useEffect(() => {
    const loadProjects = async () => {
      try {
        setIsLoading(true)
        const response = await fetch('/api/projects?workspaceId=workspace-1')
        if (response.ok) {
          const data = await response.json()
          setProjects(data)
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
        
        {/* Theme Selector */}
        <div className="flex items-center justify-center space-x-2">
          <span className="text-sm" style={{ color: colors.textSecondary }}>Theme:</span>
          <Button 
            variant={selectedTheme === 'default' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedTheme('default')}
            className="bg-gray-600 hover:bg-gray-700"
          >
            Default
          </Button>
          <Button 
            variant={selectedTheme === 'sage' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedTheme('sage')}
            className="bg-green-600 hover:bg-green-700"
          >
            Sage
          </Button>
          <Button 
            variant={selectedTheme === 'ocean' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedTheme('ocean')}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Ocean
          </Button>
          <Button 
            variant={selectedTheme === 'sunset' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedTheme('sunset')}
            className="bg-orange-600 hover:bg-orange-700"
          >
            Sunset
          </Button>
          <Button 
            variant={selectedTheme === 'mist' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedTheme('mist')}
            className="bg-purple-600 hover:bg-purple-700"
          >
            Mist
          </Button>
        </div>
      </div>

      {/* Stats Overview - Zen Style */}
      <div className="max-w-4xl mx-auto mb-12">
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
            <div className="text-3xl font-light mb-2" style={{ color: colors.primary }}>{projects.filter(p => p.status === 'COMPLETED').length}</div>
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
                id: "open",
                label: "Open",
                icon: () => <Eye className="h-4 w-4" />,
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
              <Card className="hover:shadow-lg transition-all duration-200 cursor-pointer border-0 rounded-xl overflow-hidden" style={{ backgroundColor: colors.surface }}>
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-3">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: project.color || colors.primary }}
                        />
                        <CardTitle className="text-lg font-medium" style={{ color: colors.text }}>
                          {project.name}
                        </CardTitle>
                      </div>
                      <CardDescription className="text-sm mb-3" style={{ color: colors.textSecondary }}>
                        {project.description || 'No description'}
                      </CardDescription>
                      <div className="flex items-center space-x-2">
                        <Badge className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: colors.borderLight, color: colors.textSecondary }}>
                          {project.status}
                        </Badge>
                        <Badge className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: colors.borderLight, color: colors.textSecondary }}>
                          {project.priority}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {/* Task Progress - Visual */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium" style={{ color: colors.textSecondary }}>Progress</span>
                      <span className="text-xs" style={{ color: colors.textSecondary }}>
                        {getTaskStatusCount(project, 'DONE')} of {project._count.tasks}
                      </span>
                    </div>
                    <div className="w-full rounded-full h-1.5" style={{ backgroundColor: colors.border }}>
                      <div 
                        className="h-1.5 rounded-full" 
                        style={{ 
                          backgroundColor: colors.primary, 
                          width: `${project._count.tasks > 0 ? (getTaskStatusCount(project, 'DONE') / project._count.tasks) * 100 : 0}%` 
                        }}
                      ></div>
                    </div>
                  </div>

                  {/* Team Members - Minimal */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4" style={{ color: colors.textSecondary }} />
                      <span className="text-xs" style={{ color: colors.textSecondary }}>
                        {project.members.length} members
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4" style={{ color: colors.textSecondary }} />
                      <span className="text-xs" style={{ color: colors.textSecondary }}>
                        {formatDate(project.createdAt)}
                      </span>
                    </div>
                  </div>

                  {/* Action Button */}
                  <Button asChild className="w-full rounded-lg" style={{ backgroundColor: colors.primary }}>
                    <Link href={`/projects/${project.id}`}>
                      <Eye className="h-4 w-4 mr-2" />
                      View Project
                    </Link>
                  </Button>
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
    </div>
  )
}
