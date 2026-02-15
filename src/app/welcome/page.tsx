'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

/**
 * Backward-compatibility shim — redirects to the unified onboarding wizard.
 * Middleware now sends first-time users directly to /onboarding/1, but this
 * page remains for bookmarks, cached links, and any remaining deep links.
 */
export default function WelcomePage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/onboarding/1')
  }, [router])

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </div>
  )
}
