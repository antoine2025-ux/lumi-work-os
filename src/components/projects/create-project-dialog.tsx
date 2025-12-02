"use client"

import { useState, useEffect } from "react"
import { useWorkspace } from "@/lib/workspace-context"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, Loader2, Target, Calendar, Sparkles, X } from "lucide-react"
import { setProjectSlackHints } from "@/lib/client-state/project-slack-hints"

interface CreateProjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialWorkspaceId?: string
  onProjectCreated?: (project: { id: string; name: string }) => void
}

interface ProjectFormData {
  name: string
  description: string
  status: 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED'
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  startDate: string
  endDate: string
}

const statusOptions = [
  { value: 'ACTIVE' as const, label: 'Active', color: 'bg-green-100 text-green-800' },
  { value: 'ON_HOLD' as const, label: 'On Hold', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'COMPLETED' as const, label: 'Completed', color: 'bg-blue-100 text-blue-800' },
  { value: 'CANCELLED' as const, label: 'Cancelled', color: 'bg-red-100 text-red-800' }
]

const priorityOptions = [
  { value: 'LOW' as const, label: 'Low', color: 'bg-green-100 text-green-800' },
  { value: 'MEDIUM' as const, label: 'Medium', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'HIGH' as const, label: 'High', color: 'bg-orange-100 text-orange-800' },
  { value: 'URGENT' as const, label: 'Urgent', color: 'bg-red-100 text-red-800' }
]

export function CreateProjectDialog({
  open,
  onOpenChange,
  initialWorkspaceId,
  onProjectCreated
}: CreateProjectDialogProps) {
  const { currentWorkspace } = useWorkspace()
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  
  const [formData, setFormData] = useState<ProjectFormData>({
    name: '',
    description: '',
    status: 'ACTIVE',
    priority: 'MEDIUM',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
  })

  // Channel hints state (client-side only, not sent to backend)
  const [channelInput, setChannelInput] = useState('')
  const [channelList, setChannelList] = useState<string[]>([])

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setFormData({
        name: '',
        description: '',
        status: 'ACTIVE',
        priority: 'MEDIUM',
        startDate: new Date().toISOString().split('T')[0],
        endDate: '',
      })
      setChannelInput('')
      setChannelList([])
      setErrors({})
    }
  }, [open])

  // Resolve workspaceId: use initialWorkspaceId if provided, otherwise use current workspace
  // Note: This design supports a future visible workspace selector in the UI
  const resolvedWorkspaceId = initialWorkspaceId || currentWorkspace?.id

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Project name is required'
    }

    if (formData.startDate && formData.endDate) {
      const start = new Date(formData.startDate)
      const end = new Date(formData.endDate)
      if (end < start) {
        newErrors.endDate = 'End date must be after start date'
      }
    }

    if (!resolvedWorkspaceId) {
      newErrors.workspace = 'Workspace is required'
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
      // Build request body with only MVP fields
      const requestBody: Record<string, unknown> = {
        workspaceId: resolvedWorkspaceId,
        name: formData.name.trim(),
        status: formData.status,
        priority: formData.priority
      }

      // Only include optional fields if they have values
      if (formData.description.trim()) {
        requestBody.description = formData.description.trim()
      }
      if (formData.startDate) {
        requestBody.startDate = formData.startDate
      }
      if (formData.endDate) {
        requestBody.endDate = formData.endDate
      }

      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      if (response.ok) {
        const project = await response.json()
        
        console.log('[CreateProjectDialog] created project', project.id)
        
        // Save channel hints to localStorage (client-side only)
        if (channelList.length > 0) {
          setProjectSlackHints(project.id, channelList)
        }
        
        // Call success callback if provided (parent handles refresh/navigation)
        onProjectCreated?.(project)
        
        // Close dialog
        onOpenChange(false)
      } else {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.error || errorData.message || 'Failed to create project'
        setErrors({ submit: errorMessage })
      }
    } catch (error) {
      console.error('Error creating project:', error)
      setErrors({ submit: 'An unexpected error occurred. Please try again.' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (field: keyof ProjectFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Target className="h-5 w-5" />
            <span>Create New Project</span>
          </DialogTitle>
          <DialogDescription>
            Create a new project to organize your team's work
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Project Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Project Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Enter project name"
              className={errors.name ? 'border-red-500' : ''}
              disabled={isLoading}
            />
            {errors.name && (
              <p className="text-sm text-red-500 flex items-center space-x-1">
                <AlertCircle className="h-4 w-4" />
                <span>{errors.name}</span>
              </p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Describe what this project is about"
              rows={3}
              disabled={isLoading}
            />
          </div>

          {/* Slack Channels (client-side only) */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Related Channels (optional)</Label>
            <p className="text-xs text-muted-foreground">
              Add Slack channel names to help Loopbrain understand project context. These are stored locally and not sent to the server.
            </p>
            <div className="flex flex-wrap gap-2 mt-2">
              {channelList.map((channel, idx) => (
                <Badge
                  key={idx}
                  variant="outline"
                  className="flex items-center gap-1"
                >
                  #{channel}
                  <button
                    type="button"
                    onClick={() => {
                      setChannelList(prev => prev.filter((_, i) => i !== idx))
                    }}
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
                placeholder="Add channel (e.g. loopbrain-architecture)"
                value={channelInput}
                onChange={(e) => setChannelInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    const channel = channelInput.trim().replace(/^#/, '')
                    if (channel && !channelList.includes(channel)) {
                      setChannelList(prev => [...prev, channel])
                      setChannelInput('')
                    }
                  }
                }}
                className="flex-1"
                disabled={isLoading}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const channel = channelInput.trim().replace(/^#/, '')
                  if (channel && !channelList.includes(channel)) {
                    setChannelList(prev => [...prev, channel])
                    setChannelInput('')
                  }
                }}
                disabled={isLoading || !channelInput.trim()}
              >
                Add
              </Button>
            </div>
          </div>

          {/* Status and Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => handleInputChange('status', value)}
                disabled={isLoading}
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
                disabled={isLoading}
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

          {/* Start Date and End Date */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => handleInputChange('startDate', e.target.value)}
                  className="pl-10"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => handleInputChange('endDate', e.target.value)}
                  className={`pl-10 ${errors.endDate ? 'border-red-500' : ''}`}
                  disabled={isLoading}
                />
              </div>
              {errors.endDate && (
                <p className="text-sm text-red-500 flex items-center space-x-1">
                  <AlertCircle className="h-4 w-4" />
                  <span>{errors.endDate}</span>
                </p>
              )}
            </div>
          </div>

          {/* AI Project Suggestion Placeholder */}
          {/* TODO: Add AI project suggestion feature here */}
          {/* This section is reserved for future AI-powered project creation assistance */}
          <div className="pt-4 border-t border-muted">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Sparkles className="h-4 w-4" />
              <span>AI project suggestions coming soon</span>
            </div>
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

          {errors.workspace && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600 flex items-center space-x-1">
                <AlertCircle className="h-4 w-4" />
                <span>{errors.workspace}</span>
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
              disabled={isLoading || !formData.name.trim()}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Project'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

