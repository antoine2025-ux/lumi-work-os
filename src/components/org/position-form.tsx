"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { User, Building, Users, Mail, Phone, MapPin } from "lucide-react"

interface User {
  id: string
  name: string | null
  email: string | null
  image: string | null
}

interface OrgPosition {
  id: string
  title: string
  department: string | null
  level: number
  parentId: string | null
  userId: string | null
  order: number
  isActive: boolean
  user?: User | null
  parent?: {
    id: string
    title: string
    user?: {
      name: string | null
    } | null
  } | null
  children?: OrgPosition[]
}

interface PositionFormProps {
  isOpen: boolean
  onClose: () => void
  onSave: (position: Partial<OrgPosition>) => void
  position?: OrgPosition | null
  existingPositions: OrgPosition[]
  workspaceId: string
}

export function PositionForm({ 
  isOpen, 
  onClose, 
  onSave, 
  position, 
  existingPositions,
  workspaceId 
}: PositionFormProps) {
  const [formData, setFormData] = useState({
    title: '',
    department: '',
    level: 1,
    parentId: '',
    userId: '',
    order: 0
  })
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  // Load available users
  useEffect(() => {
    if (isOpen) {
      loadUsers()
    }
  }, [isOpen, workspaceId])

  // Initialize form data when position changes
  useEffect(() => {
    if (position) {
      setFormData({
        title: position.title,
        department: position.department || '',
        level: position.level,
        parentId: position.parentId || '',
        userId: position.userId || '',
        order: position.order
      })
    } else {
      setFormData({
        title: '',
        department: '',
        level: 1,
        parentId: '',
        userId: '',
        order: 0
      })
    }
  }, [position])

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Clean up the form data before saving
      const cleanedData = {
        ...formData,
        parentId: formData.parentId === 'none' ? null : formData.parentId,
        userId: formData.userId || null
      }
      
      await onSave(cleanedData)
      onClose()
    } catch (error) {
      console.error('Error saving position:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredUsers = users.filter(user => 
    !searchTerm || 
    user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const availableParents = existingPositions.filter(p => 
    p.id !== position?.id && 
    p.level < formData.level &&
    p.isActive
  )

  const getLevelColor = (level: number) => {
    const colors = [
      'bg-purple-500', // CEO
      'bg-blue-500',   // VPs
      'bg-green-500',  // Directors
      'bg-yellow-500', // Managers
      'bg-gray-500'    // Others
    ]
    return colors[Math.min(level - 1, colors.length - 1)]
  }

  const getDepartmentColor = (department: string) => {
    const colors: { [key: string]: string } = {
      'Executive': 'bg-purple-100 text-purple-800',
      'Engineering': 'bg-blue-100 text-blue-800',
      'Marketing': 'bg-green-100 text-green-800',
      'Finance': 'bg-yellow-100 text-yellow-800',
      'Sales': 'bg-red-100 text-red-800',
      'HR': 'bg-pink-100 text-pink-800',
      'Operations': 'bg-gray-100 text-gray-800'
    }
    return colors[department] || 'bg-gray-100 text-gray-800'
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {position ? 'Edit Position' : 'Add New Position'}
          </DialogTitle>
          <DialogDescription>
            {position ? 'Update the position details' : 'Create a new position in the organization chart'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Position Title *</Label>
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
                      {parent.title} {parent.user && `(${parent.user.name})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="userId">Assign User</Label>
            <div className="space-y-2">
              <Input
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <div className="max-h-40 overflow-y-auto border rounded-md">
                <div className="space-y-1 p-2">
                  {/* No user assigned option */}
                  <div
                    className={`flex items-center space-x-3 p-2 rounded cursor-pointer hover:bg-gray-100 ${
                      !formData.userId ? 'bg-blue-100' : ''
                    }`}
                    onClick={() => setFormData({ ...formData, userId: '' })}
                  >
                    <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                      <User className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        No user assigned
                      </p>
                      <p className="text-sm text-gray-500 truncate">
                        Open position
                      </p>
                    </div>
                    {!formData.userId && (
                      <Badge variant="secondary">Selected</Badge>
                    )}
                  </div>
                  
                  {/* Available users */}
                  {filteredUsers.length > 0 && filteredUsers.map((user) => (
                    <div
                      key={user.id}
                      className={`flex items-center space-x-3 p-2 rounded cursor-pointer hover:bg-gray-100 ${
                        formData.userId === user.id ? 'bg-blue-100' : ''
                      }`}
                      onClick={() => setFormData({ ...formData, userId: user.id })}
                    >
                      <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                        {user.image ? (
                          <img src={user.image} alt={user.name || ''} className="h-8 w-8 rounded-full" />
                        ) : (
                          <User className="h-4 w-4" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {user.name}
                        </p>
                        <p className="text-sm text-gray-500 truncate">
                          {user.email}
                        </p>
                      </div>
                      {formData.userId === user.id && (
                        <Badge variant="secondary">Selected</Badge>
                      )}
                    </div>
                  ))}
                  
                  {filteredUsers.length === 0 && searchTerm && (
                    <div className="p-4 text-center text-gray-500">
                      No available users found
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Selected User</CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                if (!formData.userId) {
                  return (
                    <div className="flex items-center space-x-3">
                      <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                        <User className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium">No user assigned</p>
                        <p className="text-sm text-gray-500">Open position</p>
                      </div>
                    </div>
                  )
                }
                
                const selectedUser = users.find(u => u.id === formData.userId)
                return selectedUser ? (
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                      {selectedUser.image ? (
                        <img src={selectedUser.image} alt={selectedUser.name || ''} className="h-10 w-10 rounded-full" />
                      ) : (
                        <User className="h-5 w-5" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{selectedUser.name}</p>
                      <p className="text-sm text-gray-500">{selectedUser.email}</p>
                    </div>
                  </div>
                ) : null
              })()}
            </CardContent>
          </Card>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : (position ? 'Update Position' : 'Create Position')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
