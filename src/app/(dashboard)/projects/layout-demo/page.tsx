"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { 
  ArrowLeft, 
  Target, 
  Calendar,
  Users,
  Clock,
  CheckCircle,
  AlertCircle,
  User,
  TrendingUp,
  BarChart3,
  Activity,
  Zap,
  Eye,
  Focus,
  Sparkles,
  FileText,
  Settings,
  Filter,
  Bell,
  Command,
  MoreHorizontal,
  Plus,
  Tag,
  X,
  Bookmark
} from "lucide-react"
import Link from "next/link"
import { KanbanBoard } from "@/components/kanban/kanban-board"
import { useTheme } from "@/components/theme-provider"
import FabAddTask from "@/components/projects/fab-add-task"
import TaskDrawer from "@/components/projects/task-drawer"

// Mock data for demo
const mockProject = {
  id: "demo-project",
  name: "Product Launch",
  description: "Complete product launch process from planning to post-launch support",
  status: 'ACTIVE' as const,
  priority: 'HIGH' as const,
  color: '#f59e0b',
  createdAt: '2024-01-15',
  updatedAt: '2024-01-20',
  createdBy: {
    id: "1",
    name: "John Doe",
    email: "john@example.com"
  },
  members: [
    { id: "1", role: 'OWNER' as const, user: { id: "1", name: "John Doe", email: "john@example.com" } },
    { id: "2", role: 'MEMBER' as const, user: { id: "2", name: "Jane Smith", email: "jane@example.com" } },
    { id: "3", role: 'MEMBER' as const, user: { id: "3", name: "Mike Johnson", email: "mike@example.com" } }
  ],
  tasks: [
    { 
      id: "1", 
      title: "Market Research", 
      description: "Conduct comprehensive market analysis and competitor research to identify opportunities and threats in the target market.",
      status: 'TODO' as const, 
      priority: 'HIGH' as const, 
      dueDate: '2024-02-01', 
      assignee: { id: "1", name: "John Doe" },
      tags: ['research', 'analysis', 'high-priority'],
      createdAt: '2024-01-15T09:00:00Z',
      updatedAt: '2024-01-20T14:30:00Z'
    },
    { 
      id: "2", 
      title: "Design Mockups", 
      description: "Create high-fidelity mockups for the main user interface components and user flows.",
      status: 'IN_PROGRESS' as const, 
      priority: 'MEDIUM' as const, 
      dueDate: '2024-02-05', 
      assignee: { id: "2", name: "Jane Smith" },
      tags: ['design', 'ui', 'mockups'],
      createdAt: '2024-01-16T10:00:00Z',
      updatedAt: '2024-01-21T16:45:00Z'
    },
    { 
      id: "3", 
      title: "User Testing", 
      description: "Conduct usability testing sessions with target users to validate design decisions and identify improvement areas.",
      status: 'IN_REVIEW' as const, 
      priority: 'HIGH' as const, 
      dueDate: '2024-02-10', 
      assignee: { id: "2", name: "Jane Smith" },
      tags: ['testing', 'usability', 'validation'],
      createdAt: '2024-01-17T11:00:00Z',
      updatedAt: '2024-01-22T09:15:00Z'
    },
    { 
      id: "4", 
      title: "Launch Strategy", 
      description: "Develop comprehensive go-to-market strategy including pricing, positioning, and marketing channels.",
      status: 'DONE' as const, 
      priority: 'URGENT' as const, 
      dueDate: '2024-01-25', 
      assignee: { id: "1", name: "John Doe" },
      tags: ['strategy', 'marketing', 'launch'],
      createdAt: '2024-01-10T08:00:00Z',
      updatedAt: '2024-01-25T17:00:00Z'
    },
    { 
      id: "5", 
      title: "Legal Review", 
      description: "Review all legal requirements, terms of service, privacy policy, and compliance documentation.",
      status: 'BLOCKED' as const, 
      priority: 'MEDIUM' as const, 
      dueDate: '2024-02-15', 
      assignee: { id: "3", name: "Mike Johnson" },
      tags: ['legal', 'compliance', 'review'],
      createdAt: '2024-01-18T13:00:00Z',
      updatedAt: '2024-01-23T11:30:00Z'
    }
  ],
  _count: {
    tasks: 5
  }
}

const getTaskStatusCount = (status: string) => {
  return mockProject.tasks.filter(task => task.status === status).length
}

const getMemberTasks = (memberId: string) => {
  return mockProject.tasks.filter(task => task.assignee?.id === memberId)
}

export default function ProjectLayoutDemo() {
  const { theme } = useTheme()
  const [selectedLayout, setSelectedLayout] = useState<'minimal' | 'dashboard' | 'focused' | 'zen' | 'combined'>('combined')
  const [statusExpanded, setStatusExpanded] = useState(false)
  const [teamExpanded, setTeamExpanded] = useState(false)
  const [selectedMember, setSelectedMember] = useState<typeof mockProject.members[0] | null>(null)
  const [showMemberTasks, setShowMemberTasks] = useState(false)
  const [selectedTask, setSelectedTask] = useState<typeof mockProject.tasks[0] | null>(null)
  const [showTaskDrawer, setShowTaskDrawer] = useState(false)
  const [kanbanExpanded, setKanbanExpanded] = useState(false)
  const [showKanbanOptions, setShowKanbanOptions] = useState(false)
  const [showSavedViews, setShowSavedViews] = useState(false)
  const [showCommandPalette, setShowCommandPalette] = useState(false)
  const [showFilterPopover, setShowFilterPopover] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showMoreMenu, setShowMoreMenu] = useState(false)
  const [activeFilters, setActiveFilters] = useState<{[key: string]: string}>({})

  const colors = {
    background: theme === 'dark' ? '#0a0a0a' : '#ffffff',
    surface: theme === 'dark' ? '#111111' : '#f8fafc',
    surfaceElevated: theme === 'dark' ? '#1a1a1a' : '#ffffff',
    text: theme === 'dark' ? '#ffffff' : '#0f172a',
    textSecondary: theme === 'dark' ? '#94a3b8' : '#64748b',
    textMuted: theme === 'dark' ? '#64748b' : '#94a3b8',
    border: theme === 'dark' ? '#1e293b' : '#e2e8f0',
    borderLight: theme === 'dark' ? '#334155' : '#f1f5f9',
    primary: '#3b82f6',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444'
  }

  const layouts = {
    minimal: {
      name: "Minimal Zen",
      description: "Ultra-clean with maximum focus on tasks",
      icon: <Focus className="h-5 w-5" />
    },
    dashboard: {
      name: "Dashboard Style",
      description: "Rich information with balanced layout",
      icon: <BarChart3 className="h-5 w-5" />
    },
    focused: {
      name: "Task-Focused",
      description: "Emphasizes task management and progress",
      icon: <Target className="h-5 w-5" />
    },
    zen: {
      name: "Zen Master",
      description: "Perfect balance of information and tranquility",
      icon: <Sparkles className="h-5 w-5" />
    },
    combined: {
      name: "Zen Combined",
      description: "Minimal Zen + Zen Master with expandable status",
      icon: <Zap className="h-5 w-5" />
    }
  }

  const renderMinimalLayout = () => (
    <div className="max-w-6xl mx-auto px-6 py-8">
      {/* Ultra-minimal header */}
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-2">
          <div 
            className="w-2 h-2 rounded-full" 
            style={{ backgroundColor: mockProject.color }}
          />
          <h1 className="text-2xl font-light" style={{ color: colors.text }}>
            {mockProject.name}
          </h1>
        </div>
        <p className="text-sm" style={{ color: colors.textMuted }}>
          {mockProject.description}
        </p>
      </div>

      {/* Single progress indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium" style={{ color: colors.textSecondary }}>
            Progress
          </span>
          <span className="text-sm" style={{ color: colors.textSecondary }}>
            {getTaskStatusCount('DONE')} of {mockProject._count.tasks} tasks
          </span>
        </div>
        <div className="w-full rounded-full h-1" style={{ backgroundColor: colors.border }}>
          <div 
            className="h-1 rounded-full transition-all duration-500" 
            style={{ 
              backgroundColor: colors.primary, 
              width: `${(getTaskStatusCount('DONE') / mockProject._count.tasks) * 100}%` 
            }}
          />
        </div>
      </div>

      {/* Kanban Board - Full Width */}
      <KanbanBoard 
        projectId={mockProject.id}
        tasks={mockProject.tasks}
        onTaskUpdate={() => {}}
        onTaskCreate={() => {}}
        onTaskDelete={() => {}}
      />
    </div>
  )

  const renderDashboardLayout = () => (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Header with inline stats */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-3">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: mockProject.color }}
            />
            <h1 className="text-3xl font-semibold" style={{ color: colors.text }}>
              {mockProject.name}
            </h1>
          </div>
          <p className="text-base leading-relaxed" style={{ color: colors.textSecondary }}>
            {mockProject.description}
          </p>
        </div>
        
        {/* Compact stats grid */}
        <div className="grid grid-cols-2 gap-4 w-80">
          <Card className="border-0 shadow-sm" style={{ backgroundColor: colors.surface }}>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="flex items-center justify-center mb-2">
                  <Users className="h-4 w-4" style={{ color: colors.textSecondary }} />
                </div>
                <p className="text-sm font-medium" style={{ color: colors.text }}>
                  {mockProject.members.length} Members
                </p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-0 shadow-sm" style={{ backgroundColor: colors.surface }}>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="flex items-center justify-center mb-2">
                  <Activity className="h-4 w-4" style={{ color: colors.textSecondary }} />
                </div>
                <p className="text-sm font-medium" style={{ color: colors.text }}>
                  {mockProject.status}
                </p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-0 shadow-sm" style={{ backgroundColor: colors.surface }}>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="flex items-center justify-center mb-2">
                  <TrendingUp className="h-4 w-4" style={{ color: colors.textSecondary }} />
                </div>
                <p className="text-sm font-medium" style={{ color: colors.text }}>
                  {Math.round((getTaskStatusCount('DONE') / mockProject._count.tasks) * 100)}%
                </p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-0 shadow-sm" style={{ backgroundColor: colors.surface }}>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="flex items-center justify-center mb-2">
                  <Clock className="h-4 w-4" style={{ color: colors.textSecondary }} />
                </div>
                <p className="text-sm font-medium" style={{ color: colors.text }}>
                  {mockProject._count.tasks} Tasks
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Kanban Board */}
      <KanbanBoard 
        projectId={mockProject.id}
        tasks={mockProject.tasks}
        onTaskUpdate={() => {}}
        onTaskCreate={() => {}}
        onTaskDelete={() => {}}
      />
    </div>
  )

  const renderFocusedLayout = () => (
    <div className="max-w-6xl mx-auto px-6 py-8">
      {/* Focused header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: mockProject.color }}
            />
            <h1 className="text-2xl font-semibold" style={{ color: colors.text }}>
              {mockProject.name}
            </h1>
          </div>
          
          {/* Key metrics */}
          <div className="flex items-center space-x-6">
            <div className="text-center">
              <p className="text-lg font-bold" style={{ color: colors.primary }}>
                {getTaskStatusCount('DONE')}
              </p>
              <p className="text-xs" style={{ color: colors.textSecondary }}>Completed</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold" style={{ color: colors.warning }}>
                {getTaskStatusCount('IN_PROGRESS')}
              </p>
              <p className="text-xs" style={{ color: colors.textSecondary }}>Active</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold" style={{ color: colors.textSecondary }}>
                {mockProject._count.tasks}
              </p>
              <p className="text-xs" style={{ color: colors.textSecondary }}>Total</p>
            </div>
          </div>
        </div>
        
        <p className="text-sm" style={{ color: colors.textSecondary }}>
          {mockProject.description}
        </p>
      </div>

      {/* Progress bar */}
      <div className="mb-8">
        <div className="w-full rounded-full h-2" style={{ backgroundColor: colors.border }}>
          <div 
            className="h-2 rounded-full transition-all duration-500" 
            style={{ 
              backgroundColor: colors.primary, 
              width: `${(getTaskStatusCount('DONE') / mockProject._count.tasks) * 100}%` 
            }}
          />
        </div>
      </div>

      {/* Kanban Board */}
      <KanbanBoard 
        projectId={mockProject.id}
        tasks={mockProject.tasks}
        onTaskUpdate={() => {}}
        onTaskCreate={() => {}}
        onTaskDelete={() => {}}
      />
    </div>
  )

  const renderZenLayout = () => (
    <div className="max-w-5xl mx-auto px-6 py-8">
      {/* Zen header */}
      <div className="mb-12">
        <div className="flex items-center space-x-4 mb-4">
          <div 
            className="w-4 h-4 rounded-full" 
            style={{ backgroundColor: mockProject.color }}
          />
          <h1 className="text-2xl font-light" style={{ color: colors.text }}>
            {mockProject.name}
          </h1>
        </div>
        <p className="text-base leading-relaxed max-w-2xl" style={{ color: colors.textSecondary }}>
          {mockProject.description}
        </p>
      </div>

      {/* Zen stats - horizontal */}
      <div className="mb-12">
        <div className="flex items-center justify-center space-x-12">
          <div className="text-center">
            <div className="w-12 h-12 rounded-full flex items-center justify-center mb-2" style={{ backgroundColor: colors.surface }}>
              <CheckCircle className="h-6 w-6" style={{ color: colors.success }} />
            </div>
            <p className="text-lg font-medium" style={{ color: colors.text }}>
              {getTaskStatusCount('DONE')}
            </p>
            <p className="text-xs" style={{ color: colors.textSecondary }}>Completed</p>
          </div>
          
          <div className="text-center">
            <div className="w-12 h-12 rounded-full flex items-center justify-center mb-2" style={{ backgroundColor: colors.surface }}>
              <Activity className="h-6 w-6" style={{ color: colors.primary }} />
            </div>
            <p className="text-lg font-medium" style={{ color: colors.text }}>
              {getTaskStatusCount('IN_PROGRESS')}
            </p>
            <p className="text-xs" style={{ color: colors.textSecondary }}>In Progress</p>
          </div>
          
          <div className="text-center">
            <div className="w-12 h-12 rounded-full flex items-center justify-center mb-2" style={{ backgroundColor: colors.surface }}>
              <Users className="h-6 w-6" style={{ color: colors.textSecondary }} />
            </div>
            <p className="text-lg font-medium" style={{ color: colors.text }}>
              {mockProject.members.length}
            </p>
            <p className="text-xs" style={{ color: colors.textSecondary }}>Team Members</p>
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <KanbanBoard 
        projectId={mockProject.id}
        tasks={mockProject.tasks}
        onTaskUpdate={() => {}}
        onTaskCreate={() => {}}
        onTaskDelete={() => {}}
      />
    </div>
  )

  const renderCombinedLayout = () => (
    <div className="max-w-6xl mx-auto px-6 py-2">
      {/* Combined header with progress bar and metrics */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          {/* Left side - Project info */}
          <div className="flex-1">
            <div className="flex items-center space-x-3">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: mockProject.color }}
              />
              <h1 className="text-2xl font-light" style={{ color: colors.text }}>
                {mockProject.name}
              </h1>
            </div>
          </div>

          {/* Right side - All circular buttons aligned with title */}
          <div className="flex items-center space-x-4">
            {/* Team Members - Expandable */}
            <div className="text-center group relative">
            <button
              onClick={() => {
                setTeamExpanded(!teamExpanded)
                setStatusExpanded(false)
                setKanbanExpanded(false)
              }}
              className="w-10 h-10 rounded-full flex items-center justify-center mb-1 transition-all duration-200 hover:scale-105"
              style={{ backgroundColor: teamExpanded ? colors.primary : colors.surface }}
            >
              <Users className="h-5 w-5" style={{ color: teamExpanded ? colors.background : colors.textSecondary }} />
            </button>
              <p className={`text-sm font-medium transition-opacity duration-200 absolute -bottom-6 left-1/2 transform -translate-x-1/2 whitespace-nowrap ${teamExpanded ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} style={{ color: colors.text }}>
                Team
              </p>
              
              {/* Team Members Expansion - Directly below Team button */}
              {teamExpanded && (
                <div className="absolute top-16 left-1/2 transform -translate-x-1/2 flex items-center space-x-4 z-10">
                  {/* John - Left */}
                  <div className="text-center">
                    <button
                      onClick={() => {
                        setSelectedMember(mockProject.members[0])
                        setShowMemberTasks(true)
                      }}
                      className="w-10 h-10 rounded-full flex items-center justify-center mb-2 transition-all duration-200 hover:scale-105"
                      style={{ backgroundColor: colors.surface }}
                    >
                      <User className="h-5 w-5" style={{ color: colors.textSecondary }} />
                    </button>
                    <p className="text-xs font-medium" style={{ color: colors.text }}>
                      John
                    </p>
                    <p className="text-xs" style={{ color: colors.textMuted }}>
                      Owner
                    </p>
                  </div>
                  
                  {/* Jane - Center */}
                  <div className="text-center">
                    <button
                      onClick={() => {
                        setSelectedMember(mockProject.members[1])
                        setShowMemberTasks(true)
                      }}
                      className="w-10 h-10 rounded-full flex items-center justify-center mb-2 transition-all duration-200 hover:scale-105"
                      style={{ backgroundColor: colors.surface }}
                    >
                      <User className="h-5 w-5" style={{ color: colors.textSecondary }} />
                    </button>
                    <p className="text-xs font-medium" style={{ color: colors.text }}>
                      Jane
                    </p>
                    <p className="text-xs" style={{ color: colors.textMuted }}>
                      Member
                    </p>
                  </div>
                  
                  {/* Mike - Right */}
                  <div className="text-center">
                    <button
                      onClick={() => {
                        setSelectedMember(mockProject.members[2])
                        setShowMemberTasks(true)
                      }}
                      className="w-10 h-10 rounded-full flex items-center justify-center mb-2 transition-all duration-200 hover:scale-105"
                      style={{ backgroundColor: colors.surface }}
                    >
                      <User className="h-5 w-5" style={{ color: colors.textSecondary }} />
                    </button>
                    <p className="text-xs font-medium" style={{ color: colors.text }}>
                      Mike
                    </p>
                    <p className="text-xs" style={{ color: colors.textMuted }}>
                      Member
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Status - Expandable */}
            <div className="text-center group relative">
            <button
              onClick={() => {
                setStatusExpanded(!statusExpanded)
                setTeamExpanded(false)
                setKanbanExpanded(false)
              }}
              className="w-10 h-10 rounded-full flex items-center justify-center mb-1 transition-all duration-200 hover:scale-105"
              style={{ backgroundColor: statusExpanded ? colors.primary : colors.surface }}
            >
              <Activity className="h-5 w-5" style={{ color: statusExpanded ? colors.background : colors.textSecondary }} />
            </button>
              <p className={`text-sm font-medium transition-opacity duration-200 absolute -bottom-6 left-1/2 transform -translate-x-1/2 whitespace-nowrap ${statusExpanded ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} style={{ color: colors.text }}>
                Status
              </p>
              
              {/* Status Metrics Expansion - Directly below Status button */}
              {statusExpanded && (
                <div className="absolute top-16 left-1/2 transform -translate-x-1/2 flex items-center space-x-4 z-10">
                  {/* To Do */}
                  <div className="text-center">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center mb-2" style={{ backgroundColor: '#f1f5f9' }}>
                      <span className="text-xs font-medium" style={{ color: '#64748b' }}>
                        {getTaskStatusCount('TODO')}
                      </span>
                    </div>
                    <p className="text-xs font-medium" style={{ color: colors.text }}>
                      To Do
                    </p>
                  </div>
                  
                  {/* In Progress */}
                  <div className="text-center">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center mb-2" style={{ backgroundColor: '#dbeafe' }}>
                      <span className="text-xs font-medium" style={{ color: '#2563eb' }}>
                        {getTaskStatusCount('IN_PROGRESS')}
                      </span>
                    </div>
                    <p className="text-xs font-medium" style={{ color: colors.text }}>
                      In Progress
                    </p>
                  </div>
                  
                  {/* In Review */}
                  <div className="text-center">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center mb-2" style={{ backgroundColor: '#fed7aa' }}>
                      <span className="text-xs font-medium" style={{ color: '#ea580c' }}>
                        {getTaskStatusCount('IN_REVIEW')}
                      </span>
                    </div>
                    <p className="text-xs font-medium" style={{ color: colors.text }}>
                      In Review
                    </p>
                  </div>
                  
                  {/* Done */}
                  <div className="text-center">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center mb-2" style={{ backgroundColor: '#dcfce7' }}>
                      <span className="text-xs font-medium" style={{ color: '#16a34a' }}>
                        {getTaskStatusCount('DONE')}
                      </span>
                    </div>
                    <p className="text-xs font-medium" style={{ color: colors.text }}>
                      Done
                    </p>
                  </div>
                  
                  {/* Blocked */}
                  <div className="text-center">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center mb-2" style={{ backgroundColor: '#fecaca' }}>
                      <span className="text-xs font-medium" style={{ color: '#dc2626' }}>
                        {getTaskStatusCount('BLOCKED')}
                      </span>
                    </div>
                    <p className="text-xs font-medium" style={{ color: colors.text }}>
                      Blocked
                    </p>
                  </div>
                </div>
              )}
            </div>
            {/* Task Drawer Demo */}
            <div className="text-center group relative">
              <button
                onClick={() => {
                  setSelectedTask(mockProject.tasks[0])
                  setShowTaskDrawer(true)
                }}
                className="w-10 h-10 rounded-full flex items-center justify-center mb-1 transition-all duration-200 hover:scale-105"
                style={{ backgroundColor: colors.surface }}
              >
                <FileText className="h-5 w-5" style={{ color: colors.textSecondary }} />
              </button>
              <p className="text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-200 absolute -bottom-6 left-1/2 transform -translate-x-1/2 whitespace-nowrap" style={{ color: colors.text }}>
                Task
              </p>
            </div>

            {/* Kanban Options */}
            <div className="text-center group relative">
            <button
              onClick={() => {
                setKanbanExpanded(!kanbanExpanded)
                setTeamExpanded(false)
                setStatusExpanded(false)
              }}
              className="w-10 h-10 rounded-full flex items-center justify-center mb-1 transition-all duration-200 hover:scale-105"
              style={{ backgroundColor: kanbanExpanded ? colors.primary : colors.surface }}
            >
              <Settings className="h-5 w-5" style={{ color: kanbanExpanded ? colors.background : colors.textSecondary }} />
            </button>
              <p className={`text-sm font-medium transition-opacity duration-200 absolute -bottom-6 left-1/2 transform -translate-x-1/2 whitespace-nowrap ${kanbanExpanded ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} style={{ color: colors.text }}>
                Kanban
              </p>
              
              {/* Kanban Options Expansion - Directly below Kanban button */}
              {kanbanExpanded && (
                <div className="absolute top-16 left-1/2 transform -translate-x-1/2 flex items-center space-x-4 z-10">
                  {/* Options */}
                  <div className="text-center">
                    <button
                      onClick={() => setShowKanbanOptions(true)}
                      className="w-10 h-10 rounded-full flex items-center justify-center mb-2 transition-all duration-200 hover:scale-105"
                      style={{ backgroundColor: colors.surface }}
                    >
                      <Settings className="h-5 w-5" style={{ color: colors.textSecondary }} />
                    </button>
                    <p className="text-xs font-medium" style={{ color: colors.text }}>
                      Options
                    </p>
                  </div>
                  
                  {/* Saved Views */}
                  <div className="text-center">
                    <button
                      onClick={() => setShowSavedViews(true)}
                      className="w-10 h-10 rounded-full flex items-center justify-center mb-2 transition-all duration-200 hover:scale-105"
                      style={{ backgroundColor: colors.surface }}
                    >
                      <Bookmark className="h-5 w-5" style={{ color: colors.textSecondary }} />
                    </button>
                    <p className="text-xs font-medium" style={{ color: colors.text }}>
                      Saved Views
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Filter */}
            <div className="text-center group relative">
              <button
                onClick={() => setShowFilterPopover(true)}
                className="w-10 h-10 rounded-full flex items-center justify-center mb-1 transition-all duration-200 hover:scale-105"
                style={{ backgroundColor: colors.surface }}
              >
                <Filter className="h-5 w-5" style={{ color: colors.textSecondary }} />
              </button>
              <p className="text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-200 absolute -bottom-6 left-1/2 transform -translate-x-1/2 whitespace-nowrap" style={{ color: colors.text }}>
                Filter
              </p>
            </div>

            {/* Notifications */}
            <div className="text-center group relative">
              <button
                onClick={() => setShowNotifications(true)}
                className="w-10 h-10 rounded-full flex items-center justify-center mb-1 transition-all duration-200 hover:scale-105 relative"
                style={{ backgroundColor: colors.surface }}
              >
                <Bell className="h-5 w-5" style={{ color: colors.textSecondary }} />
                <Badge 
                  className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                  style={{ backgroundColor: colors.error, color: 'white' }}
                >
                  2
                </Badge>
              </button>
              <p className="text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-200 absolute -bottom-6 left-1/2 transform -translate-x-1/2 whitespace-nowrap" style={{ color: colors.text }}>
                Notifications
              </p>
            </div>

            {/* More Menu */}
            <div className="text-center group relative">
              <button
                onClick={() => setShowMoreMenu(true)}
                className="w-10 h-10 rounded-full flex items-center justify-center mb-1 transition-all duration-200 hover:scale-105"
                style={{ backgroundColor: colors.surface }}
              >
                <MoreHorizontal className="h-5 w-5" style={{ color: colors.textSecondary }} />
              </button>
              <p className="text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-200 absolute -bottom-6 left-1/2 transform -translate-x-1/2 whitespace-nowrap" style={{ color: colors.text }}>
                More
              </p>
            </div>
          </div>
        </div>

        {/* Project description and progress bar */}
        <div className="mt-1">
          <p className="text-sm mb-2" style={{ color: colors.textMuted }}>
            {mockProject.description}
          </p>
          
          {/* Progress bar */}
          <div className="max-w-md">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium" style={{ color: colors.textSecondary }}>
                Progress
              </span>
              <span className="text-sm" style={{ color: colors.textSecondary }}>
                {getTaskStatusCount('DONE')} of {mockProject._count.tasks} tasks
              </span>
            </div>
            <div className="w-full rounded-full h-2" style={{ backgroundColor: colors.border }}>
              <div 
                className="h-2 rounded-full transition-all duration-500" 
                style={{ 
                  backgroundColor: colors.primary, 
                  width: `${(getTaskStatusCount('DONE') / mockProject._count.tasks) * 100}%` 
                }}
              />
            </div>
          </div>
        </div>

      </div>

      {/* Kanban Board */}
      <KanbanBoard 
        projectId={mockProject.id}
        tasks={mockProject.tasks}
        onTaskUpdate={() => {}}
        onTaskCreate={() => {}}
        onTaskDelete={() => {}}
      />

      {/* Command Palette Floating Button */}
      <button
        onClick={() => setShowCommandPalette(true)}
        className="fixed top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-105 z-50"
        style={{ backgroundColor: colors.primary }}
        title="Command Palette (⌘K)"
      >
        <Command className="h-5 w-5" style={{ color: colors.background }} />
      </button>

      {/* Floating Action Button */}
      <FabAddTask 
        colors={colors}
        onTaskCreate={(task) => console.log('Task created:', task)}
      />
    </div>
  )

  return (
    <div className="min-h-screen" style={{ backgroundColor: colors.background }}>
      {/* Header */}
      <div className="border-b" style={{ backgroundColor: colors.surfaceElevated, borderColor: colors.border }}>
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button asChild variant="ghost" size="sm">
                <Link href="/projects">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Projects
                </Link>
              </Button>
              <h1 className="text-xl font-semibold" style={{ color: colors.text }}>
                Project Layout Demo
              </h1>
            </div>
            
            {/* Layout Selector */}
            <div className="flex items-center space-x-2">
              {Object.entries(layouts).map(([key, layout]) => (
                <Button
                  key={key}
                  variant={selectedLayout === key ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedLayout(key as any)}
                  className="flex items-center space-x-2"
                >
                  {layout.icon}
                  <span>{layout.name}</span>
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Layout Description */}
      <div className="border-b" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center space-x-3">
            {layouts[selectedLayout].icon}
            <div>
              <h2 className="font-medium" style={{ color: colors.text }}>
                {layouts[selectedLayout].name}
              </h2>
              <p className="text-sm" style={{ color: colors.textSecondary }}>
                {layouts[selectedLayout].description}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Render Selected Layout */}
      {selectedLayout === 'minimal' && renderMinimalLayout()}
      {selectedLayout === 'dashboard' && renderDashboardLayout()}
      {selectedLayout === 'focused' && renderFocusedLayout()}
      {selectedLayout === 'zen' && renderZenLayout()}
      {selectedLayout === 'combined' && renderCombinedLayout()}

      {/* Member Tasks Modal */}
      <Dialog open={showMemberTasks} onOpenChange={setShowMemberTasks}>
        <DialogContent className="max-w-2xl" style={{ backgroundColor: colors.surfaceElevated }}>
          <DialogHeader>
            <DialogTitle style={{ color: colors.text }}>
              {selectedMember?.user.name}'s Tasks
            </DialogTitle>
            <DialogDescription style={{ color: colors.textSecondary }}>
              Tasks assigned to {selectedMember?.user.name} in this project
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {selectedMember && getMemberTasks(selectedMember.user.id).length > 0 ? (
              getMemberTasks(selectedMember.user.id).map((task) => (
                <Card key={task.id} className="border-0 shadow-sm" style={{ backgroundColor: colors.surface }}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium" style={{ color: colors.text }}>
                          {task.title}
                        </h4>
                        <div className="flex items-center space-x-4 mt-2">
                          <Badge 
                            variant="outline" 
                            style={{ 
                              color: colors.textSecondary,
                              borderColor: colors.border 
                            }}
                          >
                            {task.status.replace('_', ' ')}
                          </Badge>
                          <Badge 
                            variant="outline" 
                            style={{ 
                              color: colors.textSecondary,
                              borderColor: colors.border 
                            }}
                          >
                            {task.priority}
                          </Badge>
                          {task.dueDate && (
                            <span className="text-sm" style={{ color: colors.textSecondary }}>
                              Due: {new Date(task.dueDate).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-8">
                <User className="h-12 w-12 mx-auto mb-4" style={{ color: colors.textMuted }} />
                <p className="text-lg font-medium" style={{ color: colors.text }}>
                  No tasks assigned
                </p>
                <p className="text-sm" style={{ color: colors.textSecondary }}>
                  {selectedMember?.user.name} doesn't have any tasks assigned to them yet.
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Task Drawer */}
      <TaskDrawer
        isOpen={showTaskDrawer}
        onClose={() => setShowTaskDrawer(false)}
        task={selectedTask}
        colors={colors}
        onTaskUpdate={(taskId, updates) => console.log('Task updated:', taskId, updates)}
      />

      {/* Kanban Options Modal */}
      <Dialog open={showKanbanOptions} onOpenChange={setShowKanbanOptions}>
        <DialogContent className="max-w-md" style={{ backgroundColor: colors.surfaceElevated }}>
          <DialogHeader>
            <DialogTitle style={{ color: colors.text }}>Kanban Options</DialogTitle>
            <DialogDescription style={{ color: colors.textSecondary }}>
              Customize your Kanban board settings
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium" style={{ color: colors.text }}>
                Column Layout
              </label>
              <div className="mt-2 space-y-2">
                <label className="flex items-center space-x-2">
                  <input type="radio" name="layout" value="default" defaultChecked />
                  <span className="text-sm" style={{ color: colors.text }}>Default (5 columns)</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input type="radio" name="layout" value="custom" />
                  <span className="text-sm" style={{ color: colors.text }}>Custom columns</span>
                </label>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium" style={{ color: colors.text }}>
                Card Density
              </label>
              <div className="mt-2 space-y-2">
                <label className="flex items-center space-x-2">
                  <input type="radio" name="density" value="compact" />
                  <span className="text-sm" style={{ color: colors.text }}>Compact</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input type="radio" name="density" value="comfortable" defaultChecked />
                  <span className="text-sm" style={{ color: colors.text }}>Comfortable</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input type="radio" name="density" value="spacious" />
                  <span className="text-sm" style={{ color: colors.text }}>Spacious</span>
                </label>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium" style={{ color: colors.text }}>
                WIP Limits
              </label>
              <div className="mt-2">
                <label className="flex items-center space-x-2">
                  <input type="checkbox" defaultChecked />
                  <span className="text-sm" style={{ color: colors.text }}>Enable WIP limits</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowKanbanOptions(false)}
                style={{ backgroundColor: colors.surface, borderColor: colors.border }}
              >
                Cancel
              </Button>
              <Button
                onClick={() => setShowKanbanOptions(false)}
                style={{ backgroundColor: colors.primary }}
              >
                Apply Settings
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Saved Views Modal */}
      <Dialog open={showSavedViews} onOpenChange={setShowSavedViews}>
        <DialogContent className="max-w-md" style={{ backgroundColor: colors.surfaceElevated }}>
          <DialogHeader>
            <DialogTitle style={{ color: colors.text }}>Saved Views</DialogTitle>
            <DialogDescription style={{ color: colors.textSecondary }}>
              Choose from your saved Kanban board views
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-2">
            <div className="p-3 rounded-lg border cursor-pointer hover:bg-opacity-50 transition-colors"
                 style={{ backgroundColor: colors.primary + '20', borderColor: colors.border }}>
              <div className="flex items-center justify-between">
                <span className="font-medium" style={{ color: colors.text }}>My Tasks</span>
                <Badge variant="secondary" style={{ backgroundColor: colors.primary + '20', color: colors.primary }}>
                  Default
                </Badge>
              </div>
            </div>
            
            <div className="p-3 rounded-lg border cursor-pointer hover:bg-opacity-50 transition-colors"
                 style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
              <span className="font-medium" style={{ color: colors.text }}>Overdue</span>
            </div>
            
            <div className="p-3 rounded-lg border cursor-pointer hover:bg-opacity-50 transition-colors"
                 style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
              <span className="font-medium" style={{ color: colors.text }}>High Priority</span>
            </div>
            
            <div className="p-3 rounded-lg border cursor-pointer hover:bg-opacity-50 transition-colors"
                 style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
              <span className="font-medium" style={{ color: colors.text }}>In Review</span>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setShowSavedViews(false)}
              style={{ backgroundColor: colors.surface, borderColor: colors.border }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => setShowSavedViews(false)}
              style={{ backgroundColor: colors.primary }}
            >
              Apply View
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Command Palette Modal */}
      <Dialog open={showCommandPalette} onOpenChange={setShowCommandPalette}>
        <DialogContent className="max-w-lg" style={{ backgroundColor: colors.surfaceElevated }}>
          <DialogHeader>
            <DialogTitle style={{ color: colors.text }}>Command Palette</DialogTitle>
            <DialogDescription style={{ color: colors.textSecondary }}>
              Quick actions and navigation (⌘K)
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-2">
            <div className="p-3 rounded-lg border cursor-pointer hover:bg-opacity-50 transition-colors"
                 style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
              <div className="flex items-center space-x-3">
                <Plus className="h-4 w-4" style={{ color: colors.textSecondary }} />
                <span className="font-medium" style={{ color: colors.text }}>Create new task</span>
              </div>
            </div>
            
            <div className="p-3 rounded-lg border cursor-pointer hover:bg-opacity-50 transition-colors"
                 style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-4 w-4" style={{ color: colors.textSecondary }} />
                <span className="font-medium" style={{ color: colors.text }}>Mark task as done</span>
              </div>
            </div>
            
            <div className="p-3 rounded-lg border cursor-pointer hover:bg-opacity-50 transition-colors"
                 style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
              <div className="flex items-center space-x-3">
                <Target className="h-4 w-4" style={{ color: colors.textSecondary }} />
                <span className="font-medium" style={{ color: colors.text }}>Go to To Do column</span>
              </div>
            </div>
            
            <div className="p-3 rounded-lg border cursor-pointer hover:bg-opacity-50 transition-colors"
                 style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
              <div className="flex items-center space-x-3">
                <Clock className="h-4 w-4" style={{ color: colors.textSecondary }} />
                <span className="font-medium" style={{ color: colors.text }}>Go to In Progress column</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setShowCommandPalette(false)}
              style={{ backgroundColor: colors.surface, borderColor: colors.border }}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Filter Popover Modal */}
      <Dialog open={showFilterPopover} onOpenChange={setShowFilterPopover}>
        <DialogContent className="max-w-md" style={{ backgroundColor: colors.surfaceElevated }}>
          <DialogHeader>
            <DialogTitle style={{ color: colors.text }}>Filter Tasks</DialogTitle>
            <DialogDescription style={{ color: colors.textSecondary }}>
              Filter tasks by assignee, status, and due date
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium" style={{ color: colors.text }}>Assignee</label>
              <select 
                className="w-full mt-1 p-2 rounded border"
                style={{ backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }}
                value={activeFilters.assignee || ''}
                onChange={(e) => setActiveFilters({...activeFilters, assignee: e.target.value})}
              >
                <option value="">All assignees</option>
                <option value="john">John Doe</option>
                <option value="jane">Jane Smith</option>
                <option value="mike">Mike Johnson</option>
              </select>
            </div>
            
            <div>
              <label className="text-sm font-medium" style={{ color: colors.text }}>Status</label>
              <select 
                className="w-full mt-1 p-2 rounded border"
                style={{ backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }}
                value={activeFilters.status || ''}
                onChange={(e) => setActiveFilters({...activeFilters, status: e.target.value})}
              >
                <option value="">All statuses</option>
                <option value="TODO">To Do</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="IN_REVIEW">In Review</option>
                <option value="DONE">Done</option>
                <option value="BLOCKED">Blocked</option>
              </select>
            </div>
            
            <div>
              <label className="text-sm font-medium" style={{ color: colors.text }}>Due Date</label>
              <select 
                className="w-full mt-1 p-2 rounded border"
                style={{ backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }}
                value={activeFilters.dueDate || ''}
                onChange={(e) => setActiveFilters({...activeFilters, dueDate: e.target.value})}
              >
                <option value="">All dates</option>
                <option value="overdue">Overdue</option>
                <option value="today">Due today</option>
                <option value="tomorrow">Due tomorrow</option>
                <option value="this-week">This week</option>
              </select>
            </div>
          </div>

          <div className="flex justify-between pt-4">
            <Button
              variant="outline"
              onClick={() => setActiveFilters({})}
              style={{ backgroundColor: colors.surface, borderColor: colors.border }}
            >
              Clear all
            </Button>
            <Button
              onClick={() => setShowFilterPopover(false)}
              style={{ backgroundColor: colors.primary }}
            >
              Apply filters
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Notifications Modal */}
      <Dialog open={showNotifications} onOpenChange={setShowNotifications}>
        <DialogContent className="max-w-md" style={{ backgroundColor: colors.surfaceElevated }}>
          <DialogHeader>
            <DialogTitle style={{ color: colors.text }}>Notifications</DialogTitle>
            <DialogDescription style={{ color: colors.textSecondary }}>
              Stay updated with project activities
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3">
            <div className="p-3 rounded-lg border-l-4"
                 style={{ backgroundColor: colors.surface, borderLeftColor: colors.primary }}>
              <div className="text-sm font-medium" style={{ color: colors.text }}>
                Mentioned in comment
              </div>
              <div className="text-xs mt-1" style={{ color: colors.textSecondary }}>
                John Doe mentioned you in a comment on "Design Mockups"
              </div>
              <div className="text-xs mt-1" style={{ color: colors.textMuted }}>
                {new Date().toLocaleDateString()}
              </div>
            </div>
            
            <div className="p-3 rounded-lg border-l-4"
                 style={{ backgroundColor: colors.surface, borderLeftColor: colors.primary }}>
              <div className="text-sm font-medium" style={{ color: colors.text }}>
                New task assigned
              </div>
              <div className="text-xs mt-1" style={{ color: colors.textSecondary }}>
                You have been assigned to "User Testing" task
              </div>
              <div className="text-xs mt-1" style={{ color: colors.textMuted }}>
                {new Date().toLocaleDateString()}
              </div>
            </div>
            
            <div className="p-3 rounded-lg border-l-4 opacity-60"
                 style={{ backgroundColor: colors.surface, borderLeftColor: colors.border }}>
              <div className="text-sm font-medium" style={{ color: colors.text }}>
                Task due soon
              </div>
              <div className="text-xs mt-1" style={{ color: colors.textSecondary }}>
                Market Research is due tomorrow
              </div>
              <div className="text-xs mt-1" style={{ color: colors.textMuted }}>
                Yesterday
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setShowNotifications(false)}
              style={{ backgroundColor: colors.surface, borderColor: colors.border }}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* More Menu Modal */}
      <Dialog open={showMoreMenu} onOpenChange={setShowMoreMenu}>
        <DialogContent className="max-w-md" style={{ backgroundColor: colors.surfaceElevated }}>
          <DialogHeader>
            <DialogTitle style={{ color: colors.text }}>More Options</DialogTitle>
            <DialogDescription style={{ color: colors.textSecondary }}>
              Additional project actions and settings
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-2">
            <div className="p-3 rounded-lg border cursor-pointer hover:bg-opacity-50 transition-colors"
                 style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
              <span className="font-medium" style={{ color: colors.text }}>Export CSV</span>
            </div>
            
            <div className="p-3 rounded-lg border cursor-pointer hover:bg-opacity-50 transition-colors"
                 style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
              <span className="font-medium" style={{ color: colors.text }}>Project Settings</span>
            </div>
            
            <div className="p-3 rounded-lg border cursor-pointer hover:bg-opacity-50 transition-colors"
                 style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
              <span className="font-medium" style={{ color: colors.text }}>Templates</span>
            </div>
            
            <div className="border-t my-2" style={{ borderColor: colors.border }} />
            
            <div className="p-3 rounded-lg border cursor-pointer hover:bg-opacity-50 transition-colors"
                 style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
              <span className="font-medium" style={{ color: colors.error }}>Delete Project</span>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setShowMoreMenu(false)}
              style={{ backgroundColor: colors.surface, borderColor: colors.border }}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

