'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Rocket } from 'lucide-react'
import { DepartmentStep } from '@/components/onboarding/org-wizard/department-step'
import { TeamStep } from '@/components/onboarding/org-wizard/team-step'
import { PositionsStep, type RoleCardData } from '@/components/onboarding/org-wizard/positions-step'
import { InviteStep } from '@/components/onboarding/org-wizard/invite-step'

export interface OrgSetupWizardClientProps {
  workspaceSlug: string
  defaultDepartment?: string
  defaultTeam?: string
  defaultRole?: string
}

export function OrgSetupWizardClient({
  workspaceSlug,
  defaultDepartment = '',
  defaultTeam = '',
  defaultRole = '',
}: OrgSetupWizardClientProps) {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [workspaceId, setWorkspaceId] = useState<string | null>(null)

  // Step 1: Department (pre-filled from Phase 1)
  const [departmentName, setDepartmentName] = useState(defaultDepartment)
  const [departmentDescription, setDepartmentDescription] = useState('')

  // Step 2: Team (pre-filled from Phase 1)
  const [teamName, setTeamName] = useState(defaultTeam)
  const [teamDescription, setTeamDescription] = useState('')

  // Step 3: Role Cards (first role pre-filled from Phase 1)
  const [roleCards, setRoleCards] = useState<RoleCardData[]>(
    defaultRole ? [{ name: defaultRole, description: '', level: 'MID' }] : []
  )

  // Step 4: Invite
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'ADMIN' | 'EDITOR' | 'VIEWER'>('VIEWER')
  const [invitePosition, setInvitePosition] = useState('')

  // Fetch workspace ID
  useEffect(() => {
    async function fetchWorkspace() {
      try {
        const res = await fetch(`/api/workspaces?slug=${workspaceSlug}`)
        if (res.ok) {
          const data = await res.json()
          if (data.workspaces?.[0]?.id) {
            setWorkspaceId(data.workspaces[0].id)
          }
        }
      } catch (error) {
        console.error('Failed to fetch workspace', error)
      }
    }
    fetchWorkspace()
  }, [workspaceSlug])

  const handleSubmit = async () => {
    if (!workspaceId) {
      alert('Workspace ID not found')
      return
    }

    setIsSubmitting(true)

    try {
      // Invite is optional (no email sending; when provided we create record and get shareable link)
      const positionIndex = invitePosition !== '' ? parseInt(invitePosition, 10) : 0
      const includeInvite = inviteEmail.trim().includes('@') && !isNaN(positionIndex) && positionIndex >= 0 && positionIndex < roleCards.length

      const payload = {
        department: {
          name: departmentName,
          description: departmentDescription,
        },
        team: {
          name: teamName,
          description: teamDescription,
        },
        roleCards: roleCards,
        ...(includeInvite && {
          invite: {
            email: inviteEmail.trim(),
            role: inviteRole,
            positionIndex,
          },
        }),
      }

      const res = await fetch('/api/org/bootstrap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const error = await res.json()
        const message = typeof error?.error === 'string' ? error.error : (error?.error && typeof error.error === 'object' ? (error.error as { message?: string }).message ?? JSON.stringify(error.error) : (error?.details ? JSON.stringify(error.details) : 'Failed to create org structure'))
        // Already bootstrapped: treat as success and go to home
        if (res.status === 400 && (message === 'Org structure already bootstrapped' || String(message).includes('already bootstrapped'))) {
          router.push('/home')
          return
        }
        const errMsg = typeof error?.error === 'string' ? error.error : (error?.error && typeof error.error === 'object' ? JSON.stringify(error.error) : (error?.details ? JSON.stringify(error.details) : 'Failed to create org structure'))
        throw new Error(errMsg)
      }

      const data = await res.json()
      if (data.inviteLink) {
        alert(`Invite link created. Share this link with your team member (email is not sent):\n\n${data.inviteLink}`)
      }

      // After successful bootstrap, sync org context for Loopbrain
      fetch('/api/loopbrain/org/context/sync', { 
        method: 'POST' 
      }).catch(err => console.error('Org context sync failed:', err))

      router.push('/home')
    } catch (error) {
      console.error('Org setup error:', error)
      alert(error instanceof Error ? error.message : 'Failed to complete org setup')
    } finally {
      setIsSubmitting(false)
    }
  }

  const nextStep = () => {
    if (currentStep < 4) setCurrentStep(currentStep + 1)
  }

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1)
  }

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return departmentName.trim().length >= 2
      case 2:
        return teamName.trim().length >= 2
      case 3:
        return roleCards.length >= 2
      case 4:
        return true // Invite optional: can complete with or without email
      default:
        return false
    }
  }

  const progress = (currentStep / 4) * 100

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Rocket className="h-6 w-6 text-primary" />
              <CardTitle className="text-2xl">Set Up Your Organization</CardTitle>
            </div>
            <span className="text-sm text-muted-foreground">Step {currentStep} of 4</span>
          </div>
          <Progress value={progress} className="h-2" />
          <CardDescription className="mt-4">
            Create your org structure so Loopbrain can answer questions about your team
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="space-y-6">
            {currentStep === 1 && (
              <DepartmentStep
                departmentName={departmentName}
                setDepartmentName={setDepartmentName}
                departmentDescription={departmentDescription}
                setDepartmentDescription={setDepartmentDescription}
              />
            )}

            {currentStep === 2 && (
              <TeamStep
                teamName={teamName}
                setTeamName={setTeamName}
                teamDescription={teamDescription}
                setTeamDescription={setTeamDescription}
                departmentName={departmentName}
              />
            )}

            {currentStep === 3 && (
              <PositionsStep roleCards={roleCards} setRoleCards={setRoleCards} />
            )}

            {currentStep === 4 && (
              <InviteStep
                inviteEmail={inviteEmail}
                setInviteEmail={setInviteEmail}
                inviteRole={inviteRole}
                setInviteRole={setInviteRole}
                invitePosition={invitePosition}
                setInvitePosition={setInvitePosition}
                roleCards={roleCards}
              />
            )}

            {/* Navigation */}
            <div className="flex justify-between pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === 1 || isSubmitting}
              >
                Back
              </Button>

              {currentStep < 4 ? (
                <Button type="button" onClick={nextStep} disabled={!canProceed()}>
                  Next
                </Button>
              ) : (
                <Button onClick={handleSubmit} disabled={!canProceed() || isSubmitting}>
                  {isSubmitting ? 'Creating...' : 'Complete Setup'}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
