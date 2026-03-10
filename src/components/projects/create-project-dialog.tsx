"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import { useWorkspace } from "@/lib/workspace-context"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, Loader2, Target, Calendar, X, Users, LayoutGrid, Globe, Lock, AlignLeft, User, Hash, Circle, AlertTriangle, FileText } from "lucide-react"
import { setProjectSlackHints } from "@/lib/client-state/project-slack-hints"
import type { ProjectTemplateData } from "@/lib/projects/templates"
import { PROJECT_TEMPLATES } from "@/lib/projects/templates"
import { cn } from "@/lib/utils"

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

// Helper to get task count from template
function getTaskCount(template: ProjectTemplateData): number {
  return template.taskGroups.reduce((sum, group) => sum + group.tasks.length, 0)
}

// Group templates by category for dropdown
const templatesByCategory = {
  engineering: PROJECT_TEMPLATES.filter(t => t.category === 'engineering'),
  product: PROJECT_TEMPLATES.filter(t => t.category === 'product'),
  marketing: PROJECT_TEMPLATES.filter(t => t.category === 'marketing'),
  operations: PROJECT_TEMPLATES.filter(t => t.category === 'operations'),
  general: PROJECT_TEMPLATES.filter(t => t.category === 'general' && t.id !== 'blank'),
}

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
  const [defaultSpaceId, setDefaultSpaceId] = useState<string | null>(null)

  // Owner and team members (assignees)
  const [selectedOwnerId, setSelectedOwnerId] = useState<string>('')
  const [selectedAssigneeIds, setSelectedAssigneeIds] = useState<string[]>([])

  // Template selection (null = Blank Project)
  const [selectedTemplate, setSelectedTemplate] = useState<ProjectTemplateData | null>(null)

  // Expanded option state (only one pill expanded at a time)
  const [expandedOption, setExpandedOption] = useState<
    'template' | 'space' | 'description' | 'visibility' | 'owner' | 'assignees' | 
    'channels' | 'status' | 'priority' | 'startDate' | 'endDate' | null
  >(null)

  // Resolve workspaceId: use initialWorkspaceId if provided, otherwise use current workspace
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
      
      // Load available spaces
      const spacesResponse = await fetch('/api/spaces')
      if (spacesResponse.ok) {
        const spacesData = await spacesResponse.json()
        setSpaces(spacesData.spaces ?? [])
      }
      
      // Load default space suggestion
      const defaultResponse = await fetch('/api/spaces/default')
      if (defaultResponse.ok) {
        const defaultData = await defaultResponse.json()
        if (defaultData.defaultSpaceId) {
          setDefaultSpaceId(defaultData.defaultSpaceId)
          
          // Pre-select the default space if no space is already selected
          if (!selectedSpaceId && !initialSpaceId) {
            setSelectedSpaceId(defaultData.defaultSpaceId)
          }
        }
      }
    } catch (error) {
      console.error('Error loading spaces:', error)
    } finally {
      setLoadingSpaces(false)
    }
  }, [selectedSpaceId, initialSpaceId])

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
      setExpandedOption(null)
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

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Project Name - No Label */}
          <div className="space-y-2">
            <Input
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Project name *"
              className={errors.name ? 'border-red-500' : ''}
              disabled={isLoading}
              autoFocus
            />
            {errors.name && (
              <p className="text-sm text-red-500 flex items-center space-x-1">
                <AlertCircle className="h-4 w-4" />
                <span>{errors.name}</span>
              </p>
            )}
          </div>

          {/* Row 1 - Core Settings */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Template Pill */}
            <button
              type="button"
              onClick={() => setExpandedOption(expandedOption === 'template' ? null : 'template')}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-md border border-border text-sm transition-colors",
                expandedOption === 'template' ? "bg-accent" : "hover:bg-accent/50"
              )}
            >
              <FileText className="w-4 h-4" />
              <span className="text-muted-foreground">Template</span>
              <span className="text-foreground">
                {selectedTemplate ? selectedTemplate.name : 'Blank'}
              </span>
            </button>

            {/* Space Pill */}
            <button
              type="button"
              onClick={() => setExpandedOption(expandedOption === 'space' ? null : 'space')}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-md border border-border text-sm transition-colors",
                expandedOption === 'space' ? "bg-accent" : "hover:bg-accent/50",
                errors.space && "border-red-500"
              )}
            >
              <LayoutGrid className="w-4 h-4" />
              <span className="text-muted-foreground">Space *</span>
              <span className="text-foreground">
                {selectedSpaceId ? spaces.find(s => s.id === selectedSpaceId)?.name : 'Not set'}
              </span>
            </button>

            {/* Description Pill */}
            <button
              type="button"
              onClick={() => setExpandedOption(expandedOption === 'description' ? null : 'description')}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-md border border-border text-sm transition-colors",
                expandedOption === 'description' ? "bg-accent" : "hover:bg-accent/50"
              )}
            >
              <AlignLeft className="w-4 h-4" />
              <span className="text-muted-foreground">Description</span>
              <span className="text-foreground">
                {formData.description ? (formData.description.length > 20 ? formData.description.slice(0, 20) + '...' : formData.description) : 'Not set'}
              </span>
            </button>

            {/* Visibility Pill */}
            <button
              type="button"
              onClick={() => setExpandedOption(expandedOption === 'visibility' ? null : 'visibility')}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-md border border-border text-sm transition-colors",
                expandedOption === 'visibility' ? "bg-accent" : "hover:bg-accent/50"
              )}
            >
              {visibility === 'PUBLIC' ? <Globe className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
              <span className="text-muted-foreground">Visibility</span>
              <span className="text-foreground">{visibility === 'PUBLIC' ? 'Public' : 'Private'}</span>
            </button>
          </div>

          {/* Row 2 - People */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Owner Pill */}
            <button
              type="button"
              onClick={() => setExpandedOption(expandedOption === 'owner' ? null : 'owner')}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-md border border-border text-sm transition-colors",
                expandedOption === 'owner' ? "bg-accent" : "hover:bg-accent/50"
              )}
            >
              <User className="w-4 h-4" />
              <span className="text-muted-foreground">Owner</span>
              <span className="text-foreground">
                {selectedOwnerId ? workspaceMembers.find(m => m.id === selectedOwnerId)?.name : 'Not set'}
              </span>
            </button>

            {/* Assignees Pill */}
            <button
              type="button"
              onClick={() => setExpandedOption(expandedOption === 'assignees' ? null : 'assignees')}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-md border border-border text-sm transition-colors",
                expandedOption === 'assignees' ? "bg-accent" : "hover:bg-accent/50"
              )}
            >
              <Users className="w-4 h-4" />
              <span className="text-muted-foreground">Assignees</span>
              <span className="text-foreground">
                {selectedAssigneeIds.length > 0 ? `${selectedAssigneeIds.length} selected` : 'None'}
              </span>
            </button>

            {/* Channels Pill */}
            <button
              type="button"
              onClick={() => setExpandedOption(expandedOption === 'channels' ? null : 'channels')}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-md border border-border text-sm transition-colors",
                expandedOption === 'channels' ? "bg-accent" : "hover:bg-accent/50"
              )}
            >
              <Hash className="w-4 h-4" />
              <span className="text-muted-foreground">Channels</span>
              <span className="text-foreground">
                {channelList.length > 0 ? `${channelList.length} channel${channelList.length !== 1 ? 's' : ''}` : 'None'}
              </span>
            </button>
          </div>

          {/* Row 3 - Scheduling */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Status Pill */}
            <button
              type="button"
              onClick={() => setExpandedOption(expandedOption === 'status' ? null : 'status')}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-md border border-border text-sm transition-colors",
                expandedOption === 'status' ? "bg-accent" : "hover:bg-accent/50"
              )}
            >
              <Circle className="w-4 h-4" />
              <span className="text-muted-foreground">Status</span>
              <Badge className={statusOptions.find(o => o.value === formData.status)?.color}>
                {statusOptions.find(o => o.value === formData.status)?.label}
              </Badge>
            </button>

            {/* Priority Pill */}
            <button
              type="button"
              onClick={() => setExpandedOption(expandedOption === 'priority' ? null : 'priority')}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-md border border-border text-sm transition-colors",
                expandedOption === 'priority' ? "bg-accent" : "hover:bg-accent/50"
              )}
            >
              <AlertTriangle className="w-4 h-4" />
              <span className="text-muted-foreground">Priority</span>
              <Badge className={priorityOptions.find(o => o.value === formData.priority)?.color}>
                {priorityOptions.find(o => o.value === formData.priority)?.label}
              </Badge>
            </button>
          </div>

          {/* Row 4 - Dates */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Start Date Pill */}
            <button
              type="button"
              onClick={() => setExpandedOption(expandedOption === 'startDate' ? null : 'startDate')}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-md border border-border text-sm transition-colors",
                expandedOption === 'startDate' ? "bg-accent" : "hover:bg-accent/50"
              )}
            >
              <Calendar className="w-4 h-4" />
              <span className="text-muted-foreground">Start Date</span>
              <span className="text-foreground">
                {formData.startDate ? new Date(formData.startDate).toLocaleDateString() : 'Not set'}
              </span>
            </button>

            {/* End Date Pill */}
            <button
              type="button"
              onClick={() => setExpandedOption(expandedOption === 'endDate' ? null : 'endDate')}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-md border border-border text-sm transition-colors",
                expandedOption === 'endDate' ? "bg-accent" : "hover:bg-accent/50",
                errors.endDate && "border-red-500"
              )}
            >
              <Calendar className="w-4 h-4" />
              <span className="text-muted-foreground">End Date</span>
              <span className="text-foreground">
                {formData.endDate ? new Date(formData.endDate).toLocaleDateString() : 'Not set'}
              </span>
            </button>
          </div>

          {/* Expanded Options */}
          {expandedOption === 'template' && (
            <div className="pt-2">
              <Select
                value={selectedTemplate?.id || 'blank'}
                onValueChange={(v) => {
                  if (v === 'blank') {
                    setSelectedTemplate(null)
                  } else {
                    const template = PROJECT_TEMPLATES.find(t => t.id === v)
                    setSelectedTemplate(template || null)
                  }
                }}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a template" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="blank">
                    Blank Project (0 tasks)
                  </SelectItem>
                  
                  {templatesByCategory.engineering.length > 0 && (
                    <SelectGroup>
                      <SelectLabel>Engineering</SelectLabel>
                      {templatesByCategory.engineering.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name} ({getTaskCount(template)} tasks)
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  )}
                  
                  {templatesByCategory.product.length > 0 && (
                    <SelectGroup>
                      <SelectLabel>Product</SelectLabel>
                      {templatesByCategory.product.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name} ({getTaskCount(template)} tasks)
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  )}
                  
                  {templatesByCategory.marketing.length > 0 && (
                    <SelectGroup>
                      <SelectLabel>Marketing</SelectLabel>
                      {templatesByCategory.marketing.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name} ({getTaskCount(template)} tasks)
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  )}
                  
                  {templatesByCategory.operations.length > 0 && (
                    <SelectGroup>
                      <SelectLabel>Operations</SelectLabel>
                      {templatesByCategory.operations.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name} ({getTaskCount(template)} tasks)
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  )}
                  
                  {templatesByCategory.general.length > 0 && (
                    <SelectGroup>
                      <SelectLabel>General</SelectLabel>
                      {templatesByCategory.general.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name} ({getTaskCount(template)} tasks)
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          {expandedOption === 'space' && (
            <div className="pt-2">
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
                  <SelectTrigger className={errors.space ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Select a space" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none" disabled>Select a space</SelectItem>
                    {spaces.map((space) => (
                      <SelectItem key={space.id} value={space.id}>
                        <div className="flex items-center justify-between w-full">
                          <span>{space.icon ? `${space.icon} ` : ''}{space.name}</span>
                          {space.id === defaultSpaceId && (
                            <span className="ml-2 text-xs text-muted-foreground">
                              (suggested)
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {errors.space && (
                <p className="text-sm text-red-500 flex items-center space-x-1 mt-1">
                  <AlertCircle className="h-4 w-4" />
                  <span>{errors.space}</span>
                </p>
              )}
            </div>
          )}

          {expandedOption === 'description' && (
            <div className="pt-2">
              <Textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Describe what this project is about"
                rows={3}
                disabled={isLoading}
              />
            </div>
          )}

          {expandedOption === 'visibility' && (
            <div className="pt-2 space-y-3">
              {/* Visibility Radio Buttons */}
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setVisibility('PUBLIC')}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-md border text-left transition-colors",
                    visibility === 'PUBLIC' 
                      ? "border-primary bg-accent" 
                      : "border-border hover:bg-accent/50"
                  )}
                >
                  <Globe className="w-4 h-4" />
                  <div>
                    <div className="font-medium text-sm">Public</div>
                    <div className="text-xs text-muted-foreground">All workspace members</div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setVisibility('TARGETED')}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-md border text-left transition-colors",
                    visibility === 'TARGETED' 
                      ? "border-primary bg-accent" 
                      : "border-border hover:bg-accent/50"
                  )}
                >
                  <Lock className="w-4 h-4" />
                  <div>
                    <div className="font-medium text-sm">Private</div>
                    <div className="text-xs text-muted-foreground">Selected members only</div>
                  </div>
                </button>
              </div>

              {/* Member Picker (only for TARGETED) */}
              {visibility === 'TARGETED' && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Select members who can access this project:</p>
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
                </div>
              )}
            </div>
          )}

          {expandedOption === 'owner' && (
            <div className="pt-2">
              {loadingMembers ? (
                <div className="text-sm text-muted-foreground">Loading members...</div>
              ) : (
                <Select
                  value={selectedOwnerId || '_none'}
                  onValueChange={(v) => setSelectedOwnerId(v === '_none' ? '' : v)}
                  disabled={isLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select owner" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">No owner</SelectItem>
                    {workspaceMembers.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.name}
                        {member.orgPositionTitle ? ` - ${member.orgPositionTitle}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          {expandedOption === 'assignees' && (
            <div className="pt-2 space-y-2">
              {/* Selected Assignees Badges */}
              {selectedAssigneeIds.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedAssigneeIds.map((id) => {
                    const member = workspaceMembers.find((m) => m.id === id)
                    return (
                      <Badge key={id} variant="secondary" className="flex items-center gap-1">
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
              )}
              
              {/* Add Assignee Dropdown */}
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
                    <SelectTrigger>
                      <SelectValue placeholder="Add member" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_add" disabled>Add member</SelectItem>
                      {available.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.name}
                          {member.orgPositionTitle ? ` - ${member.orgPositionTitle}` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="text-sm text-muted-foreground">All members added</div>
                )
              })()}
            </div>
          )}

          {expandedOption === 'channels' && (
            <div className="pt-2 space-y-2">
              {/* Channel Badges */}
              {channelList.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {channelList.map((channel, idx) => (
                    <Badge key={idx} variant="outline" className="flex items-center gap-1">
                      #{channel}
                      <button
                        type="button"
                        onClick={() => setChannelList(prev => prev.filter((_, i) => i !== idx))}
                        className="ml-1 hover:opacity-70"
                        disabled={isLoading}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              
              {/* Add Channel Input */}
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
              <p className="text-xs text-muted-foreground">
                Slack channel names stored locally for Loopbrain context
              </p>
            </div>
          )}

          {expandedOption === 'status' && (
            <div className="pt-2 space-y-2">
              {statusOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleInputChange('status', option.value)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-md border text-left transition-colors",
                    formData.status === option.value 
                      ? "border-primary bg-accent" 
                      : "border-border hover:bg-accent/50"
                  )}
                >
                  <Badge className={option.color}>{option.label}</Badge>
                </button>
              ))}
            </div>
          )}

          {expandedOption === 'priority' && (
            <div className="pt-2 space-y-2">
              {priorityOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleInputChange('priority', option.value)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-md border text-left transition-colors",
                    formData.priority === option.value 
                      ? "border-primary bg-accent" 
                      : "border-border hover:bg-accent/50"
                  )}
                >
                  <Badge className={option.color}>{option.label}</Badge>
                </button>
              ))}
            </div>
          )}

          {expandedOption === 'startDate' && (
            <div className="pt-2">
              <Input
                type="date"
                value={formData.startDate}
                onChange={(e) => handleInputChange('startDate', e.target.value)}
                disabled={isLoading}
              />
            </div>
          )}

          {expandedOption === 'endDate' && (
            <div className="pt-2">
              <Input
                type="date"
                value={formData.endDate}
                onChange={(e) => handleInputChange('endDate', e.target.value)}
                className={errors.endDate ? 'border-red-500' : ''}
                disabled={isLoading}
              />
              {errors.endDate && (
                <p className="text-sm text-red-500 flex items-center space-x-1 mt-1">
                  <AlertCircle className="h-4 w-4" />
                  <span>{errors.endDate}</span>
                </p>
              )}
            </div>
          )}

          {/* Error Messages */}
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
