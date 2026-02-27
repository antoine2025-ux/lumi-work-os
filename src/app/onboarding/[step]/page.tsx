'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Loader2 } from 'lucide-react'
import { ProgressStepper } from '@/components/onboarding/wizard/progress-stepper'
import { Step1Workspace } from '@/components/onboarding/wizard/step-1-workspace'
import { Step2Invites } from '@/components/onboarding/wizard/step-2-invites'
import { Step3OrgStructure } from '@/components/onboarding/wizard/step-3-org-structure'
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

/** Summary of entities created during onboarding for the final step. */
interface OnboardingSummary {
  workspaceName: string
  inviteCount: number
  departmentCount: number
  teamCount: number
  spaceName: string | null
}

const TOTAL_STEPS = 5

export default function OnboardingStepPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session, update: updateSession } = useSession()

  const stepParam = Number(params.step)
  const step = Number.isInteger(stepParam) && stepParam >= 1 && stepParam <= TOTAL_STEPS ? stepParam : 1

  const [progress, setProgress] = useState<OnboardingProgress | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [summary, setSummary] = useState<OnboardingSummary>({
    workspaceName: '',
    inviteCount: 0,
    departmentCount: 0,
    teamCount: 0,
    spaceName: null,
  })

  // Fetch progress on mount
  useEffect(() => {
    let cancelled = false
    const fetchProgress = async () => {
      try {
        const res = await fetch('/api/onboarding/progress')
        if (res.ok) {
          const data = await res.json()
          if (!cancelled) {
            setProgress(data)
            // If onboarding is already complete, redirect to home
            if (data.isComplete) {
              router.replace('/home')
              return
            }
            // If this step hasn't been reached yet, redirect to current step
            if (step > data.currentStep) {
              router.replace(`/onboarding/${data.currentStep}`)
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

  /** Determine if Step 3 (org structure) should be skipped for solo users. */
  const shouldSkipStep3 = progress?.companySize === 'solo'

  /** Compute the effective next step, skipping Step 3 for solo tier. */
  const getNextStep = useCallback(
    (current: number): number => {
      const next = current + 1
      if (next === 3 && shouldSkipStep3) return 4
      return next
    },
    [shouldSkipStep3]
  )

  /** Submit step data to the API and navigate forward. */
  const submitStep = useCallback(
    async (stepNumber: number, data: Record<string, unknown>) => {
      setSubmitting(true)
      try {
        const res = await fetch('/api/onboarding/progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ step: stepNumber, data }),
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

        const result = await res.json()

        // After step 1 workspace creation, refresh session so JWT has workspaceId
        if (stepNumber === 1) {
          await updateSession({})
          setSummary(prev => ({ ...prev, workspaceName: (data as { workspaceName?: string }).workspaceName || '' }))
          setProgress({
            currentStep: 2,
            completedSteps: [1],
            isComplete: false,
            companySize: (data as { companySize?: CompanySize }).companySize ?? null,
            orgName: (data as { workspaceName?: string }).workspaceName,
          })
        }

        // Track summary items
        if (stepNumber === 2) {
          const invites = (data as { invites?: unknown[] }).invites
          setSummary(prev => ({ ...prev, inviteCount: invites?.length ?? 0 }))
        }
        if (stepNumber === 3) {
          setSummary(prev => ({
            ...prev,
            departmentCount: result.createdDepartments?.length ?? 0,
            teamCount: result.createdTeams?.length ?? 0,
          }))
        }
        if (stepNumber === 4) {
          setSummary(prev => ({ ...prev, spaceName: result.spaceName ?? null }))
        }

        // Step 5 — onboarding is done; pass {} so JWT callback refreshes token
        if (stepNumber === 5) {
          await updateSession({})
          router.replace('/home')
          return
        }

        // Navigate to the next step
        const nextStep = result.nextStep ?? getNextStep(stepNumber)
        // Handle solo skipping step 3
        const effectiveNext = nextStep === 3 && shouldSkipStep3 ? 4 : nextStep
        router.push(`/onboarding/${effectiveNext}`)
      } catch (error) {
        console.error('[onboarding] Step submission error:', error)
        alert(error instanceof Error ? error.message : 'Something went wrong. Please try again.')
      } finally {
        setSubmitting(false)
      }
    },
    [router, updateSession, getNextStep, shouldSkipStep3]
  )

  /** Navigate back to the previous step. */
  const goBack = useCallback(() => {
    let prev = step - 1
    if (prev === 3 && shouldSkipStep3) prev = 2
    if (prev >= 1) router.push(`/onboarding/${prev}`)
  }, [step, shouldSkipStep3, router])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <ProgressStepper currentStep={step} totalSteps={TOTAL_STEPS} skipStep3={shouldSkipStep3} />

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
        <Step2Invites
          submitting={submitting}
          onSubmit={data => submitStep(2, data)}
          onBack={goBack}
        />
      )}

      {step === 3 && (
        <Step3OrgStructure
          submitting={submitting}
          onSubmit={data => submitStep(3, data)}
          onBack={goBack}
        />
      )}

      {step === 4 && (
        <Step4FirstSpace
          submitting={submitting}
          onSubmit={data => submitStep(4, data)}
          onBack={goBack}
        />
      )}

      {step === 5 && (
        <Step5Ready
          summary={summary}
          submitting={submitting}
          onComplete={() => submitStep(5, { confirm: true })}
        />
      )}
    </div>
  )
}
