'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Loader2 } from 'lucide-react'
import { ProgressStepper } from '@/components/onboarding/wizard/progress-stepper'
import { Step1Workspace } from '@/components/onboarding/wizard/step-1-workspace'
// Deprecated: Invite and Org steps removed from onboarding flow.
// Users complete org setup post-onboarding via /org.
// import { Step2Invites } from '@/components/onboarding/wizard/step-2-invites'
// import { Step3OrgStructure } from '@/components/onboarding/wizard/step-3-org-structure'
import { Step4FirstSpace } from '@/components/onboarding/wizard/step-4-first-space'
import { Step5Ready } from '@/components/onboarding/wizard/step-5-ready'
import type { CompanySize } from '@/lib/validations/onboarding'

interface OnboardingProgress {
  currentStep: number
  completedSteps: number[]
  isComplete: boolean
  companySize: CompanySize | null
  orgName?: string
}

interface OnboardingSummary {
  workspaceName: string
}

const TOTAL_STEPS = 3

/** Maps UI step numbers (1-3) to API step numbers the backend expects. */
const UI_TO_API_STEP: Record<number, number> = { 1: 1, 2: 4, 3: 5 }

/** Maps API/DB currentStep values back to UI step numbers for progress resume. */
const API_TO_UI_STEP: Record<number, number> = { 1: 1, 2: 2, 3: 2, 4: 2, 5: 3 }

function apiStepToUiStep(apiStep: number): number {
  return API_TO_UI_STEP[apiStep] ?? 1
}

export default function OnboardingStepPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session, update: updateSession } = useSession()

  const stepParam = Number(params.step)
  const step = Number.isInteger(stepParam) && stepParam >= 1 && stepParam <= TOTAL_STEPS ? stepParam : 1

  const [progress, setProgress] = useState<OnboardingProgress | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [summary, setSummary] = useState<OnboardingSummary>({ workspaceName: '' })

  useEffect(() => {
    let cancelled = false
    const fetchProgress = async () => {
      try {
        const res = await fetch('/api/onboarding/progress')
        if (res.ok) {
          const data = await res.json()
          if (!cancelled) {
            setProgress(data)
            if (data.isComplete) {
              router.replace('/home')
              return
            }
            const uiStep = apiStepToUiStep(data.currentStep)
            if (step > uiStep) {
              router.replace(`/onboarding/${uiStep}`)
            }
          }
        }
      } catch {
        // Silently handle — user will see step 1
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchProgress()
    return () => { cancelled = true }
  }, [step, router])

  const submitStep = useCallback(
    async (uiStepNumber: number, data: Record<string, unknown>) => {
      setSubmitting(true)
      try {
        const apiStep = UI_TO_API_STEP[uiStepNumber] ?? uiStepNumber

        const res = await fetch('/api/onboarding/progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ step: apiStep, data }),
        })

        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          const msg = typeof err?.error === 'object' && err?.error !== null && 'message' in err.error
            ? String((err.error as { message?: unknown }).message)
            : typeof err?.error === 'string'
              ? err.error
              : 'Request failed'
          throw new Error(msg)
        }

        await res.json()

        if (apiStep === 1) {
          await updateSession({})
          setSummary({ workspaceName: (data as { workspaceName?: string }).workspaceName || '' })
          setProgress({
            currentStep: 2,
            completedSteps: [1],
            isComplete: false,
            companySize: (data as { companySize?: CompanySize }).companySize ?? null,
            orgName: (data as { workspaceName?: string }).workspaceName,
          })
        }

        if (apiStep === 5) {
          await updateSession({})
          router.replace('/home')
          return
        }

        const nextUiStep = uiStepNumber + 1
        router.push(`/onboarding/${nextUiStep}`)
      } catch (error: unknown) {
        console.error('[onboarding] Step submission error:', error)
        alert(error instanceof Error ? error.message : 'Something went wrong. Please try again.')
      } finally {
        setSubmitting(false)
      }
    },
    [router, updateSession]
  )

  const goBack = useCallback(() => {
    const prev = step - 1
    if (prev >= 1) router.push(`/onboarding/${prev}`)
  }, [step, router])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <ProgressStepper currentStep={step} totalSteps={TOTAL_STEPS} />

      {step === 1 && (
        <Step1Workspace
          defaultValues={
            progress?.orgName || session?.user?.name
              ? {
                  ...(progress?.orgName ? { workspaceName: progress.orgName } : {}),
                  ...(session?.user?.name ? { adminName: session.user.name } : {}),
                }
              : undefined
          }
          submitting={submitting}
          onSubmit={data => submitStep(1, data)}
        />
      )}

      {step === 2 && (
        <Step4FirstSpace
          submitting={submitting}
          onSubmit={data => submitStep(2, data)}
          onBack={goBack}
        />
      )}

      {step === 3 && (
        <Step5Ready
          summary={summary}
          submitting={submitting}
          onComplete={() => submitStep(3, { confirm: true })}
        />
      )}
    </div>
  )
}
