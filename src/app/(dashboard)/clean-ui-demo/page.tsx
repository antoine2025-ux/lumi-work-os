"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  ArrowLeft, 
  Target, 
  Calendar,
  Users,
  Clock,
  CheckCircle,
  Plus,
  Edit,
  MoreHorizontal,
  TrendingUp,
  User,
  FileText,
  Maximize2,
  Eye,
  ChevronRight
} from "lucide-react"
import Link from "next/link"

// Mock project data
const mockProject = {
  id: "1",
  name: "Website Redesign",
  description: "Complete redesign of our company website with modern UI/UX",
  status: 'ACTIVE',
  priority: 'HIGH',
  startDate: '2024-01-15',
  endDate: '2024-03-15',
  color: '#3b82f6',
  createdAt: '2024-01-10',
  updatedAt: '2024-01-20',
  createdBy: { name: 'John Doe' },
  members: [
    { user: { name: 'Alice Johnson', email: 'alice@company.com' }, role: 'ADMIN' },
    { user: { name: 'Bob Smith', email: 'bob@company.com' }, role: 'MEMBER' },
    { user: { name: 'Carol Davis', email: 'carol@company.com' }, role: 'MEMBER' }
  ],
  tasks: [
    { id: '1', title: 'Design homepage layout', status: 'DONE', priority: 'HIGH', assignee: { name: 'Alice' } },
    { id: '2', title: 'Implement responsive design', status: 'IN_PROGRESS', priority: 'MEDIUM', assignee: { name: 'Bob' } },
    { id: '3', title: 'Create component library', status: 'TODO', priority: 'HIGH', assignee: { name: 'Carol' } },
    { id: '4', title: 'Write documentation', status: 'TODO', priority: 'LOW', assignee: { name: 'Alice' } },
    { id: '5', title: 'Performance optimization', status: 'IN_REVIEW', priority: 'MEDIUM', assignee: { name: 'Bob' } }
  ],
  _count: { tasks: 5 }
}

export default function CleanUIDemoPage() {
  const [selectedApproach, setSelectedApproach] = useState<'current' | 'minimal' | 'zen' | 'focus' | 'zenfocus'>('current')
  const [selectedTheme, setSelectedTheme] = useState<'default' | 'sage' | 'ocean' | 'sunset' | 'mist'>('default')

  const getTaskStatusCount = (status: string) => {
    return mockProject.tasks.filter(task => task.status === status).length
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/projects">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">UI Design Exploration</h1>
              <p className="text-sm text-gray-600">Testing minimalistic approaches for project pages</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Layout:</span>
              <Button 
                variant={selectedApproach === 'current' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedApproach('current')}
              >
                Current
              </Button>
              <Button 
                variant={selectedApproach === 'minimal' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedApproach('minimal')}
              >
                Minimal
              </Button>
              <Button 
                variant={selectedApproach === 'zen' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedApproach('zen')}
              >
                Zen
              </Button>
              <Button 
                variant={selectedApproach === 'focus' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedApproach('focus')}
              >
                Focus
              </Button>
              <Button 
                variant={selectedApproach === 'zenfocus' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedApproach('zenfocus')}
              >
                Zen Focus
              </Button>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Theme:</span>
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
        </div>
      </div>

      <div className="p-6">
        {selectedApproach === 'current' && <CurrentApproach project={mockProject} theme={selectedTheme} />}
        {selectedApproach === 'minimal' && <MinimalApproach project={mockProject} theme={selectedTheme} />}
        {selectedApproach === 'zen' && <ZenApproach project={mockProject} theme={selectedTheme} />}
        {selectedApproach === 'focus' && <FocusApproach project={mockProject} theme={selectedTheme} />}
        {selectedApproach === 'zenfocus' && <ZenFocusApproach project={mockProject} theme={selectedTheme} />}
      </div>
    </div>
  )
}

// Color theme system
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

// Current Approach (reproduction of existing design)
function CurrentApproach({ project, theme }: { project: any, theme: string }) {
  const colors = colorThemes[theme as keyof typeof colorThemes]
  return (
    <div className="space-y-6" style={{ backgroundColor: colors.background }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div>
            <div className="flex items-center space-x-3">
              <div 
                className="w-4 h-4 rounded-full" 
                style={{ backgroundColor: colors.primary }}
              />
              <h1 className="text-3xl font-bold" style={{ color: colors.text }}>{project.name}</h1>
            </div>
            <p className="mt-1" style={{ color: colors.textSecondary }}>
              {project.description || 'No description'}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
          <Button variant="outline" size="icon">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="grid gap-4 lg:grid-cols-4">
        {/* Main Content - Takes up 3/4 of the width */}
        <div className="lg:col-span-3 space-y-3">
          {/* Tasks */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Project Tasks</h3>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Task
                  </Button>
                  <Button variant="outline" size="sm">
                    <Maximize2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium">To Do</h4>
                    <Badge variant="outline" className="text-xs">2</Badge>
                  </div>
                  <div className="space-y-2">
                    {project.tasks.filter((t: any) => t.status === 'TODO').map((task: any) => (
                      <Card key={task.id} className="p-3">
                        <div className="space-y-1">
                          <p className="text-sm font-medium">{task.title}</p>
                          <div className="flex items-center justify-between">
                            <Badge className="bg-yellow-100 text-yellow-800 text-xs">{task.priority}</Badge>
                            <span className="text-xs text-gray-500">{task.assignee.name}</span>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium">In Progress</h4>
                    <Badge variant="outline" className="text-xs">1</Badge>
                  </div>
                  <div className="space-y-2">
                    {project.tasks.filter((t: any) => t.status === 'IN_PROGRESS').map((task: any) => (
                      <Card key={task.id} className="p-3">
                        <div className="space-y-1">
                          <p className="text-sm font-medium">{task.title}</p>
                          <div className="flex items-center justify-between">
                            <Badge className="bg-orange-100 text-orange-800 text-xs">{task.priority}</Badge>
                            <span className="text-xs text-gray-500">{task.assignee.name}</span>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium">Review</h4>
                    <Badge variant="outline" className="text-xs">1</Badge>
                  </div>
                  <div className="space-y-2">
                    {project.tasks.filter((t: any) => t.status === 'IN_REVIEW').map((task: any) => (
                      <Card key={task.id} className="p-3">
                        <div className="space-y-1">
                          <p className="text-sm font-medium">{task.title}</p>
                          <div className="flex items-center justify-between">
                            <Badge className="bg-blue-100 text-blue-800 text-xs">{task.priority}</Badge>
                            <span className="text-xs text-gray-500">{task.assignee.name}</span>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium">Done</h4>
                    <Badge variant="outline" className="text-xs">1</Badge>
                  </div>
                  <div className="space-y-2">
                    {project.tasks.filter((t: any) => t.status === 'DONE').map((task: any) => (
                      <Card key={task.id} className="p-3">
                        <div className="space-y-1">
                          <p className="text-sm font-medium">{task.title}</p>
                          <div className="flex items-center justify-between">
                            <Badge className="bg-green-100 text-green-800 text-xs">{task.priority}</Badge>
                            <span className="text-xs text-gray-500">{task.assignee.name}</span>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Documentation */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Documentation
                  </h3>
                  <p className="text-sm text-gray-600">Project documentation and wiki pages</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm">
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button variant="outline" size="sm">
                    <Maximize2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50">
                <div className="flex flex-col items-center">
                  <div className="p-3 bg-gray-100 rounded-full mb-3">
                    <FileText className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    No Page Selected
                  </h3>
                  <p className="text-gray-500 mb-4 max-w-md text-sm">
                    Select a wiki page to display project documentation inline.
                  </p>
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                    <FileText className="h-4 w-4 mr-2" />
                    Select Page
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Project Info Sidebar - Takes up 1/4 of the width */}
        <div className="space-y-3">
          {/* Project Status & Stats */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <h3 className="text-sm font-semibold">Project Status</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">Status</span>
                  <Badge className="bg-green-100 text-green-800 text-xs">ACTIVE</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">Priority</span>
                  <Badge className="bg-orange-100 text-orange-800 text-xs">HIGH</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">Timeline</span>
                  <div className="flex items-center text-xs text-gray-500">
                    <Calendar className="mr-1 h-3 w-3" />
                    Jan 15 - Mar 15
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Task Statistics */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <h3 className="text-sm font-semibold">Task Statistics</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1">
                    <Target className="h-3 w-3 text-gray-400" />
                    <span className="text-xs font-medium">Total</span>
                  </div>
                  <span className="text-lg font-bold">5</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1">
                    <CheckCircle className="h-3 w-3 text-green-600" />
                    <span className="text-xs font-medium">Done</span>
                  </div>
                  <span className="text-lg font-bold text-green-600">1</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1">
                    <TrendingUp className="h-3 w-3 text-blue-600" />
                    <span className="text-xs font-medium">Progress</span>
                  </div>
                  <span className="text-lg font-bold text-blue-600">1</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1">
                    <Clock className="h-3 w-3 text-yellow-600" />
                    <span className="text-xs font-medium">To Do</span>
                  </div>
                  <span className="text-lg font-bold text-yellow-600">2</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Team Members */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Team</h3>
                <Badge variant="outline" className="text-xs">3</Badge>
              </div>
              <div className="space-y-2">
                {project.members.map((member: any) => (
                  <div key={member.user.email} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center">
                        <User className="h-3 w-3" />
                      </div>
                      <div>
                        <p className="font-medium text-xs">{member.user.name}</p>
                        <p className="text-xs text-gray-500">{member.user.email}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">{member.role}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Project Information */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <h3 className="text-sm font-semibold">Project Info</h3>
              <div className="space-y-2">
                <div>
                  <label className="text-xs font-medium text-gray-500">Created by</label>
                  <p className="text-xs">{project.createdBy.name}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Created on</label>
                  <p className="text-xs">{formatDate(project.createdAt)}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Last updated</label>
                  <p className="text-xs">{formatDate(project.updatedAt)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

// Minimal Approach - Clean, reduced elements
function MinimalApproach({ project, theme }: { project: any, theme: string }) {
  const colors = colorThemes[theme as keyof typeof colorThemes]
  return (
    <div className="max-w-6xl mx-auto space-y-8" style={{ backgroundColor: colors.background }}>
      {/* Simplified Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-3 mb-2">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: colors.primary }}
            />
            <h1 className="text-2xl font-semibold" style={{ color: colors.text }}>{project.name}</h1>
          </div>
          <p style={{ color: colors.textSecondary }}>{project.description}</p>
        </div>
        <Button variant="outline" size="sm">
          <Edit className="h-4 w-4 mr-2" />
          Edit
        </Button>
      </div>

      {/* Single Column Layout */}
      <div className="space-y-6">
        {/* Tasks - Simplified Kanban */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-medium text-gray-900">Tasks</h2>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Task
              </Button>
            </div>
            <div className="grid grid-cols-4 gap-6">
              {['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'].map((status) => (
                <div key={status} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-gray-700 capitalize">
                      {status.replace('_', ' ').toLowerCase()}
                    </h3>
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                      {project.tasks.filter((t: any) => t.status === status).length}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {project.tasks.filter((t: any) => t.status === status).map((task: any) => (
                      <div key={task.id} className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-sm transition-shadow">
                        <p className="text-sm text-gray-900 mb-2">{task.title}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">{task.assignee.name}</span>
                          <div className={`w-2 h-2 rounded-full ${
                            task.priority === 'HIGH' ? 'bg-red-400' :
                            task.priority === 'MEDIUM' ? 'bg-yellow-400' : 'bg-green-400'
                          }`} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Project Overview - Single Card */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-8">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-2xl font-semibold text-gray-900 mb-1">5</div>
                <div className="text-sm text-gray-600">Total Tasks</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-semibold text-green-600 mb-1">1</div>
                <div className="text-sm text-gray-600">Completed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-semibold text-blue-600 mb-1">3</div>
                <div className="text-sm text-gray-600">Team Members</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-semibold text-gray-900 mb-1">60%</div>
                <div className="text-sm text-gray-600">Progress</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Team - Simplified */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-8">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Team</h2>
            <div className="flex items-center space-x-4">
              {project.members.map((member: any) => (
                <div key={member.user.email} className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                    <User className="h-4 w-4 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{member.user.name}</p>
                    <p className="text-xs text-gray-500">{member.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// Zen Approach - Ultra minimal, lots of whitespace
function ZenApproach({ project, theme }: { project: any, theme: string }) {
  const colors = colorThemes[theme as keyof typeof colorThemes]
  return (
    <div className="max-w-4xl mx-auto space-y-12" style={{ backgroundColor: colors.background }}>
      {/* Ultra Simple Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center space-x-3">
          <div 
            className="w-2 h-2 rounded-full" 
            style={{ backgroundColor: colors.primary }}
          />
          <h1 className="text-3xl font-light" style={{ color: colors.text }}>{project.name}</h1>
        </div>
        <p className="text-lg max-w-2xl mx-auto" style={{ color: colors.textSecondary }}>{project.description}</p>
        <div className="flex items-center justify-center space-x-6 text-sm" style={{ color: colors.textSecondary }}>
          <span>Active</span>
          <span>•</span>
          <span>High Priority</span>
          <span>•</span>
          <span>Jan 15 - Mar 15</span>
        </div>
      </div>

      {/* Tasks - Ultra Clean */}
      <div className="space-y-8">
        <div className="text-center">
          <h2 className="text-xl font-light text-gray-900 mb-8">Tasks</h2>
        </div>
        <div className="grid grid-cols-4 gap-8">
          {['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'].map((status) => (
            <div key={status} className="space-y-4">
              <div className="text-center">
                <h3 className="text-sm font-medium text-gray-700 mb-2 capitalize">
                  {status.replace('_', ' ').toLowerCase()}
                </h3>
                <div className="w-8 h-0.5 bg-gray-300 mx-auto"></div>
              </div>
              <div className="space-y-3">
                {project.tasks.filter((t: any) => t.status === status).map((task: any) => (
                  <div key={task.id} className="bg-white border border-gray-100 rounded-lg p-4 hover:border-gray-200 transition-colors">
                    <p className="text-sm text-gray-900 mb-3">{task.title}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">{task.assignee.name}</span>
                      <div className={`w-1.5 h-1.5 rounded-full ${
                        task.priority === 'HIGH' ? 'bg-red-400' :
                        task.priority === 'MEDIUM' ? 'bg-yellow-400' : 'bg-green-400'
                      }`} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Team - Minimal */}
      <div className="text-center space-y-6">
        <h2 className="text-xl font-light text-gray-900">Team</h2>
        <div className="flex items-center justify-center space-x-8">
          {project.members.map((member: any) => (
            <div key={member.user.email} className="text-center">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <User className="h-5 w-5 text-gray-600" />
              </div>
              <p className="text-sm text-gray-900">{member.user.name}</p>
              <p className="text-xs text-gray-500">{member.role}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Progress - Visual */}
      <div className="text-center space-y-6">
        <h2 className="text-xl font-light" style={{ color: colors.text }}>Progress</h2>
        <div className="max-w-md mx-auto">
          <div className="w-full rounded-full h-2" style={{ backgroundColor: colors.border }}>
            <div className="h-2 rounded-full" style={{ backgroundColor: colors.primary, width: '60%' }}></div>
          </div>
          <p className="text-sm mt-2" style={{ color: colors.textSecondary }}>1 of 5 tasks completed</p>
        </div>
      </div>
    </div>
  )
}

// Focus Approach - Task-centric, minimal distractions
function FocusApproach({ project, theme }: { project: any, theme: string }) {
  const colors = colorThemes[theme as keyof typeof colorThemes]
  return (
    <div className="max-w-5xl mx-auto" style={{ backgroundColor: colors.background }}>
      {/* Focused Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <div 
            className="w-3 h-3 rounded-full" 
            style={{ backgroundColor: colors.primary }}
          />
          <div>
            <h1 className="text-xl font-semibold" style={{ color: colors.text }}>{project.name}</h1>
            <p className="text-sm" style={{ color: colors.textSecondary }}>{project.description}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2 text-sm" style={{ color: colors.textSecondary }}>
          <span>5 tasks</span>
          <span>•</span>
          <span>3 members</span>
          <span>•</span>
          <span>60% complete</span>
        </div>
      </div>

      {/* Main Task Board */}
      <div className="rounded-lg overflow-hidden" style={{ backgroundColor: colors.surface, borderColor: colors.border, borderWidth: '1px' }}>
        <div className="grid grid-cols-4">
          {['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'].map((status) => (
            <div key={status} className="border-r last:border-r-0" style={{ borderColor: colors.border }}>
              <div className="px-4 py-3 border-b" style={{ backgroundColor: colors.borderLight, borderColor: colors.border }}>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium capitalize" style={{ color: colors.textSecondary }}>
                    {status.replace('_', ' ').toLowerCase()}
                  </h3>
                  <span className="text-xs rounded-full px-2 py-1" style={{ color: colors.textSecondary, backgroundColor: colors.surface }}>
                    {project.tasks.filter((t: any) => t.status === status).length}
                  </span>
                </div>
              </div>
              <div className="p-4 space-y-3 min-h-[400px]">
                {project.tasks.filter((t: any) => t.status === status).map((task: any) => (
                  <div key={task.id} className="rounded-lg p-3 hover:shadow-sm transition-shadow cursor-pointer" style={{ backgroundColor: colors.surface, borderColor: colors.border, borderWidth: '1px' }}>
                    <p className="text-sm mb-2" style={{ color: colors.text }}>{task.title}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs" style={{ color: colors.textSecondary }}>{task.assignee.name}</span>
                      <div className={`w-2 h-2 rounded-full ${
                        task.priority === 'HIGH' ? 'bg-red-400' :
                        task.priority === 'MEDIUM' ? 'bg-yellow-400' : 'bg-green-400'
                      }`} />
                    </div>
                  </div>
                ))}
                {project.tasks.filter((t: any) => t.status === status).length === 0 && (
                  <div className="text-center py-8" style={{ color: colors.textSecondary }}>
                    <div className="w-8 h-8 border-2 border-dashed rounded-lg mx-auto mb-2 flex items-center justify-center" style={{ borderColor: colors.border }}>
                      <Plus className="h-4 w-4" />
                    </div>
                    <p className="text-xs">Add task</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-6 flex items-center justify-center space-x-4">
        <Button variant="outline" size="sm">
          <Users className="h-4 w-4 mr-2" />
          Team
        </Button>
        <Button variant="outline" size="sm">
          <FileText className="h-4 w-4 mr-2" />
          Docs
        </Button>
        <Button variant="outline" size="sm">
          <TrendingUp className="h-4 w-4 mr-2" />
          Analytics
        </Button>
      </div>
    </div>
  )
}

// Zen Focus Approach - Best of both worlds
function ZenFocusApproach({ project, theme }: { project: any, theme: string }) {
  const colors = colorThemes[theme as keyof typeof colorThemes]
  return (
    <div className="max-w-6xl mx-auto space-y-12" style={{ backgroundColor: colors.background }}>
      {/* Zen-style Header - Clean and centered */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center space-x-3">
          <div 
            className="w-2 h-2 rounded-full" 
            style={{ backgroundColor: colors.primary }}
          />
          <h1 className="text-3xl font-light" style={{ color: colors.text }}>{project.name}</h1>
        </div>
        <p className="text-lg max-w-2xl mx-auto" style={{ color: colors.textSecondary }}>{project.description}</p>
        <div className="flex items-center justify-center space-x-6 text-sm" style={{ color: colors.textSecondary }}>
          <span>Active</span>
          <span>•</span>
          <span>High Priority</span>
          <span>•</span>
          <span>Jan 15 - Mar 15</span>
        </div>
      </div>

      {/* Focus-style Kanban Board - Task-centric */}
      <div className="rounded-lg overflow-hidden" style={{ backgroundColor: colors.surface, borderColor: colors.border, borderWidth: '1px' }}>
        <div className="grid grid-cols-4">
          {['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'].map((status) => (
            <div key={status} className="border-r last:border-r-0" style={{ borderColor: colors.border }}>
              <div className="px-4 py-3 border-b" style={{ backgroundColor: colors.borderLight, borderColor: colors.border }}>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium capitalize" style={{ color: colors.textSecondary }}>
                    {status.replace('_', ' ').toLowerCase()}
                  </h3>
                  <span className="text-xs rounded-full px-2 py-1" style={{ color: colors.textSecondary, backgroundColor: colors.surface }}>
                    {project.tasks.filter((t: any) => t.status === status).length}
                  </span>
                </div>
              </div>
              <div className="p-4 space-y-3 min-h-[400px]">
                {project.tasks.filter((t: any) => t.status === status).map((task: any) => (
                  <div key={task.id} className="rounded-lg p-3 hover:shadow-sm transition-shadow cursor-pointer" style={{ backgroundColor: colors.surface, borderColor: colors.border, borderWidth: '1px' }}>
                    <p className="text-sm mb-2" style={{ color: colors.text }}>{task.title}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs" style={{ color: colors.textSecondary }}>{task.assignee.name}</span>
                      <div className={`w-2 h-2 rounded-full ${
                        task.priority === 'HIGH' ? 'bg-red-400' :
                        task.priority === 'MEDIUM' ? 'bg-yellow-400' : 'bg-green-400'
                      }`} />
                    </div>
                  </div>
                ))}
                {project.tasks.filter((t: any) => t.status === status).length === 0 && (
                  <div className="text-center py-8" style={{ color: colors.textSecondary }}>
                    <div className="w-8 h-8 border-2 border-dashed rounded-lg mx-auto mb-2 flex items-center justify-center" style={{ borderColor: colors.border }}>
                      <Plus className="h-4 w-4" />
                    </div>
                    <p className="text-xs">Add task</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Zen-style Team Overview - Clean and minimal */}
      <div className="text-center space-y-6">
        <h2 className="text-xl font-light" style={{ color: colors.text }}>Team</h2>
        <div className="flex items-center justify-center space-x-8">
          {project.members.map((member: any) => (
            <div key={member.user.email} className="text-center">
              <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2" style={{ backgroundColor: colors.borderLight }}>
                <User className="h-5 w-5" style={{ color: colors.textSecondary }} />
              </div>
              <p className="text-sm" style={{ color: colors.text }}>{member.user.name}</p>
              <p className="text-xs" style={{ color: colors.textSecondary }}>{member.role}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Zen-style Progress Bar - Visual and clean */}
      <div className="text-center space-y-6">
        <h2 className="text-xl font-light" style={{ color: colors.text }}>Progress</h2>
        <div className="max-w-md mx-auto">
          <div className="w-full rounded-full h-2" style={{ backgroundColor: colors.border }}>
            <div className="h-2 rounded-full" style={{ backgroundColor: colors.primary, width: '60%' }}></div>
          </div>
          <p className="text-sm mt-2" style={{ color: colors.textSecondary }}>1 of 5 tasks completed</p>
        </div>
      </div>

      {/* Quick Actions - Subtle and minimal */}
      <div className="flex items-center justify-center space-x-4">
        <Button variant="outline" size="sm" className="opacity-60 hover:opacity-100">
          <Users className="h-4 w-4 mr-2" />
          Team
        </Button>
        <Button variant="outline" size="sm" className="opacity-60 hover:opacity-100">
          <FileText className="h-4 w-4 mr-2" />
          Docs
        </Button>
        <Button variant="outline" size="sm" className="opacity-60 hover:opacity-100">
          <TrendingUp className="h-4 w-4 mr-2" />
          Analytics
        </Button>
      </div>
    </div>
  )
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}