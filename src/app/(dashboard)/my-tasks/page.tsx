"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { 
  CheckSquare, 
  Calendar,
  User,
  MessageSquare,
  Clock,
  Filter,
  Search,
  ChevronDown,
  Edit,
  Link as LinkIcon,
  Target,
  AlertCircle,
  Loader2
} from "lucide-react"
import Link from "next/link"
import { TaskEditDialog } from "@/components/tasks/task-edit-dialog"

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
  epic?: {
    id: string
    title: string
    color: string
  }
  milestone?: {
    id: string
    title: string
  }
  points?: number
  customFields?: Array<{
    id: string
    value: any
    field: {
      id: string
      label: string
      type: string
    }
  }>
  _count: {
    subtasks: number
    comments: number
  }
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

export default function MyTasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [dueFilter, setDueFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [updatingTasks, setUpdatingTasks] = useState<Set<string>>(new Set())
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)

  useEffect(() => {
    loadMyTasks()
  }, [statusFilter, priorityFilter, dueFilter])

  const loadMyTasks = async () => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams()
      
      if (statusFilter !== 'all') {
        params.append('status', statusFilter)
      }
      if (priorityFilter !== 'all') {
        params.append('priority', priorityFilter)
      }
      if (dueFilter !== 'all') {
        params.append('due', dueFilter)
      }

      const response = await fetch(`/api/my-tasks?${params}`)
      if (response.ok) {
        const data = await response.json()
        setTasks(data)
      }
    } catch (error) {
      console.error('Error loading my tasks:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const updateTaskStatus = async (taskId: string, newStatus: string) => {
    try {
      setUpdatingTasks(prev => new Set(prev).add(taskId))
      
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      })

      if (response.ok) {
        setTasks(prevTasks => 
          prevTasks.map(task => 
            task.id === taskId ? { ...task, status: newStatus as any } : task
          )
        )
      } else {
        console.error('Failed to update task status')
        loadMyTasks()
      }
    } catch (error) {
      console.error('Error updating task status:', error)
      loadMyTasks()
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

  const isOverdue = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    return date < now && date.toDateString() !== now.toDateString()
  }

  const isDueSoon = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = date.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays >= 0 && diffDays <= 3
  }

  const filteredTasks = tasks.filter(task => {
    if (searchQuery) {
      return task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
             task.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
             task.project.name.toLowerCase().includes(searchQuery.toLowerCase())
    }
    return true
  })

  const getTaskStats = () => {
    const total = tasks.length
    const completed = tasks.filter(t => t.status === 'DONE').length
    const inProgress = tasks.filter(t => t.status === 'IN_PROGRESS').length
    const overdue = tasks.filter(t => t.dueDate && isOverdue(t.dueDate)).length
    const dueSoon = tasks.filter(t => t.dueDate && isDueSoon(t.dueDate) && t.status !== 'DONE').length

    return { total, completed, inProgress, overdue, dueSoon }
  }

  const stats = getTaskStats()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your tasks...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
              <User className="h-4 w-4 text-primary-foreground" />
            </div>
            <h1 className="text-3xl font-bold">My Tasks</h1>
          </div>
          <p className="text-muted-foreground">
            All tasks assigned to you across all projects
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Target className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Total Tasks</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <CheckSquare className="h-4 w-4 text-green-600" />
                <div>
                  <p className="text-sm font-medium">Completed</p>
                  <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-blue-600" />
                <div>
                  <p className="text-sm font-medium">In Progress</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.inProgress}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <div>
                  <p className="text-sm font-medium">Overdue</p>
                  <p className="text-2xl font-bold text-red-600">{stats.overdue}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-orange-600" />
                <div>
                  <p className="text-sm font-medium">Due Soon</p>
                  <p className="text-2xl font-bold text-orange-600">{stats.dueSoon}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search tasks..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    {statusOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priority</SelectItem>
                    {priorityOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select value={dueFilter} onValueChange={setDueFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Due Date" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Dates</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                    <SelectItem value="due-soon">Due Soon</SelectItem>
                    <SelectItem value="this-week">This Week</SelectItem>
                    <SelectItem value="this-month">This Month</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tasks List */}
        <div className="space-y-4">
          {filteredTasks.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">No tasks found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery || statusFilter !== 'all' || priorityFilter !== 'all' || dueFilter !== 'all'
                    ? 'Try adjusting your filters to see more tasks.'
                    : 'You don\'t have any tasks assigned to you yet.'
                  }
                </p>
                <Button asChild>
                  <Link href="/projects">
                    Browse Projects
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            filteredTasks.map((task) => (
              <Card key={task.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-medium text-lg line-clamp-1">
                          {task.title}
                        </h3>
                        <Badge className={getStatusOption(task.status).color}>
                          {getStatusOption(task.status).label}
                        </Badge>
                        <Badge className={getPriorityOption(task.priority).color}>
                          {getPriorityOption(task.priority).label}
                        </Badge>
                        {task.points && (
                          <Badge variant="outline">
                            {task.points}p
                          </Badge>
                        )}
                      </div>
                      
                      {task.description && (
                        <p className="text-muted-foreground mb-3 line-clamp-2">
                          {task.description}
                        </p>
                      )}
                      
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: task.project.color }}
                          />
                          <span>{task.project.name}</span>
                        </div>
                        
                        {task.epic && (
                          <div className="flex items-center gap-1">
                            <div 
                              className="w-2 h-2 rounded-full" 
                              style={{ backgroundColor: task.epic.color }}
                            />
                            <span>{task.epic.title}</span>
                          </div>
                        )}
                        
                        {task.milestone && (
                          <div className="flex items-center gap-1">
                            <Target className="h-3 w-3" />
                            <span>{task.milestone.title}</span>
                          </div>
                        )}
                        
                        {task.dueDate && (
                          <div className={`flex items-center gap-1 ${
                            isOverdue(task.dueDate) ? 'text-red-600' : 
                            isDueSoon(task.dueDate) ? 'text-orange-600' : ''
                          }`}>
                            <Calendar className="h-3 w-3" />
                            <span>{formatDate(task.dueDate)}</span>
                          </div>
                        )}
                        
                        {task._count.comments > 0 && (
                          <div className="flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" />
                            <span>{task._count.comments}</span>
                          </div>
                        )}
                      </div>
                      
                      {task.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-3">
                          {task.tags.slice(0, 5).map((tag, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {task.tags.length > 5 && (
                            <Badge variant="outline" className="text-xs">
                              +{task.tags.length - 5}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditTask(task)}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                      >
                        <Link href={`/projects/${task.project.id}`}>
                          <LinkIcon className="h-4 w-4 mr-1" />
                          View Project
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Task Edit Dialog */}
        <TaskEditDialog
          isOpen={isEditDialogOpen}
          onClose={handleCloseEditDialog}
          task={editingTask}
          onSave={handleTaskUpdate}
        />
      </div>
    </div>
  )
}
