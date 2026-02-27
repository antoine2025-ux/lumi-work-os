"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import { useWorkspace } from "@/lib/workspace-context"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, Loader2, Target, Calendar, X, Users, LayoutGrid } from "lucide-react"
import { setProjectSlackHints } from "@/lib/client-state/project-slack-hints"
import { ProjectTemplateSelector } from "@/components/projects/ProjectTemplateSelector"
import type { ProjectTemplateData } from "@/lib/projects/templates"

interface Space {
  id: string
  name: string
  icon?: string | null
  color?: string | null
  visibility: string
}

interface CreateProjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialWorkspaceId?: string
  initialSpaceId?: string
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
  initialSpaceId,
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

  // Visibility state
  const [visibility, setVisibility] = useState<'PUBLIC' | 'TARGETED'>('PUBLIC')
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([])
  const [workspaceMembers, setWorkspaceMembers] = useState<Array<{ id: string; name: string; email: string; orgPositionTitle?: string }>>([])
  const [loadingMembers, setLoadingMembers] = useState(false)

  // Space selection
  const [selectedSpaceId, setSelectedSpaceId] = useState<string>('')
  const [spaces, setSpaces] = useState<Space[]>([])
  const [loadingSpaces, setLoadingSpaces] = useState(false)

  // Owner and team members (assignees)
  const [selectedOwnerId, setSelectedOwnerId] = useState<string>('')
  const [selectedAssigneeIds, setSelectedAssigneeIds] = useState<string[]>([])

  // Template selection (null = Blank Project)
  const [selectedTemplate, setSelectedTemplate] = useState<ProjectTemplateData | null>(null)

  // Resolve workspaceId: use initialWorkspaceId if provided, otherwise use current workspace
  // Note: This design supports a future visible workspace selector in the UI
  const resolvedWorkspaceId = initialWorkspaceId || currentWorkspace?.id

  const { data: session } = useSession()

  const loadWorkspaceMembers = useCallback(async () => {
    if (!resolvedWorkspaceId) return
    try {
      setLoadingMembers(true)
      const response = await fetch('/api/workspaces/current/members')
      if (response.ok) {
        const data = await response.json()
        type MemberItem = {
          userId: string
          user?: { name?: string; email?: string }
          orgPositionTitle?: string | null
        }
        setWorkspaceMembers(
          (data.members as MemberItem[] | undefined)?.map((m) => ({
            id: m.userId,
            name: m.user?.name || m.user?.email || 'Unknown',
            email: (m.user?.email as string) || '',
            orgPositionTitle: m.orgPositionTitle ?? undefined,
          })) ?? []
        )
      }
    } catch (error) {
      console.error('Error loading workspace members:', error)
    } finally {
      setLoadingMembers(false)
    }
  }, [resolvedWorkspaceId])

  const loadSpaces = useCallback(async () => {
    try {
      setLoadingSpaces(true)
      const response = await fetch('/api/spaces')
      if (response.ok) {
        const data = await response.json()
        setSpaces(data.spaces ?? [])
      }
    } catch (error) {
      console.error('Error loading spaces:', error)
    } finally {
      setLoadingSpaces(false)
    }
  }, [])

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
      setVisibility('PUBLIC')
      setSelectedMemberIds([])
      setSelectedOwnerId('')
      setSelectedAssigneeIds([])
      setSelectedSpaceId(initialSpaceId ?? '')
      setSelectedTemplate(null)
    }
  }, [open, initialSpaceId])

  // Load workspace members whenever dialog opens (for owner and assignee pickers)
  useEffect(() => {
    if (open && resolvedWorkspaceId) {
      loadWorkspaceMembers()
    } else {
      setWorkspaceMembers([])
    }
  }, [open, resolvedWorkspaceId, loadWorkspaceMembers])

  // Load spaces when dialog opens
  useEffect(() => {
    if (open) {
      loadSpaces()
    }
  }, [open, loadSpaces])

  // Default owner to current user when members load
  const currentUserId = session?.user?.id
  useEffect(() => {
    if (open && workspaceMembers.length > 0 && currentUserId && selectedOwnerId === '') {
      const found = workspaceMembers.some((m) => m.id === currentUserId)
      if (found) {
        setSelectedOwnerId(currentUserId)
      }
    }
  }, [open, workspaceMembers, currentUserId, selectedOwnerId])

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

    if (!selectedSpaceId) {
      newErrors.space = 'Space is required'
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
        priority: formData.priority,
        spaceId: selectedSpaceId,
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
      
      // New visibility-based flow
      requestBody.visibility = visibility
      if (visibility === 'TARGETED' && selectedMemberIds.length > 0) {
        requestBody.memberUserIds = selectedMemberIds
      }

      if (selectedOwnerId) {
        requestBody.ownerId = selectedOwnerId
      }
      if (selectedAssigneeIds.length > 0) {
        requestBody.assigneeIds = selectedAssigneeIds
      }

      if (selectedTemplate) {
        requestBody.templateData = selectedTemplate
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
        const raw = errorData.error ?? errorData.message
        const errorMessage = typeof raw === 'object' && raw !== null && 'message' in raw
          ? (raw as { message?: string }).message ?? 'Failed to create project'
          : (typeof raw === 'string' ? raw : 'Failed to create project')
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
            Create a new project to organize your team&apos;s work
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Template Selection */}
          <ProjectTemplateSelector
            selectedTemplate={selectedTemplate}
            onSelect={setSelectedTemplate}
          />

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

          {/* Space Selector */}
          <div className="space-y-2">
            <Label htmlFor="space" className="flex items-center gap-2">
              <LayoutGrid className="h-4 w-4" />
              Space <span className="text-red-500">*</span>
            </Label>
            <p className="text-xs text-muted-foreground">
              Which space should this project belong to?
            </p>
            {loadingSpaces ? (
              <div className="text-sm text-muted-foreground">Loading spaces...</div>
            ) : (
              <Select
                value={selectedSpaceId || '_none'}
                onValueChange={(v) => {
                  setSelectedSpaceId(v === '_none' ? '' : v)
                  if (errors.space) {
                    setErrors(prev => { const e = { ...prev }; delete e.space; return e })
                  }
                }}
                disabled={isLoading}
              >
                <SelectTrigger id="space" className={errors.space ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select a space" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none" disabled>Select a space</SelectItem>
                  {spaces.map((space) => (
                    <SelectItem key={space.id} value={space.id}>
                      {space.icon ? `${space.icon} ` : ''}{space.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {errors.space && (
              <p className="text-sm text-red-500 flex items-center space-x-1">
                <AlertCircle className="h-4 w-4" />
                <span>{errors.space}</span>
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

          {/* Visibility Toggle */}
          <div className="space-y-2">
            <Label>Visibility</Label>
            <div className="flex gap-4">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="visibility"
                  value="PUBLIC"
                  checked={visibility === 'PUBLIC'}
                  onChange={(e) => setVisibility(e.target.value as 'PUBLIC' | 'TARGETED')}
                  disabled={isLoading}
                  className="w-4 h-4"
                />
                <span className="text-sm">Public</span>
                <Badge variant="default" className="text-xs">All workspace members</Badge>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="visibility"
                  value="TARGETED"
                  checked={visibility === 'TARGETED'}
                  onChange={(e) => setVisibility(e.target.value as 'PUBLIC' | 'TARGETED')}
                  disabled={isLoading}
                  className="w-4 h-4"
                />
                <span className="text-sm">Private</span>
                <Badge variant="secondary" className="text-xs">Selected members only</Badge>
              </label>
            </div>
            <p className="text-xs text-muted-foreground">
              {visibility === 'PUBLIC' 
                ? 'All workspace members will be able to view and access this project.'
                : 'Only selected members will be able to view and access this project. You will be added automatically.'}
            </p>
          </div>

          {/* Member Picker (only for Private) */}
          {visibility === 'TARGETED' && (
            <div className="space-y-2">
              <Label>Add Members</Label>
              {loadingMembers ? (
                <div className="text-sm text-muted-foreground">Loading members...</div>
              ) : workspaceMembers.length === 0 ? (
                <div className="text-sm text-muted-foreground">No workspace members found.</div>
              ) : (
                <div className="border rounded-md p-3 max-h-48 overflow-y-auto space-y-2">
                  {workspaceMembers.map((member) => (
                    <label key={member.id} className="flex items-center space-x-2 cursor-pointer hover:bg-muted p-2 rounded">
                      <input
                        type="checkbox"
                        checked={selectedMemberIds.includes(member.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedMemberIds([...selectedMemberIds, member.id])
                          } else {
                            setSelectedMemberIds(selectedMemberIds.filter(id => id !== member.id))
                          }
                        }}
                        disabled={isLoading}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">{member.name}</span>
                      {member.email && (
                        <span className="text-xs text-muted-foreground">({member.email})</span>
                      )}
                    </label>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Select workspace members who should have access to this private project.
              </p>
            </div>
          )}

          {/* Project Owner */}
          <div className="space-y-2">
            <Label htmlFor="owner" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Project Owner
            </Label>
            <p className="text-xs text-muted-foreground">
              Who is responsible for this project?
            </p>
            {loadingMembers ? (
              <div className="text-sm text-muted-foreground">Loading members...</div>
            ) : (
              <Select
                value={selectedOwnerId || '_none'}
                onValueChange={(v) => setSelectedOwnerId(v === '_none' ? '' : v)}
                disabled={isLoading}
              >
                <SelectTrigger id="owner">
                  <SelectValue placeholder="Select owner" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">No owner</SelectItem>
                  {workspaceMembers.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.name}
                      {member.orgPositionTitle ? ` - ${member.orgPositionTitle}` : ''}
                      {member.email && (
                        <span className="text-muted-foreground ml-1">({member.email})</span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Team Members (assignees) */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Assign Team Members
            </Label>
            <p className="text-xs text-muted-foreground">
              Who will work on this project?
            </p>
            <div className="flex flex-wrap gap-2">
              {selectedAssigneeIds.map((id) => {
                const member = workspaceMembers.find((m) => m.id === id)
                return (
                  <Badge
                    key={id}
                    variant="secondary"
                    className="flex items-center gap-1"
                  >
                    {member?.name ?? id}
                    <button
                      type="button"
                      onClick={() => setSelectedAssigneeIds((prev) => prev.filter((i) => i !== id))}
                      className="ml-1 hover:opacity-70"
                      disabled={isLoading}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )
              })}
            </div>
            {loadingMembers ? (
              <div className="text-sm text-muted-foreground">Loading members...</div>
            ) : workspaceMembers.length === 0 ? (
              <div className="text-sm text-muted-foreground">No workspace members found.</div>
            ) : (() => {
              const available = workspaceMembers.filter((m) => !selectedAssigneeIds.includes(m.id))
              return available.length > 0 ? (
                <Select
                  value="_add"
                  onValueChange={(v) => {
                    if (v !== '_add' && !selectedAssigneeIds.includes(v)) {
                      setSelectedAssigneeIds((prev) => [...prev, v])
                    }
                  }}
                  disabled={isLoading}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Add member" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_add" disabled>
                      Add member
                    </SelectItem>
                    {available.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.name}
                        {member.orgPositionTitle ? ` - ${member.orgPositionTitle}` : ''}
                        {member.email && (
                          <span className="text-muted-foreground ml-1">({member.email})</span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="text-sm text-muted-foreground">All members added</div>
              )
            })()}
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

          {/* Error Message */}
          {errors.submit && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600 flex items-center space-x-1">
                <AlertCircle className="h-4 w-4" />
                <span>{typeof errors.submit === 'string' ? errors.submit : (errors.submit as { message?: string })?.message ?? String(errors.submit)}</span>
              </p>
            </div>
          )}

          {errors.workspace && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600 flex items-center space-x-1">
                <AlertCircle className="h-4 w-4" />
                <span>{typeof errors.workspace === 'string' ? errors.workspace : (errors.workspace as { message?: string })?.message ?? String(errors.workspace)}</span>
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

