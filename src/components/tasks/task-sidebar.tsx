"use client"

import { useState, useEffect } from "react"
import { useTaskSidebarStore } from "@/lib/stores/use-task-sidebar-store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Loader2, User, Calendar, Tag, X, Settings, MessageSquare, History, Plus, AlertCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import { TaskComments } from "./task-comments"

interface User {
  id: string
  name: string
  email: string
}

interface Task {
  id: string
  title: string
  description: string
  status: 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'BLOCKED'
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  assigneeId?: string
  dueDate?: string
  tags: string[]
  createdAt: string
  updatedAt: string
  epicId?: string
  milestoneId?: string
  points?: number
  assignee?: {
    id: string
    name: string
    email: string
  }
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
  customFields?: CustomFieldValue[]
  subtasks?: Array<{
    id: string
    title: string
    description: string | null
    assigneeId: string | null
    dueDate: string | null
  }>
  _count: {
    comments: number
    subtasks: number
  }
}

interface Subtask {
  id?: string
  title: string
  description: string
  assigneeId: string
  dueDate: string
}

interface CustomFieldDef {
  id: string
  projectId: string
  key: string
  label: string
  type: 'text' | 'number' | 'select' | 'date' | 'boolean'
  options?: any
  uniqueKey: string
  createdAt: string
}

interface CustomFieldValue {
  id: string
  value: any
  field: {
    id: string
    label: string
    type: string
  }
}

const statusOptions = [
  { value: 'TODO', label: 'To Do', color: 'bg-muted text-foreground' },
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

export function TaskSidebar() {
  const { isOpen, taskId, close } = useTaskSidebarStore()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingTask, setIsLoadingTask] = useState(false)
  const [task, setTask] = useState<Task | null>(null)
  const [workspaceId, setWorkspaceId] = useState<string | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [epics, setEpics] = useState<Array<{id: string, title: string, color?: string}>>([])
  const [milestones, setMilestones] = useState<Array<{id: string, title: string, startDate?: string, endDate?: string}>>([])
  const [customFieldDefs, setCustomFieldDefs] = useState<CustomFieldDef[]>([])
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, any>>({})
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'TODO' as 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'BLOCKED',
    priority: 'MEDIUM' as 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT',
    assigneeId: '',
    dueDate: '',
    tags: [] as string[],
    epicId: '',
    milestoneId: '',
    points: undefined as number | undefined
  })
  const [newTag, setNewTag] = useState('')
  const [subtasks, setSubtasks] = useState<Subtask[]>([])
  const [subtaskErrors, setSubtaskErrors] = useState<Record<string, string>>({})
  const [activeTab, setActiveTab] = useState<'details' | 'comments' | 'history'>('details')

  // Load workspaceId
  useEffect(() => {
    const fetchWorkspaceId = async () => {
      try {
        const response = await fetch('/api/auth/user-status')
        if (response.ok) {
          const data = await response.json()
          setWorkspaceId(data.workspaceId)
        }
      } catch (error) {
        console.error('Error loading workspace ID:', error)
      }
    }
    if (isOpen) {
      fetchWorkspaceId()
    }
  }, [isOpen])

  // Load task when sidebar opens
  useEffect(() => {
    if (isOpen && taskId) {
      loadTask()
    } else {
      setTask(null)
    }
  }, [isOpen, taskId])

  // Load users, epics, milestones, custom fields when task is loaded
  useEffect(() => {
    if (task && workspaceId) {
      loadUsers()
      loadCustomFields()
      loadEpics()
      loadMilestones()
    }
  }, [task, workspaceId])

  // Update form data when task changes
  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title,
        description: task.description || '',
        status: task.status,
        priority: task.priority,
        assigneeId: task.assigneeId || 'none',
        dueDate: task.dueDate ? task.dueDate.split('T')[0] : '',
        tags: task.tags || [],
        epicId: task.epicId || 'none',
        milestoneId: task.milestoneId || 'none',
        points: task.points || undefined
      })

      // Initialize custom field values
      const initialValues: Record<string, any> = {}
      if (task.customFields) {
        task.customFields.forEach(cf => {
          // Support both fieldId (from API) and field.id (from interface)
          const fieldId = (cf as any).fieldId || cf.field.id
          initialValues[fieldId] = cf.value
        })
      }
      setCustomFieldValues(initialValues)

      // Initialize subtasks
      if (task.subtasks && task.subtasks.length > 0) {
        setSubtasks(task.subtasks.map(st => ({
          id: st.id,
          title: st.title,
          description: st.description || '',
          assigneeId: st.assigneeId || '',
          dueDate: st.dueDate ? st.dueDate.split('T')[0] : ''
        })))
      } else {
        setSubtasks([])
      }
    }
  }, [task])

  const loadTask = async () => {
    if (!taskId) return
    try {
      setIsLoadingTask(true)
      const response = await fetch(`/api/tasks/${taskId}`)
      if (response.ok) {
        const taskData = await response.json()
        setTask(taskData)
      } else {
        console.error('Failed to load task')
        close()
      }
    } catch (error) {
      console.error('Error loading task:', error)
      close()
    } finally {
      setIsLoadingTask(false)
    }
  }

  const loadUsers = async () => {
    if (!workspaceId) return
    try {
      const response = await fetch(`/api/org/users?workspaceId=${workspaceId}`)
      if (response.ok) {
        const userData = await response.json()
        setUsers(userData)
      }
    } catch (error) {
      console.error('Error loading users:', error)
    }
  }

  const loadCustomFields = async () => {
    if (!task) return
    try {
      const response = await fetch(`/api/projects/${task.project.id}/custom-fields`)
      if (response.ok) {
        const customFieldsData = await response.json()
        setCustomFieldDefs(customFieldsData)
      }
    } catch (error) {
      console.error('Error loading custom fields:', error)
    }
  }

  const loadEpics = async () => {
    if (!task) return
    try {
      const response = await fetch(`/api/projects/${task.project.id}/epics`)
      if (response.ok) {
        const epicsData = await response.json()
        setEpics(epicsData)
      }
    } catch (error) {
      console.error('Error loading epics:', error)
    }
  }

  const loadMilestones = async () => {
    if (!task) return
    try {
      const response = await fetch(`/api/projects/${task.project.id}/milestones`)
      if (response.ok) {
        const milestonesData = await response.json()
        setMilestones(milestonesData)
      }
    } catch (error) {
      console.error('Error loading milestones:', error)
    }
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleCustomFieldChange = (fieldId: string, value: any) => {
    setCustomFieldValues(prev => ({
      ...prev,
      [fieldId]: value
    }))
  }

  const handleAddTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }))
      setNewTag('')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }))
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddTag()
    }
  }

  const addSubtask = () => {
    setSubtasks([...subtasks, {
      title: '',
      description: '',
      assigneeId: '',
      dueDate: ''
    }])
  }

  const updateSubtask = (index: number, field: keyof Subtask, value: string) => {
    setSubtasks(prev => prev.map((subtask, i) => 
      i === index ? { ...subtask, [field]: value } : subtask
    ))
    if (subtaskErrors[`subtask-${index}`]) {
      setSubtaskErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[`subtask-${index}`]
        return newErrors
      })
    }
  }

  const removeSubtask = (index: number) => {
    setSubtasks(prev => prev.filter((_, i) => i !== index))
    if (subtaskErrors[`subtask-${index}`]) {
      setSubtaskErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[`subtask-${index}`]
        return newErrors
      })
    }
  }

  const handleSave = async () => {
    if (!task) return

    try {
      setIsLoading(true)
      
      // Format dueDate to ISO datetime string if provided
      let formattedDueDate: string | null = null
      if (formData.dueDate) {
        if (formData.dueDate.includes('T')) {
          formattedDueDate = formData.dueDate
        } else {
          formattedDueDate = `${formData.dueDate}T23:59:59.999Z`
        }
      }
      
      // Update basic task fields
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          status: formData.status,
          priority: formData.priority,
          assigneeId: formData.assigneeId === 'none' ? null : formData.assigneeId || null,
          dueDate: formattedDueDate,
          tags: formData.tags,
          epicId: formData.epicId === 'none' ? null : formData.epicId || null,
          milestoneId: formData.milestoneId === 'none' ? null : formData.milestoneId || null,
          points: formData.points || null
        }),
      })

      if (response.ok) {
        const updatedTask = await response.json()
        
        // Update custom fields if there are any
        if (customFieldDefs.length > 0) {
          const customFieldsResponse = await fetch(`/api/tasks/${task.id}/custom-fields`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              customFields: customFieldDefs.map(fieldDef => ({
                fieldId: fieldDef.id,
                value: customFieldValues[fieldDef.id] || null
              }))
            }),
          })

          if (!customFieldsResponse.ok) {
            const errorData = await customFieldsResponse.json().catch(() => ({}))
            console.error('Failed to update custom fields:', errorData.error || 'Unknown error')
          }
        }

        // Update subtasks
        const validSubtasks = subtasks.filter(st => st.title.trim()).map(st => ({
          title: st.title.trim(),
          description: st.description?.trim() || undefined,
          assigneeId: st.assigneeId || undefined,
          dueDate: st.dueDate || undefined
        }))

        const subtasksResponse = await fetch(`/api/tasks/${task.id}/subtasks`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            subtasks: validSubtasks
          }),
        })

        if (!subtasksResponse.ok) {
          const errorData = await subtasksResponse.json().catch(() => ({}))
          console.error('Failed to update subtasks:', errorData.error || 'Unknown error')
        } else {
          const taskWithSubtasks = await subtasksResponse.json()
          setTask({ ...updatedTask, subtasks: taskWithSubtasks.subtasks })
        }

        // Refresh the page data
        router.refresh()
      } else {
        let errorMessage = 'Failed to update task'
        try {
          const errorText = await response.text()
          if (errorText) {
            try {
              const errorData = JSON.parse(errorText)
              errorMessage = errorData.error || errorData.details || errorMessage
            } catch {
              errorMessage = errorText || errorMessage
            }
          }
        } catch (e) {
          errorMessage = response.statusText || errorMessage
        }
        
        console.error('Failed to update task:', errorMessage)
        alert(`Failed to update task: ${errorMessage}`)
      }
    } catch (error) {
      console.error('Error updating task:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      alert(`Error updating task: ${errorMessage}`)
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-40"
        onClick={close}
      />
      
      {/* Sidebar */}
      <div className="fixed right-0 top-0 h-full w-[420px] border-l bg-background shadow-lg flex flex-col z-50">
        {/* Header */}
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold">Task Details</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={close}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        {isLoadingTask ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : !task ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-muted-foreground">Task not found</p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Tabs */}
            <div className="flex border-b px-4">
              <button
                onClick={() => setActiveTab('details')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'details'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Details
                </div>
              </button>
              <button
                onClick={() => setActiveTab('comments')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'comments'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Comments
                </div>
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'history'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <div className="flex items-center gap-2">
                  <History className="h-4 w-4" />
                  History
                </div>
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto">
              <div className="px-4 pb-6 space-y-6">
                {activeTab === 'details' && (
                  <>
                    {/* Basic Information */}
                    <div className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <Label htmlFor="title">Task Title</Label>
                        <Input
                          id="title"
                          value={formData.title}
                          onChange={(e) => handleInputChange('title', e.target.value)}
                          placeholder="Enter task title"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                          id="description"
                          value={formData.description}
                          onChange={(e) => handleInputChange('description', e.target.value)}
                          placeholder="Enter task description"
                          rows={3}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Status</Label>
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
                          <Label>Priority</Label>
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
                    </div>

                    {/* Assignment */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-medium flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Assignment
                      </h3>
                      
                      <div className="space-y-2">
                        <Label>Assignee</Label>
                        <Select 
                          value={formData.assigneeId} 
                          onValueChange={(value) => handleInputChange('assigneeId', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select assignee" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No assignee</SelectItem>
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
                    </div>

                    {/* Timeline */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-medium flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Timeline
                      </h3>
                      
                      <div className="space-y-2">
                        <Label htmlFor="dueDate">Due Date</Label>
                        <Input
                          id="dueDate"
                          type="date"
                          value={formData.dueDate}
                          onChange={(e) => handleInputChange('dueDate', e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Epic and Milestone */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-medium">Epic & Milestone</h3>
                      
                      <div className="grid grid-cols-1 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="epic">Epic</Label>
                          <Select 
                            value={formData.epicId} 
                            onValueChange={(value) => handleInputChange('epicId', value)}
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
                            value={formData.milestoneId} 
                            onValueChange={(value) => handleInputChange('milestoneId', value)}
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
                                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                                    <span>{milestone.title}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

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
                    </div>

                    {/* Tags */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-medium flex items-center gap-2">
                        <Tag className="h-4 w-4" />
                        Tags
                      </h3>
                      
                      <div className="space-y-2">
                        <Label>Add Tags</Label>
                        <div className="flex gap-2">
                          <Input
                            value={newTag}
                            onChange={(e) => setNewTag(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder="Enter tag name"
                          />
                          <Button type="button" onClick={handleAddTag} variant="outline">
                            Add
                          </Button>
                        </div>
                        
                        {formData.tags.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {formData.tags.map((tag, index) => (
                              <Badge key={index} variant="secondary" className="flex items-center gap-1">
                                {tag}
                                <button
                                  type="button"
                                  onClick={() => handleRemoveTag(tag)}
                                  className="ml-1 hover:bg-muted rounded-full p-0.5"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Subtasks */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium">Subtasks</h3>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={addSubtask}
                          disabled={isLoading}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Subtask
                        </Button>
                      </div>
                      {subtasks.map((subtask, index) => (
                        <div key={subtask.id || index} className="border rounded-lg p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium text-sm">Subtask {index + 1}</h4>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeSubtask(index)}
                              className="text-red-500 hover:text-red-700"
                              disabled={isLoading}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="grid gap-3 md:grid-cols-2">
                            <div className="space-y-2">
                              <Label className="text-sm">Title</Label>
                              <Input
                                value={subtask.title}
                                onChange={(e) => updateSubtask(index, 'title', e.target.value)}
                                placeholder="Subtask title"
                                className={subtaskErrors[`subtask-${index}`] ? 'border-red-500' : ''}
                                disabled={isLoading}
                              />
                              {subtaskErrors[`subtask-${index}`] && (
                                <p className="text-xs text-red-500">{subtaskErrors[`subtask-${index}`]}</p>
                              )}
                            </div>
                            <div className="space-y-2">
                              <Label className="text-sm">Assignee</Label>
                              <Select 
                                value={subtask.assigneeId || "unassigned"} 
                                onValueChange={(value) => updateSubtask(index, 'assigneeId', value === "unassigned" ? "" : value)}
                                disabled={isLoading}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select assignee" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="unassigned">Unassigned</SelectItem>
                                  {users
                                    .filter((user) => !!user.id)
                                    .map((user) => (
                                      <SelectItem key={user.id} value={user.id}>
                                        {user.name}
                                      </SelectItem>
                                    ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm">Description</Label>
                            <Textarea
                              value={subtask.description}
                              onChange={(e) => updateSubtask(index, 'description', e.target.value)}
                              placeholder="Subtask description"
                              rows={2}
                              disabled={isLoading}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm">Due Date</Label>
                            <Input
                              type="date"
                              value={subtask.dueDate}
                              onChange={(e) => updateSubtask(index, 'dueDate', e.target.value)}
                              disabled={isLoading}
                            />
                          </div>
                        </div>
                      ))}
                      {subtasks.length === 0 && (
                        <p className="text-muted-foreground text-center py-4 text-sm">
                          No subtasks added yet. Click &quot;Add Subtask&quot; to get started.
                        </p>
                      )}
                    </div>

                    {/* Custom Fields */}
                    {customFieldDefs.length > 0 && (
                      <div className="space-y-4">
                        <h3 className="text-sm font-medium flex items-center gap-2">
                          <Settings className="h-4 w-4" />
                          Custom Fields
                        </h3>
                        
                        <div className="grid gap-4">
                          {customFieldDefs.map((fieldDef) => (
                            <div key={fieldDef.id} className="space-y-2">
                              <Label htmlFor={`custom-${fieldDef.id}`}>{fieldDef.label}</Label>
                              
                              {fieldDef.type === 'text' && (
                                <Input
                                  id={`custom-${fieldDef.id}`}
                                  value={customFieldValues[fieldDef.id] || ''}
                                  onChange={(e) => handleCustomFieldChange(fieldDef.id, e.target.value)}
                                  placeholder={`Enter ${fieldDef.label.toLowerCase()}`}
                                />
                              )}
                              
                              {fieldDef.type === 'number' && (
                                <Input
                                  id={`custom-${fieldDef.id}`}
                                  type="number"
                                  value={customFieldValues[fieldDef.id] || ''}
                                  onChange={(e) => handleCustomFieldChange(fieldDef.id, e.target.value ? Number(e.target.value) : null)}
                                  placeholder={`Enter ${fieldDef.label.toLowerCase()}`}
                                />
                              )}
                              
                              {fieldDef.type === 'select' && (
                                <Select
                                  value={customFieldValues[fieldDef.id] || ''}
                                  onValueChange={(value) => handleCustomFieldChange(fieldDef.id, value)}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder={`Select ${fieldDef.label.toLowerCase()}`} />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="">No selection</SelectItem>
                                    {fieldDef.options && Array.isArray(fieldDef.options) && fieldDef.options.map((option) => (
                                      <SelectItem key={option} value={option}>
                                        {option}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                              
                              {fieldDef.type === 'date' && (
                                <Input
                                  id={`custom-${fieldDef.id}`}
                                  type="date"
                                  value={customFieldValues[fieldDef.id] ? customFieldValues[fieldDef.id].split('T')[0] : ''}
                                  onChange={(e) => handleCustomFieldChange(fieldDef.id, e.target.value ? new Date(e.target.value).toISOString() : null)}
                                />
                              )}
                              
                              {fieldDef.type === 'boolean' && (
                                <div className="flex items-center space-x-2">
                                  <input
                                    type="checkbox"
                                    id={`custom-${fieldDef.id}`}
                                    checked={customFieldValues[fieldDef.id] || false}
                                    onChange={(e) => handleCustomFieldChange(fieldDef.id, e.target.checked)}
                                    className="h-4 w-4"
                                  />
                                  <Label htmlFor={`custom-${fieldDef.id}`} className="text-sm">
                                    {customFieldValues[fieldDef.id] ? 'Yes' : 'No'}
                                  </Label>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Task Info */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-medium">Task Information</h3>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <Label className="text-muted-foreground">Created by</Label>
                          <p className="font-medium">{task.createdBy.name}</p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Project</Label>
                          <div className="flex items-center space-x-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: task.project.color }}
                            />
                            <span className="font-medium">{task.project.name}</span>
                          </div>
                        </div>
                        {task.epic && (
                          <div>
                            <Label className="text-muted-foreground">Current Epic</Label>
                            <div className="flex items-center space-x-2">
                              <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: task.epic.color }}
                              />
                              <span className="font-medium">{task.epic.title}</span>
                            </div>
                          </div>
                        )}
                        {task.milestone && (
                          <div>
                            <Label className="text-muted-foreground">Current Milestone</Label>
                            <div className="flex items-center space-x-2">
                              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                              <span className="font-medium">{task.milestone.title}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {activeTab === 'comments' && task && (
                  <div className="pt-4">
                    <TaskComments taskId={task.id} projectId={task.project.id} />
                  </div>
                )}

                {activeTab === 'history' && (
                  <div className="pt-4 text-center text-muted-foreground py-8">
                    <History className="h-8 w-8 mx-auto mb-2" />
                    <p>Task history will be displayed here</p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer with Save Button */}
            <div className="px-4 py-3 border-t flex justify-end space-x-2">
              <Button variant="outline" onClick={close} disabled={isLoading}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

