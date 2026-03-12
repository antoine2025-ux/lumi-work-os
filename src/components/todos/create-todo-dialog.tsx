"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useWorkspace } from "@/lib/workspace-context"
import { CalendarIcon, Loader2, Folder } from "lucide-react"
import { Todo } from "./todo-item"

interface WorkspaceMember {
  id: string
  userId: string
  role: string
  user: {
    id: string
    name?: string | null
    email: string
    image?: string | null
  }
}

interface Project {
  id: string
  name: string
  color?: string | null
}

interface CreateTodoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (todo: Todo) => void
  editTodo?: Todo | null
  anchorType?: 'NONE' | 'PROJECT' | 'TASK' | 'PAGE'
  anchorId?: string
}

function getInitials(name?: string | null, email?: string): string {
  if (name) {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }
  return email?.charAt(0).toUpperCase() || '?'
}

export function CreateTodoDialog({
  open,
  onOpenChange,
  onCreated,
  editTodo,
  anchorType = 'NONE',
  anchorId
}: CreateTodoDialogProps) {
  const { currentWorkspace } = useWorkspace()
  
  const [title, setTitle] = useState('')
  const [note, setNote] = useState('')
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'NONE'>('NONE')
  const [dueAt, setDueAt] = useState<Date | undefined>()
  const [assignedToId, setAssignedToId] = useState<string>('')
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')
  
  const [members, setMembers] = useState<WorkspaceMember[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loadingMembers, setLoadingMembers] = useState(false)
  const [loadingProjects, setLoadingProjects] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Reset form when dialog opens/closes or editTodo changes
  useEffect(() => {
    if (open) {
      if (editTodo) {
        setTitle(editTodo.title)
        setNote(editTodo.note || '')
        setPriority(editTodo.priority || 'NONE')
        setDueAt(editTodo.dueAt ? new Date(editTodo.dueAt) : undefined)
        setAssignedToId(editTodo.assignedTo.id)
        // Set project if todo is anchored to a project
        if (editTodo.anchorType === 'PROJECT' && editTodo.anchorId) {
          setSelectedProjectId(editTodo.anchorId)
        } else {
          setSelectedProjectId('')
        }
      } else {
        setTitle('')
        setNote('')
        setPriority('NONE')
        setDueAt(new Date()) // Default to today
        setAssignedToId('')
        // If anchorType is already set to PROJECT, use that anchorId
        if (anchorType === 'PROJECT' && anchorId) {
          setSelectedProjectId(anchorId)
        } else {
          setSelectedProjectId('')
        }
      }
    }
  }, [open, editTodo, anchorType, anchorId])

  // Load workspace members and projects
  useEffect(() => {
    if (open && currentWorkspace?.id) {
      if (members.length === 0) {
        loadMembers()
      }
      if (projects.length === 0) {
        loadProjects()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, currentWorkspace?.id])

  const loadMembers = async () => {
    if (!currentWorkspace?.id) return
    
    setLoadingMembers(true)
    try {
      const response = await fetch(`/api/workspaces/${currentWorkspace.id}/members`)
      if (response.ok) {
        const data = await response.json()
        setMembers(data.members || [])
      }
    } catch (error: unknown) {
      console.error('Failed to load members:', error)
    } finally {
      setLoadingMembers(false)
    }
  }

  const loadProjects = async () => {
    if (!currentWorkspace?.id) return
    
    setLoadingProjects(true)
    try {
      const response = await fetch('/api/projects')
      if (response.ok) {
        const data = await response.json()
        // API returns { projects: Project[] }
        setProjects(data.projects || [])
      }
    } catch (error: unknown) {
      console.error('Failed to load projects:', error)
    } finally {
      setLoadingProjects(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || isSubmitting) return

    setIsSubmitting(true)
    try {
      // Determine anchor type and ID:
      // 1. If anchorType prop is already set (e.g., from context), use it
      // 2. Otherwise, if user selected a project, use that
      // 3. Otherwise, use NONE
      let finalAnchorType: 'NONE' | 'PROJECT' | 'TASK' | 'PAGE' = anchorType
      let finalAnchorId: string | null = anchorType !== 'NONE' ? anchorId || null : null
      
      // If no anchor was provided via props, check if user selected a project
      if (anchorType === 'NONE' && selectedProjectId) {
        finalAnchorType = 'PROJECT'
        finalAnchorId = selectedProjectId
      }

      const payload: Record<string, unknown> = {
        title: title.trim(),
        note: note.trim() || null,
        priority: priority === 'NONE' ? null : priority,
        dueAt: dueAt?.toISOString() || null,
        anchorType: finalAnchorType,
        anchorId: finalAnchorType !== 'NONE' ? finalAnchorId : null
      }

      // Only include assignedToId if explicitly set (API defaults to creator if not provided)
      if (assignedToId && assignedToId.trim()) {
        payload.assignedToId = assignedToId
      }

      const url = editTodo ? `/api/todos/${editTodo.id}` : '/api/todos'
      const method = editTodo ? 'PATCH' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save todo')
      }

      const todo = await response.json()
      onCreated(todo)
      onOpenChange(false)
    } catch (error: unknown) {
      console.error('Error saving todo:', error)
      alert(error instanceof Error ? error.message : 'Failed to save todo')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{editTodo ? 'Edit To-do' : 'New To-do'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Show assignment info when editing an existing todo */}
          {editTodo && (
            <div className="rounded-lg bg-muted/50 p-3 space-y-1.5">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Created by:</span>
                <div className="flex items-center gap-1.5">
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={editTodo.createdBy.image || ''} />
                    <AvatarFallback className="text-xs">
                      {getInitials(editTodo.createdBy.name, editTodo.createdBy.email)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{editTodo.createdBy.name || editTodo.createdBy.email}</span>
                </div>
              </div>
              {editTodo.createdBy.id !== editTodo.assignedTo.id && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Assigned to:</span>
                  <div className="flex items-center gap-1.5">
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={editTodo.assignedTo.image || ''} />
                      <AvatarFallback className="text-xs">
                        {getInitials(editTodo.assignedTo.name, editTodo.assignedTo.email)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{editTodo.assignedTo.name || editTodo.assignedTo.email}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to be done?"
              autoFocus
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">Note (optional)</Label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add details..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date</Label>
              <div className="relative">
                <CalendarIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <Input
                  id="dueDate"
                  type="date"
                  value={dueAt ? dueAt.toISOString().split('T')[0] : ''}
                  onChange={(e) => setDueAt(e.target.value ? new Date(e.target.value) : undefined)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as 'LOW' | 'MEDIUM' | 'HIGH' | 'NONE')}>
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">None</SelectItem>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Assign to</Label>
            {loadingMembers ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading members...
              </div>
            ) : (
              <Select value={assignedToId || undefined} onValueChange={(v) => setAssignedToId(v || '')}>
                <SelectTrigger>
                  <SelectValue placeholder="Assign to me (default)" />
                </SelectTrigger>
                <SelectContent>
                  {members.map((member) => (
                    <SelectItem key={member.userId} value={member.userId}>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={member.user.image || ''} />
                          <AvatarFallback className="text-xs">
                            {getInitials(member.user.name, member.user.email)}
                          </AvatarFallback>
                        </Avatar>
                        <span>{member.user.name || member.user.email}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Project selector - only show if anchorType is NONE (not pre-set) */}
          {anchorType === 'NONE' && (
            <div className="space-y-2">
              <Label>Link to Project (optional)</Label>
              {loadingProjects ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading projects...
                </div>
              ) : (
                <Select value={selectedProjectId || undefined} onValueChange={(v) => setSelectedProjectId(v || '')}>
                  <SelectTrigger>
                    <SelectValue placeholder="No project (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        <div className="flex items-center gap-2">
                          {project.color && (
                            <div 
                              className="h-3 w-3 rounded-full flex-shrink-0" 
                              style={{ backgroundColor: project.color }}
                            />
                          )}
                          {!project.color && <Folder className="h-4 w-4 text-muted-foreground" />}
                          <span>{project.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          {anchorType !== 'NONE' && (
            <p className="text-xs text-muted-foreground">
              This to-do will be linked to the current {anchorType.toLowerCase()}.
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !title.trim()}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {editTodo ? 'Saving...' : 'Creating...'}
                </>
              ) : (
                editTodo ? 'Save' : 'Create'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

