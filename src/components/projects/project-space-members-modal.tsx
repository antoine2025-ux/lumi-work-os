"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Users, UserPlus, Trash2, Loader2, AlertCircle } from "lucide-react"
import { useWorkspace } from "@/lib/workspace-context"

interface ProjectSpaceMembersModalProps {
  isOpen: boolean
  onClose: () => void
  projectSpaceId: string
  projectName: string
  onMemberAdded?: () => void
}

interface ProjectSpaceMember {
  id: string
  userId: string
  joinedAt: string
  user: {
    id: string
    name: string
    email: string
    image?: string
  }
}

interface WorkspaceMember {
  id: string
  userId: string
  role: string
  user: {
    id: string
    name: string
    email: string
  }
}

export function ProjectSpaceMembersModal({
  isOpen,
  onClose,
  projectSpaceId,
  projectName,
  onMemberAdded
}: ProjectSpaceMembersModalProps) {
  const { currentWorkspace } = useWorkspace()
  const [members, setMembers] = useState<ProjectSpaceMember[]>([])
  const [workspaceMembers, setWorkspaceMembers] = useState<WorkspaceMember[]>([])
  const [selectedUserId, setSelectedUserId] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingMembers, setIsLoadingMembers] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [visibility, setVisibility] = useState<'PUBLIC' | 'TARGETED'>('TARGETED')

  useEffect(() => {
    if (isOpen && projectSpaceId) {
      loadMembers()
      loadWorkspaceMembers()
      loadProjectSpaceInfo()
    }
  }, [isOpen, projectSpaceId])

  const loadMembers = async () => {
    try {
      setIsLoadingMembers(true)
      const response = await fetch(`/api/project-spaces/${projectSpaceId}/members`)
      if (response.ok) {
        const data = await response.json()
        setMembers(data.members || [])
      } else {
        setError('Failed to load members')
      }
    } catch (error) {
      console.error('Error loading members:', error)
      setError('Failed to load members')
    } finally {
      setIsLoadingMembers(false)
    }
  }

  const loadWorkspaceMembers = async () => {
    try {
      if (!currentWorkspace?.id) return
      const response = await fetch(`/api/workspaces/${currentWorkspace.id}/members`)
      if (response.ok) {
        const data = await response.json()
        setWorkspaceMembers(data.members || [])
      }
    } catch (error) {
      console.error('Error loading workspace members:', error)
    }
  }

  const loadProjectSpaceInfo = async () => {
    try {
      const response = await fetch(`/api/project-spaces`)
      if (response.ok) {
        const data = await response.json()
        const space = data.spaces?.find((s: { id: string }) => s.id === projectSpaceId)
        if (space) {
          setVisibility(space.visibility)
        }
      }
    } catch (error) {
      console.error('Error loading project space info:', error)
    }
  }

  const handleAddMember = async () => {
    if (!selectedUserId) return

    try {
      setIsLoading(true)
      setError(null)
      const response = await fetch(`/api/project-spaces/${projectSpaceId}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: selectedUserId }),
      })

      if (response.ok) {
        await loadMembers()
        setSelectedUserId("")
        onMemberAdded?.() // Notify parent to refresh
      } else {
        const errorData = await response.json().catch(() => ({}))
        setError(errorData.error || 'Failed to add member')
      }
    } catch (error) {
      console.error('Error adding member:', error)
      setError('Failed to add member')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRemoveMember = async (userId: string) => {
    if (!confirm('Are you sure you want to remove this member from the ProjectSpace?')) {
      return
    }

    try {
      setIsLoading(true)
      setError(null)
      const response = await fetch(`/api/project-spaces/${projectSpaceId}/members/${userId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        await loadMembers()
      } else {
        const errorData = await response.json().catch(() => ({}))
        setError(errorData.error || 'Failed to remove member')
      }
    } catch (error) {
      console.error('Error removing member:', error)
      setError('Failed to remove member')
    } finally {
      setIsLoading(false)
    }
  }

  // Get available workspace members (not already in ProjectSpace)
  const availableMembers = workspaceMembers.filter(
    wm => !members.some(m => m.userId === wm.userId)
  )

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            ProjectSpace Members
          </DialogTitle>
          <DialogDescription>
            Manage members for "{projectName}" ProjectSpace
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Visibility Info */}
          <div className="p-3 rounded-lg bg-muted">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Visibility:</span>
              <Badge variant={visibility === 'PUBLIC' ? 'default' : 'secondary'}>
                {visibility}
              </Badge>
            </div>
            {visibility === 'PUBLIC' && (
              <p className="text-xs text-muted-foreground mt-2">
                All workspace members have access to projects in this space.
              </p>
            )}
            {visibility === 'TARGETED' && (
              <p className="text-xs text-muted-foreground mt-2">
                Only members listed below can access projects in this space.
              </p>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200">
              <p className="text-sm text-red-600 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                {error}
              </p>
            </div>
          )}

          {/* Add Member (only for TARGETED) */}
          {visibility === 'TARGETED' && (
            <div className="flex gap-2">
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select workspace member to add" />
                </SelectTrigger>
                <SelectContent>
                  {availableMembers.length === 0 ? (
                    <SelectItem value="" disabled>
                      No available members
                    </SelectItem>
                  ) : (
                    availableMembers.map((member) => (
                      <SelectItem key={member.userId} value={member.userId}>
                        <div className="flex items-center gap-2">
                          <span>{member.user.name || member.user.email}</span>
                          <Badge variant="outline" className="text-xs">
                            {member.role}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <Button
                onClick={handleAddMember}
                disabled={!selectedUserId || isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Members List */}
          <div>
            <h3 className="text-sm font-medium mb-2">
              Members ({members.length})
            </h3>
            {isLoadingMembers ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : members.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                {visibility === 'PUBLIC' 
                  ? 'All workspace members have access'
                  : 'No members added yet'}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Joined</TableHead>
                    {visibility === 'TARGETED' && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell>{member.user.name || 'Unknown'}</TableCell>
                      <TableCell>{member.user.email}</TableCell>
                      <TableCell>
                        {new Date(member.joinedAt).toLocaleDateString()}
                      </TableCell>
                      {visibility === 'TARGETED' && (
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveMember(member.userId)}
                            disabled={isLoading}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
