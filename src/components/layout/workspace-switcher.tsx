"use client"

import { useState } from "react"
import { useWorkspace } from "@/lib/workspace-context"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { WorkspaceCreationModal } from "@/components/ui/workspace-creation-modal"
import { 
  Building2, 
  ChevronDown, 
  Plus, 
  Settings,
  Users,
  Shield,
  Crown
} from "lucide-react"
import { cn } from "@/lib/utils"

interface WorkspaceSwitcherProps {
  className?: string
}

export function WorkspaceSwitcher({ className }: WorkspaceSwitcherProps) {
  const { 
    currentWorkspace, 
    workspaces, 
    userRole, 
    switchWorkspace, 
    isLoading 
  } = useWorkspace()
  const [isOpen, setIsOpen] = useState(false)

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'OWNER':
        return Crown
      case 'ADMIN':
        return Shield
      case 'MEMBER':
        return Users
      default:
        return Users
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'OWNER':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'ADMIN':
        return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'MEMBER':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  if (isLoading) {
    return (
      <div className={cn("flex items-center space-x-2", className)}>
        <div className="h-8 w-8 bg-gray-200 rounded animate-pulse" />
        <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
      </div>
    )
  }

  if (!currentWorkspace) {
    return (
      <div className={cn("flex items-center space-x-2", className)}>
        <WorkspaceCreationModal>
          <Button variant="outline" size="sm" className="h-8">
            <Plus className="h-4 w-4 mr-2" />
            Create Workspace
          </Button>
        </WorkspaceCreationModal>
      </div>
    )
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "h-8 justify-between min-w-[200px] px-3",
            className
          )}
        >
          <div className="flex items-center space-x-2">
            <Building2 className="h-4 w-4" />
            <span className="truncate">{currentWorkspace.name}</span>
            {userRole && (
              <Badge 
                variant="outline" 
                className={cn("text-xs px-1.5 py-0.5", getRoleColor(userRole))}
              >
                {userRole}
              </Badge>
            )}
          </div>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent className="w-64" align="start">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Current Workspace
        </DropdownMenuLabel>
        
        <DropdownMenuItem 
          className="flex items-center space-x-2 p-2 cursor-default"
          onSelect={(e) => e.preventDefault()}
        >
          <Building2 className="h-4 w-4" />
          <div className="flex-1 min-w-0">
            <div className="font-medium truncate">{currentWorkspace.name}</div>
            <div className="text-xs text-muted-foreground truncate">
              {currentWorkspace.description || `@${currentWorkspace.slug}`}
            </div>
          </div>
          {userRole && (
            <Badge 
              variant="outline" 
              className={cn("text-xs px-1.5 py-0.5", getRoleColor(userRole))}
            >
              {userRole}
            </Badge>
          )}
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Switch Workspace
        </DropdownMenuLabel>
        
        {workspaces
          .filter(w => w.id !== currentWorkspace.id)
          .map((workspace) => (
            <DropdownMenuItem
              key={workspace.id}
              onClick={() => {
                switchWorkspace(workspace.id)
                setIsOpen(false)
              }}
              className="flex items-center space-x-2 p-2"
            >
              <Building2 className="h-4 w-4" />
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{workspace.name}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {workspace.description || `@${workspace.slug}`}
                </div>
              </div>
            </DropdownMenuItem>
          ))}

        <DropdownMenuSeparator />
        
        <WorkspaceCreationModal>
          <DropdownMenuItem className="flex items-center space-x-2 p-2">
            <Plus className="h-4 w-4" />
            <span>Create Workspace</span>
          </DropdownMenuItem>
        </WorkspaceCreationModal>
        
        {userRole === 'OWNER' && (
          <DropdownMenuItem className="flex items-center space-x-2 p-2">
            <Settings className="h-4 w-4" />
            <span>Workspace Settings</span>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
