'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Rocket, X } from 'lucide-react'

interface OrgSetupBannerProps {
  workspaceSlug: string
}

export function OrgSetupBanner({ workspaceSlug }: OrgSetupBannerProps) {
  const router = useRouter()
  const [showBanner, setShowBanner] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)

  useEffect(() => {
    // Check if banner was dismissed in this session
    const dismissed = sessionStorage.getItem('org-setup-banner-dismissed')
    if (dismissed) {
      setIsDismissed(true)
      return
    }

    // Fetch onboarding state
    async function checkOnboardingState() {
      try {
        const res = await fetch(`/api/workspaces?slug=${workspaceSlug}`)
        if (!res.ok) return

        const data = await res.json()
        const workspace = data.workspaces?.[0]
        
        if (!workspace?.id) return

        // Fetch onboarding state
        const stateRes = await fetch(`/api/workspaces/${workspace.id}/onboarding`)
        if (!stateRes.ok) return

        const stateData = await stateRes.json()
        
        // Show banner if org structure is not complete
        if (stateData.onboardingState && !stateData.onboardingState.orgStructure) {
          setShowBanner(true)
        }
      } catch (error) {
        console.error('Failed to check onboarding state', error)
      }
    }

    checkOnboardingState()
  }, [workspaceSlug])

  const handleDismiss = () => {
    sessionStorage.setItem('org-setup-banner-dismissed', 'true')
    setIsDismissed(true)
    setShowBanner(false)
  }

  const handleContinue = () => {
    router.push(`/w/${workspaceSlug}/welcome/org-setup`)
  }

  if (!showBanner || isDismissed) {
    return null
  }

  return (
    <Alert className="mb-6 border-primary/50 bg-primary/5">
      <Rocket className="h-5 w-5 text-primary" />
      <AlertTitle className="flex items-center justify-between">
        <span>Complete Your Organization Setup</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDismiss}
          className="h-6 w-6 p-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </AlertTitle>
      <AlertDescription className="mt-2">
        <p className="mb-3">
          Set up your organization structure to unlock full features and enable Loopbrain to answer questions about your team.
        </p>
        <Button onClick={handleContinue} size="sm">
          Continue Setup
        </Button>
      </AlertDescription>
    </Alert>
  )
}
