"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { 
  CheckSquare, 
  Calendar,
  User,
  MessageSquare,
  MoreHorizontal,
  Plus,
  Filter,
  Search,
  ChevronDown,
  Edit,
  Maximize2,
  Minimize2,
  Link as LinkIcon
} from "lucide-react"
import Link from "next/link"
import { TaskEditDialog } from "./task-edit-dialog"
import { DependencyManager } from "./dependency-manager"

interface Task {
  id: string
  title: string
  description: string
  status: 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'BLOCKED'
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  assigneeId?: string
  assignee?: {
    id: string
    name: string
    email: string
  }
  dueDate?: string
  tags: string[]
  dependsOn: string[]
  blocks: string[]
  createdAt: string
  updatedAt: string
  createdBy: {
    id: string
    name: string
    email: string
  }
  project: {
    id: string
    name: string
    color: string
  }
  _count: {
    subtasks: number
    comments: number
  }
}

interface TaskListProps {
  projectId: string
  workspaceId?: string
  isFullscreen?: boolean
  onToggleFullscreen?: () => void
}

const statusOptions = [
  { value: 'TODO', label: 'To Do', color: 'bg-gray-100 text-gray-800' },
  { value: 'IN_PROGRESS', label: 'In Progress', color: 'bg-blue-100 text-blue-800' },
  { value: 'IN_REVIEW', label: 'In Review', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'DONE', label: 'Done', color: 'bg-green-100 text-green-800' },
  { value: 'BLOCKED', label: 'Blocked', color: 'bg-red-100 text-red-800' }
]

const priorityOptions = [
  { value: 'LOW', label: 'Low', color: 'bg-green-100 text-green-800' },
  { value: 'MEDIUM', label: 'Medium', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'HIGH', label: 'High', color: 'bg-orange-100 text-orange-800' },
  { value: 'URGENT', label: 'Urgent', color: 'bg-red-100 text-red-800' }
]

export default function TaskList({ projectId, workspaceId, isFullscreen = false, onToggleFullscreen }: TaskListProps) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [updatingTasks, setUpdatingTasks] = useState<Set<string>>(new Set())
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [dependencyTaskId, setDependencyTaskId] = useState<string | null>(null)
  const [isDependencyManagerOpen, setIsDependencyManagerOpen] = useState(false)

  useEffect(() => {
    loadTasks()
  }, [projectId, workspaceId, filter])

  const loadTasks = async () => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams({
        projectId,
        workspaceId
      })
      
      if (filter !== 'all') {
        params.append('status', filter)
      }

      const response = await fetch(`/api/tasks?${params}`)
      if (response.ok) {
        const data = await response.json()
        setTasks(data)
      }
    } catch (error) {
      console.error('Error loading tasks:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const updateTaskStatus = async (taskId: string, newStatus: string) => {
    try {
      setUpdatingTasks(prev => new Set(prev).add(taskId))
      
      // Check if task has unmet dependencies before allowing status change
      const task = tasks.find(t => t.id === taskId)
      if (task && task.dependsOn.length > 0 && newStatus !== 'TODO') {
        // Check if all dependencies are completed
        const dependencyTasks = tasks.filter(t => task.dependsOn.includes(t.id))
        const unmetDependencies = dependencyTasks.filter(dep => dep.status !== 'DONE')
        
        if (unmetDependencies.length > 0) {
          alert(`Cannot move task to ${newStatus.toLowerCase()}. The following dependencies must be completed first:\n${unmetDependencies.map(dep => `• ${dep.title}`).join('\n')}`)
          return
        }
      }
      
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      })

      if (response.ok) {
        // Update the task in the local state immediately for better UX
        setTasks(prevTasks => 
          prevTasks.map(task => 
            task.id === taskId ? { ...task, status: newStatus as any } : task
          )
        )
      } else {
        console.error('Failed to update task status')
        // Reload tasks to get the correct state
        loadTasks()
      }
    } catch (error) {
      console.error('Error updating task status:', error)
      // Reload tasks to get the correct state
      loadTasks()
    } finally {
      setUpdatingTasks(prev => {
        const newSet = new Set(prev)
        newSet.delete(taskId)
        return newSet
      })
    }
  }

  const handleEditTask = (task: Task) => {
    setEditingTask(task)
    setIsEditDialogOpen(true)
  }

  const handleTaskUpdate = (updatedTask: Task) => {
    setTasks(prevTasks => 
      prevTasks.map(task => 
        task.id === updatedTask.id ? updatedTask : task
      )
    )
    setEditingTask(null)
    setIsEditDialogOpen(false)
  }

  const handleCloseEditDialog = () => {
    setEditingTask(null)
    setIsEditDialogOpen(false)
  }

  const getStatusOption = (status: string) => {
    return statusOptions.find(option => option.value === status) || statusOptions[0]
  }

  const getPriorityOption = (priority: string) => {
    return priorityOptions.find(option => option.value === priority) || priorityOptions[1]
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = date.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays < 0) {
      return `Overdue by ${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? 's' : ''}`
    } else if (diffDays === 0) {
      return 'Due today'
    } else if (diffDays === 1) {
      return 'Due tomorrow'
    } else {
      return `Due in ${diffDays} days`
    }
  }

  const openDependencyManager = (taskId: string) => {
    setDependencyTaskId(taskId)
    setIsDependencyManagerOpen(true)
  }

  const closeDependencyManager = () => {
    setIsDependencyManagerOpen(false)
    setDependencyTaskId(null)
  }

  const handleDependenciesUpdated = () => {
    loadTasks() // Reload tasks to get updated dependency info
  }

  const filteredTasks = tasks.filter(task => {
    if (searchQuery) {
      return task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
             task.description?.toLowerCase().includes(searchQuery.toLowerCase())
    }
    return true
  })

  const groupedTasks = filteredTasks.reduce((acc, task) => {
    if (!acc[task.status]) {
      acc[task.status] = []
    }
    acc[task.status].push(task)
    return acc
  }, {} as Record<string, Task[]>)

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Tasks</h2>
          <p className="text-muted-foreground">
            {tasks.length} task{tasks.length !== 1 ? 's' : ''} total
          </p>
        </div>
        <div className="flex items-center gap-2">
          {onToggleFullscreen && (
            <Button variant="outline" onClick={onToggleFullscreen}>
              {isFullscreen ? (
                <>
                  <Minimize2 className="h-4 w-4 mr-2" />
                  Exit Fullscreen
                </>
              ) : (
                <>
                  <Maximize2 className="h-4 w-4 mr-2" />
                  Fullscreen
                </>
              )}
            </Button>
          )}
          <Button asChild>
            <Link href={`/projects/${projectId}/tasks/new`}>
              <Plus className="h-4 w-4 mr-2" />
              New Task
            </Link>
          </Button>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="all">All Tasks</option>
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Task Columns */}
      <div className={`grid gap-4 ${isFullscreen ? 'grid-cols-5 min-w-max' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-5'}`}>
        {statusOptions.map((statusOption) => {
          const statusTasks = groupedTasks[statusOption.value] || []
          return (
            <div key={statusOption.value} className={`space-y-3 ${isFullscreen ? 'min-w-[280px]' : ''}`}>
              <div className="flex items-center gap-2">
                <h3 className="font-medium text-sm text-muted-foreground">
                  {statusOption.label}
                </h3>
                <Badge className={statusOption.color}>
                  {statusTasks.length}
                </Badge>
              </div>
              <div className="space-y-2">
                {statusTasks.map((task) => (
                  <Card key={task.id} className="cursor-pointer hover:shadow-md transition-shadow">
                    <Link href={`/projects/${projectId}/tasks/${task.id}`}>
                      <CardContent className="p-4">
                      <div className="space-y-3 min-h-[120px]">
                        <div className="flex items-start justify-between">
                          <h4 className="font-medium text-sm line-clamp-2">
                            {task.title}
                          </h4>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={(e) => e.preventDefault()}
                                disabled={updatingTasks.has(task.id)}
                              >
                                {updatingTasks.has(task.id) ? (
                                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
                                ) : (
                                  <MoreHorizontal className="h-4 w-4" />
                                )}
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  handleEditTask(task)
                                }}
                                className="flex items-center space-x-2"
                              >
                                <Edit className="h-4 w-4" />
                                <span>Edit Task</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  openDependencyManager(task.id)
                                }}
                                className="flex items-center space-x-2"
                              >
                                <LinkIcon className="h-4 w-4" />
                                <span>Manage Dependencies</span>
                              </DropdownMenuItem>
                              <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                                Change Status
                              </div>
                              {statusOptions.map((statusOption) => (
                                <DropdownMenuItem
                                  key={statusOption.value}
                                  onClick={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    updateTaskStatus(task.id, statusOption.value)
                                  }}
                                  disabled={task.status === statusOption.value || updatingTasks.has(task.id)}
                                  className="flex items-center space-x-2"
                                >
                                  <Badge className={statusOption.color}>
                                    {statusOption.label}
                                  </Badge>
                                  {task.status === statusOption.value && (
                                    <span className="text-xs text-muted-foreground">(current)</span>
                                  )}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        {task.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {task.description}
                          </p>
                        )}

                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Badge className={getPriorityOption(task.priority).color}>
                              {getPriorityOption(task.priority).label}
                            </Badge>
                          </div>
                          {task.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {task.tags.slice(0, 3).map((tag, index) => (
                                <Badge key={index} variant="outline" className="text-xs px-2 py-1">
                                  {tag}
                                </Badge>
                              ))}
                              {task.tags.length > 3 && (
                                <Badge variant="outline" className="text-xs px-2 py-1">
                                  +{task.tags.length - 3}
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>

                        {task.assignee && (
                          <div className="flex items-center space-x-2">
                            <User className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              {task.assignee.name}
                            </span>
                          </div>
                        )}

                        {task.dueDate && (
                          <div className="flex items-center space-x-2">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              {formatDate(task.dueDate)}
                            </span>
                          </div>
                        )}

                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <div className="flex items-center space-x-2">
                            {task._count.subtasks > 0 && (
                              <span>{task._count.subtasks} subtasks</span>
                            )}
                            {task._count.comments > 0 && (
                              <div className="flex items-center space-x-1">
                                <MessageSquare className="h-3 w-3" />
                                <span>{task._count.comments}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                    </Link>
                  </Card>
                ))}
                {statusTasks.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No {statusOption.label.toLowerCase()} tasks
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Task Edit Dialog */}
      <TaskEditDialog
        isOpen={isEditDialogOpen}
        onClose={handleCloseEditDialog}
        task={editingTask}
        onSave={handleTaskUpdate}
      />

      {/* Dependency Manager */}
      {dependencyTaskId && (
        <DependencyManager
          taskId={dependencyTaskId}
          projectId={projectId}
          isOpen={isDependencyManagerOpen}
          onClose={closeDependencyManager}
          onDependenciesUpdated={handleDependenciesUpdated}
        />
      )}
    </div>
  )
}

