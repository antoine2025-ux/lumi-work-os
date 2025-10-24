"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"
import { useSession } from "next-auth/react"

export type WorkspaceRole = 'OWNER' | 'ADMIN' | 'MEMBER'
export type ProjectRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER'

export interface Workspace {
  id: string
  name: string
  slug: string
  description?: string
  createdAt: Date
  updatedAt: Date
}

export interface UserWorkspaceRole {
  userId: string
  workspaceId: string
  role: WorkspaceRole
  joinedAt: Date
}

export interface WorkspaceContextType {
  currentWorkspace: Workspace | null
  userRole: WorkspaceRole | null
  workspaces: Workspace[]
  isLoading: boolean
  switchWorkspace: (workspaceId: string) => void
  canManageWorkspace: boolean
  canManageUsers: boolean
  canManageSettings: boolean
  canViewAnalytics: boolean
  canManageProjects: boolean
  canCreateProjects: boolean
  canViewProjects: boolean
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined)

export function useWorkspace() {
  const context = useContext(WorkspaceContext)
  if (context === undefined) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider')
  }
  return context
}

interface WorkspaceProviderProps {
  children: ReactNode
}

export function WorkspaceProvider({ children }: WorkspaceProviderProps) {
  const { data: session } = useSession()
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null)
  const [userRole, setUserRole] = useState<WorkspaceRole | null>(null)
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Load user's workspaces and current workspace
  useEffect(() => {
    const loadWorkspaces = async () => {
      try {
        setIsLoading(true)
        
        // First check if user is a first-time user
        const userStatusResponse = await fetch('/api/auth/user-status', {
          credentials: 'include' as RequestCredentials,
          headers: {
            'Content-Type': 'application/json',
          }
        })
        
        if (userStatusResponse.ok) {
          const userStatus = await userStatusResponse.json()
          
          // If user is first-time or has no workspace, don't load workspaces
          if (userStatus.isFirstTime || !userStatus.workspaceId) {
            console.log('First-time user or no workspace, skipping workspace load')
            setWorkspaces([])
            setCurrentWorkspace(null)
            setUserRole(null)
            setIsLoading(false)
            return
          }
        }
        
        // Load user's workspaces
        const fetchOptions = {
          credentials: 'include' as RequestCredentials,
          headers: {
            'Content-Type': 'application/json',
          }
        }
        
        const workspacesResponse = await fetch('/api/workspaces', fetchOptions)
        if (workspacesResponse.ok) {
          const workspacesData = await workspacesResponse.json()
          const workspacesList = workspacesData.workspaces || []
          setWorkspaces(workspacesList)
          
          // Set current workspace (first one for now, or from localStorage)
          const savedWorkspaceId = localStorage.getItem('currentWorkspaceId')
          const workspace = workspacesList.find((w: Workspace) => 
            savedWorkspaceId ? w.id === savedWorkspaceId : true
          ) || workspacesList[0]
          
          if (workspace) {
            setCurrentWorkspace(workspace)
            localStorage.setItem('currentWorkspaceId', workspace.id)
            
            // Load user's role in the workspace
            try {
              const roleResponse = await fetch(`/api/workspaces/${workspace.id}/user-role`, fetchOptions)
              if (roleResponse.ok) {
                const roleData = await roleResponse.json()
                setUserRole(roleData.role)
              } else if (roleResponse.status === 401) {
                // User not authenticated, set default role for development
                console.log('User not authenticated, using default OWNER role for development')
                setUserRole('OWNER')
              } else {
                // If role fetch fails, set default role for development
                console.log('Failed to load user role, using default OWNER role for development')
                setUserRole('OWNER')
              }
            } catch (roleError) {
              console.error('Failed to load user role:', roleError)
              setUserRole('OWNER')
            }
          }
        } else {
          // If workspaces API fails, use fallback
          throw new Error('Failed to load workspaces')
        }
      } catch (error) {
        console.error('Failed to load workspaces:', error)
        // Don't set fallback workspace - let the error propagate
        setWorkspaces([])
        setCurrentWorkspace(null)
        setUserRole(null)
      } finally {
        setIsLoading(false)
      }
    }

    loadWorkspaces()
  }, []) // Remove session dependency entirely for development

  const switchWorkspace = async (workspaceId: string) => {
    const workspace = workspaces.find(w => w.id === workspaceId)
    if (workspace) {
      setCurrentWorkspace(workspace)
      localStorage.setItem('currentWorkspaceId', workspaceId)
      
      // Load user's role in the new workspace
      try {
        const fetchOptions = {
          credentials: 'include' as RequestCredentials,
          headers: {
            'Content-Type': 'application/json',
          }
        }
        
        const roleResponse = await fetch(`/api/workspaces/${workspaceId}/user-role`, fetchOptions)
        if (roleResponse.ok) {
          const roleData = await roleResponse.json()
          setUserRole(roleData.role)
        } else if (roleResponse.status === 401) {
          // User not authenticated, set default role for development
          console.log('User not authenticated, using default OWNER role for development')
          setUserRole('OWNER')
        } else {
          console.log('Failed to load user role, using default OWNER role for development')
          setUserRole('OWNER')
        }
      } catch (error) {
        console.error('Failed to load user role:', error)
        setUserRole('OWNER')
      }
    }
  }

  // Permission helpers
  const canManageWorkspace = userRole === 'OWNER' || userRole === 'ADMIN'
  const canManageUsers = userRole === 'OWNER' || userRole === 'ADMIN'
  const canManageSettings = userRole === 'OWNER' || userRole === 'ADMIN'
  const canViewAnalytics = userRole === 'OWNER' || userRole === 'ADMIN'
  const canManageProjects = userRole === 'OWNER' || userRole === 'ADMIN' || userRole === 'MEMBER'
  const canCreateProjects = userRole === 'OWNER' || userRole === 'ADMIN' || userRole === 'MEMBER'
  const canViewProjects = true // All roles can view projects

  const value: WorkspaceContextType = {
    currentWorkspace,
    userRole,
    workspaces,
    isLoading,
    switchWorkspace,
    canManageWorkspace,
    canManageUsers,
    canManageSettings,
    canViewAnalytics,
    canManageProjects,
    canCreateProjects,
    canViewProjects,
  }

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  )
}
