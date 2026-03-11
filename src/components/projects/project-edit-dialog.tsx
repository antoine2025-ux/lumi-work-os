"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Loader2, User, Calendar, X, Circle, AlertTriangle, Eye, Users, Hash, Palette } from "lucide-react"
import { getProjectSlackHints, setProjectSlackHints } from "@/lib/client-state/project-slack-hints"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarDatePicker } from "@/components/ui/calendar-date-picker"
import { cn } from "@/lib/utils"

interface User {
  id: string
  name: string
  email: string
}

interface ProjectAssignee {
  id: string
  user: User
}

interface ProjectOwner {
  id: string
  name: string
  email: string
}

interface Project {
  id: string
  name: string
  description?: string
  status: 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED'
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  startDate?: string
  endDate?: string
  color?: string
  ownerId?: string
  assignees: ProjectAssignee[]
  owner?: ProjectOwner
  projectSpace?: {
    id: string
    name: string
    visibility: 'PUBLIC' | 'TARGETED'
  }
  projectSpaceId?: string | null
  teamId?: string | null
}

interface ProjectEditDialogProps {
  isOpen: boolean
  onClose: () => void
  project: Project | null
  onSave: (updatedProject: Project) => void
  workspaceId: string
}

const statusOptions = [
  { value: 'ACTIVE', label: 'Active', color: 'bg-green-100 text-green-800' },
  { value: 'ON_HOLD', label: 'On Hold', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'COMPLETED', label: 'Completed', color: 'bg-blue-100 text-blue-800' },
  { value: 'CANCELLED', label: 'Cancelled', color: 'bg-red-100 text-red-800' }
]

const priorityOptions = [
  { value: 'LOW', label: 'Low', color: 'bg-green-100 text-green-800' },
  { value: 'MEDIUM', label: 'Medium', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'HIGH', label: 'High', color: 'bg-orange-100 text-orange-800' },
  { value: 'URGENT', label: 'Urgent', color: 'bg-red-100 text-red-800' }
]

const colorOptions = [
  { value: '#3b82f6', label: 'Blue', color: '#3b82f6' },
  { value: '#10b981', label: 'Green', color: '#10b981' },
  { value: '#f59e0b', label: 'Yellow', color: '#f59e0b' },
  { value: '#ef4444', label: 'Red', color: '#ef4444' },
  { value: '#8b5cf6', label: 'Purple', color: '#8b5cf6' },
  { value: '#06b6d4', label: 'Cyan', color: '#06b6d4' },
  { value: '#f97316', label: 'Orange', color: '#f97316' },
  { value: '#84cc16', label: 'Lime', color: '#84cc16' }
]

export function ProjectEditDialog({ isOpen, onClose, project, onSave, workspaceId }: ProjectEditDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [workspaceMembers, setWorkspaceMembers] = useState<Array<{ id: string; name: string; email: string }>>([])
  const [teams, setTeams] = useState<Array<{ id: string; name: string }>>([])
  const [visibility, setVisibility] = useState<'PUBLIC' | 'TARGETED'>('PUBLIC')
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([])
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'ACTIVE' as 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED',
    priority: 'MEDIUM' as 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT',
    startDate: '',
    endDate: '',
    color: '#3b82f6',
    ownerId: '',
    teamId: '',
    assigneeIds: [] as string[],
    slackChannelHints: [] as string[]
  })
  
  // Channel input state for UI
  const [channelInput, setChannelInput] = useState('')
  const [expandedOption, setExpandedOption] = useState<string | null>(null)

  // Load workspace members and teams when dialog opens
  useEffect(() => {
    if (isOpen && workspaceId) {
      loadWorkspaceMembers()
      fetch('/api/org/teams')
        .then((r) => r.json())
        .then((data) => setTeams(data.teams || []))
        .catch(() => setTeams([]))
    }
  }, [isOpen, workspaceId])

  // Update form data when project changes
  useEffect(() => {
    if (project) {
      // Determine current visibility
      const currentVisibility = project.projectSpace?.visibility || 
                                (project.projectSpaceId ? 'TARGETED' : 'PUBLIC')
      
      setVisibility(currentVisibility)
      setFormData({
        name: project.name,
        description: project.description || '',
        status: project.status,
        priority: project.priority,
        startDate: project.startDate ? project.startDate.split('T')[0] : '',
        endDate: project.endDate ? project.endDate.split('T')[0] : '',
        color: project.color || '#3b82f6',
        ownerId: project.ownerId || 'none',
        teamId: project.teamId ?? '',
        assigneeIds: project.assignees?.map(a => a.user.id) || [],
        // Load channel hints from localStorage (fallback) or from project if it exists
        slackChannelHints: ('slackChannelHints' in project ? (project as { slackChannelHints?: string[] }).slackChannelHints : undefined) || getProjectSlackHints(project.id) || []
      })
      setChannelInput('')
      
      // Load ProjectSpace members if TARGETED
      if (currentVisibility === 'TARGETED' && project.projectSpaceId) {
        loadProjectSpaceMembers(project.projectSpaceId)
      } else {
        setSelectedMemberIds([])
      }
    }
  }, [project])

  const loadWorkspaceMembers = async () => {
    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/members`)
      if (response.ok) {
        const data = await response.json()
        setWorkspaceMembers(data.members?.map((m: { userId: string; user?: { name?: string; email?: string } }) => ({
          id: m.userId,
          name: m.user?.name || m.user?.email || 'Unknown',
          email: m.user?.email || ''
        })) || [])
      }
    } catch (error: unknown) {
      console.error('Error loading workspace members:', error)
    }
  }

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

  const handleInputChange = (field: string, value: string | string[]) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleMultiSelectChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field as keyof typeof prev].includes(value)
        ? (prev[field as keyof typeof prev] as string[]).filter(id => id !== value)
        : [...(prev[field as keyof typeof prev] as string[]), value]
    }))
  }

  const handleSave = async () => {
    if (!project) return

    // Validate required fields
    if (!formData.name || !formData.name.trim()) {
      alert('Project name is required')
      return
    }

    try {
      setIsLoading(true)
      
      // Prepare request body - format dates properly for Zod validation
      const requestBody: Record<string, unknown> = {
        name: formData.name.trim(),
        status: formData.status,
        priority: formData.priority,
      }
      
      // Description - send as string or undefined (not empty string or null)
      // Schema: z.string().optional() means string | undefined
      if (formData.description !== undefined && formData.description !== null && formData.description.trim()) {
        requestBody.description = formData.description.trim()
      }
      
      // Dates - convert YYYY-MM-DD to ISO datetime format (required by schema)
      // Schema: z.string().datetime().optional() - must be valid ISO datetime or undefined
      if (formData.startDate && formData.startDate.trim()) {
        const dateStr = formData.startDate.trim()
        requestBody.startDate = dateStr.includes('T') 
          ? dateStr 
          : `${dateStr}T00:00:00.000Z`
      }
      
      if (formData.endDate && formData.endDate.trim()) {
        const dateStr = formData.endDate.trim()
        requestBody.endDate = dateStr.includes('T')
          ? dateStr
          : `${dateStr}T23:59:59.999Z`
      }
      
      // Color - only if valid format (schema has regex: /^#[0-9A-Fa-f]{6}$/)
      if (formData.color && formData.color.trim()) {
        const colorStr = formData.color.trim()
        if (/^#[0-9A-Fa-f]{6}$/.test(colorStr)) {
          requestBody.color = colorStr
        }
      }
      
      // Owner ID - only if not 'none' (schema: z.string().optional())
      if (formData.ownerId && formData.ownerId !== 'none' && formData.ownerId.trim()) {
        requestBody.ownerId = formData.ownerId.trim()
      }

      // Owning team (optional org team assignment)
      requestBody.teamId = formData.teamId?.trim() || null
      
      // Include assigneeIds separately (not in schema, extracted before validation)
      if (formData.assigneeIds && Array.isArray(formData.assigneeIds)) {
        requestBody.assigneeIds = formData.assigneeIds
      }
      
      // Include visibility and memberUserIds if visibility changed
      const currentVisibility = project.projectSpace?.visibility || 
                                (project.projectSpaceId ? 'TARGETED' : 'PUBLIC')
      if (visibility !== currentVisibility) {
        requestBody.visibility = visibility
        if (visibility === 'TARGETED' && selectedMemberIds.length > 0) {
          requestBody.memberUserIds = selectedMemberIds
        }
      }
      
      // Include slackChannelHints (client-side only, not persisted to DB but returned in response)
      if (formData.slackChannelHints && Array.isArray(formData.slackChannelHints)) {
        requestBody.slackChannelHints = formData.slackChannelHints
      }
      
      const response = await fetch(`/api/projects/${project.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      if (response.ok) {
        const updatedProject = await response.json()
        // Save slackChannelHints to localStorage before calling onSave
        // This ensures they persist even if the API response doesn't include them
        if (formData.slackChannelHints && formData.slackChannelHints.length > 0) {
          setProjectSlackHints(project.id, formData.slackChannelHints)
        }
        onSave(updatedProject)
        onClose()
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Failed to update project' }))
        console.error('Failed to update project:', errorData)
        
        // Show detailed validation errors if available
        if (errorData.details && Array.isArray(errorData.details)) {
          const errorMessages = errorData.details.map((d: { path?: string; message: string }) => `${d.path || 'field'}: ${d.message}`).join('\n')
          alert(`Validation error:\n${errorMessages}`)
        } else {
          alert(errorData.error || 'Failed to update project. Please check your permissions.')
        }
      }
    } catch (error: unknown) {
      console.error('Error updating project:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (!project) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-base font-semibold">Edit Project</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 -mt-1">
          {/* Project Name - Unboxed */}
          <div className="border-b border-border/50 pb-3">
            <Input
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Project name *"
              className="text-lg font-medium border-0 rounded-none px-0 h-auto py-2 focus-visible:ring-0 focus-visible:ring-offset-0"
              autoFocus
            />
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
                  <Badge variant="outline" className={cn("text-xs px-1.5 py-0", statusOptions.find(s => s.value === formData.status)?.color)}>
                    {statusOptions.find(s => s.value === formData.status)?.label}
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
                        handleInputChange('status', option.value)
                        setExpandedOption(null)
                      }}
                      className={cn(
                        "w-full flex items-center gap-1.5 px-2 py-1 rounded-md text-xs text-left hover:bg-accent/50 transition-colors",
                        formData.status === option.value && "bg-accent"
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
                  <Badge variant="outline" className={cn("text-xs px-1.5 py-0", priorityOptions.find(p => p.value === formData.priority)?.color)}>
                    {priorityOptions.find(p => p.value === formData.priority)?.label}
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
                        handleInputChange('priority', option.value)
                        setExpandedOption(null)
                      }}
                      className={cn(
                        "w-full flex items-center gap-1.5 px-2 py-1 rounded-md text-xs text-left hover:bg-accent/50 transition-colors",
                        formData.priority === option.value && "bg-accent"
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

            {/* Visibility Pill */}
            <Popover open={expandedOption === 'visibility'} onOpenChange={(open) => setExpandedOption(open ? 'visibility' : null)}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-1.5 px-2 py-1 rounded-md border border-border text-xs hover:bg-accent/50 transition-colors"
                  disabled={isLoading}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span className="text-muted-foreground">
                    {visibility === 'PUBLIC' ? 'Public' : 'Private'}
                  </span>
                </button>
              </PopoverTrigger>
              <PopoverContent className="z-[100] w-72 p-3" align="start" sideOffset={4}>
                <div className="space-y-3">
                  <Label className="text-xs text-muted-foreground">Project Visibility</Label>
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => {
                        setVisibility('PUBLIC')
                        setExpandedOption(null)
                      }}
                      className={cn(
                        "w-full flex items-start gap-2 px-2 py-2 rounded-md text-xs text-left hover:bg-accent/50 transition-colors",
                        visibility === 'PUBLIC' && "bg-accent"
                      )}
                    >
                      <div className="flex-1">
                        <div className="font-medium">Public</div>
                        <div className="text-muted-foreground">All workspace members</div>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setVisibility('TARGETED')}
                      className={cn(
                        "w-full flex items-start gap-2 px-2 py-2 rounded-md text-xs text-left hover:bg-accent/50 transition-colors",
                        visibility === 'TARGETED' && "bg-accent"
                      )}
                    >
                      <div className="flex-1">
                        <div className="font-medium">Private</div>
                        <div className="text-muted-foreground">Selected members only</div>
                      </div>
                    </button>
                  </div>
                  {visibility === 'TARGETED' && (
                    <div className="pt-2 border-t space-y-2">
                      <Label className="text-xs text-muted-foreground">Select Members</Label>
                      <div className="max-h-48 overflow-y-auto space-y-1">
                        {workspaceMembers.map((member) => (
                          <label key={member.id} className="flex items-center space-x-2 cursor-pointer hover:bg-muted p-1.5 rounded text-xs">
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
                              className="w-3 h-3"
                            />
                            <span>{member.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>

            {/* Owner Pill */}
            <Popover open={expandedOption === 'owner'} onOpenChange={(open) => setExpandedOption(open ? 'owner' : null)}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-1.5 px-2 py-1 rounded-md border border-border text-xs hover:bg-accent/50 transition-colors"
                  disabled={isLoading}
                >
                  <User className="w-3.5 h-3.5" />
                  <span className="text-muted-foreground">
                    {formData.ownerId && formData.ownerId !== 'none' 
                      ? workspaceMembers.find(m => m.id === formData.ownerId)?.name || 'Owner'
                      : 'Owner'}
                  </span>
                </button>
              </PopoverTrigger>
              <PopoverContent className="z-[100] w-56 p-1" align="start" sideOffset={4}>
                <div className="space-y-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      handleInputChange('ownerId', 'none')
                      setExpandedOption(null)
                    }}
                    className={cn(
                      "w-full flex items-center gap-1.5 px-2 py-1 rounded-md text-xs text-left hover:bg-accent/50 transition-colors",
                      (!formData.ownerId || formData.ownerId === 'none') && "bg-accent"
                    )}
                  >
                    <span className="text-muted-foreground">No owner</span>
                  </button>
                  {workspaceMembers.map((member) => (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => {
                        handleInputChange('ownerId', member.id)
                        setExpandedOption(null)
                      }}
                      className={cn(
                        "w-full flex items-center gap-1.5 px-2 py-1 rounded-md text-xs text-left hover:bg-accent/50 transition-colors",
                        formData.ownerId === member.id && "bg-accent"
                      )}
                    >
                      {member.name}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            {/* Assignees Pill */}
            <Popover open={expandedOption === 'assignees'} onOpenChange={(open) => setExpandedOption(open ? 'assignees' : null)}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-1.5 px-2 py-1 rounded-md border border-border text-xs hover:bg-accent/50 transition-colors"
                  disabled={isLoading}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span className="text-muted-foreground">
                    {formData.assigneeIds.length > 0 ? `${formData.assigneeIds.length} assignee${formData.assigneeIds.length > 1 ? 's' : ''}` : 'Assignees'}
                  </span>
                </button>
              </PopoverTrigger>
              <PopoverContent className="z-[100] w-64 p-2" align="start" sideOffset={4}>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Select Assignees</Label>
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {workspaceMembers.map((member) => (
                      <label key={member.id} className="flex items-center space-x-2 cursor-pointer hover:bg-muted p-1.5 rounded text-xs">
                        <Checkbox
                          checked={formData.assigneeIds.includes(member.id)}
                          onCheckedChange={() => handleMultiSelectChange('assigneeIds', member.id)}
                        />
                        <span>{member.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* Start Date Pill */}
            <Popover open={expandedOption === 'startDate'} onOpenChange={(open) => setExpandedOption(open ? 'startDate' : null)}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-1.5 px-2 py-1 rounded-md border border-border text-xs hover:bg-accent/50 transition-colors"
                  disabled={isLoading}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span className="text-muted-foreground">
                    {formData.startDate || 'Start'}
                  </span>
                </button>
              </PopoverTrigger>
              <PopoverContent className="z-[100] w-auto p-0" align="start" sideOffset={4}>
                <CalendarDatePicker
                  value={formData.startDate}
                  onChange={(date) => handleInputChange('startDate', date)}
                  onSelect={() => setExpandedOption(null)}
                />
              </PopoverContent>
            </Popover>

            {/* End Date Pill */}
            <Popover open={expandedOption === 'endDate'} onOpenChange={(open) => setExpandedOption(open ? 'endDate' : null)}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-1.5 px-2 py-1 rounded-md border border-border text-xs hover:bg-accent/50 transition-colors"
                  disabled={isLoading}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span className="text-muted-foreground">
                    {formData.endDate || 'End'}
                  </span>
                </button>
              </PopoverTrigger>
              <PopoverContent className="z-[100] w-auto p-0" align="start" sideOffset={4}>
                <CalendarDatePicker
                  value={formData.endDate}
                  onChange={(date) => handleInputChange('endDate', date)}
                  onSelect={() => setExpandedOption(null)}
                />
              </PopoverContent>
            </Popover>

            {/* Color Pill */}
            <Popover open={expandedOption === 'color'} onOpenChange={(open) => setExpandedOption(open ? 'color' : null)}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-1.5 px-2 py-1 rounded-md border border-border text-xs hover:bg-accent/50 transition-colors"
                  disabled={isLoading}
                >
                  <Palette className="w-3.5 h-3.5" />
                  <div 
                    className="w-3.5 h-3.5 rounded-full border border-border/50" 
                    style={{ backgroundColor: formData.color }}
                  />
                </button>
              </PopoverTrigger>
              <PopoverContent className="z-[100] w-auto p-2" align="start" sideOffset={4}>
                <div className="flex gap-1.5">
                  {colorOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        handleInputChange('color', option.value)
                        setExpandedOption(null)
                      }}
                      className={cn(
                        "w-7 h-7 rounded-md border-2 transition-all hover:scale-110",
                        formData.color === option.value ? 'border-foreground ring-2 ring-offset-1 ring-foreground/20' : 'border-transparent'
                      )}
                      style={{ backgroundColor: option.color }}
                      title={option.label}
                    />
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            {/* Channels Pill */}
            <Popover open={expandedOption === 'channels'} onOpenChange={(open) => setExpandedOption(open ? 'channels' : null)}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-1.5 px-2 py-1 rounded-md border border-border text-xs hover:bg-accent/50 transition-colors"
                  disabled={isLoading}
                >
                  <Hash className="w-3.5 h-3.5" />
                  <span className="text-muted-foreground">
                    {formData.slackChannelHints.length > 0 ? `${formData.slackChannelHints.length} channel${formData.slackChannelHints.length > 1 ? 's' : ''}` : 'Channels'}
                  </span>
                </button>
              </PopoverTrigger>
              <PopoverContent className="z-[100] w-64 p-2" align="start" sideOffset={4}>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Slack Channels (optional)</Label>
                  <div className="flex gap-1.5">
                    <Input
                      placeholder="Add channel"
                      value={channelInput}
                      onChange={(e) => setChannelInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          const channel = channelInput.trim().replace(/^#/, '')
                          if (channel && !formData.slackChannelHints.includes(channel)) {
                            setFormData({
                              ...formData,
                              slackChannelHints: [...formData.slackChannelHints, channel]
                            })
                            setChannelInput('')
                          }
                        }
                      }}
                      className="flex-1 h-7 text-xs"
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        const channel = channelInput.trim().replace(/^#/, '')
                        if (channel && !formData.slackChannelHints.includes(channel)) {
                          setFormData({
                            ...formData,
                            slackChannelHints: [...formData.slackChannelHints, channel]
                          })
                          setChannelInput('')
                        }
                      }}
                      disabled={!channelInput.trim()}
                      className="h-7 px-2 text-xs"
                    >
                      Add
                    </Button>
                  </div>
                  {formData.slackChannelHints.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {formData.slackChannelHints.map((channel, idx) => (
                        <Badge
                          key={idx}
                          variant="outline"
                          className="flex items-center gap-1 text-xs px-1.5 py-0"
                        >
                          #{channel}
                          <button
                            type="button"
                            onClick={() => {
                              const updated = formData.slackChannelHints.filter((_, i) => i !== idx)
                              setFormData({ ...formData, slackChannelHints: updated })
                            }}
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
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Add a description..."
              rows={10}
              className="min-h-[220px] resize-y focus-visible:ring-0 focus-visible:ring-offset-0"
              disabled={isLoading}
            />
          </div>

          {/* Team Assignment (Optional) */}
          <div className="space-y-2 pt-2 border-t">
            <Label className="text-sm text-muted-foreground">Owning Team (Optional)</Label>

            <Select
              value={formData.teamId || 'none'}
              onValueChange={(value) => handleInputChange('teamId', value === 'none' ? '' : value)}
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
        </div>

        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
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
      </DialogContent>
    </Dialog>
  )
}
