"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Building, 
  Target, 
  Award, 
  BarChart3,
  Users,
  DollarSign,
  Plus,
  X,
  CheckCircle,
  TrendingUp
} from "lucide-react"

interface RoleData {
  id: string
  title: string
  department: string | null
  level: number
  parentId: string | null
  userId: string | null
  order: number
  isActive: boolean
  // Contextual AI fields (optional for backward compatibility)
  roleDescription?: string | null
  responsibilities?: string[]
  requiredSkills?: string[]
  preferredSkills?: string[]
  keyMetrics?: string[]
  teamSize?: number | null
  budget?: string | null
  reportingStructure?: string | null
}

interface RoleFormProps {
  isOpen: boolean
  onClose: () => void
  onSave: (role: Partial<RoleData>) => void
  role?: RoleData | null
  existingRoles: RoleData[]
  workspaceId: string
}

export function RoleForm({ 
  isOpen, 
  onClose, 
  onSave, 
  role,
  existingRoles,
  workspaceId 
}: RoleFormProps) {
  const [formData, setFormData] = useState({
    title: '',
    department: '',
    level: 1,
    parentId: '',
    userId: '',
    order: 0,
    roleDescription: '',
    responsibilities: [] as string[],
    requiredSkills: [] as string[],
    preferredSkills: [] as string[],
    keyMetrics: [] as string[],
    teamSize: '',
    budget: '',
    reportingStructure: ''
  })
  const [loading, setLoading] = useState(false)
  const [newResponsibility, setNewResponsibility] = useState('')
  const [newRequiredSkill, setNewRequiredSkill] = useState('')
  const [newPreferredSkill, setNewPreferredSkill] = useState('')
  const [newMetric, setNewMetric] = useState('')

  // Initialize form data when role changes
  useEffect(() => {
    if (role) {
      setFormData({
        title: role.title,
        department: role.department || '',
        level: role.level,
        parentId: role.parentId || '',
        userId: role.userId || '',
        order: role.order,
        roleDescription: role.roleDescription || '',
        responsibilities: role.responsibilities || [],
        requiredSkills: role.requiredSkills || [],
        preferredSkills: role.preferredSkills || [],
        keyMetrics: role.keyMetrics || [],
        teamSize: role.teamSize?.toString() || '',
        budget: role.budget || '',
        reportingStructure: role.reportingStructure || ''
      })
    } else {
      setFormData({
        title: '',
        department: '',
        level: 1,
        parentId: '',
        userId: '',
        order: 0,
        roleDescription: '',
        responsibilities: [],
        requiredSkills: [],
        preferredSkills: [],
        keyMetrics: [],
        teamSize: '',
        budget: '',
        reportingStructure: ''
      })
    }
  }, [role])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const cleanedData = {
        ...formData,
        parentId: formData.parentId === 'none' ? null : formData.parentId,
        userId: formData.userId || null,
        teamSize: formData.teamSize ? parseInt(formData.teamSize) : null
      }
      
      await onSave(cleanedData)
      onClose()
    } catch (error) {
      console.error('Error saving role:', error)
    } finally {
      setLoading(false)
    }
  }

  const addResponsibility = () => {
    if (newResponsibility.trim() && !formData.responsibilities.includes(newResponsibility.trim())) {
      setFormData({ ...formData, responsibilities: [...formData.responsibilities, newResponsibility.trim()] })
      setNewResponsibility('')
    }
  }

  const removeResponsibility = (responsibilityToRemove: string) => {
    setFormData({ ...formData, responsibilities: formData.responsibilities.filter(resp => resp !== responsibilityToRemove) })
  }

  const addRequiredSkill = () => {
    if (newRequiredSkill.trim() && !formData.requiredSkills.includes(newRequiredSkill.trim())) {
      setFormData({ ...formData, requiredSkills: [...formData.requiredSkills, newRequiredSkill.trim()] })
      setNewRequiredSkill('')
    }
  }

  const removeRequiredSkill = (skillToRemove: string) => {
    setFormData({ ...formData, requiredSkills: formData.requiredSkills.filter(skill => skill !== skillToRemove) })
  }

  const addPreferredSkill = () => {
    if (newPreferredSkill.trim() && !formData.preferredSkills.includes(newPreferredSkill.trim())) {
      setFormData({ ...formData, preferredSkills: [...formData.preferredSkills, newPreferredSkill.trim()] })
      setNewPreferredSkill('')
    }
  }

  const removePreferredSkill = (skillToRemove: string) => {
    setFormData({ ...formData, preferredSkills: formData.preferredSkills.filter(skill => skill !== skillToRemove) })
  }

  const addMetric = () => {
    if (newMetric.trim() && !formData.keyMetrics.includes(newMetric.trim())) {
      setFormData({ ...formData, keyMetrics: [...formData.keyMetrics, newMetric.trim()] })
      setNewMetric('')
    }
  }

  const removeMetric = (metricToRemove: string) => {
    setFormData({ ...formData, keyMetrics: formData.keyMetrics.filter(metric => metric !== metricToRemove) })
  }

  const availableParents = existingRoles.filter(r => 
    r.id !== role?.id && 
    r.level < formData.level &&
    r.isActive
  )

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {role ? 'Edit Role' : 'Add New Role'}
          </DialogTitle>
          <DialogDescription>
            {role ? 'Update the role with detailed contextual information for AI assistance' : 'Create a new role with detailed contextual information'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Role Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <Building className="h-5 w-5 mr-2" />
                Basic Role Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Role Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., Senior Software Engineer"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <Select
                    value={formData.department}
                    onValueChange={(value) => setFormData({ ...formData, department: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Executive">Executive</SelectItem>
                      <SelectItem value="Engineering">Engineering</SelectItem>
                      <SelectItem value="Marketing">Marketing</SelectItem>
                      <SelectItem value="Finance">Finance</SelectItem>
                      <SelectItem value="Sales">Sales</SelectItem>
                      <SelectItem value="HR">HR</SelectItem>
                      <SelectItem value="Operations">Operations</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="level">Level</Label>
                  <Select
                    value={formData.level.toString()}
                    onValueChange={(value) => setFormData({ ...formData, level: parseInt(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Level 1 (CEO/Executive)</SelectItem>
                      <SelectItem value="2">Level 2 (VP/Senior Leadership)</SelectItem>
                      <SelectItem value="3">Level 3 (Director)</SelectItem>
                      <SelectItem value="4">Level 4 (Manager)</SelectItem>
                      <SelectItem value="5">Level 5 (Individual Contributor)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="parentId">Reports To</Label>
                  <Select
                    value={formData.parentId || undefined}
                    onValueChange={(value) => setFormData({ ...formData, parentId: value || '' })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select reporting manager" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No direct report</SelectItem>
                      {availableParents.map((parent) => (
                        <SelectItem key={parent.id} value={parent.id}>
                          {parent.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="roleDescription">Role Description</Label>
                <Textarea
                  id="roleDescription"
                  value={formData.roleDescription}
                  onChange={(e) => setFormData({ ...formData, roleDescription: e.target.value })}
                  placeholder="Provide a detailed description of this role, its purpose, and how it fits into the organization..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Key Responsibilities */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <Target className="h-5 w-5 mr-2" />
                Key Responsibilities
              </CardTitle>
              <CardDescription>
                Define the main responsibilities and duties for this role
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex space-x-2">
                <Input
                  placeholder="Add a responsibility..."
                  value={newResponsibility}
                  onChange={(e) => setNewResponsibility(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addResponsibility())}
                />
                <Button type="button" onClick={addResponsibility} disabled={!newResponsibility.trim()}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              
              {formData.responsibilities.length > 0 && (
                <ul className="space-y-2">
                  {formData.responsibilities.map((responsibility, index) => (
                    <li key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                      <span className="text-sm flex items-center">
                        <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                        {responsibility}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeResponsibility(responsibility)}
                        className="hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Required Skills */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <Award className="h-5 w-5 mr-2" />
                Required Skills
              </CardTitle>
              <CardDescription>
                Essential skills and qualifications needed for this role
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex space-x-2">
                <Input
                  placeholder="Add a required skill..."
                  value={newRequiredSkill}
                  onChange={(e) => setNewRequiredSkill(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addRequiredSkill())}
                />
                <Button type="button" onClick={addRequiredSkill} disabled={!newRequiredSkill.trim()}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              
              {formData.requiredSkills.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.requiredSkills.map((skill, index) => (
                    <Badge key={index} variant="secondary" className="flex items-center space-x-1">
                      <span>{skill}</span>
                      <button
                        type="button"
                        onClick={() => removeRequiredSkill(skill)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Preferred Skills */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <Award className="h-5 w-5 mr-2" />
                Preferred Skills
              </CardTitle>
              <CardDescription>
                Nice-to-have skills that would be beneficial for this role
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex space-x-2">
                <Input
                  placeholder="Add a preferred skill..."
                  value={newPreferredSkill}
                  onChange={(e) => setNewPreferredSkill(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addPreferredSkill())}
                />
                <Button type="button" onClick={addPreferredSkill} disabled={!newPreferredSkill.trim()}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              
              {formData.preferredSkills.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.preferredSkills.map((skill, index) => (
                    <Badge key={index} variant="outline" className="flex items-center space-x-1">
                      <span>{skill}</span>
                      <button
                        type="button"
                        onClick={() => removePreferredSkill(skill)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Key Metrics */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <BarChart3 className="h-5 w-5 mr-2" />
                Key Performance Metrics
              </CardTitle>
              <CardDescription>
                Define how success will be measured in this role
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex space-x-2">
                <Input
                  placeholder="Add a key metric..."
                  value={newMetric}
                  onChange={(e) => setNewMetric(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addMetric())}
                />
                <Button type="button" onClick={addMetric} disabled={!newMetric.trim()}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              
              {formData.keyMetrics.length > 0 && (
                <ul className="space-y-2">
                  {formData.keyMetrics.map((metric, index) => (
                    <li key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                      <span className="text-sm flex items-center">
                        <TrendingUp className="h-4 w-4 mr-2 text-blue-500" />
                        {metric}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeMetric(metric)}
                        className="hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Additional Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <Users className="h-5 w-5 mr-2" />
                Additional Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="teamSize">Team Size</Label>
                  <Input
                    id="teamSize"
                    type="number"
                    value={formData.teamSize}
                    onChange={(e) => setFormData({ ...formData, teamSize: e.target.value })}
                    placeholder="Number of direct reports"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="budget">Budget Responsibility</Label>
                  <Input
                    id="budget"
                    value={formData.budget}
                    onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                    placeholder="e.g., $500K annual budget"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="reportingStructure">Reporting Structure</Label>
                  <Input
                    id="reportingStructure"
                    value={formData.reportingStructure}
                    onChange={(e) => setFormData({ ...formData, reportingStructure: e.target.value })}
                    placeholder="Describe the reporting structure and relationships"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : (role ? 'Update Role' : 'Create Role')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
