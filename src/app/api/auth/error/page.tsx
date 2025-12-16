"use client"

export const dynamic = 'force-dynamic'

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertCircle } from "lucide-react"

export default function AuthErrorPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const errorParam = searchParams.get("error")
    if (errorParam) {
      // Decode common NextAuth error codes
      const errorMessages: Record<string, string> = {
        Configuration: "There is a problem with the server configuration. Please check your Google OAuth credentials in .env.local and ensure the redirect URI 'http://localhost:3000/api/auth/callback/google' is added to your Google Cloud Console OAuth client.",
        AccessDenied: "Access denied. You may not have permission to sign in.",
        Verification: "The verification token has expired or has already been used.",
        OAuthAccountNotLinked: "This account is already linked to another user.",
        OAuthCallback: "Error during OAuth callback. Check your redirect URI configuration.",
        OAuthCreateAccount: "Could not create OAuth account.",
        EmailCreateAccount: "Could not create email account.",
        Callback: "Error in OAuth callback.",
        OAuthSignin: "Error signing in with OAuth provider.",
        SessionRequired: "Session required.",
        Default: "An error occurred during authentication.",
      }
      setError(errorMessages[errorParam] || errorMessages.Default)
    } else {
      setError("An unknown authentication error occurred. Check the browser console for details.")
    }
  }, [searchParams])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <AlertCircle className="w-12 h-12 text-destructive" />
          </div>
          <CardTitle className="text-2xl font-bold text-destructive">Authentication Error</CardTitle>
          <CardDescription className="text-base mt-2">
            {error || "An error occurred during sign in"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground">
            <p className="mb-2">Common causes:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Google OAuth credentials not configured in .env.local</li>
              <li>Redirect URI mismatch in Google Cloud Console</li>
              <li>Invalid or expired OAuth credentials</li>
            </ul>
          </div>
          <div className="flex flex-col gap-2">
            <Button
              onClick={() => router.push("/login")}
              className="w-full"
            >
              Return to Login
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                const errorCode = searchParams.get("error")
                const errorDescription = searchParams.get("error_description")
                console.log("Auth error details:", {
                  error: errorCode,
                  errorDescription: errorDescription,
                  fullUrl: window.location.href,
                  searchParams: Object.fromEntries(new URLSearchParams(window.location.search)),
                })
                alert(`Error Code: ${errorCode || "Unknown"}\n\nCheck the browser console (F12) for full details.`)
              }}
            >
              View Error Details (Check Console)
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

