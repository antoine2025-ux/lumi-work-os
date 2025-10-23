"use client"

import { useState, useEffect } from "react"
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { PositionForm } from "@/components/org/position-form"
import { UserProfileForm } from "@/components/admin/user-profile-form"
import { UserManagementTable } from "@/components/admin/user-management-table"
import { UserProfileCard } from "@/components/org/user-profile-card"
import { RoleCard } from "@/components/org/role-card"
import { UserProfileForm as EnhancedUserProfileForm } from "@/components/org/user-profile-form"
import { RoleForm } from "@/components/org/role-form"
import { UserAssignmentModal } from "@/components/org/user-assignment-modal"
import { 
  Users, 
  Plus, 
  Edit, 
  Trash2,
  Phone,
  Mail,
  MapPin,
  Building,
  UserPlus,
  MoreHorizontal,
  User,
  Shield,
  Settings
} from "lucide-react"

interface User {
  id: string
  name: string | null
  email: string | null
  image: string | null
  // Contextual AI fields (optional for backward compatibility)
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

interface OrgPosition {
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

export default function OrgChartPage() {
  const router = useRouter()
  const [orgData, setOrgData] = useState<OrgPosition[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showUserForm, setShowUserForm] = useState(false)
  const [showUserManagement, setShowUserManagement] = useState(false)
  const [showEnhancedUserForm, setShowEnhancedUserForm] = useState(false)
  const [showEnhancedRoleForm, setShowEnhancedRoleForm] = useState(false)
  const [showUserAssignmentModal, setShowUserAssignmentModal] = useState(false)
  const [editingPosition, setEditingPosition] = useState<OrgPosition | null>(null)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [assigningToRole, setAssigningToRole] = useState<OrgPosition | null>(null)
  const [workspaceId, setWorkspaceId] = useState<string>('')
  const [userRole] = useState('ADMIN') // In a real app, this would come from session/context

  // Get workspace ID from user status
  useEffect(() => {
    const fetchWorkspaceId = async () => {
      try {
        const response = await fetch('/api/auth/user-status')
        if (response.ok) {
          const userStatus = await response.json()
          if (userStatus.workspaceId) {
            setWorkspaceId(userStatus.workspaceId)
          }
        }
      } catch (error) {
        console.error('Error fetching workspace ID:', error)
      }
    }
    fetchWorkspaceId()
  }, [])

  // Load org data on component mount
  useEffect(() => {
    if (workspaceId) {
      loadOrgData()
    }
  }, [workspaceId])

  const loadOrgData = async () => {
    try {
      setLoading(true)
      
      // Include credentials for authentication
      const fetchOptions = {
        credentials: 'include' as RequestCredentials,
        headers: {
          'Content-Type': 'application/json',
        }
      }
      
      const [orgResponse, usersResponse] = await Promise.all([
        fetch(`/api/org/positions?workspaceId=${workspaceId}`, fetchOptions),
        userRole === 'ADMIN' || userRole === 'OWNER' ? fetch(`/api/admin/users?workspaceId=${workspaceId}`, fetchOptions) : Promise.resolve(null)
      ])
      
      if (orgResponse.ok) {
        const data = await orgResponse.json()
        setOrgData(data)
      } else {
        console.error('Failed to load org data:', orgResponse.status, orgResponse.statusText)
      }

      if (usersResponse && usersResponse.ok) {
        const usersData = await usersResponse.json()
        setUsers(usersData)
      } else if (usersResponse) {
        console.error('Failed to load users:', usersResponse.status, usersResponse.statusText)
      }
    } catch (error) {
      console.error('Error loading org data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSavePosition = async (positionData: Partial<OrgPosition>) => {
    try {
      const url = editingPosition 
        ? `/api/org/positions/${editingPosition.id}`
        : '/api/org/positions'
      
      const method = editingPosition ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...positionData,
          workspaceId
        }),
      })

      if (response.ok) {
        await loadOrgData() // Reload data
        setShowForm(false)
        setEditingPosition(null)
      } else {
        const errorData = await response.json()
        console.error('Error saving position:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        })
        alert('Failed to save position: ' + (errorData.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Error saving position:', error)
      alert('Failed to save position: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  const handleDeletePosition = async (positionId: string) => {
    if (!confirm('Are you sure you want to delete this position?')) {
      return
    }

    try {
      const response = await fetch(`/api/org/positions/${positionId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        await loadOrgData() // Reload data
      } else {
        let errorData = null
        let errorMessage = 'Unknown error'
        let rawResponse = ''
        
        try {
          rawResponse = await response.text()
          console.log('Raw response:', rawResponse)
          
          if (rawResponse) {
            errorData = JSON.parse(rawResponse)
            errorMessage = errorData.error || errorData.message || 'Unknown error'
          } else {
            errorMessage = `HTTP ${response.status}: ${response.statusText}`
          }
        } catch (parseError) {
          console.error('Failed to parse error response:', parseError)
          errorMessage = `HTTP ${response.status}: ${response.statusText}`
        }
        
        console.error('Error deleting position:', {
          status: response.status,
          statusText: response.statusText,
          errorData: errorData,
          rawResponse: rawResponse
        })
        
        alert('Failed to delete position: ' + errorMessage)
      }
    } catch (error) {
      console.error('Error deleting position:', error)
      alert('Failed to delete position: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  const handleEditPosition = (position: OrgPosition) => {
    setEditingPosition(position)
    setShowForm(true)
  }

  const handleAddPosition = () => {
    setEditingPosition(null)
    setShowForm(true)
  }

  const handleSaveUser = async (userData: Partial<User>) => {
    try {
      const url = editingUser 
        ? `/api/admin/users/${editingUser.id}`
        : '/api/admin/users'
      
      const method = editingUser ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...userData,
          workspaceId
        }),
      })

      if (response.ok) {
        await loadOrgData() // Reload data
        setShowUserForm(false)
        setEditingUser(null)
      } else {
        const errorData = await response.json()
        console.error('Error saving user:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        })
        alert('Failed to save user: ' + (errorData.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Error saving user:', error)
      alert('Failed to save user: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  const handleEditUser = (user: User) => {
    setEditingUser(user)
    setShowUserForm(true)
  }

  const handleAddUser = () => {
    setEditingUser(null)
    setShowUserForm(true)
  }

  const handleSaveEnhancedUser = async (userData: Partial<User>) => {
    try {
      const url = editingUser 
        ? `/api/admin/users/${editingUser.id}`
        : '/api/admin/users'
      
      const method = editingUser ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...userData,
          workspaceId
        }),
      })

      if (response.ok) {
        await loadOrgData() // Reload data
        setShowEnhancedUserForm(false)
        setEditingUser(null)
      } else {
        const errorData = await response.json()
        console.error('Error saving enhanced user:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        })
        alert('Failed to save user: ' + (errorData.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Error saving enhanced user:', error)
      alert('Failed to save user: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  const handleEditEnhancedUser = (user: User) => {
    setEditingUser(user)
    setShowEnhancedUserForm(true)
  }

  const handleAddEnhancedUser = () => {
    setEditingUser(null)
    setShowEnhancedUserForm(true)
  }

  const handleCreateDepartment = () => {
    // TODO: Implement department creation functionality
    alert('Department creation functionality will be implemented next!')
  }

  const handleOpenRoleCards = () => {
    router.push('/org/role-cards')
  }

  const handleSaveEnhancedRole = async (roleData: Partial<OrgPosition>) => {
    try {
      const url = editingPosition 
        ? `/api/org/positions/${editingPosition.id}`
        : '/api/org/positions'
      
      const method = editingPosition ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...roleData,
          workspaceId
        }),
      })

      if (response.ok) {
        await loadOrgData() // Reload data
        setShowEnhancedRoleForm(false)
        setEditingPosition(null)
      } else {
        const errorData = await response.json()
        console.error('Error saving enhanced role:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        })
        alert('Failed to save role: ' + (errorData.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Error saving enhanced role:', error)
      alert('Failed to save role: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  const handleEditEnhancedRole = (position: OrgPosition) => {
    setEditingPosition(position)
    setShowEnhancedRoleForm(true)
  }

  const handleAddEnhancedRole = () => {
    setEditingPosition(null)
    setShowEnhancedRoleForm(true)
  }

  const handleAssignUserToRole = async (role: OrgPosition) => {
    setAssigningToRole(role)
    setShowUserAssignmentModal(true)
  }

  const handleUserAssignment = async (userId: string) => {
    if (!assigningToRole) return

    try {
      // Update the position with the user assignment
      const response = await fetch(`/api/org/positions/${assigningToRole.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userId,
          workspaceId
        }),
      })

      if (response.ok) {
        await loadOrgData() // Reload data
        setShowUserAssignmentModal(false)
        setAssigningToRole(null)
      } else {
        const errorData = await response.json()
        alert('Failed to assign user: ' + (errorData.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Error assigning user:', error)
      alert('Failed to assign user: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  const isAdmin = userRole === 'ADMIN' || userRole === 'OWNER'

  const getLevelColor = (level: number) => {
    switch (level) {
      case 1: return "bg-yellow-500"
      case 2: return "bg-blue-500" 
      case 3: return "bg-green-500"
      case 4: return "bg-purple-500"
      case 5: return "bg-gray-500"
      default: return "bg-gray-500"
    }
  }

  const getDepartmentColor = (department: string | null) => {
    if (!department) return "bg-gray-100 text-gray-800"
    
    switch (department) {
      case "Executive": return "bg-yellow-100 text-yellow-800"
      case "Engineering": return "bg-blue-100 text-blue-800"
      case "Marketing": return "bg-purple-100 text-purple-800"
      case "Finance": return "bg-green-100 text-green-800"
      case "Product": return "bg-orange-100 text-orange-800"
      case "Sales": return "bg-red-100 text-red-800"
      case "HR": return "bg-pink-100 text-pink-800"
      case "Operations": return "bg-gray-100 text-gray-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  const getInitials = (name: string | null) => {
    if (!name) return "?"
    return name.split(' ').map(n => n[0]).join('').toUpperCase()
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading organization chart...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center space-x-2">
            <Users className="h-8 w-8 text-primary" />
            <span>Organization Chart</span>
          </h1>
          <p className="text-muted-foreground">
            Visualize your team structure and reporting relationships
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => loadOrgData()}>
            <Edit className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          {isAdmin && (
            <Button variant="outline" onClick={() => setShowUserManagement(!showUserManagement)}>
              <Shield className="mr-2 h-4 w-4" />
              {showUserManagement ? 'Hide' : 'Show'} Admin
            </Button>
          )}
          {isAdmin && showUserManagement && (
            <>
              <Button onClick={handleAddPosition}>
                <UserPlus className="mr-2 h-4 w-4" />
                Add Position
              </Button>
              <Button onClick={handleAddUser}>
                <User className="mr-2 h-4 w-4" />
                Add User
              </Button>
              <Button onClick={handleOpenRoleCards} variant="secondary">
                <Building className="mr-2 h-4 w-4" />
                Role Cards
              </Button>
              <Button onClick={handleAddEnhancedUser} variant="secondary">
                <User className="mr-2 h-4 w-4" />
                Add User with Profile
              </Button>
              <Button onClick={handleCreateDepartment} variant="secondary">
                <Building className="mr-2 h-4 w-4" />
                Create Department
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Positions</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{orgData.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Departments</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(orgData.map(position => position.department).filter(Boolean)).size}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assigned</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {orgData.filter(position => position.user).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Positions</CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {orgData.filter(position => !position.user).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Admin Section - Only visible to admins */}
      {isAdmin && showUserManagement && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold flex items-center space-x-2">
              <Shield className="h-5 w-5" />
              <span>User Management</span>
            </h2>
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>{users.length} users</span>
            </div>
          </div>
          
          <UserManagementTable 
            users={users}
            onEditUser={handleEditUser}
            onRefresh={loadOrgData}
          />
        </div>
      )}

      {/* Organization Chart */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold">Team Structure</h2>
        
        {orgData.length === 0 ? (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No positions yet</h3>
            <p className="text-muted-foreground mb-4">Get started by adding your first position to the organization chart.</p>
            {isAdmin && showUserManagement && (
              <Button onClick={handleAddPosition}>
                <UserPlus className="mr-2 h-4 w-4" />
                Add First Position
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-8">
            {/* Render by levels */}
            {[1, 2, 3, 4, 5].map(level => {
              const positionsAtLevel = orgData.filter(position => position.level === level)
              if (positionsAtLevel.length === 0) return null

              return (
                <div key={level} className="space-y-4">
                  <h3 className="text-lg font-medium text-muted-foreground">
                    Level {level} {level === 1 ? '(Executive)' : level === 2 ? '(Senior Leadership)' : level === 3 ? '(Directors)' : level === 4 ? '(Managers)' : '(Individual Contributors)'}
                  </h3>
                  <div className={`flex ${level === 1 ? 'justify-center' : level === 2 ? 'justify-center space-x-8' : 'justify-center space-x-4'} flex-wrap gap-4`}>
                    {positionsAtLevel.map((position) => (
                      <div key={position.id} className={`${level === 1 ? 'w-80' : level === 2 ? 'w-72' : 'w-64'}`}>
                        {position.user ? (
                          <UserProfileCard
                            user={position.user}
                            position={{
                              title: position.title,
                              department: position.department,
                              level: position.level
                            }}
                            onEdit={isAdmin && showUserManagement ? handleEditEnhancedUser : undefined}
                            showActions={isAdmin && showUserManagement}
                            compact={false}
                          />
                        ) : (
                          <RoleCard
                            role={position}
                            onEdit={isAdmin && showUserManagement ? handleEditEnhancedRole : undefined}
                            onAssignUser={isAdmin && showUserManagement ? handleAssignUserToRole : undefined}
                            showActions={isAdmin && showUserManagement}
                            compact={false}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Department Overview */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Department Overview</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from(new Set(orgData.map(position => position.department).filter(Boolean))).map((dept) => {
            const deptPositions = orgData.filter(position => position.department === dept)
            return (
              <Card key={dept}>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Building className="h-5 w-5" />
                    <span>{dept}</span>
                    <Badge variant="secondary">{deptPositions.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {deptPositions.map((position) => (
                      <div key={position.id} className="flex items-center justify-between text-sm">
                        <span>{position.user?.name || position.title}</span>
                        <span className="text-muted-foreground">
                          {position.user ? position.title : 'Open Position'}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Position Form Modal */}
      <PositionForm
        isOpen={showForm}
        onClose={() => {
          setShowForm(false)
          setEditingPosition(null)
        }}
        onSave={handleSavePosition}
        position={editingPosition}
        existingPositions={orgData}
        workspaceId={workspaceId}
      />

      {/* Enhanced User Profile Form Modal */}
      {isAdmin && (
        <EnhancedUserProfileForm
          isOpen={showEnhancedUserForm}
          onClose={() => {
            setShowEnhancedUserForm(false)
            setEditingUser(null)
          }}
          onSave={handleSaveEnhancedUser}
          user={editingUser}
          workspaceId={workspaceId}
        />
      )}

      {/* User Assignment Modal */}
      {isAdmin && (
        <UserAssignmentModal
          isOpen={showUserAssignmentModal}
          onClose={() => {
            setShowUserAssignmentModal(false)
            setAssigningToRole(null)
          }}
          onAssign={handleUserAssignment}
          role={assigningToRole}
          availableUsers={users}
          workspaceId={workspaceId}
        />
      )}
    </div>
  )
}

