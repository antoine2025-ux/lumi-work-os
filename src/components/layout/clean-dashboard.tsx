'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Bell, Search, Plus, Filter, MoreHorizontal, CheckCircle, Clock, AlertCircle } from 'lucide-react'
import { PresenceIndicator } from '@/components/realtime/presence-indicator'
import { NotificationBell } from '@/components/realtime/notification-toast'
import { cn } from '@/lib/utils'

interface Task {
  id: string
  title: string
  assignee: {
    id: string
    name: string
    avatar?: string
  }
  dueDate: string
  priority: 'high' | 'medium' | 'low'
  status: 'todo' | 'in_progress' | 'done'
  description?: string
}

interface Project {
  id: string
  name: string
  description: string
  tasks: Task[]
  activeUsers: number
}

interface CleanDashboardProps {
  project: Project
  onTaskUpdate?: (taskId: string, updates: Partial<Task>) => void
  onTaskCreate?: (task: Omit<Task, 'id'>) => void
}

export function CleanDashboard({ project, onTaskUpdate, onTaskCreate }: CleanDashboardProps) {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')

  const filteredTasks = project.tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = filterStatus === 'all' || task.status === filterStatus
    return matchesSearch && matchesStatus
  })

  const tasksByStatus = filteredTasks.reduce((acc, task) => {
    if (!acc[task.status]) acc[task.status] = []
    acc[task.status].push(task)
    return acc
  }, {} as Record<string, Task[]>)

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low': return 'bg-green-100 text-green-800 border-green-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'done': return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'in_progress': return <Clock className="h-4 w-4 text-blue-500" />
      case 'todo': return <AlertCircle className="h-4 w-4 text-gray-400" />
      default: return null
    }
  }

  const TaskCard = ({ task }: { task: Task }) => (
    <Card 
      className={cn(
        "cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5",
        selectedTask?.id === task.id && "ring-2 ring-blue-500 shadow-md"
      )}
      onClick={() => setSelectedTask(task)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <h3 className="font-medium text-gray-900 text-sm leading-tight">{task.title}</h3>
          <Badge className={cn("text-xs", getPriorityColor(task.priority))}>
            {task.priority}
          </Badge>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Avatar className="h-6 w-6">
              <AvatarImage src={task.assignee.avatar} />
              <AvatarFallback className="text-xs">
                {task.assignee.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-gray-600">{task.assignee.name}</span>
          </div>
          
          <div className="flex items-center space-x-2">
            {getStatusIcon(task.status)}
            <span className="text-xs text-gray-500">{task.dueDate}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )

  const StatusColumn = ({ status, tasks, title }: { status: string; tasks: Task[]; title: string }) => (
    <div className="flex flex-col space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-700 text-sm">{title}</h3>
        <Badge variant="secondary" className="text-xs">
          {tasks.length}
        </Badge>
      </div>
      
      <div className="space-y-3 min-h-[400px]">
        {tasks.map(task => (
          <TaskCard key={task.id} task={task} />
        ))}
        
        {tasks.length === 0 && (
          <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
            No tasks in this status
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <h1 className="text-xl font-semibold text-gray-900">🌟 Loopwell Work OS</h1>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <PresenceIndicator projectId={project.id} />
            <NotificationBell />
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              New Task
            </Button>
            <Avatar className="h-8 w-8">
              <AvatarImage src="/placeholder-avatar.jpg" />
              <AvatarFallback>AM</AvatarFallback>
            </Avatar>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-gray-200 min-h-screen">
          <nav className="p-4 space-y-2">
            <Button variant="ghost" className="w-full justify-start">
              📁 Projects
            </Button>
            <Button variant="ghost" className="w-full justify-start">
              📚 Wiki
            </Button>
            <Button variant="ghost" className="w-full justify-start">
              🤖 AI Assistant
            </Button>
            <Button variant="ghost" className="w-full justify-start">
              ⚙️ Settings
            </Button>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{project.name}</h2>
                <p className="text-gray-600">{project.description}</p>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500">👥 {project.activeUsers} online</span>
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  Filter
                </Button>
              </div>
            </div>
          </div>

          {/* Kanban Board */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <StatusColumn 
              status="todo" 
              tasks={tasksByStatus.todo || []} 
              title="To Do" 
            />
            <StatusColumn 
              status="in_progress" 
              tasks={tasksByStatus.in_progress || []} 
              title="In Progress" 
            />
            <StatusColumn 
              status="done" 
              tasks={tasksByStatus.done || []} 
              title="Done" 
            />
          </div>
        </main>

        {/* Task Details Sidebar */}
        {selectedTask && (
          <aside className="w-80 bg-white border-l border-gray-200 min-h-screen p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Task Details</h3>
              <Button variant="ghost" size="sm" onClick={() => setSelectedTask(null)}>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">{selectedTask.title}</h4>
                <p className="text-sm text-gray-600">{selectedTask.description || 'No description provided'}</p>
              </div>
              
              <div className="flex items-center space-x-2">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={selectedTask.assignee.avatar} />
                  <AvatarFallback className="text-xs">
                    {selectedTask.assignee.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm text-gray-600">{selectedTask.assignee.name}</span>
              </div>
              
              <div className="flex items-center space-x-2">
                {getStatusIcon(selectedTask.status)}
                <span className="text-sm text-gray-600">Due: {selectedTask.dueDate}</span>
              </div>
              
              <Badge className={cn("text-xs", getPriorityColor(selectedTask.priority))}>
                {selectedTask.priority} priority
              </Badge>
            </div>
          </aside>
        )}
      </div>
    </div>
  )
}
