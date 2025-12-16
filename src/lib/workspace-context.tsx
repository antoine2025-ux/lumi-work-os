"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"
import { useSession } from "next-auth/react"
import { useUserStatus } from '@/hooks/use-user-status'

export type WorkspaceRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER'
export type ProjectRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER'

export interface WorkspaceWithRole {
  id: string
  name: string
  slug: string
  description?: string | null
  createdAt: Date
  updatedAt: Date
  userRole: WorkspaceRole
}

export interface UserWorkspaceRole {
  userId: string
  workspaceId: string
  role: WorkspaceRole
  joinedAt: Date
}

export interface WorkspaceContextType {
  currentWorkspace: WorkspaceWithRole | null
  userRole: WorkspaceRole | null
  workspaces: WorkspaceWithRole[]
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
  const { userStatus, loading: userStatusLoading } = useUserStatus()
  
  // SSR-safe initial state: All state initialized as null/empty to avoid hydration mismatches
  // Workspace selection happens client-side only in useEffect after mount
  const [currentWorkspace, setCurrentWorkspace] = useState<WorkspaceWithRole | null>(null)
  const [userRole, setUserRole] = useState<WorkspaceRole | null>(null)
  const [workspaces, setWorkspaces] = useState<WorkspaceWithRole[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Load user's workspaces and current workspace
  // SSR-safe: This useEffect runs client-side only, after initial render
  // All localStorage access is guarded with typeof window !== 'undefined'
  useEffect(() => {
    const loadWorkspaces = async () => {
      try {
        setIsLoading(true)
        
        // Wait for user status to be loaded
        if (userStatusLoading || !userStatus) {
          return
        }
        
        // Skip workspace loading if we're on an invite page
        // Users need to accept the invite first, which will create the workspace membership
        if (typeof window !== 'undefined') {
          const isInvitePage = window.location.pathname.startsWith('/invites/')
          if (isInvitePage) {
            console.log('On invite page, skipping workspace load until invite is accepted')
            setWorkspaces([])
            setCurrentWorkspace(null)
            setUserRole(null)
            setIsLoading(false)
            return
          }
        }
        
        // If user is first-time or has no workspace, don't load workspaces
        if (userStatus.isFirstTime || !userStatus.workspaceId) {
          console.log('First-time user or no workspace, skipping workspace load')
          setWorkspaces([])
          setCurrentWorkspace(null)
          setUserRole(null)
          setIsLoading(false)
          return
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
          const workspacesList: WorkspaceWithRole[] = workspacesData.workspaces || []
          setWorkspaces(workspacesList)
          
          // Choose current workspace with precedence:
          // 1. localStorage.currentWorkspaceId (if valid and exists in workspaces)
          // 2. First workspace in array
          // 3. null if no workspaces
          let selectedWorkspace: WorkspaceWithRole | null = null
          
          if (workspacesList.length > 0) {
            // SSR-safe: localStorage access only on client-side
            // Check for saved workspaceId preference (from previous session)
            if (typeof window !== 'undefined') {
              const savedWorkspaceId = localStorage.getItem('currentWorkspaceId')
              if (savedWorkspaceId) {
                const savedWorkspace = workspacesList.find(w => w.id === savedWorkspaceId)
                if (savedWorkspace) {
                  // Valid saved workspace - use it
                  selectedWorkspace = savedWorkspace
                }
                // If saved workspaceId is invalid (user removed from workspace), fall through to default
              }
            }
            
            // Fallback to first workspace if no valid saved workspace
            if (!selectedWorkspace) {
              selectedWorkspace = workspacesList[0]
            }
            
            setCurrentWorkspace(selectedWorkspace)
            setUserRole(selectedWorkspace.userRole) // Use role from API response (no separate fetch needed)
            
            // SSR-safe: Persist to localStorage (client-side only, after state update)
            if (typeof window !== 'undefined') {
              localStorage.setItem('currentWorkspaceId', selectedWorkspace.id)
            }
          } else {
            // No workspaces - user needs to create one
            setCurrentWorkspace(null)
            setUserRole(null)
            // SSR-safe: Clear localStorage (client-side only)
            if (typeof window !== 'undefined') {
              localStorage.removeItem('currentWorkspaceId')
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
  }, [session, userStatus, userStatusLoading])

  const switchWorkspace = (workspaceId: string) => {
    // Validate workspaceId exists in workspaces array
    const workspace = workspaces.find(w => w.id === workspaceId)
    if (!workspace) {
      if (process.env.NODE_ENV === 'development') {
        console.warn(`Workspace ${workspaceId} not found in user's workspaces. Available:`, workspaces.map(w => w.id))
      }
      return
    }
    
    // Update current workspace and role from cached data (no API call needed)
    setCurrentWorkspace(workspace)
    setUserRole(workspace.userRole) // Use role from cached workspace data
    
    // SSR-safe: Persist to localStorage (client-side only)
    // This ensures workspace selection survives browser sessions
    if (typeof window !== 'undefined') {
      localStorage.setItem('currentWorkspaceId', workspaceId)
    }
    
    // Components using useWorkspace() will automatically react to state changes
    // No manual refresh needed - React's reactivity handles updates
  }

  // Permission helpers - return false if no workspace or role (graceful degradation)
  const canManageWorkspace = currentWorkspace !== null && userRole !== null && (userRole === 'OWNER' || userRole === 'ADMIN')
  const canManageUsers = currentWorkspace !== null && userRole !== null && (userRole === 'OWNER' || userRole === 'ADMIN')
  const canManageSettings = currentWorkspace !== null && userRole !== null && (userRole === 'OWNER' || userRole === 'ADMIN')
  const canViewAnalytics = currentWorkspace !== null && userRole !== null && (userRole === 'OWNER' || userRole === 'ADMIN')
  const canManageProjects = currentWorkspace !== null && userRole !== null && (userRole === 'OWNER' || userRole === 'ADMIN' || userRole === 'MEMBER')
  const canCreateProjects = currentWorkspace !== null && userRole !== null && (userRole === 'OWNER' || userRole === 'ADMIN' || userRole === 'MEMBER')
  const canViewProjects = currentWorkspace !== null // All roles can view projects if workspace exists

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
