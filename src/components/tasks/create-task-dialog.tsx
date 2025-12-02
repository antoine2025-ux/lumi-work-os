"use client"

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { X, Plus, Loader2, AlertCircle } from 'lucide-react'

type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'BLOCKED'

interface CreateTaskDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  defaultStatus?: TaskStatus
  defaultEpicId?: string | null
  onTaskCreated?: (task: any) => void
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
  onTaskCreated
}: CreateTaskDialogProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<TaskStatus>(defaultStatus)
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>('MEDIUM')
  const [assigneeId, setAssigneeId] = useState<string | null>(null)
  const [dueDate, setDueDate] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [newTag, setNewTag] = useState('')
  const [epicId, setEpicId] = useState<string | null>(defaultEpicId || null)
  const [subtasks, setSubtasks] = useState<Subtask[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [users, setUsers] = useState<Array<{id: string, name: string, email: string}>>([])
  const [epics, setEpics] = useState<Array<{id: string, title: string, color?: string}>>([])

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
      setDueDate('')
      setTags([])
      setNewTag('')
      setEpicId(defaultEpicId || null)
      setSubtasks([])
      setErrors({})
    }
  }, [open, defaultStatus, defaultEpicId])

  const loadUsers = async () => {
    try {
      const response = await fetch('/api/users')
      if (response.ok) {
        const data = await response.json()
        setUsers(data)
      }
    } catch (error) {
      console.error('Error loading users:', error)
    }
  }

  const loadEpics = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/epics`)
      if (response.ok) {
        const data = await response.json()
        setEpics(data)
      }
    } catch (error) {
      console.error('Error loading epics:', error)
    }
  }

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()])
      setNewTag('')
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
      const requestBody: any = {
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
        if (errorData.details) {
          if (Array.isArray(errorData.details)) {
            const validationErrors = errorData.details.map((err: any) => 
              `${err.path?.join('.') || 'field'}: ${err.message}`
            ).join(', ')
            errorMessage = `Validation error: ${validationErrors}`
          } else if (typeof errorData.details === 'string') {
            errorMessage = errorData.details
          }
        }
        setErrors({ submit: errorMessage })
      }
    } catch (error) {
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Task</DialogTitle>
          <DialogDescription>
            Create a new task for this project
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={(e) => { e.preventDefault(); handleCreate(); }} className="space-y-6">
          {/* Task Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Task Title *</Label>
            <Input
              id="title"
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
              placeholder="Enter task title..."
              className={errors.title ? 'border-red-500' : ''}
              disabled={isLoading}
            />
            {errors.title && (
              <p className="text-sm text-red-500 flex items-center space-x-1">
                <AlertCircle className="h-4 w-4" />
                <span>{errors.title}</span>
              </p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a description..."
              rows={3}
              disabled={isLoading}
            />
          </div>

          {/* Status and Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(value: TaskStatus) => setStatus(value)} disabled={isLoading}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODO">To Do</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="IN_REVIEW">In Review</SelectItem>
                  <SelectItem value="DONE">Done</SelectItem>
                  <SelectItem value="BLOCKED">Blocked</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(value: any) => setPriority(value)} disabled={isLoading}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="URGENT">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Assignee and Due Date */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Assignee</Label>
              <Select value={assigneeId || undefined} onValueChange={(value) => setAssigneeId(value || null)} disabled={isLoading}>
                <SelectTrigger>
                  <SelectValue placeholder="Unassigned" />
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

            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date</Label>
              <Input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Epic */}
          <div className="space-y-2">
            <Label>Epic</Label>
            <Select 
              value={epicId || 'none'} 
              onValueChange={(value) => setEpicId(value === 'none' ? null : value)}
              disabled={isLoading}
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

          {/* Tags */}
          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {tags.map((tag) => (
                <Badge
                  key={tag}
                  variant="outline"
                  className="flex items-center gap-1"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="ml-1 hover:opacity-70"
                    disabled={isLoading}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                placeholder="Add tag..."
                className="flex-1"
                disabled={isLoading}
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleAddTag}
                disabled={!newTag.trim() || isLoading}
              >
                Add
              </Button>
            </div>
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
              <p className="text-sm text-red-600 flex items-center space-x-1">
                <AlertCircle className="h-4 w-4" />
                <span>{errors.submit}</span>
              </p>
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

