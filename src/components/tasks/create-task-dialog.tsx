"use client"

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { X, Sparkles } from 'lucide-react'

interface CreateTaskDialogProps {
  isOpen: boolean
  onClose: () => void
  projectId: string
  workspaceId?: string
  epicId?: string
  defaultStatus?: 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'BLOCKED'
  onTaskCreated?: () => void
  colors?: {
    text: string
    textSecondary: string
    textMuted: string
    border: string
    surface: string
    background: string
    primary: string
  }
}

export function CreateTaskDialog({
  isOpen,
  onClose,
  projectId,
  workspaceId,
  epicId,
  defaultStatus = 'TODO',
  onTaskCreated,
  colors
}: CreateTaskDialogProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'BLOCKED'>(defaultStatus)
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>('MEDIUM')
  const [assigneeId, setAssigneeId] = useState<string | null>(null)
  const [dueDate, setDueDate] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [newTag, setNewTag] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [users, setUsers] = useState<Array<{id: string, name: string, email: string}>>([])

  useEffect(() => {
    if (isOpen) {
      loadUsers()
      // Reset form when dialog opens
      setTitle('')
      setDescription('')
      setStatus(defaultStatus)
      setPriority('MEDIUM')
      setAssigneeId(null)
      setDueDate('')
      setTags([])
      setNewTag('')
    }
  }, [isOpen, defaultStatus])

  const loadUsers = async () => {
    if (!workspaceId) return
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

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()])
      setNewTag('')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove))
  }

  const handleCreate = async () => {
    if (!title.trim()) return

    try {
      setIsLoading(true)
      
      // Format dueDate to ISO datetime string if provided
      let formattedDueDate: string | null = null
      if (dueDate) {
        if (dueDate.includes('T')) {
          formattedDueDate = dueDate
        } else {
          formattedDueDate = `${dueDate}T23:59:59.999Z`
        }
      }

      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId,
          workspaceId,
          title: title.trim(),
          description: description.trim() || null,
          status,
          priority,
          assigneeId: assigneeId,
          dueDate: formattedDueDate,
          tags,
          epicId: epicId || null
        }),
      })

      if (response.ok) {
        onTaskCreated?.()
        onClose()
      } else {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.error || errorData.details || 'Failed to create task'
        alert(`Failed to create task: ${errorMessage}`)
      }
    } catch (error) {
      console.error('Error creating task:', error)
      alert('Failed to create task. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const defaultColors = {
    text: 'rgb(15, 23, 42)',
    textSecondary: 'rgb(100, 116, 139)',
    textMuted: 'rgb(148, 163, 184)',
    border: 'rgb(226, 232, 240)',
    surface: 'rgb(255, 255, 255)',
    background: 'rgb(248, 250, 252)',
    primary: 'rgb(59, 130, 246)'
  }

  const themeColors = colors || defaultColors

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" style={{ backgroundColor: themeColors.surface }}>
        <DialogHeader>
          <DialogTitle style={{ color: themeColors.text }}>New Task</DialogTitle>
          <DialogDescription style={{ color: themeColors.textMuted }}>
            {epicId ? 'Add a new task to this epic' : 'Add a new task to the project'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Task Title */}
          <div className="space-y-2">
            <Label htmlFor="title" style={{ color: themeColors.text }}>
              Task Title *
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter task title..."
              className="w-full"
              style={{ 
                borderColor: themeColors.border,
                backgroundColor: themeColors.background
              }}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" style={{ color: themeColors.text }}>
              Description
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a description..."
              rows={3}
              className="w-full"
              style={{ 
                borderColor: themeColors.border,
                backgroundColor: themeColors.background
              }}
            />
          </div>

          {/* Status and Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label style={{ color: themeColors.text }}>Status</Label>
              <Select value={status} onValueChange={(value: any) => setStatus(value)}>
                <SelectTrigger style={{ borderColor: themeColors.border }}>
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
              <Label style={{ color: themeColors.text }}>Priority</Label>
              <Select value={priority} onValueChange={(value: any) => setPriority(value)}>
                <SelectTrigger style={{ borderColor: themeColors.border }}>
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
              <Label style={{ color: themeColors.text }}>Assignee</Label>
              <Select value={assigneeId || undefined} onValueChange={(value) => setAssigneeId(value || null)}>
                <SelectTrigger style={{ borderColor: themeColors.border }}>
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
              <Label htmlFor="dueDate" style={{ color: themeColors.text }}>Due Date</Label>
              <Input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                style={{ 
                  borderColor: themeColors.border,
                  backgroundColor: themeColors.background
                }}
              />
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label style={{ color: themeColors.text }}>Tags</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {tags.map((tag) => (
                <Badge
                  key={tag}
                  variant="outline"
                  className="flex items-center gap-1"
                  style={{ borderColor: themeColors.border }}
                >
                  {tag}
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="ml-1 hover:opacity-70"
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
                style={{ 
                  borderColor: themeColors.border,
                  backgroundColor: themeColors.background
                }}
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleAddTag}
                disabled={!newTag.trim()}
                style={{ borderColor: themeColors.border }}
              >
                Add
              </Button>
            </div>
          </div>

          {/* AI Placeholder */}
          <div className="pt-4 border-t" style={{ borderColor: themeColors.border }}>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4" style={{ color: themeColors.textMuted }} />
              <Label style={{ color: themeColors.textSecondary }} className="text-sm">
                AI Task Generation (Coming soon)
              </Label>
            </div>
            <p className="text-xs" style={{ color: themeColors.textMuted }}>
              Automatically create tasks for this epic based on documentation
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
              style={{ borderColor: themeColors.border }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!title.trim() || isLoading}
              style={{ backgroundColor: themeColors.primary }}
            >
              {isLoading ? 'Creating...' : 'Create Task'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

