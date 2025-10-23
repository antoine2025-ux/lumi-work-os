"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RichTextEditor } from '@/components/ui/rich-text-editor'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Building, X } from 'lucide-react'

interface RoleCardFormData {
  roleName: string
  department: string
  roleDescription: string
  jobFamily: string
  level: string
}

interface CreateRoleCardDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (data: RoleCardFormData) => void
  loading?: boolean
}

export function CreateRoleCardDialog({ 
  open, 
  onOpenChange, 
  onSave, 
  loading = false 
}: CreateRoleCardDialogProps) {
  // Common department options - will be replaced with dynamic data later
  const departmentOptions = [
    'Engineering',
    'Product Management',
    'Design',
    'Marketing',
    'Sales',
    'Customer Success',
    'Human Resources',
    'Finance',
    'Operations',
    'Legal',
    'Data & Analytics',
    'Quality Assurance',
    'DevOps',
    'Security',
    'Research & Development'
  ]

  // Job Family options
  const jobFamilyOptions = [
    'Individual Contributor',
    'Management',
    'Technical Leadership',
    'Product Leadership',
    'Sales & Business Development',
    'Customer Success',
    'Operations & Support',
    'Strategy & Planning',
    'Creative & Design',
    'Data & Research'
  ]

  // Level options
  const levelOptions = [
    'Junior',
    'Senior',
    'Lead',
    'Director'
  ]

  const [formData, setFormData] = useState<RoleCardFormData>({
    roleName: '',
    department: '',
    roleDescription: '',
    jobFamily: '',
    level: ''
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.roleName.trim() && formData.department.trim() && formData.roleDescription.trim() && formData.jobFamily.trim() && formData.level.trim()) {
      onSave(formData)
      // Reset form
      setFormData({ roleName: '', department: '', roleDescription: '', jobFamily: '', level: '' })
    }
  }

  const handleClose = () => {
    onOpenChange(false)
    // Reset form when closing
    setFormData({ roleName: '', department: '', roleDescription: '', jobFamily: '', level: '' })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Create Role Card
          </DialogTitle>
          <DialogDescription>
            Define a new role with its basic information. You can add more details later.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="roleName">Role Name</Label>
            <Input
              id="roleName"
              placeholder="e.g., Senior Software Engineer"
              value={formData.roleName}
              onChange={(e) => setFormData(prev => ({ ...prev, roleName: e.target.value }))}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="department">Department</Label>
            <Select
              value={formData.department}
              onValueChange={(value) => setFormData(prev => ({ ...prev, department: value }))}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a department..." />
              </SelectTrigger>
              <SelectContent>
                {departmentOptions.map((dept) => (
                  <SelectItem key={dept} value={dept}>
                    {dept}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="jobFamily">Job Family</Label>
            <Select
              value={formData.jobFamily}
              onValueChange={(value) => setFormData(prev => ({ ...prev, jobFamily: value }))}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a job family..." />
              </SelectTrigger>
              <SelectContent>
                {jobFamilyOptions.map((family) => (
                  <SelectItem key={family} value={family}>
                    {family}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="level">Level</Label>
            <Select
              value={formData.level}
              onValueChange={(value) => setFormData(prev => ({ ...prev, level: value }))}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a level..." />
              </SelectTrigger>
              <SelectContent>
                {levelOptions.map((level) => (
                  <SelectItem key={level} value={level}>
                    {level}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="roleDescription">Role Description</Label>
            <RichTextEditor
              value={formData.roleDescription}
              onChange={(value) => setFormData(prev => ({ ...prev, roleDescription: value }))}
              placeholder="Describe the role's main responsibilities, objectives, and key functions..."
              rows={8}
              className="min-h-[200px] resize-y"
              required
            />
          </div>

          <DialogFooter className="gap-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading || !formData.roleName.trim() || !formData.department.trim() || !formData.roleDescription.trim() || !formData.jobFamily.trim() || !formData.level.trim()}
            >
              {loading ? 'Creating...' : 'Create Role Card'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
