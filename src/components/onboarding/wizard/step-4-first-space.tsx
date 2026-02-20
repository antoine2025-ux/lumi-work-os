'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Building2,
  ArrowLeft,
  ArrowRight,
  Loader2,
  Code2,
  Users,
  ShoppingCart,
  Heart,
  TrendingUp,
  Cog,
  MoreHorizontal,
} from 'lucide-react'
import type { OnboardingStep4Data } from '@/lib/validations/onboarding'
import type { CompanyType } from '@/lib/validations/onboarding'
import { cn } from '@/lib/utils'

interface CompanyTypeOption {
  value: CompanyType
  label: string
  description: string
  icon: React.ElementType
}

const COMPANY_TYPES: CompanyTypeOption[] = [
  { value: 'saas', label: 'Software / SaaS', description: 'Product companies, tech startups', icon: Code2 },
  { value: 'agency', label: 'Agency / Services', description: 'Consulting, design, marketing', icon: Users },
  { value: 'ecommerce', label: 'E-commerce / Retail', description: 'Online stores, retail', icon: ShoppingCart },
  { value: 'healthcare', label: 'Healthcare', description: 'Medical, biotech, pharma', icon: Heart },
  { value: 'financial', label: 'Financial Services', description: 'Banking, insurance, fintech', icon: TrendingUp },
  { value: 'manufacturing', label: 'Manufacturing', description: 'Physical products, hardware', icon: Cog },
  { value: 'other', label: 'Other', description: 'Non-profit, education, government', icon: MoreHorizontal },
]

interface Step4FirstSpaceProps {
  submitting: boolean
  onSubmit: (data: OnboardingStep4Data) => void
  onBack: () => void
}

export function Step4FirstSpace({ submitting, onSubmit, onBack }: Step4FirstSpaceProps) {
  const [companyType, setCompanyType] = useState<CompanyType>('saas')

  const handleSubmit = () => {
    if (submitting) return
    onSubmit({ companyType })
  }

  return (
    <Card className="border-border/50">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Building2 className="h-6 w-6 text-primary" />
        </div>
        <CardTitle className="text-2xl">About your company</CardTitle>
        <CardDescription className="text-base">
          Tell us what kind of company you run so Loopbrain can personalize your experience.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5 pt-4">
        {/* Company type */}
        <div className="space-y-2">
          <Label>What kind of company are you?</Label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {COMPANY_TYPES.map(ct => {
              const Icon = ct.icon
              return (
                <button
                  key={ct.value}
                  type="button"
                  onClick={() => setCompanyType(ct.value)}
                  className={cn(
                    'flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-colors',
                    companyType === ct.value
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/40'
                  )}
                >
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium leading-tight">{ct.label}</span>
                  <span className="text-xs text-muted-foreground leading-tight">{ct.description}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <Button variant="ghost" onClick={onBack} disabled={submitting}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div className="flex-1" />
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
