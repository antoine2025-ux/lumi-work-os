"use client"

import { signIn, getSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BookOpen, ArrowRight } from "lucide-react"
import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)
  const [hasGoogleAuth, setHasGoogleAuth] = useState(true)
  
  // Read callbackUrl from search params, default to '/home'
  // This preserves invite URLs (/invites/[token]) through the authentication flow
  // All sign-in methods (Google, email, credentials, etc.) should use this callbackUrl
  const callbackUrl = searchParams.get('callbackUrl') ?? '/home'

  useEffect(() => {
    // Clear logout flag when login page loads
    // This ensures fresh OAuth attempts don't get blocked
    const logoutFlag = sessionStorage.getItem('__logout_flag__')
    if (logoutFlag === 'true') {
      console.log('🧹 Clearing logout flag on login page load')
      sessionStorage.removeItem('__logout_flag__')
    }

    // DON'T check session at all - this causes the redirect loop
    // Users should explicitly sign in, not be auto-redirected
    console.log('🔵 Login page loaded - no auto-redirect, user must click sign in')

    // Check if Google OAuth is available
    fetch('/api/auth/providers')
      .then(res => res.json())
      .then(providers => {
        console.log('Available providers:', providers)
        setHasGoogleAuth(!!providers.google)
      })
      .catch(() => {
        console.log('Error fetching providers')
        setHasGoogleAuth(false)
      })
  }, [router])

  const handleGoogleSignIn = async () => {
    console.log('🟢 [login] Google sign-in button clicked')
    
    // CRITICAL: Clear the logout flag before starting OAuth
    // This prevents AuthWrapper from blocking the OAuth callback
    sessionStorage.removeItem('__logout_flag__')
    console.log('✅ [login] Cleared logout flag before OAuth')
    
    // Clear any Google OAuth state/cookies to force fresh account selection
    // This ensures users can select a different account even if they're logged into Google
    try {
      // Clear Google OAuth cookies if they exist
      const cookies = document.cookie.split(';')
      cookies.forEach(cookie => {
        const eqPos = cookie.indexOf('=')
        const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim()
        // Clear Google-related cookies
        if (name.includes('google') || name.includes('gid') || name.includes('GA')) {
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=.google.com`
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=.googleapis.com`
        }
      })
    } catch (e) {
      console.log('Note: Could not clear Google cookies (may be cross-domain)', e)
    }
    
    setIsLoading(true)
    try {
      // Log sign-in attempt with callbackUrl for debugging invite flow
      const logData = {
        message: 'Login: calling signIn with callbackUrl',
        callbackUrl,
        href: typeof window !== 'undefined' ? window.location.href : null,
        searchParams: typeof window !== 'undefined' ? window.location.search : null,
        timestamp: new Date().toISOString()
      }
      
      if (process.env.NODE_ENV === 'development') {
        console.log('🔐 [Login] Calling signIn("google"):', logData)
      } else {
        // In production, log as JSON for server logs
        console.log(JSON.stringify({
          level: 'info',
          ...logData
        }))
      }
      
      // Force account selection by passing authorizationParams
      // This will override the default and ensure Google shows account picker
      // Use dynamic callbackUrl to preserve invite URLs through OAuth flow
      const result = await signIn('google', { 
        callbackUrl,
        redirect: true,
      })
      
      if (process.env.NODE_ENV === 'development') {
        console.log('🟢 [login] signIn result:', result)
      }
    } catch (error) {
      console.error('❌ [login] Sign in error:', error)
    } finally {
      setIsLoading(false)
    }
  }


  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-xl">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center">
                <BookOpen className="w-8 h-8 text-primary-foreground" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">Welcome to Loopwell Work OS</CardTitle>
            <CardDescription className="text-base">
              Your comprehensive workplace operating system
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center text-sm text-muted-foreground mb-6">
              Sign in to access your wiki, workflows, and team collaboration tools
            </div>
            
            <div className="space-y-3">
              {hasGoogleAuth ? (
                <Button 
                  onClick={handleGoogleSignIn}
                  disabled={isLoading}
                  className="w-full h-12 text-base"
                  size="lg"
                >
                  {isLoading ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Signing in...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      <span>Continue with Google</span>
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  )}
                </Button>
              ) : (
                <div className="text-center text-sm text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-200">
                  <strong>Development Mode:</strong> No authentication providers configured
                </div>
              )}
            </div>

            <div className="text-center text-xs text-muted-foreground mt-4">
              By signing in, you agree to our{" "}
              <a href="/cookie-policy" className="underline hover:text-foreground">Cookie Policy</a>
              {", "}
              <a href="#" className="underline hover:text-foreground">Terms of Service</a>
              {" and "}
              <a href="#" className="underline hover:text-foreground">Privacy Policy</a>
            </div>
          </CardContent>
        </Card>

        <div className="mt-8 text-center">
          <div className="text-sm text-muted-foreground">
            <strong>Need help?</strong> Contact your administrator or check our documentation
          </div>
        </div>
      </div>
    </div>
  )
}