'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Building2, ArrowRight, Loader2 } from 'lucide-react'
import type { OnboardingStep1Data, CompanySize } from '@/lib/validations/onboarding'
import { cn } from '@/lib/utils'

interface Step1WorkspaceProps {
  defaultValues?: Partial<OnboardingStep1Data>
  submitting: boolean
  onSubmit: (data: OnboardingStep1Data) => void
}

const COMPANY_SIZES: Array<{ value: CompanySize; label: string; description: string }> = [
  { value: 'solo', label: 'Solo', description: 'Just me' },
  { value: '2-10', label: '2-10', description: 'Small team' },
  { value: '11-50', label: '11-50', description: 'Growing company' },
  { value: '50+', label: '50+', description: 'Large org' },
]

export function Step1Workspace({ defaultValues, submitting, onSubmit }: Step1WorkspaceProps) {
  const [workspaceName, setWorkspaceName] = useState(defaultValues?.workspaceName ?? '')
  const [adminName, setAdminName] = useState(defaultValues?.adminName ?? '')
  const [adminTitle, setAdminTitle] = useState(defaultValues?.adminTitle ?? '')
  const [companySize, setCompanySize] = useState<CompanySize | ''>(defaultValues?.companySize ?? '')

  const canSubmit =
    workspaceName.trim().length >= 2 &&
    adminName.trim().length >= 1 &&
    adminTitle.trim().length >= 1 &&
    companySize !== ''

  const handleSubmit = () => {
    if (!canSubmit || submitting) return
    onSubmit({
      workspaceName: workspaceName.trim(),
      adminName: adminName.trim(),
      adminTitle: adminTitle.trim(),
      companySize: companySize as CompanySize,
    })
  }

  return (
    <Card className="border-border/50">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Building2 className="h-6 w-6 text-primary" />
        </div>
        <CardTitle className="text-2xl">Welcome to Loopwell</CardTitle>
        <CardDescription className="text-base">
          Let&apos;s set up your workspace. This only takes a minute.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5 pt-4">
        {/* Workspace name */}
        <div className="space-y-1.5">
          <Label htmlFor="workspaceName">Workspace name</Label>
          <Input
            id="workspaceName"
            placeholder="Acme Inc."
            value={workspaceName}
            onChange={e => setWorkspaceName(e.target.value)}
            autoFocus
          />
          <p className="text-xs text-muted-foreground">Your company or team name.</p>
        </div>

        {/* Admin name */}
        <div className="space-y-1.5">
          <Label htmlFor="adminName">Your name</Label>
          <Input
            id="adminName"
            placeholder="Jane Smith"
            value={adminName}
            onChange={e => setAdminName(e.target.value)}
          />
        </div>

        {/* Admin title */}
        <div className="space-y-1.5">
          <Label htmlFor="adminTitle">Your role / title</Label>
          <Input
            id="adminTitle"
            placeholder="CEO, CTO, Engineering Manager..."
            value={adminTitle}
            onChange={e => setAdminTitle(e.target.value)}
          />
        </div>

        {/* Company size */}
        <div className="space-y-2">
          <Label>Company size</Label>
          <div className="grid grid-cols-4 gap-2">
            {COMPANY_SIZES.map(size => (
              <button
                key={size.value}
                type="button"
                onClick={() => setCompanySize(size.value)}
                className={cn(
                  'flex flex-col items-center gap-0.5 rounded-lg border p-3 text-center transition-colors',
                  companySize === size.value
                    ? 'border-primary bg-primary/5 text-foreground'
                    : 'border-border hover:border-primary/40 text-muted-foreground'
                )}
              >
                <span className="text-sm font-semibold">{size.label}</span>
                <span className="text-[11px]">{size.description}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Submit */}
        <Button
          className="w-full mt-2"
          size="lg"
          disabled={!canSubmit || submitting}
          onClick={handleSubmit}
        >
          {submitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Setting up...
            </>
          ) : (
            <>
              Continue
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
