"use client"

import { useState, useEffect } from "react"
import { useWorkspace } from "@/lib/workspace-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { 
  Users, 
  UserPlus, 
  Mail, 
  Copy, 
  Trash2, 
  Loader2,
  AlertTriangle,
  CheckCircle
} from "lucide-react"
// Simple toast implementation - replace with actual toast hook if available
const useToast = () => {
  return {
    toast: (options: { title: string; description?: string; variant?: 'default' | 'destructive' }) => {
      // Simple alert for now - replace with actual toast implementation
      if (options.variant === 'destructive') {
        alert(`Error: ${options.title}\n${options.description || ''}`)
      } else {
        console.log(`Toast: ${options.title} - ${options.description || ''}`)
      }
    }
  }
}

interface Member {
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

interface Invite {
  id: string
  email: string
  role: string
  createdAt: string
  expiresAt: string
  createdBy: {
    id: string
    name: string | null
    email: string
  }
  token: string
}

export function WorkspaceMembers() {
  const { currentWorkspace, userRole } = useWorkspace()
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error', message: string } | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [invites, setInvites] = useState<Invite[]>([])
  const [loading, setLoading] = useState(true)
  const [inviteLoading, setInviteLoading] = useState(false)
  const [revokeLoading, setRevokeLoading] = useState<string | null>(null)
  
  // Invite form state
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState("MEMBER")
  const [copiedToken, setCopiedToken] = useState<string | null>(null)

  const canManageMembers = userRole === 'OWNER' || userRole === 'ADMIN'

  useEffect(() => {
    if (currentWorkspace) {
      loadData()
    }
  }, [currentWorkspace])

  const loadData = async () => {
    if (!currentWorkspace) return

    try {
      setLoading(true)
      const [membersRes, invitesRes] = await Promise.all([
        fetch(`/api/workspaces/${currentWorkspace.id}/members`),
        canManageMembers ? fetch(`/api/workspaces/${currentWorkspace.id}/invites`) : Promise.resolve(null)
      ])

      if (membersRes.ok) {
        const membersData = await membersRes.json()
        setMembers(membersData.members || [])
      }

      if (invitesRes?.ok) {
        const invitesData = await invitesRes.json()
        setInvites(invitesData.invites || [])
      }
    } catch (error) {
      console.error("Error loading members/invites:", error)
      setToastMessage({ type: 'error', message: 'Failed to load members and invites' })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateInvite = async () => {
    if (!currentWorkspace || !inviteEmail.trim()) return

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(inviteEmail.trim())) {
      setToastMessage({ type: 'error', message: 'Please enter a valid email address' })
      return
    }

    try {
      setInviteLoading(true)
      const response = await fetch(`/api/workspaces/${currentWorkspace.id}/invites`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: inviteEmail.trim(),
          role: inviteRole
        })
      })

      const data = await response.json()

      if (!response.ok) {
        // Always log detailed error information for debugging
        console.error('Invite creation failed', {
          status: response.status,
          statusText: response.statusText,
          data,
        })
        throw new Error(data.error || "Failed to create invite")
      }

      setToastMessage({ type: 'success', message: `Invite created for ${data.email}` })

      // Reset form
      setInviteEmail("")
      setInviteRole("MEMBER")
      setShowInviteForm(false)

      // Reload invites
      await loadData()
    } catch (error: any) {
      console.error("Error creating invite:", error)
      setToastMessage({ type: 'error', message: error.message || 'Failed to create invite' })
    } finally {
      setInviteLoading(false)
    }
  }

  const handleRevokeInvite = async (inviteId: string) => {
    if (!currentWorkspace) return

    try {
      setRevokeLoading(inviteId)
      const response = await fetch(
        `/api/workspaces/${currentWorkspace.id}/invites/${inviteId}`,
        { method: 'DELETE' }
      )

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to revoke invite")
      }

      setToastMessage({ type: 'success', message: 'Invite revoked successfully' })

      // Reload invites
      await loadData()
    } catch (error: any) {
      console.error("Error revoking invite:", error)
      setToastMessage({ type: 'error', message: error.message || 'Failed to revoke invite' })
    } finally {
      setRevokeLoading(null)
    }
  }

  const copyInviteLink = (token: string) => {
    const baseUrl = window.location.origin
    const inviteUrl = `${baseUrl}/invites/${token}`
    navigator.clipboard.writeText(inviteUrl)
    setCopiedToken(token)
      setToastMessage({ type: 'success', message: 'Invite link copied to clipboard' })
    setTimeout(() => setCopiedToken(null), 2000)
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'OWNER':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
      case 'ADMIN':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'MEMBER':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'VIEWER':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-x-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Loading members...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {toastMessage && (
        <div className={`p-3 rounded-md ${
          toastMessage.type === 'success' 
            ? 'bg-green-50 border border-green-200 text-green-800 dark:bg-green-900 dark:text-green-200' 
            : 'bg-red-50 border border-red-200 text-red-800 dark:bg-red-900 dark:text-red-200'
        }`}>
          <div className="flex items-center justify-between">
            <span>{toastMessage.message}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setToastMessage(null)}
            >
              ×
            </Button>
          </div>
        </div>
      )}
      {/* Members */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5" />
                <span>Members</span>
              </CardTitle>
              <CardDescription>
                People who have access to this workspace
              </CardDescription>
            </div>
            {canManageMembers && (
              <Button onClick={() => setShowInviteForm(!showInviteForm)}>
                <UserPlus className="mr-2 h-4 w-4" />
                Invite Member
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No members yet
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">
                      {member.user.name || 'Unknown'}
                    </TableCell>
                    <TableCell>{member.user.email}</TableCell>
                    <TableCell>
                      <Badge className={getRoleColor(member.role)}>
                        {member.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(member.joinedAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Invite Form */}
      {canManageMembers && showInviteForm && (
        <Card>
          <CardHeader>
            <CardTitle>Invite Member</CardTitle>
            <CardDescription>
              Send an invitation to join this workspace
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="user@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-role">Role</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger id="invite-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="VIEWER">Viewer</SelectItem>
                  <SelectItem value="MEMBER">Member</SelectItem>
                  {userRole === 'OWNER' && (
                    <>
                      <SelectItem value="ADMIN">Admin</SelectItem>
                      <SelectItem value="OWNER">Owner</SelectItem>
                    </>
                  )}
                  {userRole === 'ADMIN' && (
                    <SelectItem value="ADMIN">Admin</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="flex space-x-2">
              <Button onClick={handleCreateInvite} disabled={inviteLoading}>
                {inviteLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    Create Invite
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={() => setShowInviteForm(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pending Invites */}
      {canManageMembers && (
        <Card>
          <CardHeader>
            <CardTitle>Pending Invites</CardTitle>
            <CardDescription>
              Invitations that haven't been accepted yet
            </CardDescription>
          </CardHeader>
          <CardContent>
            {invites.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No pending invites
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Invited By</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invites.map((invite) => {
                    const expiresAt = new Date(invite.expiresAt)
                    const isExpired = expiresAt < new Date()
                    return (
                      <TableRow key={invite.id}>
                        <TableCell>{invite.email}</TableCell>
                        <TableCell>
                          <Badge className={getRoleColor(invite.role)}>
                            {invite.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {invite.createdBy.name || invite.createdBy.email}
                        </TableCell>
                        <TableCell>
                          <span className={isExpired ? 'text-destructive' : ''}>
                            {expiresAt.toLocaleDateString()}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyInviteLink(invite.token)}
                              title="Copy invite link"
                            >
                              {copiedToken === invite.token ? (
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRevokeInvite(invite.id)}
                              disabled={revokeLoading === invite.id}
                              title="Revoke invite"
                            >
                              {revokeLoading === invite.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4 text-destructive" />
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
