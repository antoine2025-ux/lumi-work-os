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
import { OrgCleanSlate } from "@/components/org/org-clean-slate"
import { InviteUserDialog } from "@/components/org/invite-user-dialog"
import { PositionInviteDialog } from "@/components/org/position-invite-dialog"
import { LoopbrainAssistantLauncher } from "@/components/loopbrain/assistant-launcher"
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
  teamId?: string | null
  team?: {
    id: string
    name: string
    department?: {
      id: string
      name: string
    }
  } | null
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
  const [departments, setDepartments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showUserForm, setShowUserForm] = useState(false)
  const [showUserManagement, setShowUserManagement] = useState(false)
  const [showEnhancedUserForm, setShowEnhancedUserForm] = useState(false)
  const [showEnhancedRoleForm, setShowEnhancedRoleForm] = useState(false)
  const [showUserAssignmentModal, setShowUserAssignmentModal] = useState(false)
  const [showInviteDialog, setShowInviteDialog] = useState(false)
  const [showPositionInviteDialog, setShowPositionInviteDialog] = useState(false)
  const [invitingPosition, setInvitingPosition] = useState<OrgPosition | null>(null)
  const [editingPosition, setEditingPosition] = useState<OrgPosition | null>(null)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [assigningToRole, setAssigningToRole] = useState<OrgPosition | null>(null)
  const [workspaceId, setWorkspaceId] = useState<string>('')
  const [userRole, setUserRole] = useState<'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER'>('MEMBER')
  const [userRoleLoaded, setUserRoleLoaded] = useState(false)
  const [orgAccessDenied, setOrgAccessDenied] = useState(false)

  // Get workspace ID from user status, then fetch role separately
  useEffect(() => {
    const fetchUserStatus = async () => {
      try {
        const response = await fetch('/api/auth/user-status')
        if (response.ok) {
          const userStatus = await response.json()
          if (userStatus.workspaceId) {
            setWorkspaceId(userStatus.workspaceId)
            
            // Fetch user role from workspace members API (user-status doesn't return role)
            try {
              const roleResponse = await fetch(`/api/workspaces/${userStatus.workspaceId}/user-role`, {
                credentials: 'include'
              })
              if (roleResponse.ok) {
                const roleData = await roleResponse.json()
                if (roleData.role) {
                  setUserRole(roleData.role as 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER')
                }
              }
              // Mark role as loaded regardless of success/failure (defaults to MEMBER)
              setUserRoleLoaded(true)
            } catch (roleError) {
              // Graceful degradation - default to MEMBER if role fetch fails
              setUserRoleLoaded(true)
            }
          }
        }
      } catch (error) {
        // Error handling - don't log sensitive data
      }
    }
    fetchUserStatus()
  }, [])

  // Load org data on component mount (only after workspaceId and userRole are loaded)
  useEffect(() => {
    if (workspaceId && userRoleLoaded) {
      loadOrgData()
    }
  }, [workspaceId, userRoleLoaded])

  const loadOrgData = async () => {
    try {
      setLoading(true)
      setOrgAccessDenied(false)
      
      // Include credentials for authentication
      const fetchOptions = {
        credentials: 'include' as RequestCredentials,
        headers: {
          'Content-Type': 'application/json',
        }
      }
      
      // Fetch with error handling to prevent hanging
      const [orgResponse, usersResponse, departmentsResponse] = await Promise.all([
        fetch(`/api/org/positions`, fetchOptions).catch(err => {
          // Error fetching positions - handled gracefully
          return { ok: false, status: 500, statusText: err.message, json: async () => [] }
        }),
        userRole === 'ADMIN' || userRole === 'OWNER' 
          ? fetch(`/api/admin/users?workspaceId=${workspaceId}`, fetchOptions).catch(err => {
              // Error fetching users - handled gracefully
              return { ok: false, status: 500, statusText: err.message, json: async () => [] }
            })
          : Promise.resolve(null),
        fetch(`/api/org/departments`, fetchOptions).catch(err => {
          // Error fetching departments - handled gracefully
          return { ok: false, status: 500, statusText: err.message, json: async () => [] }
        })
      ])
      
      // Check for 403 (access denied) errors
      if (orgResponse && orgResponse.status === 403) {
        setOrgAccessDenied(true)
        setOrgData([])
      } else if (orgResponse && orgResponse.ok) {
        try {
          const data = await orgResponse.json()
          setOrgData(data || [])
        } catch (err) {
          console.error('Error parsing org data:', err)
          setOrgData([])
        }
      } else {
        setOrgData([])
      }

      if (departmentsResponse && departmentsResponse.status === 403) {
        setOrgAccessDenied(true)
        setDepartments([])
      } else if (departmentsResponse && departmentsResponse.ok) {
        try {
          const departmentsData = await departmentsResponse.json()
          setDepartments(departmentsData || [])
        } catch (err) {
          // Error parsing departments data - handled gracefully
          setDepartments([])
        }
      } else {
        setDepartments([])
      }

      if (usersResponse && usersResponse.ok) {
        try {
          const usersData = await usersResponse.json()
          setUsers(usersData || [])
        } catch (err) {
          // Error parsing users data - handled gracefully
          setUsers([])
        }
      } else if (usersResponse) {
        setUsers([])
      }
    } catch (error) {
      // Error loading org data - handled gracefully
      // Set empty arrays on error to prevent infinite loading
      setOrgData([])
      setDepartments([])
      setUsers([])
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
        // Error saving position - handled gracefully
        alert('Failed to save position: ' + (errorData.error || 'Unknown error'))
      }
    } catch (error) {
      // Error saving position - handled gracefully
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
          // Raw response logged for debugging (dev only)
          
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
    setShowInviteDialog(true)
  }

  const handleSaveEnhancedUser = async (userData: Partial<User & { positionId?: string }>) => {
    try {
      const url = editingUser 
        ? `/api/admin/users/${editingUser.id}`
        : '/api/admin/users'
      
      const method = editingUser ? 'PUT' : 'POST'
      
      // Handle position assignment separately if provided
      const { positionId, ...userProfileData } = userData
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...userProfileData,
          positionId: positionId || 'none', // Send 'none' if empty string
          workspaceId
        }),
      })

      if (response.ok) {
        // If position was assigned, update the position
        if (positionId && editingUser) {
          try {
            // First, remove user from any existing positions
            const allPositions = await fetch('/api/org/positions', {
              credentials: 'include'
            }).then(r => r.json())
            
            const currentPositions = allPositions.filter((p: any) => p.userId === editingUser.id)
            for (const pos of currentPositions) {
              await fetch(`/api/org/positions/${pos.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: null }),
                credentials: 'include'
              })
            }
            
            // Assign to new position
            await fetch(`/api/org/positions/${positionId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId: editingUser.id }),
              credentials: 'include'
            })
          } catch (posError) {
            console.error('Error assigning position:', posError)
            // Don't fail the whole operation if position assignment fails
          }
        } else if (!positionId && editingUser) {
          // Remove user from all positions if no position selected
          try {
            const allPositions = await fetch('/api/org/positions', {
              credentials: 'include'
            }).then(r => r.json())
            
            const currentPositions = allPositions.filter((p: any) => p.userId === editingUser.id)
            for (const pos of currentPositions) {
              await fetch(`/api/org/positions/${pos.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: null }),
                credentials: 'include'
              })
            }
          } catch (posError) {
            console.error('Error removing position:', posError)
          }
        }
        
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

  const handleInviteToPosition = (position: OrgPosition) => {
    // Ensure position exists and is not occupied
    if (!position.id) {
      alert('Position ID is required')
      return
    }
    if (position.userId) {
      alert('Position is already occupied')
      return
    }
    setInvitingPosition(position)
    setShowPositionInviteDialog(true)
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
    if (!department) return "bg-muted text-foreground"
    
    switch (department) {
      case "Executive": return "bg-yellow-500/20 text-yellow-400"
      case "Engineering": return "bg-blue-500/20 text-blue-400"
      case "Marketing": return "bg-purple-500/20 text-purple-400"
      case "Finance": return "bg-green-500/20 text-green-400"
      case "Product": return "bg-orange-500/20 text-orange-400"
      case "Sales": return "bg-red-500/20 text-red-400"
      case "HR": return "bg-pink-500/20 text-pink-400"
      case "Operations": return "bg-muted text-foreground"
      default: return "bg-muted text-foreground"
    }
  }

  const getInitials = (name: string | null) => {
    if (!name) return "?"
    return name.split(' ').map(n => n[0]).join('').toUpperCase()
  }

  // Use CSS variables for consistent theming
  const colors = {
    primary: 'var(--primary)',
    primaryLight: 'var(--accent)',
    primaryDark: 'var(--secondary)',
    success: '#10b981',
    successLight: '#d1fae5',
    warning: '#f59e0b',
    warningLight: '#fef3c7',
    error: 'var(--destructive)',
    errorLight: '#fee2e2',
    background: 'var(--background)',
    surface: 'var(--card)',
    text: 'var(--foreground)',
    textSecondary: 'var(--muted-foreground)',
    border: 'var(--border)',
    borderLight: 'var(--muted)'
  }

  const totalPositions = orgData.length
  const assignedCount = orgData.filter(position => position.user).length
  const departmentsCount = departments.length

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-4" style={{ borderColor: colors.primary }}></div>
          <p style={{ color: colors.textSecondary }}>Loading organization chart...</p>
        </div>
      </div>
    )
  }

  // Check if this is a clean slate (no departments exist)
  const isCleanSlate = departments.length === 0 && !loading
  const orgDataIsEmpty = orgData.length === 0 && !loading
  const canEdit = userRole === 'OWNER' || userRole === 'ADMIN'

  return (
    <div className="min-h-screen bg-slate-950">
        {orgAccessDenied ? (
          // Access denied message
          <div className="min-h-screen flex items-center justify-center">
            <Card className="border-0 rounded-xl max-w-md" style={{ backgroundColor: colors.surface }}>
              <CardContent className="p-6">
                <div className="text-center">
                  <Shield className="h-12 w-12 mx-auto mb-4" style={{ color: colors.textSecondary }} />
                  <h3 className="text-lg font-bold mb-2" style={{ color: colors.text }}>No Access</h3>
                  <p className="text-sm" style={{ color: colors.textSecondary }}>
                    You don't have permission to view the organization chart.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : isCleanSlate && canEdit ? (
          // Clean Slate Setup View (only for OWNER/ADMIN)
          <OrgCleanSlate
            workspaceId={workspaceId}
            onStructureCreated={loadOrgData}
            colors={colors}
          />
        ) : (
          <>
            {/* Zen-style Header */}
            <div className="px-16 py-8 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-4xl font-light" style={{ color: colors.text }}>Organization Chart</h1>
                  <p className="text-lg max-w-2xl mt-2" style={{ color: colors.textSecondary }}>
                    Visualize your team structure and reporting relationships
                  </p>
                </div>
            <div className="flex space-x-2">
              <Button variant="outline" onClick={() => loadOrgData()} className="border-0 rounded-lg" style={{ backgroundColor: colors.surface }}>
                <Edit className="mr-2 h-4 w-4" />
                Refresh
              </Button>
              {isAdmin && (
                <Button variant="outline" onClick={() => setShowUserManagement(!showUserManagement)} className="border-0 rounded-lg" style={{ backgroundColor: colors.surface }}>
                  <Shield className="mr-2 h-4 w-4" />
                  {showUserManagement ? 'Hide' : 'Show'} Admin
                </Button>
              )}
              {isAdmin && showUserManagement && (
                <>
                  <Button onClick={handleAddPosition} className="rounded-lg">
                    <UserPlus className="mr-2 h-4 w-4" />
                    Add Position
                  </Button>
                  <Button onClick={handleAddUser} variant="secondary" className="rounded-lg">
                    <User className="mr-2 h-4 w-4" />
                    Add User
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Stats Overview - Zen Style (Reduced to 2-3 metrics) */}
        <div className="px-16 mb-8">
          <div className="flex items-center gap-8">
            <div>
              <div className="text-3xl font-light mb-2" style={{ color: colors.text }}>{totalPositions}</div>
              <div className="text-sm" style={{ color: colors.textSecondary }}>Total Positions</div>
            </div>
            <div className="h-8 w-px" style={{ backgroundColor: colors.borderLight }}></div>
            <div>
              <div className="text-3xl font-light mb-2" style={{ color: colors.success }}>{assignedCount}</div>
              <div className="text-sm" style={{ color: colors.textSecondary }}>Assigned</div>
            </div>
            {departmentsCount > 0 && (
              <>
                <div className="h-8 w-px" style={{ backgroundColor: colors.borderLight }}></div>
                <div>
                  <div className="text-3xl font-light mb-2" style={{ color: colors.primary }}>{departmentsCount}</div>
                  <div className="text-sm" style={{ color: colors.textSecondary }}>Departments</div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Admin Section - Only visible to admins */}
        {isAdmin && showUserManagement && (
          <div className="px-16 mb-8 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-medium flex items-center space-x-2" style={{ color: colors.text }}>
                <Shield className="h-5 w-5" />
                <span>User Management</span>
              </h2>
              <div className="flex items-center space-x-2 text-sm" style={{ color: colors.textSecondary }}>
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
        <div className="px-16 pb-12 space-y-8">
          <h2 className="text-xl font-medium" style={{ color: colors.text }}>Team Structure</h2>
          
          {orgData.length === 0 ? (
            <Card className="border-0 rounded-xl" style={{ backgroundColor: colors.surface }}>
              <CardContent className="p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-2 h-2 rounded-full bg-muted-foreground/50" />
                  <h3 className="text-lg font-bold text-muted-foreground">No positions yet</h3>
                </div>
                {canEdit ? (
                  <>
                    <p className="text-sm text-muted-foreground mb-4">Get started by adding your first position to the organization chart.</p>
                    {isAdmin && showUserManagement && (
                      <Button onClick={handleAddPosition} className="rounded-lg">
                        <UserPlus className="mr-2 h-4 w-4" />
                        Add First Position
                      </Button>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">The organization chart is empty. Contact an administrator to set up the organization structure.</p>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-8">
              {/* Render by levels */}
              {[1, 2, 3, 4, 5].map(level => {
                const positionsAtLevel = orgData.filter(position => position.level === level)
                if (positionsAtLevel.length === 0) return null

                return (
                  <div key={level} className="space-y-4">
                    <h3 className="text-base font-medium" style={{ color: colors.textSecondary }}>
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
                                department: position.team?.department?.name || null,
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
                              onInvite={isAdmin && showUserManagement ? handleInviteToPosition : undefined}
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
        <div className="px-16 pb-12 space-y-6">
          <h2 className="text-xl font-medium" style={{ color: colors.text }}>Department Overview</h2>
          {departmentsCount === 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  <Card className="border-0 rounded-xl opacity-50" style={{ backgroundColor: colors.surface }}>
                    <CardContent className="p-6">
                      <div className="flex items-center space-x-3 mb-4">
                        <div className="w-2 h-2 rounded-full bg-muted-foreground/50" />
                        <h3 className="text-lg font-bold text-muted-foreground">Department Overview</h3>
                      </div>
                      <p className="text-sm text-muted-foreground">Coming soon...</p>
                    </CardContent>
                  </Card>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {departments.map((dept) => {
                const deptPositions = orgData.filter(position => 
                  position.team?.department?.id === dept.id
                )
                return (
                  <Card key={dept.id} className="border-0 rounded-xl" style={{ backgroundColor: colors.surface }}>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2" style={{ color: colors.text }}>
                        <Building className="h-5 w-5" />
                        <span>{dept.name}</span>
                        <Badge variant="secondary" className="bg-muted text-muted-foreground">{deptPositions.length}</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {deptPositions.map((position) => (
                          <div key={position.id} className="flex items-center justify-between text-sm">
                            <span style={{ color: colors.text }}>{position.user?.name || position.title}</span>
                            <span style={{ color: colors.textSecondary }}>
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
          )}
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

            {/* Invite User Dialog */}
            {isAdmin && (
              <InviteUserDialog
                isOpen={showInviteDialog}
                onClose={() => setShowInviteDialog(false)}
                onSuccess={loadOrgData}
                workspaceId={workspaceId}
              />
            )}

            {/* Position Invite Dialog */}
            {isAdmin && invitingPosition && (
              <PositionInviteDialog
                isOpen={showPositionInviteDialog}
                onClose={() => {
                  setShowPositionInviteDialog(false)
                  setInvitingPosition(null)
                }}
                onSuccess={loadOrgData}
                positionId={invitingPosition.id}
                positionTitle={invitingPosition.title}
                workspaceId={workspaceId}
                userRole={userRole as 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER'}
              />
            )}
          </>
        )}

      {/* Global Loopbrain Assistant */}
      <LoopbrainAssistantLauncher mode="org" />
    </div>
  )
}

