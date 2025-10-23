"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { 
  ArrowLeft, 
  CheckSquare, 
  Calendar,
  Users,
  AlertCircle,
  CheckCircle,
  Loader2,
  Plus,
  X,
  Tag
} from "lucide-react"
import Link from "next/link"

interface TaskFormData {
  title: string
  description: string
  status: 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'BLOCKED'
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  assigneeId: string
  dueDate: string
  tags: string[]
  dependsOn: string[]
  epicId?: string // Add epicId field
  milestoneId?: string // Add milestoneId field
  points?: number // Add points field
  subtasks: Array<{
    title: string
    description: string
    assigneeId: string
    dueDate: string
  }>
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

export default function NewTaskPage() {
  const router = useRouter()
  const params = useParams()
  const projectId = params?.id as string
  
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [users, setUsers] = useState<Array<{id: string, name: string, email: string}>>([])
  const [project, setProject] = useState<{id: string, name: string, color: string} | null>(null)
  const [availableTasks, setAvailableTasks] = useState<Array<{id: string, title: string, status: string}>>([])
  const [epics, setEpics] = useState<Array<{id: string, title: string, color?: string}>>([])
  const [milestones, setMilestones] = useState<Array<{id: string, title: string, startDate?: string, endDate?: string}>>([])
  const [newTag, setNewTag] = useState('')
  
  // Get initial values from URL parameters
  const getInitialStatus = () => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const status = urlParams.get('status')
      if (status && ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'BLOCKED'].includes(status)) {
        return status as 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'BLOCKED'
      }
    }
    return 'TODO'
  }
  
  const getInitialEpicId = () => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      return urlParams.get('epicId') || undefined
    }
    return undefined
  }
  
  const getInitialMilestoneId = () => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      return urlParams.get('milestoneId') || undefined
    }
    return undefined
  }
  
  const [formData, setFormData] = useState<TaskFormData>({
    title: '',
    description: '',
    status: getInitialStatus(),
    priority: 'MEDIUM',
    assigneeId: '',
    dueDate: '',
    tags: [],
    dependsOn: [],
    epicId: getInitialEpicId(),
    milestoneId: getInitialMilestoneId(),
    points: undefined,
    subtasks: []
  })

  // Load users and project data on component mount
  useEffect(() => {
    if (!projectId) return
    
    const loadData = async () => {
      try {
        // Load users from API
        const usersResponse = await fetch('/api/users')
        if (usersResponse.ok) {
          const usersData = await usersResponse.json()
          setUsers(usersData)
        } else {
          // Fallback to empty users if API fails
          setUsers([])
          console.warn('Failed to load users from API')
        }

        // Load project data
        const projectResponse = await fetch(`/api/projects/${projectId}`)
        if (projectResponse.ok) {
          const projectData = await projectResponse.json()
          setProject(projectData)
        }

        // Load available tasks for dependencies
        const tasksResponse = await fetch(`/api/tasks?projectId=${projectId}&workspaceId=workspace-1`)
        if (tasksResponse.ok) {
          const tasksData = await tasksResponse.json()
          setAvailableTasks(tasksData.map((task: any) => ({
            id: task.id,
            title: task.title,
            status: task.status
          })))
        }

        // Load epics
        const epicsResponse = await fetch(`/api/projects/${projectId}/epics`)
        if (epicsResponse.ok) {
          const epicsData = await epicsResponse.json()
          setEpics(epicsData)
        }

        // Load milestones
        const milestonesResponse = await fetch(`/api/projects/${projectId}/milestones`)
        if (milestonesResponse.ok) {
          const milestonesData = await milestonesResponse.json()
          setMilestones(milestonesData)
        }
      } catch (error) {
        console.error('Error loading data:', error)
      }
    }

    loadData()
  }, [projectId])

  if (!projectId) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Error</h1>
          <p className="text-muted-foreground mb-4">Invalid project ID</p>
          <Button asChild>
            <Link href="/projects">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Projects
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.title.trim()) {
      newErrors.title = 'Task title is required'
    }

    if (formData.dueDate && new Date(formData.dueDate) < new Date()) {
      newErrors.dueDate = 'Due date cannot be in the past'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setIsLoading(true)
    setErrors({})

    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          projectId,
          workspaceId: 'workspace-1'
        }),
      })

      if (response.ok) {
        const task = await response.json()
        router.push(`/projects/${projectId}/tasks/${task.id}`)
      } else {
        const errorData = await response.json()
        setErrors({ submit: errorData.message || 'Failed to create task' })
      }
    } catch (error) {
      console.error('Error creating task:', error)
      setErrors({ submit: 'An unexpected error occurred' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (field: keyof TaskFormData, value: string | string[] | number | undefined) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }))
      setNewTag('')
    }
  }

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }))
  }

  const addSubtask = () => {
    setFormData(prev => ({
      ...prev,
      subtasks: [...prev.subtasks, {
        title: '',
        description: '',
        assigneeId: '',
        dueDate: ''
      }]
    }))
  }

  const updateSubtask = (index: number, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      subtasks: prev.subtasks.map((subtask, i) => 
        i === index ? { ...subtask, [field]: value } : subtask
      )
    }))
  }

  const removeSubtask = (index: number) => {
    setFormData(prev => ({
      ...prev,
      subtasks: prev.subtasks.filter((_, i) => i !== index)
    }))
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center space-x-4 mb-6">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/projects/${projectId}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold flex items-center space-x-2">
            <CheckSquare className="h-8 w-8 text-primary" />
            <span>New Task</span>
          </h1>
          <p className="text-muted-foreground">
            {project ? `Add a new task to ${project.name}` : 'Create a new task'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Task Details</CardTitle>
              <CardDescription>
                Essential information about the task
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Task Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="Enter task title"
                  className={errors.title ? 'border-red-500' : ''}
                />
                {errors.title && (
                  <p className="text-sm text-red-500 flex items-center space-x-1">
                    <AlertCircle className="h-4 w-4" />
                    <span>{errors.title}</span>
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Describe what needs to be done"
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label>Tags</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {formData.tags.map((tag, index) => (
                    <Badge key={index} variant="secondary" className="flex items-center space-x-1">
                      <Tag className="h-3 w-3" />
                      <span>{tag}</span>
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="ml-1 hover:text-red-500"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex space-x-2">
                  <Input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="Add a tag"
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  />
                  <Button type="button" onClick={addTag} size="sm">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Task Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Task Settings</CardTitle>
              <CardDescription>
                Configure status, priority, and assignment
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select 
                    value={formData.status} 
                    onValueChange={(value) => handleInputChange('status', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <div className="flex items-center space-x-2">
                            <Badge className={option.color}>
                              {option.label}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Select 
                    value={formData.priority} 
                    onValueChange={(value) => handleInputChange('priority', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {priorityOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <div className="flex items-center space-x-2">
                            <Badge className={option.color}>
                              {option.label}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="assignee">Assignee</Label>
                <Select 
                  value={formData.assigneeId} 
                  onValueChange={(value) => handleInputChange('assigneeId', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select assignee" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <span>{user.name}</span>
                          <span className="text-sm text-muted-foreground">({user.email})</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dueDate">Due Date</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="dueDate"
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => handleInputChange('dueDate', e.target.value)}
                    className={`pl-10 ${errors.dueDate ? 'border-red-500' : ''}`}
                  />
                </div>
                {errors.dueDate && (
                  <p className="text-sm text-red-500 flex items-center space-x-1">
                    <AlertCircle className="h-4 w-4" />
                    <span>{errors.dueDate}</span>
                  </p>
                )}
              </div>

              {/* Epic and Milestone Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="epic">Epic</Label>
                  <Select 
                    value={formData.epicId || 'none'} 
                    onValueChange={(value) => handleInputChange('epicId', value === 'none' ? undefined : value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select epic (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">
                        <span className="text-muted-foreground">No Epic</span>
                      </SelectItem>
                      {epics.map((epic) => (
                        <SelectItem key={epic.id} value={epic.id}>
                          <div className="flex items-center space-x-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: epic.color || '#3B82F6' }}
                            ></div>
                            <span>{epic.title}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="milestone">Milestone</Label>
                  <Select 
                    value={formData.milestoneId || 'none'} 
                    onValueChange={(value) => handleInputChange('milestoneId', value === 'none' ? undefined : value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select milestone (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">
                        <span className="text-muted-foreground">No Milestone</span>
                      </SelectItem>
                      {milestones.map((milestone) => (
                        <SelectItem key={milestone.id} value={milestone.id}>
                          <div className="flex items-center space-x-2">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            <span>{milestone.title}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Story Points */}
              <div className="space-y-2">
                <Label htmlFor="points">Story Points</Label>
                <Input
                  id="points"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.points || ''}
                  onChange={(e) => handleInputChange('points', e.target.value ? parseInt(e.target.value) : undefined)}
                  placeholder="Enter story points (optional)"
                />
              </div>
                <div className="space-y-2">
                  {formData.dependsOn.map((taskId, index) => {
                    const task = availableTasks.find(t => t.id === taskId)
                    return (
                      <div key={taskId} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-blue-400 rounded-full" />
                          <span className="text-sm">{task?.title || 'Unknown Task'}</span>
                          <Badge variant="outline" className="text-xs">
                            {task?.status || 'Unknown'}
                          </Badge>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const newDependsOn = formData.dependsOn.filter(id => id !== taskId)
                            setFormData(prev => ({ ...prev, dependsOn: newDependsOn }))
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )
                  })}
                  
                  {availableTasks.length > 0 && (
                    <Select
                      value=""
                      onValueChange={(taskId) => {
                        if (taskId && !formData.dependsOn.includes(taskId)) {
                          setFormData(prev => ({
                            ...prev,
                            dependsOn: [...prev.dependsOn, taskId]
                          }))
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select task to depend on..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableTasks
                          .filter(task => !formData.dependsOn.includes(task.id))
                          .map((task) => (
                            <SelectItem key={task.id} value={task.id}>
                              <div className="flex items-center space-x-2">
                                <div className="w-2 h-2 bg-blue-400 rounded-full" />
                                <span>{task.title}</span>
                                <Badge variant="outline" className="text-xs">
                                  {task.status}
                                </Badge>
                              </div>
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  )}
                  
                  {availableTasks.length === 0 && (
                    <p className="text-sm text-gray-500">No other tasks available for dependencies</p>
                  )}
                </div>
            </CardContent>
          </Card>
        </div>

        {/* Subtasks */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Subtasks</span>
              <Button type="button" onClick={addSubtask} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Subtask
              </Button>
            </CardTitle>
            <CardDescription>
              Break down the task into smaller, manageable pieces
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {formData.subtasks.map((subtask, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Subtask {index + 1}</h4>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeSubtask(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input
                      value={subtask.title}
                      onChange={(e) => updateSubtask(index, 'title', e.target.value)}
                      placeholder="Subtask title"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Assignee</Label>
                    <Select 
                      value={subtask.assigneeId} 
                      onValueChange={(value) => updateSubtask(index, 'assigneeId', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select assignee" />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={subtask.description}
                    onChange={(e) => updateSubtask(index, 'description', e.target.value)}
                    placeholder="Subtask description"
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Due Date</Label>
                  <Input
                    type="date"
                    value={subtask.dueDate}
                    onChange={(e) => updateSubtask(index, 'dueDate', e.target.value)}
                  />
                </div>
              </div>
            ))}
            {formData.subtasks.length === 0 && (
              <p className="text-muted-foreground text-center py-8">
                No subtasks added yet. Click &quot;Add Subtask&quot; to get started.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Error Message */}
        {errors.submit && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2 text-red-700">
                <AlertCircle className="h-5 w-5" />
                <span>{errors.submit}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end space-x-4">
          <Button variant="outline" asChild>
            <Link href={`/projects/${projectId}`}>Cancel</Link>
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Create Task
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}


