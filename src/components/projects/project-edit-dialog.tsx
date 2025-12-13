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
import { Loader2, User, Calendar, Palette, X } from "lucide-react"
import { getProjectSlackHints, setProjectSlackHints } from "@/lib/client-state/project-slack-hints"

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
  const [users, setUsers] = useState<User[]>([])
  const [workspaceMembers, setWorkspaceMembers] = useState<Array<{ id: string; name: string; email: string }>>([])
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
    assigneeIds: [] as string[],
    slackChannelHints: [] as string[]
  })
  
  // Channel input state for UI
  const [channelInput, setChannelInput] = useState('')

  // Load users when dialog opens
  useEffect(() => {
    if (isOpen && workspaceId) {
      loadUsers()
      loadWorkspaceMembers()
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
        assigneeIds: project.assignees?.map(a => a.user.id) || [],
        // Load channel hints from localStorage (fallback) or from project if it exists
        slackChannelHints: (project as any).slackChannelHints || getProjectSlackHints(project.id) || []
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
        setWorkspaceMembers(data.members?.map((m: any) => ({
          id: m.userId,
          name: m.user?.name || m.user?.email || 'Unknown',
          email: m.user?.email || ''
        })) || [])
      }
    } catch (error) {
      console.error('Error loading workspace members:', error)
    }
  }

  const loadProjectSpaceMembers = async (projectSpaceId: string) => {
    try {
      const response = await fetch(`/api/project-spaces/${projectSpaceId}/members`)
      if (response.ok) {
        const data = await response.json()
        setSelectedMemberIds(data.members?.map((m: any) => m.userId) || [])
      }
    } catch (error) {
      console.error('Error loading ProjectSpace members:', error)
    }
  }

  const loadUsers = async () => {
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

  const handleInputChange = (field: string, value: any) => {
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
          const { setProjectSlackHints } = await import('@/lib/client-state/project-slack-hints')
          setProjectSlackHints(project.id, formData.slackChannelHints)
        }
        onSave(updatedProject)
        onClose()
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Failed to update project' }))
        console.error('Failed to update project:', errorData)
        
        // Show detailed validation errors if available
        if (errorData.details && Array.isArray(errorData.details)) {
          const errorMessages = errorData.details.map((d: any) => `${d.path || 'field'}: ${d.message}`).join('\n')
          alert(`Validation error:\n${errorMessages}`)
        } else {
          alert(errorData.error || 'Failed to update project. Please check your permissions.')
        }
      }
    } catch (error) {
      console.error('Error updating project:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (!project) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Project</DialogTitle>
          <DialogDescription>
            Update project properties, assignees, and timeline
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Basic Information</h3>
            
            <div className="space-y-2">
              <Label htmlFor="name">Project Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter project name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Enter project description"
                rows={3}
              />
            </div>

            {/* Slack Channels - sent in request body but not persisted to DB */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Relevant Slack Channels (optional)</Label>
              <p className="text-xs text-muted-foreground">
                Add Slack channel names to help Loopbrain fetch relevant conversations. These are sent with the request but not stored in the database.
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.slackChannelHints.map((channel, idx) => (
                  <Badge
                    key={idx}
                    variant="outline"
                    className="flex items-center gap-1"
                  >
                    #{channel}
                    <button
                      type="button"
                      onClick={() => {
                        const updated = formData.slackChannelHints.filter((_, i) => i !== idx)
                        setFormData({ ...formData, slackChannelHints: updated })
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
                      if (channel && !formData.slackChannelHints.includes(channel)) {
                        setFormData({
                          ...formData,
                          slackChannelHints: [...formData.slackChannelHints, channel]
                        })
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
                    if (channel && !formData.slackChannelHints.includes(channel)) {
                      setFormData({
                        ...formData,
                        slackChannelHints: [...formData.slackChannelHints, channel]
                      })
                      setChannelInput('')
                    }
                  }}
                  disabled={isLoading || !channelInput.trim()}
                >
                  Add
                </Button>
              </div>
            </div>

            {/* Visibility Control */}
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
                  ? 'All workspace members can view and access this project.'
                  : 'Only selected members can view and access this project.'}
              </p>
            </div>

            {/* Member Picker (only for Private) */}
            {visibility === 'TARGETED' && (
              <div className="space-y-2">
                <Label>Project Members</Label>
                {workspaceMembers.length === 0 ? (
                  <div className="text-sm text-muted-foreground">Loading members...</div>
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

            <div className="space-y-2">
              <Label>Project Color</Label>
              <div className="flex flex-wrap gap-2">
                {colorOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleInputChange('color', option.value)}
                    className={`w-8 h-8 rounded-full border-2 ${
                      formData.color === option.value ? 'border-gray-800' : 'border-gray-300'
                    }`}
                    style={{ backgroundColor: option.color }}
                    title={option.label}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Timeline
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => handleInputChange('startDate', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => handleInputChange('endDate', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Ownership */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <User className="h-5 w-5" />
              Ownership
            </h3>
            
            <div className="space-y-2">
              <Label>Project Owner</Label>
              <Select 
                value={formData.ownerId} 
                onValueChange={(value) => handleInputChange('ownerId', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select project owner" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No owner</SelectItem>
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

          {/* Assignees */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <User className="h-5 w-5" />
              Assignees
            </h3>
            
            <div className="space-y-2">
              <Label>Select Assignees</Label>
              <div className="space-y-2 max-h-32 overflow-y-auto border rounded-md p-3">
                {users.map((user) => (
                  <div key={user.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`assignee-${user.id}`}
                      checked={formData.assigneeIds.includes(user.id)}
                      onCheckedChange={() => handleMultiSelectChange('assigneeIds', user.id)}
                    />
                    <label htmlFor={`assignee-${user.id}`} className="flex items-center space-x-2 cursor-pointer flex-1">
                      <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                      <span className="text-sm">{user.name}</span>
                      <span className="text-xs text-muted-foreground">({user.email})</span>
                    </label>
                  </div>
                ))}
              </div>
            </div>
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
