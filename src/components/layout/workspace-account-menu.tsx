"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession, signOut } from "next-auth/react"
import { useWorkspace } from "@/lib/workspace-context"
import { clearUserStatusCache } from "@/hooks/use-user-status"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { WorkspaceCreationModal } from "@/components/ui/workspace-creation-modal"
import { 
  ChevronDown, 
  Settings,
  LogOut,
  Building2,
  Loader2
} from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"

interface WorkspaceMember {
  id: string
  userId: string
  role: string
  joinedAt: string
  user: {
    id: string
    name: string | null
    email: string
    image: string | null
  }
}

interface WorkspaceAccountMenuProps {
  className?: string
}

export function WorkspaceAccountMenu({ className }: WorkspaceAccountMenuProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const { 
    currentWorkspace, 
    workspaces, 
    userRole, 
    switchWorkspace, 
    isLoading 
  } = useWorkspace()
  
  const [isOpen, setIsOpen] = useState(false)
  const [members, setMembers] = useState<WorkspaceMember[]>([])
  const [membersLoading, setMembersLoading] = useState(false)
  const [membersLoaded, setMembersLoaded] = useState(false)

  // Lazy load members when dropdown opens
  useEffect(() => {
    if (isOpen && !membersLoaded && currentWorkspace?.id && !membersLoading) {
      loadMembers()
    }
  }, [isOpen, currentWorkspace?.id, membersLoaded, membersLoading])

  const loadMembers = async () => {
    if (!currentWorkspace?.id) return
    
    try {
      setMembersLoading(true)
      const response = await fetch(`/api/workspaces/${currentWorkspace.id}/members`)
      
      if (response.ok) {
        const data = await response.json()
        setMembers(data.members || [])
        setMembersLoaded(true)
      } else if (response.status === 403 || response.status === 401) {
        // Silent handling - user doesn't have permission
        setMembers([])
        setMembersLoaded(true)
      }
      // Silently fail for other errors - don't break dropdown
    } catch (error) {
      // Silently fail - don't break dropdown
      console.error('Failed to load members:', error)
      setMembers([])
      setMembersLoaded(true)
    } finally {
      setMembersLoading(false)
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'OWNER':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800'
      case 'ADMIN':
        return 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800'
      case 'MEMBER':
        return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400 dark:border-gray-800'
    }
  }

  const getInitials = (name: string | null | undefined): string => {
    if (!name) return 'U'
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const handleLogout = async () => {
    // STEP 1: Clear user status cache immediately
    clearUserStatusCache()
    
    // STEP 2: Sign out from NextAuth first (this clears server-side session)
    try {
      await signOut({ redirect: false })
    } catch (e) {
      console.log('Sign out error (continuing anyway):', e)
    }
    
    // STEP 3: Set logout flag BEFORE clearing storage
    sessionStorage.setItem('__logout_flag__', 'true')
    
    // STEP 4: Clear all local storage (except the logout flag)
    localStorage.clear()
    // Don't clear sessionStorage completely - we need the flag!
    // But clear other items
    Object.keys(sessionStorage).forEach(key => {
      if (key !== '__logout_flag__') {
        sessionStorage.removeItem(key)
      }
    })
    
    // STEP 5: Clear all cookies including NextAuth and Google OAuth cookies
    const cookies = document.cookie.split(";")
    cookies.forEach(function(c) { 
      const eqPos = c.indexOf('=')
      const name = eqPos > -1 ? c.substr(0, eqPos).trim() : c.trim()
      // Clear all cookies
      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`
      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname}`
      // Try to clear Google cookies (may not work due to cross-domain, but worth trying)
      if (name.includes('google') || name.includes('gid') || name.includes('GA') || name.includes('oauth')) {
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=.google.com`
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=.googleapis.com`
      }
    })
    
    // STEP 6: Clear NextAuth session storage
    try {
      // Clear any NextAuth session data
      if (typeof window !== 'undefined') {
        // Clear indexedDB if used by NextAuth
        if ('indexedDB' in window) {
          indexedDB.databases().then(databases => {
            databases.forEach(db => {
              if (db.name && db.name.includes('next-auth')) {
                indexedDB.deleteDatabase(db.name)
              }
            })
          }).catch(() => {})
        }
      }
    } catch (e) {
      console.log('Could not clear indexedDB:', e)
    }
    
    // STEP 7: Force redirect to login immediately
    // Add a small delay to ensure cookies are cleared
    setTimeout(() => {
      window.location.href = '/login'
    }, 100)
  }

  const handleSwitchWorkspace = (workspaceId: string) => {
    const workspace = workspaces.find(w => w.id === workspaceId)
    if (workspace) {
      switchWorkspace(workspaceId)
      router.push(`/w/${workspace.slug}`)
      setIsOpen(false)
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <div className={cn("flex items-center space-x-2 h-8 px-3 rounded-full bg-muted animate-pulse", className)}>
        <div className="h-6 w-6 rounded-full bg-muted-foreground/20" />
        <div className="h-4 w-24 bg-muted-foreground/20 rounded" />
      </div>
    )
  }

  // No workspace - show create button
  if (!currentWorkspace || workspaces.length === 0) {
    return (
      <div className={cn("flex items-center", className)}>
        <WorkspaceCreationModal>
          <Button variant="outline" size="sm" className="h-8">
            <Building2 className="h-4 w-4 mr-2" />
            Create Workspace
          </Button>
        </WorkspaceCreationModal>
      </div>
    )
  }

  // Show compact bubble with dropdown
  const displayName = currentWorkspace.name || 'Workspace'
  const truncatedName = displayName.length > 15 
    ? `${displayName.slice(0, 15)}...` 
    : displayName

  const currentUserInitials = getInitials(session?.user?.name || session?.user?.email)

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "h-8 px-3 rounded-full gap-2 hover:bg-muted",
            className
          )}
        >
          <div className="flex items-center gap-2 min-w-0">
            {/* Workspace name (truncated) */}
            <span className="text-sm font-medium truncate max-w-[120px]">
              {truncatedName}
            </span>
            
            {/* Role badge */}
            {userRole && (
              <Badge 
                variant="outline" 
                className={cn("text-xs px-1.5 py-0 h-5 shrink-0", getRoleColor(userRole))}
              >
                {userRole}
              </Badge>
            )}
            
            {/* User avatar */}
            <Avatar className="h-6 w-6 shrink-0">
              <AvatarImage src={session?.user?.image || ""} alt={session?.user?.name || ""} />
              <AvatarFallback className="bg-muted text-foreground text-xs">
                {currentUserInitials}
              </AvatarFallback>
            </Avatar>
          </div>
          
          <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent className="w-[280px]" align="end" forceMount>
        {/* Header: Workspace name + role */}
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium leading-none truncate">
                {displayName}
              </p>
              {userRole && (
                <Badge 
                  variant="outline" 
                  className={cn("text-xs px-1.5 py-0.5 ml-2 shrink-0", getRoleColor(userRole))}
                >
                  {userRole}
                </Badge>
              )}
            </div>
            {currentWorkspace.description && (
              <p className="text-xs leading-none text-muted-foreground truncate">
                {currentWorkspace.description}
              </p>
            )}
          </div>
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator />
        
        {/* Members section */}
        {membersLoading ? (
          <div className="px-2 py-3 flex items-center justify-center">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : members.length > 0 ? (
          <>
            <DropdownMenuLabel className="text-xs text-muted-foreground px-2 py-1.5">
              Members
            </DropdownMenuLabel>
            <div className="max-h-[120px] overflow-y-auto">
              {members.slice(0, 3).map((member) => (
                <DropdownMenuItem
                  key={member.id}
                  className="flex items-center space-x-2 px-2 py-1.5 cursor-default"
                  onSelect={(e) => e.preventDefault()}
                >
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={member.user.image || ""} alt={member.user.name || ""} />
                    <AvatarFallback className="bg-muted text-foreground text-xs">
                      {getInitials(member.user.name || member.user.email)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm truncate max-w-[180px] flex-1">
                    {member.user.name || member.user.email}
                  </span>
                  {member.role && member.role !== 'MEMBER' && (
                    <Badge 
                      variant="outline" 
                      className={cn("text-xs px-1 py-0 h-4 shrink-0", getRoleColor(member.role))}
                    >
                      {member.role}
                    </Badge>
                  )}
                </DropdownMenuItem>
              ))}
              {members.length > 3 && currentWorkspace.slug && (
                <DropdownMenuItem asChild>
                  <Link 
                    href={`/w/${currentWorkspace.slug}/settings?tab=members`}
                    className="text-xs text-muted-foreground hover:text-foreground px-2 py-1.5"
                    onClick={() => setIsOpen(false)}
                  >
                    View all {members.length} members
                  </Link>
                </DropdownMenuItem>
              )}
            </div>
            <DropdownMenuSeparator />
          </>
        ) : null}
        
        {/* Actions */}
        {workspaces.length > 1 && (
          <>
            <DropdownMenuLabel className="text-xs text-muted-foreground px-2 py-1.5">
              Switch Workspace
            </DropdownMenuLabel>
            {workspaces
              .filter(w => w.id !== currentWorkspace.id)
              .map((workspace) => (
                <DropdownMenuItem
                  key={workspace.id}
                  onClick={() => handleSwitchWorkspace(workspace.id)}
                  className="flex items-center space-x-2 px-2 py-1.5"
                >
                  <Building2 className="h-4 w-4" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate text-sm">{workspace.name}</div>
                    {workspace.description && (
                      <div className="text-xs text-muted-foreground truncate">
                        {workspace.description}
                      </div>
                    )}
                  </div>
                  {workspace.userRole && (
                    <Badge 
                      variant="outline" 
                      className={cn("text-xs px-1.5 py-0.5 shrink-0", getRoleColor(workspace.userRole))}
                    >
                      {workspace.userRole}
                    </Badge>
                  )}
                </DropdownMenuItem>
              ))}
            <DropdownMenuSeparator />
          </>
        )}
        
        {/* Workspace Settings */}
        {currentWorkspace.slug && (
          <DropdownMenuItem asChild>
            <Link 
              href={`/w/${currentWorkspace.slug}/settings`}
              className="flex items-center space-x-2 px-2 py-1.5"
              onClick={() => setIsOpen(false)}
            >
              <Settings className="h-4 w-4" />
              <span>Workspace Settings</span>
            </Link>
          </DropdownMenuItem>
        )}
        
        <DropdownMenuSeparator />
        
        {/* Log out */}
        <DropdownMenuItem 
          onClick={handleLogout}
          className="flex items-center space-x-2 px-2 py-1.5 text-destructive focus:text-destructive"
        >
          <LogOut className="h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

