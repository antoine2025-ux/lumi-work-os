"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  User, 
  Search,
  UserPlus,
  Mail,
  Building
} from "lucide-react"

interface User {
  id: string
  name: string | null
  email: string | null
  image: string | null
  bio?: string | null
  skills?: string[]
  currentGoals?: string[]
  interests?: string[]
  timezone?: string | null
  location?: string | null
  phone?: string | null
  linkedinUrl?: string | null
  githubUrl?: string | null
  personalWebsite?: string | null
}

interface RoleData {
  id: string
  title: string
  department: string | null
  level: number
  isActive: boolean
  roleDescription?: string | null
  responsibilities?: string[]
  requiredSkills?: string[]
  preferredSkills?: string[]
  keyMetrics?: string[]
  teamSize?: number | null
  budget?: string | null
  reportingStructure?: string | null
}

interface UserAssignmentModalProps {
  isOpen: boolean
  onClose: () => void
  onAssign: (userId: string) => void
  role: RoleData | null
  availableUsers: User[]
  workspaceId: string
}

export function UserAssignmentModal({ 
  isOpen, 
  onClose, 
  onAssign,
  role,
  availableUsers,
  workspaceId 
}: UserAssignmentModalProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [loading, setLoading] = useState(false)

  // Reset selection when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setSelectedUserId('')
      setSearchTerm('')
    }
  }, [isOpen])

  const handleAssign = async () => {
    if (!selectedUserId) return
    
    setLoading(true)
    try {
      await onAssign(selectedUserId)
      onClose()
    } catch (error) {
      console.error('Error assigning user:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredUsers = availableUsers.filter(user => 
    !searchTerm || 
    user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.skills?.some(skill => skill.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const getInitials = (name: string | null) => {
    if (!name) return "?"
    return name.split(' ').map(n => n[0]).join('').toUpperCase()
  }

  const getSkillMatchCount = (user: User) => {
    if (!role?.requiredSkills || !user.skills) return 0
    return user.skills.filter(skill => role.requiredSkills?.includes(skill)).length
  }

  const getSkillMatchPercentage = (user: User) => {
    if (!role?.requiredSkills || !user.skills) return 0
    const matches = getSkillMatchCount(user)
    return Math.round((matches / role.requiredSkills.length) * 100)
  }

  if (!role) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <UserPlus className="h-5 w-5 mr-2" />
            Assign User to Role
          </DialogTitle>
          <DialogDescription>
            Select a user to assign to the {role.title} position
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Role Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <Building className="h-5 w-5 mr-2" />
                {role.title}
              </CardTitle>
              <CardDescription>
                {role.department && (
                  <Badge variant="outline" className="mr-2">
                    {role.department}
                  </Badge>
                )}
                Level {role.level}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {role.roleDescription && (
                <p className="text-sm text-muted-foreground mb-3">
                  {role.roleDescription}
                </p>
              )}
              
              {role.requiredSkills && role.requiredSkills.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Required Skills:</h4>
                  <div className="flex flex-wrap gap-1">
                    {role.requiredSkills.map((skill, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* User Search */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="search">Search Users</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search by name, email, or skills..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Available Users */}
            <div className="max-h-96 overflow-y-auto border rounded-md">
              <div className="space-y-1 p-2">
                {filteredUsers.length > 0 ? (
                  filteredUsers.map((user) => {
                    const skillMatchCount = getSkillMatchCount(user)
                    const skillMatchPercentage = getSkillMatchPercentage(user)
                    
                    return (
                      <div
                        key={user.id}
                        className={`flex items-center space-x-3 p-3 rounded cursor-pointer hover:bg-gray-100 transition-colors ${
                          selectedUserId === user.id ? 'bg-blue-100 border border-blue-300' : ''
                        }`}
                        onClick={() => setSelectedUserId(user.id)}
                      >
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={user.image || undefined} />
                          <AvatarFallback>
                            {getInitials(user.name)}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h3 className="font-medium text-sm truncate">
                              {user.name}
                            </h3>
                            {skillMatchCount > 0 && (
                              <Badge 
                                variant={skillMatchPercentage >= 50 ? "default" : "secondary"}
                                className="text-xs"
                              >
                                {skillMatchCount}/{role.requiredSkills?.length || 0} skills
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            {user.email}
                          </p>
                          {user.skills && user.skills.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {user.skills.slice(0, 3).map((skill, index) => (
                                <Badge 
                                  key={index} 
                                  variant={role.requiredSkills?.includes(skill) ? "default" : "outline"}
                                  className="text-xs"
                                >
                                  {skill}
                                </Badge>
                              ))}
                              {user.skills.length > 3 && (
                                <span className="text-xs text-muted-foreground">
                                  +{user.skills.length - 3} more
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        
                        {selectedUserId === user.id && (
                          <div className="text-blue-600">
                            <UserPlus className="h-5 w-5" />
                          </div>
                        )}
                      </div>
                    )
                  })
                ) : (
                  <div className="p-4 text-center text-muted-foreground">
                    {searchTerm ? 'No users found matching your search' : 'No available users'}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Selected User Preview */}
          {selectedUserId && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Selected User</CardTitle>
              </CardHeader>
              <CardContent>
                {(() => {
                  const selectedUser = availableUsers.find(u => u.id === selectedUserId)
                  if (!selectedUser) return null
                  
                  const skillMatchCount = getSkillMatchCount(selectedUser)
                  const skillMatchPercentage = getSkillMatchPercentage(selectedUser)
                  
                  return (
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={selectedUser.image || undefined} />
                        <AvatarFallback>
                          {getInitials(selectedUser.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <h3 className="font-medium">{selectedUser.name}</h3>
                        <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                        {skillMatchCount > 0 && (
                          <div className="mt-1">
                            <Badge 
                              variant={skillMatchPercentage >= 50 ? "default" : "secondary"}
                              className="text-xs"
                            >
                              {skillMatchPercentage}% skill match ({skillMatchCount}/{role.requiredSkills?.length || 0})
                            </Badge>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })()}
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleAssign} 
            disabled={!selectedUserId || loading}
          >
            {loading ? 'Assigning...' : 'Assign User'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
