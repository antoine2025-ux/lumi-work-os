"use client"

/**
 * React Hook Ordering Fix:
 * 
 * PREVIOUS ISSUE: The second useEffect (redirect logic) was placed AFTER an early return,
 * causing React error #310 "Rendered more hooks than during the previous render."
 * 
 * When status === 'loading', the component returned early before the second useEffect,
 * so on first render: 1 useEffect called, on second render: 2 useEffects called.
 * 
 * FIX: All hooks (including all useEffects) are now called unconditionally at the top level,
 * before any early returns. Conditional logic is moved inside the effects.
 */

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, CheckCircle, AlertTriangle, Mail } from "lucide-react"
import { useSession } from "next-auth/react"

interface InviteDetails {
  email: string
  role: string
  workspace: {
    id: string
    name: string
    slug: string
  }
}

export default function InviteAcceptPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session, status } = useSession()
  const token = params.token as string
  
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(false)
  const [inviteDetails, setInviteDetails] = useState<InviteDetails | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // All hooks must be called unconditionally before any early returns
  // This ensures React sees the same number of hooks on every render

  useEffect(() => {
    // Invite details would be fetched from API if needed
    // For now, we'll just show the accept button
    setLoading(false)
  }, [token])

  // Redirect unauthenticated users to login with callbackUrl to preserve invite token
  // This useEffect must be called before any early returns to maintain hook order
  useEffect(() => {
    if (status === 'unauthenticated' && token) {
      const invitePath = `/invites/${token}`
      const loginUrl = `/login?callbackUrl=${encodeURIComponent(invitePath)}`
      
      // Log redirect for debugging invite flow
      const logData = {
        message: 'Redirecting unauthenticated user from invite',
        invitePath,
        callbackUrl: invitePath,
        loginUrl,
        currentHref: typeof window !== 'undefined' ? window.location.href : null,
        timestamp: new Date().toISOString()
      }
      
      if (process.env.NODE_ENV === 'development') {
        console.log('🔗 [Invite] Redirecting to login:', logData)
      } else {
        // In production, log as JSON for server logs
        console.log(JSON.stringify({
          level: 'info',
          ...logData
        }))
      }
      
      router.push(loginUrl)
    }
  }, [status, token, router])

  const handleAcceptInvite = async () => {
    if (!token) return

    try {
      setAccepting(true)
      setError(null)

      const response = await fetch(`/api/invites/${token}/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to accept invite')
      }

      setSuccess(true)
      
      // Redirect to the invited workspace using slug-based URL
      // This ensures getUnifiedAuth() resolves to the correct workspace
      if (data.workspace?.slug) {
        setTimeout(() => {
          router.push(`/w/${data.workspace.slug}`)
        }, 2000)
      } else {
        // Fallback to workspaceId if slug is missing (shouldn't happen)
        console.warn('Workspace slug missing from accept response, using workspaceId fallback')
        setTimeout(() => {
          router.push(`/home?workspaceId=${data.workspaceId}`)
        }, 2000)
      }
    } catch (error: any) {
      console.error("Error accepting invite:", error)
      setError(error.message || 'Failed to accept invite')
    } finally {
      setAccepting(false)
    }
  }

  // Early returns are now AFTER all hooks have been called
  // This ensures React always sees the same number of hooks on every render
  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-center space-x-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-center space-x-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Redirecting to login...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Accept Workspace Invite</CardTitle>
          <CardDescription>
            {success 
              ? "Invite accepted successfully!" 
              : "You've been invited to join a workspace"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
              <div className="flex items-center space-x-2 text-destructive">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm">{error}</span>
              </div>
            </div>
          )}

          {success ? (
            <div className="space-y-4">
              <div className="flex items-center justify-center space-x-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">Invite accepted!</span>
              </div>
              <p className="text-sm text-center text-muted-foreground">
                Redirecting to workspace...
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <span className="text-sm">Logged in as: {session?.user?.email}</span>
                </div>
              </div>

              <Button 
                onClick={handleAcceptInvite}
                disabled={accepting}
                className="w-full"
              >
                {accepting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Accepting...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Accept Invite
                  </>
                )}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
