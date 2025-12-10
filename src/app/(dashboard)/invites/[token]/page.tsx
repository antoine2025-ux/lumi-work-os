"use client"

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

  useEffect(() => {
    // Invite details would be fetched from API if needed
    // For now, we'll just show the accept button
    setLoading(false)
  }, [token])

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
      
      // Redirect to workspace after a short delay
      setTimeout(() => {
        router.push(`/home?workspaceId=${data.workspaceId}`)
      }, 2000)
    } catch (error: any) {
      console.error("Error accepting invite:", error)
      setError(error.message || 'Failed to accept invite')
    } finally {
      setAccepting(false)
    }
  }

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
          <CardHeader>
            <CardTitle>Accept Workspace Invite</CardTitle>
            <CardDescription>
              You need to be logged in to accept this invitation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2 text-muted-foreground">
              <AlertTriangle className="h-4 w-4" />
              <span>Please log in to continue</span>
            </div>
            <Button 
              onClick={() => router.push('/login')}
              className="w-full"
            >
              Go to Login
            </Button>
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
