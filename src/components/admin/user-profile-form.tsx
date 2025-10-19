"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { User, Mail, Building, Shield, UserPlus } from "lucide-react"

interface User {
  id: string
  name: string | null
  email: string | null
  image: string | null
  role: string
  department: string | null
  position: string | null
  isActive: boolean
}

interface OrgPosition {
  id: string
  title: string
  department: string | null
  level: number
  parentId: string | null
  userId: string | null
  user?: User | null
}

interface UserProfileFormProps {
  isOpen: boolean
  onClose: () => void
  onSave: (userData: Partial<User>) => void
  user?: User | null
  existingPositions: OrgPosition[]
  workspaceId: string
}

export function UserProfileForm({ 
  isOpen, 
  onClose, 
  onSave, 
  user, 
  existingPositions,
  workspaceId 
}: UserProfileFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'MEMBER',
    department: '',
    positionId: '',
    isActive: true,
    createOrgPosition: false,
    orgPositionTitle: '',
    orgPositionLevel: 3,
    orgPositionParentId: ''
  })
  const [loading, setLoading] = useState(false)

  // Initialize form data when user changes
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        role: user.role,
        department: user.department || '',
        positionId: user.position || '',
        isActive: user.isActive,
        createOrgPosition: false,
        orgPositionTitle: '',
        orgPositionLevel: 3,
        orgPositionParentId: ''
      })
    } else {
      setFormData({
        name: '',
        email: '',
        role: 'MEMBER',
        department: '',
        positionId: '',
        isActive: true,
        createOrgPosition: true, // Default to creating org position for new users
        orgPositionTitle: '',
        orgPositionLevel: 3,
        orgPositionParentId: ''
      })
    }
  }, [user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Clean up the form data before saving
      const cleanedData = {
        ...formData,
        positionId: formData.positionId || null,
        orgPositionParentId: formData.orgPositionParentId === 'none' ? null : formData.orgPositionParentId
      }
      
      await onSave(cleanedData)
      onClose()
    } catch (error) {
      console.error('Error saving user:', error)
    } finally {
      setLoading(false)
    }
  }

  const availablePositions = existingPositions.filter(pos => !pos.user)
  const availableParents = existingPositions.filter(pos => 
    pos.level < formData.orgPositionLevel &&
    pos.isActive
  )

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'OWNER': return 'bg-purple-100 text-purple-800'
      case 'ADMIN': return 'bg-red-100 text-red-800'
      case 'MEMBER': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getDepartmentColor = (department: string) => {
    const colors: { [key: string]: string } = {
      'Executive': 'bg-yellow-100 text-yellow-800',
      'Engineering': 'bg-blue-100 text-blue-800',
      'Marketing': 'bg-purple-100 text-purple-800',
      'Finance': 'bg-green-100 text-green-800',
      'Product': 'bg-orange-100 text-orange-800',
      'Sales': 'bg-red-100 text-red-800',
      'HR': 'bg-pink-100 text-pink-800',
      'Operations': 'bg-gray-100 text-gray-800'
    }
    return colors[department] || 'bg-gray-100 text-gray-800'
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <UserPlus className="h-5 w-5" />
            <span>{user ? 'Edit User Profile' : 'Create User Profile'}</span>
          </DialogTitle>
          <DialogDescription>
            {user ? 'Update user information and organizational role' : 'Create a new user and optionally assign them to an organizational position'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Basic Information</CardTitle>
              <CardDescription>
                Essential user details and contact information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="John Doe"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="john.doe@company.com"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="role">Role *</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value) => setFormData({ ...formData, role: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MEMBER">Member</SelectItem>
                      <SelectItem value="ADMIN">Administrator</SelectItem>
                      <SelectItem value="OWNER">Owner</SelectItem>
                    </SelectContent>
                  </Select>
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
                      <SelectItem value="Product">Product</SelectItem>
                      <SelectItem value="Sales">Sales</SelectItem>
                      <SelectItem value="HR">HR</SelectItem>
                      <SelectItem value="Operations">Operations</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: !!checked })}
                />
                <Label htmlFor="isActive">Active user (can log in and access the system)</Label>
              </div>
            </CardContent>
          </Card>

          {/* Organizational Position */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center space-x-2">
                <Building className="h-5 w-5" />
                <span>Organizational Position</span>
              </CardTitle>
              <CardDescription>
                Assign user to an existing position or create a new one
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="createOrgPosition"
                  checked={formData.createOrgPosition}
                  onCheckedChange={(checked) => setFormData({ ...formData, createOrgPosition: !!checked })}
                />
                <Label htmlFor="createOrgPosition">
                  Create new organizational position for this user
                </Label>
              </div>

              {formData.createOrgPosition ? (
                <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                  <h4 className="font-medium">New Position Details</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="orgPositionTitle">Position Title *</Label>
                      <Input
                        id="orgPositionTitle"
                        value={formData.orgPositionTitle}
                        onChange={(e) => setFormData({ ...formData, orgPositionTitle: e.target.value })}
                        placeholder="e.g., Senior Software Engineer"
                        required={formData.createOrgPosition}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="orgPositionLevel">Level</Label>
                      <Select
                        value={formData.orgPositionLevel.toString()}
                        onValueChange={(value) => setFormData({ ...formData, orgPositionLevel: parseInt(value) })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">Level 1 (Executive)</SelectItem>
                          <SelectItem value="2">Level 2 (Senior Leadership)</SelectItem>
                          <SelectItem value="3">Level 3 (Director)</SelectItem>
                          <SelectItem value="4">Level 4 (Manager)</SelectItem>
                          <SelectItem value="5">Level 5 (Individual Contributor)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="orgPositionParentId">Reports To</Label>
                      <Select
                        value={formData.orgPositionParentId || undefined}
                        onValueChange={(value) => setFormData({ ...formData, orgPositionParentId: value || '' })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select reporting manager" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No direct report</SelectItem>
                          {availableParents.map((parent) => (
                            <SelectItem key={parent.id} value={parent.id}>
                              {parent.title} {parent.user && `(${parent.user.name})`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="positionId">Assign to Existing Position</Label>
                  <Select
                    value={formData.positionId || undefined}
                    onValueChange={(value) => setFormData({ ...formData, positionId: value || '' })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select existing position" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No position assigned</SelectItem>
                      {availablePositions.map((position) => (
                        <SelectItem key={position.id} value={position.id}>
                          {position.title} - {position.department || 'No Department'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Preview</CardTitle>
              <CardDescription>
                How this user will appear in the system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-4 p-4 border rounded-lg">
                <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center">
                  <User className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <h3 className="font-medium">{formData.name || 'User Name'}</h3>
                    <Badge className={getRoleColor(formData.role)}>
                      {formData.role}
                    </Badge>
                    <Badge variant={formData.isActive ? "default" : "secondary"}>
                      {formData.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{formData.email || 'user@email.com'}</p>
                  {formData.department && (
                    <Badge className={`${getDepartmentColor(formData.department)} text-xs mt-1`}>
                      {formData.department}
                    </Badge>
                  )}
                  {formData.createOrgPosition && formData.orgPositionTitle && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Position: {formData.orgPositionTitle}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : (user ? 'Update User' : 'Create User')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
