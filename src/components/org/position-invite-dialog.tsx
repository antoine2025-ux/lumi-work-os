"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Mail, CheckCircle2, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

// Simple toast hook - shows alert for now, can be replaced with proper toast library
const useToast = () => {
  return {
    toast: (options: { title: string; description?: string; variant?: 'default' | 'destructive' }) => {
      if (options.variant === 'destructive') {
        alert(`Error: ${options.title}${options.description ? `\n${options.description}` : ''}`)
      } else {
        // In a real app, use a toast library like sonner or react-hot-toast
        // For now, we'll use the Alert component in the dialog
      }
    }
  }
}

interface PositionInviteDialogProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  positionId: string
  positionTitle: string
  workspaceId: string
  userRole?: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER' // Current user's role for permission checks
}

export function PositionInviteDialog({ 
  isOpen, 
  onClose, 
  onSuccess,
  positionId,
  positionTitle,
  workspaceId,
  userRole = 'MEMBER'
}: PositionInviteDialogProps) {
  const [email, setEmail] = useState("")
  // OWNER role is excluded - only ADMIN, MEMBER, VIEWER allowed for position-based invites
  const [role, setRole] = useState<"ADMIN" | "MEMBER" | "VIEWER">("MEMBER")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [invitedEmail, setInvitedEmail] = useState<string>("")
  const [inviteUrl, setInviteUrl] = useState<string>("")
  const toast = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      if (!email.trim()) {
        throw new Error('Email is required')
      }

      // Validate position exists (should be guaranteed by parent, but double-check)
      if (!positionId) {
        throw new Error('Position is required')
      }

      const response = await fetch(`/api/org/positions/${positionId}/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
          role
        }),
        credentials: 'include'
      })

      const data = await response.json()

      if (!response.ok) {
        // Handle 409 Conflict - position occupied
        if (response.status === 409) {
          toast.toast({
            title: 'Position Already Occupied',
            description: 'This position has been filled. Refreshing organization chart...',
            variant: 'destructive'
          })
          // Refetch org chart data
          onSuccess()
          // Close dialog after a short delay
          setTimeout(() => {
            onClose()
          }, 1500)
          return
        }
        throw new Error(data.error || 'Failed to send invitation')
      }

      setSuccess(true)
      setInvitedEmail(email.trim())
      // Store inviteUrl but don't expose token in UI (security)
      setInviteUrl(data.inviteUrl || '')
      setEmail("")
      
      // Call onSuccess immediately to refetch org chart and any invite lists
      onSuccess()
      
      // Close dialog after showing success message
      setTimeout(() => {
        setSuccess(false)
        setInvitedEmail("")
        setInviteUrl("")
        onClose()
      }, 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    if (!isLoading) {
      setEmail("")
      setRole("MEMBER")
      setError(null)
      setSuccess(false)
      setInvitedEmail("")
      setInviteUrl("")
      onClose()
    }
  }

  // Determine available roles based on user's role
  // OWNER is excluded - position-based invites cannot assign OWNER role
  const getAvailableRoles = () => {
    const roles: Array<{ value: "ADMIN" | "MEMBER" | "VIEWER"; label: string }> = [
      { value: "MEMBER", label: "Member" },
      { value: "VIEWER", label: "Viewer" }
    ]
    
    // Only OWNER and ADMIN can invite ADMIN
    if (userRole === 'OWNER' || userRole === 'ADMIN') {
      roles.unshift({ value: "ADMIN", label: "Admin" })
    }
    
    return roles
  }

  const availableRoles = getAvailableRoles()

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Invite to Position</DialogTitle>
          <DialogDescription>
            Send an invitation to fill the <strong>{positionTitle}</strong> position
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="py-6 space-y-4">
            <Alert className="border-green-200 bg-green-50 dark:bg-green-950">
              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
              <AlertDescription className="text-green-800 dark:text-green-200">
                Invitation sent successfully to <strong>{invitedEmail}</strong>!
              </AlertDescription>
            </Alert>
            {inviteUrl && (
              <div className="p-3 bg-muted rounded-md">
                <p className="text-xs text-muted-foreground mb-1">Invite Link:</p>
                <code className="text-xs break-all">{inviteUrl}</code>
                <p className="text-xs text-muted-foreground mt-2 italic">
                  The invite has been sent. Organization chart has been refreshed.
                </p>
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="colleague@company.com"
                  required
                  disabled={isLoading}
                  className="pl-10"
                />
              </div>
              <p className="text-xs text-gray-500">
                They'll receive an email invitation to join this position
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select
                value={role}
                onValueChange={(value) => setRole(value as "ADMIN" | "MEMBER" | "VIEWER")}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableRoles.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                {role === 'ADMIN' && 'Admins can manage workspace settings and invite others.'}
                {role === 'MEMBER' && 'Members can view and edit content.'}
                {role === 'VIEWER' && 'Viewers have read-only access.'}
              </p>
              <p className="text-xs text-muted-foreground italic">
                Note: OWNER role cannot be assigned via position-based invites.
              </p>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isLoading || !email.trim() || !positionId}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4 mr-2" />
                    Send Invitation
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
