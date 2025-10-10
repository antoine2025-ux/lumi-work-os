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
      // Temporarily bypass session check for development
      // if (!session?.user?.id) {
      //   setIsLoading(false)
      //   return
      // }

      try {
        setIsLoading(true)
        
        // Load user's workspaces
        const workspacesResponse = await fetch('/api/workspaces')
        if (workspacesResponse.ok) {
          const workspacesData = await workspacesResponse.json()
          setWorkspaces(workspacesData.workspaces || [])
          
          // Set current workspace (first one for now, or from localStorage)
          const savedWorkspaceId = localStorage.getItem('currentWorkspaceId')
          const workspace = workspacesData.workspaces?.find((w: Workspace) => 
            savedWorkspaceId ? w.id === savedWorkspaceId : true
          ) || workspacesData.workspaces?.[0]
          
          if (workspace) {
            setCurrentWorkspace(workspace)
            localStorage.setItem('currentWorkspaceId', workspace.id)
          }
        }

        // Load user's role in current workspace
        if (currentWorkspace) {
          const roleResponse = await fetch(`/api/workspaces/${currentWorkspace.id}/user-role`)
          if (roleResponse.ok) {
            const roleData = await roleResponse.json()
            setUserRole(roleData.role)
          }
        }
      } catch (error) {
        console.error('Failed to load workspaces:', error)
        // Set fallback workspace for development
        const fallbackWorkspace: Workspace = {
          id: 'workspace-1',
          name: 'Development Workspace',
          slug: 'development-workspace',
          description: 'Default development workspace',
          createdAt: new Date(),
          updatedAt: new Date()
        }
        setWorkspaces([fallbackWorkspace])
        setCurrentWorkspace(fallbackWorkspace)
        setUserRole('OWNER')
      } finally {
        setIsLoading(false)
      }
    }

    loadWorkspaces()
  }, [session?.user?.id, currentWorkspace?.id])

  const switchWorkspace = async (workspaceId: string) => {
    const workspace = workspaces.find(w => w.id === workspaceId)
    if (workspace) {
      setCurrentWorkspace(workspace)
      localStorage.setItem('currentWorkspaceId', workspaceId)
      
      // Load user's role in the new workspace
      try {
        const roleResponse = await fetch(`/api/workspaces/${workspaceId}/user-role`)
        if (roleResponse.ok) {
          const roleData = await roleResponse.json()
          setUserRole(roleData.role)
        }
      } catch (error) {
        console.error('Failed to load user role:', error)
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
