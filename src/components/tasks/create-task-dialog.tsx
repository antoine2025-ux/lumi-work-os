"use client"

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { X, Plus, Loader2, AlertCircle, Circle, AlertTriangle, User, Calendar as CalendarIcon, FileText, Hash, CheckSquare } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CalendarDatePicker } from '@/components/ui/calendar-date-picker'
import { cn } from '@/lib/utils'

type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'BLOCKED'
type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'

interface CreatedTask {
  id: string
  title: string
  status: TaskStatus
  priority: TaskPriority
  [key: string]: unknown
}

interface CreateTaskDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  defaultStatus?: TaskStatus
  defaultEpicId?: string | null
  defaultDueDate?: string | null
  onTaskCreated?: (task: CreatedTask) => void
}

interface Subtask {
  title: string
  description: string
  assigneeId: string
  dueDate: string
}

export function CreateTaskDialog({
  open,
  onOpenChange,
  projectId,
  defaultStatus = 'TODO',
  defaultEpicId,
  defaultDueDate,
  onTaskCreated
}: CreateTaskDialogProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<TaskStatus>(defaultStatus)
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>('MEDIUM')
  const [assigneeId, setAssigneeId] = useState<string | null>(null)
  const [dueDate, setDueDate] = useState(defaultDueDate || '')
  const [tags, setTags] = useState<string[]>([])
  const [epicId, setEpicId] = useState<string | null>(defaultEpicId || null)
  const [subtasks, setSubtasks] = useState<Subtask[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [users, setUsers] = useState<Array<{id: string, name: string, email: string}>>([])
  const [epics, setEpics] = useState<Array<{id: string, title: string, color?: string}>>([])
  const [expandedOption, setExpandedOption] = useState<string | null>(null)
  const [tagInput, setTagInput] = useState('')

  useEffect(() => {
    if (open) {
      loadUsers()
      loadEpics()
      // Reset form when dialog opens
      setTitle('')
      setDescription('')
      setStatus(defaultStatus)
      setPriority('MEDIUM')
      setAssigneeId(null)
      setDueDate(defaultDueDate || '')
      setTags([])
      setEpicId(defaultEpicId || null)
      setSubtasks([])
      setErrors({})
    }
  }, [open, defaultStatus, defaultEpicId, defaultDueDate])

  const loadUsers = async () => {
    try {
      // Use Policy B compliant assignees endpoint
      const response = await fetch(`/api/projects/${projectId}/assignees`)
      if (response.ok) {
        const data = await response.json()
        setUsers(data.users || [])
      } else if (response.status === 403) {
        // User doesn't have access to project - show empty list
        setUsers([])
      }
    } catch (error: unknown) {
      console.error('Error loading assignees:', error)
      // Fallback to empty list on error
      setUsers([])
    }
  }

  const loadEpics = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/epics`)
      if (response.ok) {
        const data = await response.json()
        setEpics(data)
      }
    } catch (error: unknown) {
      console.error('Error loading epics:', error)
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove))
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!title.trim()) {
      newErrors.title = 'Task title is required'
    }

    // Validate subtasks
    subtasks.forEach((subtask, index) => {
      if (!subtask.title.trim()) {
        newErrors[`subtask-${index}`] = 'Subtask title is required'
      }
    })

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleCreate = async () => {
    if (!validateForm()) {
      return
    }

    try {
      setIsLoading(true)
      setErrors({})
      
      // Build request body, omitting undefined/null values for optional fields
      const requestBody: Record<string, unknown> = {
        projectId,
        title: title.trim(),
        status,
        priority,
        tags
      }
      
      // Only include optional fields if they have values
      if (description.trim()) {
        requestBody.description = description.trim()
      }
      if (assigneeId) {
        requestBody.assigneeId = assigneeId
      }
      if (dueDate) {
        requestBody.dueDate = dueDate
      }
      // Always include epicId if it's set (even if it's from defaultEpicId)
      if (epicId) {
        requestBody.epicId = epicId
      }
      // Always include subtasks array (even if empty) - filter out empty titles
      const validSubtasks = subtasks.filter(st => st.title.trim()).map(st => ({
        title: st.title.trim(),
        description: st.description?.trim() || undefined,
        assigneeId: st.assigneeId || undefined,
        dueDate: st.dueDate || undefined
      }))
      if (validSubtasks.length > 0) {
        requestBody.subtasks = validSubtasks
      }

      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      if (response.ok) {
        const task = await response.json()
        onTaskCreated?.(task)
        onOpenChange(false)
      } else {
        const errorData = await response.json().catch(() => ({}))
        console.error('Task creation error:', errorData)
        
        let errorMessage = errorData.error || errorData.message || 'Failed to create task'
        
        // Handle Policy B 403 errors with clear message
        if (response.status === 403 && (errorMessage.includes('assignee') || errorMessage.includes('access'))) {
          // Use the backend error message if it's specific, otherwise provide generic guidance
          if (errorMessage.includes('TARGETED') || errorMessage.includes('ProjectSpace')) {
            // Backend already specified it's TARGETED
            errorMessage = errorMessage
          } else {
            // Generic message - could be TARGETED or other access issue
            errorMessage = 'Cannot assign task: The selected assignee does not have access to this project. If this is a private project, add them to the project members first.'
          }
        }
        
        if (errorData.details) {
          if (Array.isArray(errorData.details)) {
            const validationErrors = errorData.details.map((err: { path?: string[]; message: string }) =>
              `${err.path?.join('.') || 'field'}: ${err.message}`
            ).join(', ')
            errorMessage = `Validation error: ${validationErrors}`
          } else if (typeof errorData.details === 'string') {
            errorMessage = errorData.details
          }
        }
        setErrors({ submit: errorMessage })
      }
    } catch (error: unknown) {
      console.error('Error creating task:', error)
      setErrors({ submit: 'An unexpected error occurred. Please try again.' })
    } finally {
      setIsLoading(false)
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
    // Clear error when user starts typing
    if (errors[`subtask-${index}`]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[`subtask-${index}`]
        return newErrors
      })
    }
  }

  const removeSubtask = (index: number) => {
    setSubtasks(prev => prev.filter((_, i) => i !== index))
    // Clear error
    if (errors[`subtask-${index}`]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[`subtask-${index}`]
        return newErrors
      })
    }
  }

  const statusOptions = [
    { value: 'TODO' as const, label: 'To Do', color: 'bg-gray-100 text-gray-800' },
    { value: 'IN_PROGRESS' as const, label: 'In Progress', color: 'bg-blue-100 text-blue-800' },
    { value: 'IN_REVIEW' as const, label: 'In Review', color: 'bg-purple-100 text-purple-800' },
    { value: 'DONE' as const, label: 'Done', color: 'bg-green-100 text-green-800' },
    { value: 'BLOCKED' as const, label: 'Blocked', color: 'bg-red-100 text-red-800' }
  ]

  const priorityOptions = [
    { value: 'LOW' as const, label: 'Low', color: 'bg-green-100 text-green-800' },
    { value: 'MEDIUM' as const, label: 'Medium', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'HIGH' as const, label: 'High', color: 'bg-orange-100 text-orange-800' },
    { value: 'URGENT' as const, label: 'Urgent', color: 'bg-red-100 text-red-800' }
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-base font-semibold flex items-center gap-2">
            <CheckSquare className="h-4 w-4" />
            <span>Create New Task</span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={(e) => { e.preventDefault(); handleCreate(); }} className="space-y-4 -mt-1">
          {/* Task Title - Unboxed */}
          <div className="border-b border-border/50 pb-3">
            <Input
              value={title}
              onChange={(e) => {
                setTitle(e.target.value)
                if (errors.title) {
                  setErrors(prev => {
                    const newErrors = { ...prev }
                    delete newErrors.title
                    return newErrors
                  })
                }
              }}
              placeholder="Task title *"
              className="text-lg font-medium border-0 rounded-none px-0 h-auto py-2 focus-visible:ring-0 focus-visible:ring-offset-0"
              autoFocus
              disabled={isLoading}
            />
            {errors.title && (
              <p className="text-sm text-red-500 flex items-center space-x-1 mt-2">
                <AlertCircle className="h-4 w-4" />
                <span>{errors.title}</span>
              </p>
            )}
          </div>

          {/* Option Pills Row */}
          <div className="flex items-center gap-1.5 flex-nowrap overflow-x-auto pb-1">
            {/* Status Pill */}
            <Popover open={expandedOption === 'status'} onOpenChange={(open) => setExpandedOption(open ? 'status' : null)}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-1.5 px-2 py-1 rounded-md border border-border text-xs hover:bg-accent/50 transition-colors"
                  disabled={isLoading}
                >
                  <Circle className="w-3.5 h-3.5" />
                  <Badge variant="outline" className={cn("text-xs px-1.5 py-0", statusOptions.find(s => s.value === status)?.color)}>
                    {statusOptions.find(s => s.value === status)?.label}
                  </Badge>
                </button>
              </PopoverTrigger>
              <PopoverContent className="z-[100] w-48 p-1" align="start" sideOffset={4}>
                <div className="space-y-0.5">
                  {statusOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        setStatus(option.value)
                        setExpandedOption(null)
                      }}
                      className={cn(
                        "w-full flex items-center gap-1.5 px-2 py-1 rounded-md text-xs text-left hover:bg-accent/50 transition-colors",
                        status === option.value && "bg-accent"
                      )}
                    >
                      <Badge variant="outline" className={cn("text-xs px-1.5 py-0", option.color)}>
                        {option.label}
                      </Badge>
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            {/* Priority Pill */}
            <Popover open={expandedOption === 'priority'} onOpenChange={(open) => setExpandedOption(open ? 'priority' : null)}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-1.5 px-2 py-1 rounded-md border border-border text-xs hover:bg-accent/50 transition-colors"
                  disabled={isLoading}
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <Badge variant="outline" className={cn("text-xs px-1.5 py-0", priorityOptions.find(p => p.value === priority)?.color)}>
                    {priorityOptions.find(p => p.value === priority)?.label}
                  </Badge>
                </button>
              </PopoverTrigger>
              <PopoverContent className="z-[100] w-48 p-1" align="start" sideOffset={4}>
                <div className="space-y-0.5">
                  {priorityOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        setPriority(option.value)
                        setExpandedOption(null)
                      }}
                      className={cn(
                        "w-full flex items-center gap-1.5 px-2 py-1 rounded-md text-xs text-left hover:bg-accent/50 transition-colors",
                        priority === option.value && "bg-accent"
                      )}
                    >
                      <Badge variant="outline" className={cn("text-xs px-1.5 py-0", option.color)}>
                        {option.label}
                      </Badge>
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            {/* Assignee Pill */}
            <Popover open={expandedOption === 'assignee'} onOpenChange={(open) => setExpandedOption(open ? 'assignee' : null)}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-1.5 px-2 py-1 rounded-md border border-border text-xs hover:bg-accent/50 transition-colors"
                  disabled={isLoading}
                >
                  <User className="w-3.5 h-3.5" />
                  <span className="text-muted-foreground">
                    {assigneeId ? users.find(u => u.id === assigneeId)?.name || 'Assignee' : 'Assignee'}
                  </span>
                </button>
              </PopoverTrigger>
              <PopoverContent className="z-[100] w-56 p-1" align="start" sideOffset={4}>
                <div className="space-y-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setAssigneeId(null)
                      setExpandedOption(null)
                    }}
                    className={cn(
                      "w-full flex items-center gap-1.5 px-2 py-1 rounded-md text-xs text-left hover:bg-accent/50 transition-colors",
                      !assigneeId && "bg-accent"
                    )}
                  >
                    <span className="text-muted-foreground">Unassigned</span>
                  </button>
                  {users.length === 0 ? (
                    <div className="px-2 py-1.5 text-xs text-muted-foreground">
                      No eligible assignees
                    </div>
                  ) : (
                    users.map((user) => (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => {
                          setAssigneeId(user.id)
                          setExpandedOption(null)
                        }}
                        className={cn(
                          "w-full flex items-center gap-1.5 px-2 py-1 rounded-md text-xs text-left hover:bg-accent/50 transition-colors",
                          assigneeId === user.id && "bg-accent"
                        )}
                      >
                        {user.name}
                      </button>
                    ))
                  )}
                </div>
              </PopoverContent>
            </Popover>

            {/* Due Date Pill */}
            <Popover open={expandedOption === 'dueDate'} onOpenChange={(open) => setExpandedOption(open ? 'dueDate' : null)}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-1.5 px-2 py-1 rounded-md border border-border text-xs hover:bg-accent/50 transition-colors"
                  disabled={isLoading}
                >
                  <CalendarIcon className="w-3.5 h-3.5" />
                  <span className="text-muted-foreground">
                    {dueDate || 'Due Date'}
                  </span>
                </button>
              </PopoverTrigger>
              <PopoverContent className="z-[100] w-auto p-0" align="start" sideOffset={4}>
                <CalendarDatePicker
                  value={dueDate}
                  onChange={(date) => setDueDate(date)}
                  onSelect={() => setExpandedOption(null)}
                />
              </PopoverContent>
            </Popover>

            {/* Epic Pill */}
            <Popover open={expandedOption === 'epic'} onOpenChange={(open) => setExpandedOption(open ? 'epic' : null)}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-1.5 px-2 py-1 rounded-md border border-border text-xs hover:bg-accent/50 transition-colors"
                  disabled={isLoading}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span className="text-muted-foreground">
                    {epicId ? epics.find(e => e.id === epicId)?.title || 'Epic' : 'Epic'}
                  </span>
                </button>
              </PopoverTrigger>
              <PopoverContent className="z-[100] w-56 p-1" align="start" sideOffset={4}>
                <div className="space-y-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setEpicId(null)
                      setExpandedOption(null)
                    }}
                    className={cn(
                      "w-full flex items-center gap-1.5 px-2 py-1 rounded-md text-xs text-left hover:bg-accent/50 transition-colors",
                      !epicId && "bg-accent"
                    )}
                  >
                    <span className="text-muted-foreground">No Epic</span>
                  </button>
                  {epics.map((epic) => (
                    <button
                      key={epic.id}
                      type="button"
                      onClick={() => {
                        setEpicId(epic.id)
                        setExpandedOption(null)
                      }}
                      className={cn(
                        "w-full flex items-center gap-1.5 px-2 py-1 rounded-md text-xs text-left hover:bg-accent/50 transition-colors",
                        epicId === epic.id && "bg-accent"
                      )}
                    >
                      <div 
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0" 
                        style={{ backgroundColor: epic.color || '#3B82F6' }}
                      />
                      <span className="truncate">{epic.title}</span>
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            {/* Tags Pill */}
            <Popover open={expandedOption === 'tags'} onOpenChange={(open) => setExpandedOption(open ? 'tags' : null)}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-1.5 px-2 py-1 rounded-md border border-border text-xs hover:bg-accent/50 transition-colors"
                  disabled={isLoading}
                >
                  <Hash className="w-3.5 h-3.5" />
                  <span className="text-muted-foreground">
                    {tags.length > 0 ? `${tags.length} tag${tags.length > 1 ? 's' : ''}` : 'Tags'}
                  </span>
                </button>
              </PopoverTrigger>
              <PopoverContent className="z-[100] w-64 p-2" align="start" sideOffset={4}>
                <div className="space-y-2">
                  <div className="flex gap-1.5">
                    <Input
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          if (tagInput.trim() && !tags.includes(tagInput.trim())) {
                            setTags([...tags, tagInput.trim()])
                            setTagInput('')
                          }
                        }
                      }}
                      placeholder="Add tag..."
                      className="flex-1 h-7 text-xs"
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        if (tagInput.trim() && !tags.includes(tagInput.trim())) {
                          setTags([...tags, tagInput.trim()])
                          setTagInput('')
                        }
                      }}
                      disabled={!tagInput.trim()}
                      className="h-7 px-2 text-xs"
                    >
                      Add
                    </Button>
                  </div>
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {tags.map((tag) => (
                        <Badge
                          key={tag}
                          variant="outline"
                          className="flex items-center gap-1 text-xs px-1.5 py-0"
                        >
                          {tag}
                          <button
                            type="button"
                            onClick={() => handleRemoveTag(tag)}
                            className="ml-0.5 hover:opacity-70"
                          >
                            <X className="h-2.5 w-2.5" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Description - Enlarged */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm text-muted-foreground">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a description..."
              rows={10}
              className="min-h-[220px] resize-y focus-visible:ring-0 focus-visible:ring-offset-0"
              disabled={isLoading}
            />
          </div>

          {/* Subtasks */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Subtasks</Label>
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
              <div key={index} className="border rounded-lg p-4 space-y-3">
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
                      className={errors[`subtask-${index}`] ? 'border-red-500' : ''}
                      disabled={isLoading}
                    />
                    {errors[`subtask-${index}`] && (
                      <p className="text-xs text-red-500">{errors[`subtask-${index}`]}</p>
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

          {/* Error Message */}
          {errors.submit && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <div className="text-sm text-red-600 flex items-start space-x-2">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-medium mb-1">Task creation failed</p>
                  <p className="whitespace-pre-line">{errors.submit}</p>
                  {errors.submit.includes('ProjectSpace') && (
                    <p className="mt-2 text-xs text-red-500">
                      💡 Tip: The &quot;Manage ProjectSpace Members&quot; button is located on the project detail page, below the project header.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!title.trim() || isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Task'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

