"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import { useWorkspace } from "@/lib/workspace-context"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, Loader2, Target, Calendar, X, Users, Globe, Lock, User, Hash, Circle, AlertTriangle, FileText } from "lucide-react"
import { CalendarDatePicker } from "@/components/ui/calendar-date-picker"
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
  type?: string | null
  slug?: string | null
}

interface ProjectToEdit {
  id: string
  name: string
  excerpt?: string | null
  description?: string | null
  status: 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED'
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  startDate?: string | null
  endDate?: string | null
  color?: string | null
  ownerId?: string | null
  assignees?: Array<{ id: string; user: { id: string; name: string; email: string } }>
  owner?: { id: string; name: string; email: string } | null
  projectSpace?: {
    id: string
    name: string
    visibility: 'PUBLIC' | 'TARGETED'
  } | null
  projectSpaceId?: string | null
  teamId?: string | null
  slackChannelHints?: string[]
}

interface CreateProjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialWorkspaceId?: string
  initialSpaceId?: string
  onProjectCreated?: (project: { id: string; name: string }) => void
  // Edit mode props
  mode?: 'create' | 'edit'
  project?: ProjectToEdit | null
  onProjectUpdated?: (project: ProjectToEdit) => void
}

interface ProjectFormData {
  name: string
  excerpt: string
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

const colorOptions = [
  { value: '#3b82f6', label: 'Blue' },
  { value: '#10b981', label: 'Green' },
  { value: '#f59e0b', label: 'Yellow' },
  { value: '#ef4444', label: 'Red' },
  { value: '#8b5cf6', label: 'Purple' },
  { value: '#06b6d4', label: 'Cyan' },
  { value: '#f97316', label: 'Orange' },
  { value: '#84cc16', label: 'Lime' }
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
  onProjectCreated,
  mode = 'create',
  project,
  onProjectUpdated
}: CreateProjectDialogProps) {
  const { currentWorkspace } = useWorkspace()
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  
  const [formData, setFormData] = useState<ProjectFormData>({
    name: '',
    excerpt: '',
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
  
  // Color and team
  const [projectColor, setProjectColor] = useState<string>('#3B82F6')
  const [selectedTeamId, setSelectedTeamId] = useState<string>('')
  const [teams, setTeams] = useState<Array<{ id: string; name: string }>>([])

  // Template selection (null = Blank Project)
  const [selectedTemplate, setSelectedTemplate] = useState<ProjectTemplateData | null>(null)

  // Expanded option state (only one pill expanded at a time)
  const [expandedOption, setExpandedOption] = useState<
    'template' | 'visibility' | 'owner' | 'assignees' | 
    'channels' | 'status' | 'priority' | 'startDate' | 'endDate' | 'color' | 'team' | null
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
    } catch (error: unknown) {
      console.error('Error loading workspace members:', error)
    } finally {
      setLoadingMembers(false)
    }
  }, [resolvedWorkspaceId])

  const loadProjectSpaceMembers = async (projectSpaceId: string) => {
    try {
      const response = await fetch(`/api/project-spaces/${projectSpaceId}/members`)
      if (response.ok) {
        const data = await response.json()
        setSelectedMemberIds(data.members?.map((m: { userId: string }) => m.userId) || [])
      }
    } catch (error: unknown) {
      console.error('Error loading ProjectSpace members:', error)
    }
  }

  const loadSpaces = useCallback(async () => {
    try {
      setLoadingSpaces(true)
      
      // Load available spaces (exclude Company Wiki — it's for docs only, not projects)
      const spacesResponse = await fetch('/api/spaces')
      if (spacesResponse.ok) {
        const spacesData = await spacesResponse.json()
        const allSpaces = spacesData.spaces ?? []
        const projectSpaces = allSpaces.filter(
          (s: Space) =>
            (s.type !== 'WIKI' || !s.type) && (s.slug ?? '') !== 'company-wiki'
        )
        setSpaces(projectSpaces)

        // Load default space suggestion
        const defaultResponse = await fetch('/api/spaces/default')
        if (defaultResponse.ok) {
          const defaultData = await defaultResponse.json()
          const defaultId = defaultData.defaultSpaceId ?? null
          setDefaultSpaceId(defaultId)

          // Resolve selected space: use initialSpaceId only if it's a valid project space
          const isValidInitial = initialSpaceId && projectSpaces.some((s: Space) => s.id === initialSpaceId)
          const fallbackId = defaultId && projectSpaces.some((s: Space) => s.id === defaultId) ? defaultId : projectSpaces[0]?.id ?? ''
          if (!selectedSpaceId && !initialSpaceId) {
            setSelectedSpaceId(fallbackId)
          } else if (initialSpaceId && !isValidInitial) {
            setSelectedSpaceId(fallbackId)
          }
        }
      }
    } catch (error: unknown) {
      console.error('Error loading spaces:', error)
    } finally {
      setLoadingSpaces(false)
    }
  }, [selectedSpaceId, initialSpaceId])

  // Reset form when dialog opens or populate from project in edit mode
  useEffect(() => {
    if (open) {
      if (mode === 'edit' && project) {
        // Populate form with existing project data
        setFormData({
          name: project.name,
          excerpt: project.excerpt || '',
          description: project.description || '',
          status: project.status,
          priority: project.priority,
          startDate: project.startDate ? project.startDate.split('T')[0] : '',
          endDate: project.endDate ? project.endDate.split('T')[0] : '',
        })
        setChannelInput('')
        setChannelList(project.slackChannelHints || [])
        setErrors({})
        
        // Set visibility based on projectSpace
        const currentVisibility = project.projectSpace?.visibility || 
                                  (project.projectSpaceId ? 'TARGETED' : 'PUBLIC')
        setVisibility(currentVisibility)
        
        // Set space
        setSelectedSpaceId(project.projectSpaceId || '')
        
        // Set owner
        setSelectedOwnerId(project.ownerId || '')
        
        // Set assignees
        setSelectedAssigneeIds(project.assignees?.map(a => a.user.id) || [])
        
        // Set color and team
        setProjectColor(project.color || '#3B82F6')
        setSelectedTeamId(project.teamId || '')
        
        // Load ProjectSpace members if TARGETED
        if (currentVisibility === 'TARGETED' && project.projectSpaceId) {
          loadProjectSpaceMembers(project.projectSpaceId)
        } else {
          setSelectedMemberIds([])
        }
        
        // No template in edit mode
        setSelectedTemplate(null)
        setExpandedOption(null)
      } else {
        // Create mode - reset to defaults
        setFormData({
          name: '',
          excerpt: '',
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
        setProjectColor('#3B82F6')
        setSelectedTeamId('')
        setSelectedSpaceId(initialSpaceId ?? '')
        setSelectedTemplate(null)
        setExpandedOption(null)
      }
    }
  }, [open, mode, project, initialSpaceId])

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

  // Load teams when dialog opens
  useEffect(() => {
    if (open) {
      fetch('/api/org/teams')
        .then((r) => r.json())
        .then((data) => setTeams(data.teams || []))
        .catch(() => setTeams([]))
    }
  }, [open])

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

    if (!selectedSpaceId || selectedSpaceId === '_none') {
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
      // Build request body
      const requestBody: Record<string, unknown> = {
        name: formData.name.trim(),
        status: formData.status,
        priority: formData.priority,
      }

      // Only include optional fields if they have values
      if (formData.excerpt.trim()) {
        requestBody.excerpt = formData.excerpt.trim()
      }
      if (formData.description.trim()) {
        requestBody.description = formData.description.trim()
      }
      if (formData.startDate) {
        requestBody.startDate = formData.startDate
      }
      if (formData.endDate) {
        requestBody.endDate = formData.endDate
      }

      if (selectedOwnerId) {
        requestBody.ownerId = selectedOwnerId
      }
      if (selectedAssigneeIds.length > 0) {
        requestBody.assigneeIds = selectedAssigneeIds
      }
      if (projectColor && projectColor !== '#3B82F6') {
        requestBody.color = projectColor
      }
      if (selectedTeamId) {
        requestBody.teamId = selectedTeamId
      }

      // Include slackChannelHints (client-side only)
      if (channelList.length > 0) {
        requestBody.slackChannelHints = channelList
      }

      // Mode-specific fields
      if (mode === 'create') {
        requestBody.workspaceId = resolvedWorkspaceId
        requestBody.spaceId = selectedSpaceId
        requestBody.visibility = visibility
        if (visibility === 'TARGETED' && selectedMemberIds.length > 0) {
          requestBody.memberUserIds = selectedMemberIds
        }
        if (selectedTemplate) {
          requestBody.templateData = selectedTemplate
        }
      } else {
        // Edit mode - include visibility changes
        const currentVisibility = project?.projectSpace?.visibility || 
                                  (project?.projectSpaceId ? 'TARGETED' : 'PUBLIC')
        if (visibility !== currentVisibility) {
          requestBody.visibility = visibility
          if (visibility === 'TARGETED' && selectedMemberIds.length > 0) {
            requestBody.memberUserIds = selectedMemberIds
          }
        }
      }

      const url = mode === 'create' ? '/api/projects' : `/api/projects/${project?.id}`
      const method = mode === 'create' ? 'POST' : 'PUT'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      if (response.ok) {
        const updatedProject = await response.json()
        
        // Save channel hints to localStorage (client-side only)
        if (channelList.length > 0) {
          setProjectSlackHints(updatedProject.id, channelList)
        }
        
        // Call appropriate callback
        if (mode === 'create') {
          onProjectCreated?.(updatedProject)
        } else {
          onProjectUpdated?.(updatedProject)
        }
        
        // Close dialog
        onOpenChange(false)
      } else {
        const errorData = await response.json().catch(() => ({}))
        const raw = errorData.error ?? errorData.message
        const errorMessage = typeof raw === 'object' && raw !== null && 'message' in raw
          ? (raw as { message?: string }).message ?? `Failed to ${mode} project`
          : (typeof raw === 'string' ? raw : `Failed to ${mode} project`)
        setErrors({ submit: errorMessage })
      }
    } catch (error: unknown) {
      console.error(`Error ${mode === 'create' ? 'creating' : 'updating'} project:`, error)
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
      <DialogContent className="max-w-5xl w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <DialogTitle className="flex items-center space-x-2 text-base font-semibold">
              <Target className="h-4 w-4" />
              <span>{mode === 'create' ? 'Create New Project' : 'Edit Project'}</span>
            </DialogTitle>
            {/* Compact space selector */}
            {loadingSpaces ? (
              <span className="text-xs text-muted-foreground">Loading spaces...</span>
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
                <SelectTrigger className={cn(
                  "h-7 w-auto min-w-[120px] max-w-[180px] text-xs border-border",
                  errors.space && "border-red-500"
                )}>
                  <SelectValue placeholder="Select space" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none" disabled>Select space *</SelectItem>
                  {spaces.map((space) => (
                    <SelectItem key={space.id} value={space.id}>
                      {space.name}
                      {space.id === defaultSpaceId ? ' (suggested)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 -mt-1">
          {/* Project name + short summary - unboxed flow */}
          <div className="space-y-1 border-b border-border/50 pb-3">
            <Input
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Project name *"
              className={cn(
                "text-lg font-medium border-0 rounded-none px-0 h-auto py-2 focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground",
                errors.name && "text-red-500"
              )}
              disabled={isLoading}
              autoFocus
            />
            <input
              type="text"
              value={formData.excerpt}
              onChange={(e) => handleInputChange('excerpt', e.target.value)}
              placeholder="Add a short summary..."
              className={cn(
                "w-full text-sm bg-transparent border-0 rounded-none px-0 py-1 focus:outline-none focus:ring-0 placeholder:text-muted-foreground/70",
                formData.excerpt ? "text-foreground" : "text-muted-foreground"
              )}
              disabled={isLoading}
            />
            {errors.name && (
              <p className="text-sm text-red-500 flex items-center space-x-1 pt-0.5">
                <AlertCircle className="h-4 w-4" />
                <span>{errors.name}</span>
              </p>
            )}
          </div>

          {/* Option pills - compact single row, open dropdown from pill */}
          <div className="flex items-center gap-1.5 flex-nowrap overflow-x-auto pb-1 -mx-0.5">
            {/* Template (only in create mode) */}
            {mode === 'create' && (
              <Popover open={expandedOption === 'template'} onOpenChange={(o) => setExpandedOption(o ? 'template' : null)}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      "flex items-center gap-1.5 px-2 py-1 rounded-md border border-border text-xs transition-colors shrink-0",
                      expandedOption === 'template' ? "bg-accent" : "hover:bg-accent/50"
                    )}
                  >
                    <FileText className="w-3.5 h-3.5 shrink-0" />
                    <span className={selectedTemplate ? "text-foreground" : "text-muted-foreground"}>
                      {selectedTemplate ? selectedTemplate.name : "Template"}
                    </span>
                  </button>
                </PopoverTrigger>
              <PopoverContent className="z-[100] w-72 max-h-64 overflow-y-auto p-1" align="start" sideOffset={4}>
                <div className="space-y-0.5">
                  <button type="button" onClick={() => { setSelectedTemplate(null); setExpandedOption(null) }} disabled={isLoading} className={cn("w-full flex items-center gap-1.5 px-2 py-1 rounded-md text-xs text-left transition-colors", !selectedTemplate ? "bg-accent" : "hover:bg-accent/50")}>
                    <FileText className="w-3.5 h-3.5 shrink-0" />
                    Blank Project (0 tasks)
                  </button>
                  {templatesByCategory.engineering.length > 0 && (
                    <>
                      <div className="px-2 py-0.5 text-[10px] font-medium text-muted-foreground uppercase">Engineering</div>
                      {templatesByCategory.engineering.map((t) => (
                        <button key={t.id} type="button" onClick={() => { setSelectedTemplate(t); setExpandedOption(null) }} disabled={isLoading} className={cn("w-full flex items-center gap-1.5 px-2 py-1 rounded-md text-xs text-left transition-colors", selectedTemplate?.id === t.id ? "bg-accent" : "hover:bg-accent/50")}>
                          <FileText className="w-3.5 h-3.5 shrink-0" />
                          {t.name} ({getTaskCount(t)} tasks)
                        </button>
                      ))}
                    </>
                  )}
                  {templatesByCategory.product.length > 0 && (
                    <>
                      <div className="px-2 py-0.5 text-[10px] font-medium text-muted-foreground uppercase">Product</div>
                      {templatesByCategory.product.map((t) => (
                        <button key={t.id} type="button" onClick={() => { setSelectedTemplate(t); setExpandedOption(null) }} disabled={isLoading} className={cn("w-full flex items-center gap-1.5 px-2 py-1 rounded-md text-xs text-left transition-colors", selectedTemplate?.id === t.id ? "bg-accent" : "hover:bg-accent/50")}>
                          <FileText className="w-3.5 h-3.5 shrink-0" />
                          {t.name} ({getTaskCount(t)} tasks)
                        </button>
                      ))}
                    </>
                  )}
                  {templatesByCategory.marketing.length > 0 && (
                    <>
                      <div className="px-2 py-0.5 text-[10px] font-medium text-muted-foreground uppercase">Marketing</div>
                      {templatesByCategory.marketing.map((t) => (
                        <button key={t.id} type="button" onClick={() => { setSelectedTemplate(t); setExpandedOption(null) }} disabled={isLoading} className={cn("w-full flex items-center gap-1.5 px-2 py-1 rounded-md text-xs text-left transition-colors", selectedTemplate?.id === t.id ? "bg-accent" : "hover:bg-accent/50")}>
                          <FileText className="w-3.5 h-3.5 shrink-0" />
                          {t.name} ({getTaskCount(t)} tasks)
                        </button>
                      ))}
                    </>
                  )}
                  {templatesByCategory.operations.length > 0 && (
                    <>
                      <div className="px-2 py-0.5 text-[10px] font-medium text-muted-foreground uppercase">Operations</div>
                      {templatesByCategory.operations.map((t) => (
                        <button key={t.id} type="button" onClick={() => { setSelectedTemplate(t); setExpandedOption(null) }} disabled={isLoading} className={cn("w-full flex items-center gap-1.5 px-2 py-1 rounded-md text-xs text-left transition-colors", selectedTemplate?.id === t.id ? "bg-accent" : "hover:bg-accent/50")}>
                          <FileText className="w-3.5 h-3.5 shrink-0" />
                          {t.name} ({getTaskCount(t)} tasks)
                        </button>
                      ))}
                    </>
                  )}
                  {templatesByCategory.general.length > 0 && (
                    <>
                      <div className="px-2 py-0.5 text-[10px] font-medium text-muted-foreground uppercase">General</div>
                      {templatesByCategory.general.map((t) => (
                        <button key={t.id} type="button" onClick={() => { setSelectedTemplate(t); setExpandedOption(null) }} disabled={isLoading} className={cn("w-full flex items-center gap-1.5 px-2 py-1 rounded-md text-xs text-left transition-colors", selectedTemplate?.id === t.id ? "bg-accent" : "hover:bg-accent/50")}>
                          <FileText className="w-3.5 h-3.5 shrink-0" />
                          {t.name} ({getTaskCount(t)} tasks)
                        </button>
                      ))}
                    </>
                  )}
                </div>
              </PopoverContent>
            </Popover>
            )}

            {/* Visibility */}
            <Popover open={expandedOption === 'visibility'} onOpenChange={(o) => setExpandedOption(o ? 'visibility' : null)}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "flex items-center gap-1.5 px-2 py-1 rounded-md border border-border text-xs transition-colors shrink-0",
                    expandedOption === 'visibility' ? "bg-accent" : "hover:bg-accent/50"
                  )}
                >
                  {visibility === 'PUBLIC' ? <Globe className="w-3.5 h-3.5 shrink-0" /> : <Lock className="w-3.5 h-3.5 shrink-0" />}
                  <span className={visibility === 'TARGETED' ? "text-foreground" : "text-muted-foreground"}>
                    {visibility === 'TARGETED' ? "Private" : "Visibility"}
                  </span>
                </button>
              </PopoverTrigger>
              <PopoverContent className="z-[100] w-72 max-h-64 overflow-y-auto p-1" align="start" sideOffset={4}>
                <div className="space-y-0.5">
                  <button type="button" onClick={() => { setVisibility('PUBLIC'); setExpandedOption(null) }} disabled={isLoading} className={cn("w-full flex items-center gap-1.5 px-2 py-1 rounded-md text-xs text-left transition-colors", visibility === 'PUBLIC' ? "bg-accent" : "hover:bg-accent/50")}>
                    <Globe className="w-3.5 h-3.5 shrink-0" />
                    Public — All workspace members
                  </button>
                  <button type="button" onClick={() => setVisibility('TARGETED')} disabled={isLoading} className={cn("w-full flex items-center gap-1.5 px-2 py-1 rounded-md text-xs text-left transition-colors", visibility === 'TARGETED' ? "bg-accent" : "hover:bg-accent/50")}>
                    <Lock className="w-3.5 h-3.5 shrink-0" />
                    Private — Selected members only
                  </button>
                </div>
                {visibility === 'TARGETED' && (
                  <div className="mt-2 pt-2 border-t border-border space-y-0.5">
                    <div className="px-2 py-0.5 text-[10px] font-medium text-muted-foreground uppercase">Select members</div>
                    {loadingMembers ? <div className="px-2 py-1 text-xs text-muted-foreground">Loading...</div> : workspaceMembers.length === 0 ? <div className="px-2 py-1 text-xs text-muted-foreground">No members found.</div> : (
                      workspaceMembers.map((m) => (
                        <label key={m.id} className="flex items-center gap-1.5 px-2 py-1 rounded-md cursor-pointer hover:bg-accent/50 text-xs">
                          <input type="checkbox" checked={selectedMemberIds.includes(m.id)} onChange={(e) => e.target.checked ? setSelectedMemberIds([...selectedMemberIds, m.id]) : setSelectedMemberIds(selectedMemberIds.filter(id => id !== m.id))} disabled={isLoading} className="w-3.5 h-3.5" />
                          {m.name}
                        </label>
                      ))
                    )}
                  </div>
                )}
              </PopoverContent>
            </Popover>

            {/* Owner */}
            <Popover open={expandedOption === 'owner'} onOpenChange={(o) => setExpandedOption(o ? 'owner' : null)}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "flex items-center gap-1.5 px-2 py-1 rounded-md border border-border text-xs transition-colors shrink-0",
                    expandedOption === 'owner' ? "bg-accent" : "hover:bg-accent/50"
                  )}
                >
                  <User className="w-3.5 h-3.5 shrink-0" />
                  <span className={selectedOwnerId ? "text-foreground" : "text-muted-foreground"}>
                    {selectedOwnerId ? workspaceMembers.find(m => m.id === selectedOwnerId)?.name : "Owner"}
                  </span>
                </button>
              </PopoverTrigger>
              <PopoverContent className="z-[100] w-64 max-h-64 overflow-y-auto p-1" align="start" sideOffset={4}>
                <div className="space-y-0.5">
                  {loadingMembers ? <div className="px-2 py-1 text-xs text-muted-foreground">Loading...</div> : (
                    <>
                      <button type="button" onClick={() => { setSelectedOwnerId(''); setExpandedOption(null) }} disabled={isLoading} className={cn("w-full flex items-center gap-1.5 px-2 py-1 rounded-md text-xs text-left transition-colors", !selectedOwnerId ? "bg-accent" : "hover:bg-accent/50")}>
                        <User className="w-3.5 h-3.5 shrink-0" />
                        No owner
                      </button>
                      {workspaceMembers.map((m) => (
                        <button key={m.id} type="button" onClick={() => { setSelectedOwnerId(m.id); setExpandedOption(null) }} disabled={isLoading} className={cn("w-full flex items-center gap-1.5 px-2 py-1 rounded-md text-xs text-left transition-colors", selectedOwnerId === m.id ? "bg-accent" : "hover:bg-accent/50")}>
                          <User className="w-3.5 h-3.5 shrink-0" />
                          {m.name}{m.orgPositionTitle ? ` — ${m.orgPositionTitle}` : ''}
                        </button>
                      ))}
                    </>
                  )}
                </div>
              </PopoverContent>
            </Popover>

            {/* Assignees */}
            <Popover open={expandedOption === 'assignees'} onOpenChange={(o) => setExpandedOption(o ? 'assignees' : null)}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "flex items-center gap-1.5 px-2 py-1 rounded-md border border-border text-xs transition-colors shrink-0",
                    expandedOption === 'assignees' ? "bg-accent" : "hover:bg-accent/50"
                  )}
                >
                  <Users className="w-3.5 h-3.5 shrink-0" />
                  <span className={selectedAssigneeIds.length > 0 ? "text-foreground" : "text-muted-foreground"}>
                    {selectedAssigneeIds.length > 0 ? selectedAssigneeIds.length : "Assignees"}
                  </span>
                </button>
              </PopoverTrigger>
              <PopoverContent className="z-[100] w-72 max-h-64 overflow-y-auto p-1" align="start" sideOffset={4}>
                <div className="space-y-0.5">
                  {selectedAssigneeIds.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-1">
                      {selectedAssigneeIds.map((id) => {
                        const member = workspaceMembers.find(m => m.id === id)
                        return (
                          <Badge key={id} variant="secondary" className="flex items-center gap-1 text-xs py-0">
                            {member?.name ?? id}
                            <button type="button" onClick={() => setSelectedAssigneeIds(prev => prev.filter(i => i !== id))} className="ml-0.5 hover:opacity-70" disabled={isLoading}><X className="h-3 w-3" /></button>
                          </Badge>
                        )
                      })}
                    </div>
                  )}
                  <div className="px-2 py-0.5 text-[10px] font-medium text-muted-foreground uppercase">Add member</div>
                  {loadingMembers ? <div className="px-2 py-1 text-xs text-muted-foreground">Loading...</div> : workspaceMembers.length === 0 ? <div className="px-2 py-1 text-xs text-muted-foreground">No members found.</div> : (() => {
                    const available = workspaceMembers.filter(m => !selectedAssigneeIds.includes(m.id))
                    return available.length > 0 ? (
                      available.map((m) => (
                        <button key={m.id} type="button" onClick={() => { setSelectedAssigneeIds(prev => [...prev, m.id]) }} disabled={isLoading} className="w-full flex items-center gap-1.5 px-2 py-1 rounded-md text-xs text-left transition-colors hover:bg-accent/50">
                          <Users className="w-3.5 h-3.5 shrink-0" />
                          {m.name}{m.orgPositionTitle ? ` — ${m.orgPositionTitle}` : ''}
                        </button>
                      ))
                    ) : <div className="px-2 py-1 text-xs text-muted-foreground">All members added</div>
                  })()}
                </div>
              </PopoverContent>
            </Popover>

            {/* Channels */}
            <Popover open={expandedOption === 'channels'} onOpenChange={(o) => setExpandedOption(o ? 'channels' : null)}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "flex items-center gap-1.5 px-2 py-1 rounded-md border border-border text-xs transition-colors shrink-0",
                    expandedOption === 'channels' ? "bg-accent" : "hover:bg-accent/50"
                  )}
                >
                  <Hash className="w-3.5 h-3.5 shrink-0" />
                  <span className={channelList.length > 0 ? "text-foreground" : "text-muted-foreground"}>
                    {channelList.length > 0 ? channelList.length : "Channels"}
                  </span>
                </button>
              </PopoverTrigger>
              <PopoverContent className="z-[100] w-72 max-h-64 overflow-y-auto p-1" align="start" sideOffset={4}>
                <div className="space-y-0.5">
                  {channelList.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-1">
                      {channelList.map((ch, i) => (
                        <Badge key={i} variant="outline" className="flex items-center gap-1 text-xs py-0">
                          #{ch}
                          <button type="button" onClick={() => setChannelList(prev => prev.filter((_, j) => j !== i))} className="ml-0.5 hover:opacity-70" disabled={isLoading}><X className="h-3 w-3" /></button>
                        </Badge>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-1">
                    <Input placeholder="Add channel" value={channelInput} onChange={(e) => setChannelInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); const ch = channelInput.trim().replace(/^#/, ''); if (ch && !channelList.includes(ch)) { setChannelList(prev => [...prev, ch]); setChannelInput('') } } }} className="flex-1 h-7 text-xs" disabled={isLoading} />
                    <Button type="button" variant="outline" size="sm" className="h-7 text-xs px-2" onClick={() => { const ch = channelInput.trim().replace(/^#/, ''); if (ch && !channelList.includes(ch)) { setChannelList(prev => [...prev, ch]); setChannelInput('') } }} disabled={isLoading || !channelInput.trim()}>Add</Button>
                  </div>
                  <p className="px-2 py-0.5 text-[10px] text-muted-foreground">Slack channel names for Loopbrain</p>
                </div>
              </PopoverContent>
            </Popover>

            {/* Status */}
            <Popover open={expandedOption === 'status'} onOpenChange={(o) => setExpandedOption(o ? 'status' : null)}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "flex items-center gap-1.5 px-2 py-1 rounded-md border border-border text-xs transition-colors shrink-0",
                    expandedOption === 'status' ? "bg-accent" : "hover:bg-accent/50"
                  )}
                >
                  <Circle className="w-3.5 h-3.5 shrink-0" />
                  <Badge className={cn("text-[10px] px-1 py-0", statusOptions.find(o => o.value === formData.status)?.color)}>
                    {statusOptions.find(o => o.value === formData.status)?.label}
                  </Badge>
                </button>
              </PopoverTrigger>
              <PopoverContent className="z-[100] w-48 p-1" align="start" sideOffset={4}>
                <div className="space-y-0.5">
                  {statusOptions.map((opt) => (
                    <button key={opt.value} type="button" onClick={() => { handleInputChange('status', opt.value); setExpandedOption(null) }} className={cn("w-full flex items-center gap-1.5 px-2 py-1 rounded-md text-xs text-left transition-colors", formData.status === opt.value ? "bg-accent" : "hover:bg-accent/50")}>
                      <Badge className={cn("text-[10px] px-1 py-0", opt.color)}>{opt.label}</Badge>
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            {/* Priority */}
            <Popover open={expandedOption === 'priority'} onOpenChange={(o) => setExpandedOption(o ? 'priority' : null)}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "flex items-center gap-1.5 px-2 py-1 rounded-md border border-border text-xs transition-colors shrink-0",
                    expandedOption === 'priority' ? "bg-accent" : "hover:bg-accent/50"
                  )}
                >
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <Badge className={cn("text-[10px] px-1 py-0", priorityOptions.find(o => o.value === formData.priority)?.color)}>
                    {priorityOptions.find(o => o.value === formData.priority)?.label}
                  </Badge>
                </button>
              </PopoverTrigger>
              <PopoverContent className="z-[100] w-48 p-1" align="start" sideOffset={4}>
                <div className="space-y-0.5">
                  {priorityOptions.map((opt) => (
                    <button key={opt.value} type="button" onClick={() => { handleInputChange('priority', opt.value); setExpandedOption(null) }} className={cn("w-full flex items-center gap-1.5 px-2 py-1 rounded-md text-xs text-left transition-colors", formData.priority === opt.value ? "bg-accent" : "hover:bg-accent/50")}>
                      <Badge className={cn("text-[10px] px-1 py-0", opt.color)}>{opt.label}</Badge>
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            {/* Start Date */}
            <Popover open={expandedOption === 'startDate'} onOpenChange={(o) => setExpandedOption(o ? 'startDate' : null)}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "flex items-center gap-1.5 px-2 py-1 rounded-md border border-border text-xs transition-colors shrink-0",
                    expandedOption === 'startDate' ? "bg-accent" : "hover:bg-accent/50"
                  )}
                >
                  <Calendar className="w-3.5 h-3.5 shrink-0" />
                  <span className={formData.startDate ? "text-foreground" : "text-muted-foreground"}>
                    {formData.startDate ? new Date(formData.startDate).toLocaleDateString() : "Start"}
                  </span>
                </button>
              </PopoverTrigger>
              <PopoverContent className="z-[100] w-auto p-0" align="start" sideOffset={4}>
                <CalendarDatePicker
                  value={formData.startDate}
                  onChange={(v) => handleInputChange('startDate', v)}
                  placeholder="3/11/2026, May 2027, Q4 2026"
                  disabled={isLoading}
                  showInput={true}
                  showGranularityTabs={true}
                  onSelect={() => setExpandedOption(null)}
                />
              </PopoverContent>
            </Popover>

            {/* End Date */}
            <Popover open={expandedOption === 'endDate'} onOpenChange={(o) => setExpandedOption(o ? 'endDate' : null)}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "flex items-center gap-1.5 px-2 py-1 rounded-md border border-border text-xs transition-colors shrink-0",
                    expandedOption === 'endDate' ? "bg-accent" : "hover:bg-accent/50",
                    errors.endDate && "border-red-500"
                  )}
                >
                  <Calendar className="w-3.5 h-3.5 shrink-0" />
                  <span className={formData.endDate ? "text-foreground" : "text-muted-foreground"}>
                    {formData.endDate ? new Date(formData.endDate).toLocaleDateString() : "End"}
                  </span>
                </button>
              </PopoverTrigger>
              <PopoverContent className="z-[100] w-auto p-0" align="start" sideOffset={4}>
                <CalendarDatePicker
                  value={formData.endDate}
                  onChange={(v) => handleInputChange('endDate', v)}
                  placeholder="3/11/2026, May 2027, Q4 2026"
                  disabled={isLoading}
                  showInput={true}
                  showGranularityTabs={true}
                  onSelect={() => setExpandedOption(null)}
                />
                {errors.endDate && <p className="text-xs text-red-500 px-2 pb-2">{errors.endDate}</p>}
              </PopoverContent>
            </Popover>

            {/* Color Pill */}
            <Popover open={expandedOption === 'color'} onOpenChange={(o) => setExpandedOption(o ? 'color' : null)}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "flex items-center gap-1.5 px-2 py-1 rounded-md border border-border text-xs transition-colors shrink-0",
                    expandedOption === 'color' ? "bg-accent" : "hover:bg-accent/50"
                  )}
                >
                  <div 
                    className="w-3.5 h-3.5 rounded-full border border-border/50" 
                    style={{ backgroundColor: projectColor }}
                  />
                  <span className="text-muted-foreground">Color</span>
                </button>
              </PopoverTrigger>
              <PopoverContent className="z-[100] w-auto p-2" align="start" sideOffset={4}>
                <div className="flex gap-1.5">
                  {colorOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        setProjectColor(option.value)
                        setExpandedOption(null)
                      }}
                      className={cn(
                        "w-7 h-7 rounded-md border-2 transition-all hover:scale-110",
                        projectColor === option.value ? 'border-foreground ring-2 ring-offset-1 ring-foreground/20' : 'border-transparent'
                      )}
                      style={{ backgroundColor: option.value }}
                      title={option.label}
                    />
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Team Assignment (Optional) - Below pills */}
          {teams.length > 0 && (
            <div className="space-y-2 pt-2 border-t">
              <Label className="text-sm text-muted-foreground">Owning Team (Optional)</Label>
              <Select
                value={selectedTeamId || 'none'}
                onValueChange={(value) => setSelectedTeamId(value === 'none' ? '' : value)}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="No team assigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No team assigned</SelectItem>
                  {teams.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Links this project to an org team
              </p>
            </div>
          )}

          {/* Description - always visible */}
          <div className="space-y-2">
            <Textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Describe what this project is about"
              rows={10}
              className="min-h-[220px] resize-y focus-visible:ring-0 focus-visible:ring-offset-0"
              disabled={isLoading}
            />
          </div>

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
                  {mode === 'create' ? 'Creating...' : 'Saving...'}
                </>
              ) : (
                mode === 'create' ? 'Create Project' : 'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
