"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useWorkspace } from "@/lib/workspace-context"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { 
  ArrowLeft, 
  Target, 
  Calendar,
  Users,
  AlertCircle,
  CheckCircle,
  Loader2,
  Building2,
  UserPlus,
  Eye,
  Link as LinkIcon,
  Checkbox
} from "lucide-react"
import Link from "next/link"
import { TemplateSelector } from "@/components/projects/template-selector"
import { TaskTemplateDialog } from "@/components/templates/task-template-dialog"

interface ProjectFormData {
  name: string
  description: string
  status: 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED'
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  startDate: string
  endDate: string
  color: string
  department: string
  team: string
  ownerId: string
  watcherIds: string[]
  assigneeIds: string[]
  wikiPageId: string
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
  { value: '#3b82f6', label: 'Blue', color: 'bg-blue-500' },
  { value: '#10b981', label: 'Green', color: 'bg-green-500' },
  { value: '#f59e0b', label: 'Yellow', color: 'bg-yellow-500' },
  { value: '#ef4444', label: 'Red', color: 'bg-red-500' },
  { value: '#8b5cf6', label: 'Purple', color: 'bg-purple-500' },
  { value: '#06b6d4', label: 'Cyan', color: 'bg-cyan-500' },
  { value: '#f97316', label: 'Orange', color: 'bg-orange-500' },
  { value: '#ec4899', label: 'Pink', color: 'bg-pink-500' }
]

const departmentOptions = [
  { value: 'engineering', label: 'Engineering' },
  { value: 'product', label: 'Product' },
  { value: 'design', label: 'Design' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'sales', label: 'Sales' },
  { value: 'operations', label: 'Operations' },
  { value: 'hr', label: 'Human Resources' },
  { value: 'finance', label: 'Finance' }
]

const teamOptions = [
  { value: 'frontend', label: 'Frontend Team' },
  { value: 'backend', label: 'Backend Team' },
  { value: 'mobile', label: 'Mobile Team' },
  { value: 'devops', label: 'DevOps Team' },
  { value: 'qa', label: 'QA Team' },
  { value: 'data', label: 'Data Team' },
  { value: 'security', label: 'Security Team' },
  { value: 'platform', label: 'Platform Team' }
]

export default function NewProjectPage() {
  const router = useRouter()
  const { currentWorkspace } = useWorkspace()
  const { data: session } = useSession()
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [users, setUsers] = useState<Array<{id: string, name: string, email: string}>>([])
  const [wikiPages, setWikiPages] = useState<Array<{id: string, title: string, category: string}>>([])
  const [showTemplateSelector, setShowTemplateSelector] = useState(false)
  const [showTaskTemplateDialog, setShowTaskTemplateDialog] = useState(false)
  const [createdProject, setCreatedProject] = useState<{id: string, name: string} | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null)
  const [formData, setFormData] = useState<ProjectFormData>({
    name: '',
    description: '',
    status: 'ACTIVE',
    priority: 'MEDIUM',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    color: '#3b82f6',
    department: '',
    team: '',
    ownerId: '',
    watcherIds: [],
    assigneeIds: [],
    wikiPageId: ''
  })

  // Load users and wiki pages on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load users from API
        const usersResponse = await fetch('/api/users')
        if (usersResponse.ok) {
          const usersData = await usersResponse.json()
          setUsers(usersData)
          
          // Pre-select current user as project owner if they exist in the users list
          if (session?.user?.email && usersData.length > 0) {
            const currentUser = usersData.find((user: any) => user.email === session.user.email)
            if (currentUser) {
              setFormData(prev => ({
                ...prev,
                ownerId: currentUser.id
              }))
            }
          }
        } else {
          // Fallback to empty users if API fails
          setUsers([])
          console.warn('Failed to load users from API')
        }

        // Load wiki pages
        const wikiResponse = await fetch(`/api/wiki/pages?workspaceId=${currentWorkspace?.id || 'workspace-1'}`)
        if (wikiResponse.ok) {
          const result = await wikiResponse.json()
          // Handle paginated response - data is in result.data
          const wikiData = result.data || result
          // Ensure wikiData is an array before setting
          if (Array.isArray(wikiData)) {
            setWikiPages(wikiData)
          } else {
            console.warn('Expected array but got:', typeof wikiData, wikiData)
            setWikiPages([])
          }
        }
      } catch (error) {
        console.error('Error loading data:', error)
      }
    }

    loadData()
  }, [session?.user?.email, currentWorkspace?.id])

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Project name is required'
    }

    if (!formData.endDate) {
      newErrors.endDate = 'End date is required'
    } else if (new Date(formData.endDate) <= new Date(formData.startDate)) {
      newErrors.endDate = 'End date must be after start date'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleTaskTemplateApplied = (template: any) => {
    console.log('Task template applied:', template)
    router.push(`/projects/${createdProject?.id}`)
  }

  const handleTaskTemplateDialogClose = () => {
    setShowTaskTemplateDialog(false)
    router.push(`/projects/${createdProject?.id}`)
  }

  const handleTemplateSelect = async (template: any) => {
    try {
      setIsLoading(true)
      
      const response = await fetch(`/api/project-templates/${template.id}/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workspaceId: currentWorkspace?.id || 'workspace-1',
          projectName: formData.name || template.name,
          projectDescription: formData.description || template.description,
          customizations: {
            status: formData.status,
            priority: formData.priority,
            startDate: formData.startDate,
            endDate: formData.endDate,
            color: formData.color,
            department: formData.department,
            team: formData.team
          }
        }),
      })

      if (response.ok) {
        const result = await response.json()
        router.push(`/projects/${result.project.id}`)
      } else {
        const error = await response.json()
        setErrors({ submit: error.error || 'Failed to create project from template' })
      }
    } catch (error) {
      console.error('Error creating project from template:', error)
      setErrors({ submit: 'Failed to create project from template' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setIsLoading(true)
    setErrors({})

    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          workspaceId: currentWorkspace?.id || 'workspace-1'
        }),
      })

      if (response.ok) {
        const project = await response.json()
        setCreatedProject({ id: project.id, name: project.name })
        setShowTaskTemplateDialog(true)
      } else {
        const errorData = await response.json()
        setErrors({ submit: errorData.message || 'Failed to create project' })
      }
    } catch (error) {
      console.error('Error creating project:', error)
      setErrors({ submit: 'An unexpected error occurred' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (field: keyof ProjectFormData, value: string | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const handleMultiSelectChange = (field: 'watcherIds' | 'assigneeIds', userId: string) => {
    setFormData(prev => {
      const currentIds = prev[field] as string[]
      const newIds = currentIds.includes(userId)
        ? currentIds.filter(id => id !== userId)
        : [...currentIds, userId]
      return { ...prev, [field]: newIds }
    })
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center space-x-4 mb-6">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/projects">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold flex items-center space-x-2">
            <Target className="h-8 w-8 text-primary" />
            <span>New Project</span>
          </h1>
          <p className="text-muted-foreground">
            Create a new project to organize your team's work
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>
                Essential details about your project
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Project Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Enter project name"
                  className={errors.name ? 'border-red-500' : ''}
                />
                {errors.name && (
                  <p className="text-sm text-red-500 flex items-center space-x-1">
                    <AlertCircle className="h-4 w-4" />
                    <span>{errors.name}</span>
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Describe what this project is about"
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label>Project Color</Label>
                <div className="flex flex-wrap gap-2">
                  {colorOptions.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => handleInputChange('color', color.value)}
                      className={`w-8 h-8 rounded-full ${color.color} border-2 transition-all ${
                        formData.color === color.value 
                          ? 'border-gray-900 scale-110' 
                          : 'border-gray-300 hover:scale-105'
                      }`}
                      title={color.label}
                    />
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Project Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Project Settings</CardTitle>
              <CardDescription>
                Configure status, priority, and timeline
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
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
                  <Label htmlFor="priority">Priority</Label>
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
                <Label htmlFor="startDate">Start Date *</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => handleInputChange('startDate', e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="endDate">End Date *</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="endDate"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => handleInputChange('endDate', e.target.value)}
                    className={`pl-10 ${errors.endDate ? 'border-red-500' : ''}`}
                  />
                </div>
                {errors.endDate && (
                  <p className="text-sm text-red-500 flex items-center space-x-1">
                    <AlertCircle className="h-4 w-4" />
                    <span>{errors.endDate}</span>
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Team & Organization */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Building2 className="h-5 w-5" />
                <span>Organization</span>
              </CardTitle>
              <CardDescription>
                Department and team assignment
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Select 
                  value={formData.department} 
                  onValueChange={(value) => handleInputChange('department', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departmentOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="team">Team</Label>
                <Select 
                  value={formData.team} 
                  onValueChange={(value) => handleInputChange('team', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select team" />
                  </SelectTrigger>
                  <SelectContent>
                    {teamOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5" />
                <span>Project Owner</span>
              </CardTitle>
              <CardDescription>
                Who is responsible for this project
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="owner">Project Owner</Label>
                <Select 
                  value={formData.ownerId} 
                  onValueChange={(value) => handleInputChange('ownerId', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select project owner" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span>{user.name}</span>
                          <span className="text-sm text-muted-foreground">({user.email})</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Team Members */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Eye className="h-5 w-5" />
                <span>Watchers</span>
              </CardTitle>
              <CardDescription>
                Users who will be notified about project updates
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Select Watchers</Label>
                <div className="space-y-2 max-h-32 overflow-y-auto border rounded-md p-2">
                  {users.map((user) => (
                    <div key={user.id} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`watcher-${user.id}`}
                        checked={formData.watcherIds.includes(user.id)}
                        onChange={() => handleMultiSelectChange('watcherIds', user.id)}
                        className="rounded border-gray-300"
                      />
                      <label htmlFor={`watcher-${user.id}`} className="flex items-center space-x-2 cursor-pointer">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <span className="text-sm">{user.name}</span>
                        <span className="text-xs text-muted-foreground">({user.email})</span>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <UserPlus className="h-5 w-5" />
                <span>Assignees</span>
              </CardTitle>
              <CardDescription>
                Team members assigned to work on this project
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Select Assignees</Label>
                <div className="space-y-2 max-h-32 overflow-y-auto border rounded-md p-2">
                  {users.map((user) => (
                    <div key={user.id} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`assignee-${user.id}`}
                        checked={formData.assigneeIds.includes(user.id)}
                        onChange={() => handleMultiSelectChange('assigneeIds', user.id)}
                        className="rounded border-gray-300"
                      />
                      <label htmlFor={`assignee-${user.id}`} className="flex items-center space-x-2 cursor-pointer">
                        <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                        <span className="text-sm">{user.name}</span>
                        <span className="text-xs text-muted-foreground">({user.email})</span>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Wiki Integration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <LinkIcon className="h-5 w-5" />
              <span>Wiki Integration</span>
            </CardTitle>
            <CardDescription>
              Link this project to a wiki page for documentation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="wikiPage">Related Wiki Page</Label>
              <Select 
                value={formData.wikiPageId} 
                onValueChange={(value) => handleInputChange('wikiPageId', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a wiki page (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {Array.isArray(wikiPages) ? wikiPages.map((page) => (
                    <SelectItem key={page.id} value={page.id}>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="text-xs">
                          {page.category}
                        </Badge>
                        <span>{page.title}</span>
                      </div>
                    </SelectItem>
                  )) : []}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Error Message */}
        {errors.submit && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2 text-red-700">
                <AlertCircle className="h-5 w-5" />
                <span>{errors.submit}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end space-x-4">
          <Button variant="outline" asChild>
            <Link href="/projects">Cancel</Link>
          </Button>
          <Button 
            type="button" 
            variant="secondary" 
            onClick={() => setShowTemplateSelector(true)}
            disabled={isLoading}
          >
            Use Template
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Create Project
              </>
            )}
          </Button>
        </div>
      </form>

      {/* Template Selector */}
      <TemplateSelector
        isOpen={showTemplateSelector}
        onClose={() => setShowTemplateSelector(false)}
        onSelectTemplate={handleTemplateSelect}
      />

      {createdProject && (
        <TaskTemplateDialog
          isOpen={showTaskTemplateDialog}
          onClose={handleTaskTemplateDialogClose}
          onTemplateApplied={handleTaskTemplateApplied}
          projectId={createdProject.id}
          projectName={createdProject.name}
        />
      )}
    </div>
  )
}
