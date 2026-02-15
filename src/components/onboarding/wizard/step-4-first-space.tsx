'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Rocket,
  ArrowLeft,
  ArrowRight,
  Loader2,
  Globe,
  Lock,
  Code2,
  Megaphone,
  Settings2,
  FileText,
  LayoutGrid,
} from 'lucide-react'
import type { OnboardingStep4Data } from '@/lib/validations/onboarding'
import { cn } from '@/lib/utils'

type Visibility = 'PUBLIC' | 'PRIVATE'
type Template = 'blank' | 'engineering' | 'marketing' | 'operations' | 'hr'

interface TemplateOption {
  value: Template
  label: string
  description: string
  icon: React.ElementType
}

const TEMPLATES: TemplateOption[] = [
  { value: 'blank', label: 'Blank', description: 'Start from scratch', icon: LayoutGrid },
  { value: 'engineering', label: 'Engineering', description: 'Sprints, bugs, roadmap', icon: Code2 },
  { value: 'marketing', label: 'Marketing', description: 'Campaigns, content', icon: Megaphone },
  { value: 'operations', label: 'Operations', description: 'Processes, SOPs', icon: Settings2 },
  { value: 'hr', label: 'HR', description: 'People, policies', icon: FileText },
]

interface Step4FirstSpaceProps {
  submitting: boolean
  onSubmit: (data: OnboardingStep4Data) => void
  onBack: () => void
}

export function Step4FirstSpace({ submitting, onSubmit, onBack }: Step4FirstSpaceProps) {
  const [spaceName, setSpaceName] = useState('')
  const [visibility, setVisibility] = useState<Visibility>('PUBLIC')
  const [template, setTemplate] = useState<Template>('blank')

  const canSubmit = spaceName.trim().length >= 2

  const handleSubmit = () => {
    if (!canSubmit || submitting) return
    onSubmit({
      spaceName: spaceName.trim(),
      visibility,
      template,
    })
  }

  return (
    <Card className="border-border/50">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Rocket className="h-6 w-6 text-primary" />
        </div>
        <CardTitle className="text-2xl">Create your first space</CardTitle>
        <CardDescription className="text-base">
          Spaces organize projects, tasks, and documents.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5 pt-4">
        {/* Space name */}
        <div className="space-y-1.5">
          <Label htmlFor="spaceName">Space name</Label>
          <Input
            id="spaceName"
            placeholder="e.g. Product Launch, Q1 Planning..."
            value={spaceName}
            onChange={e => setSpaceName(e.target.value)}
            autoFocus
          />
        </div>

        {/* Visibility */}
        <div className="space-y-2">
          <Label>Visibility</Label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setVisibility('PUBLIC')}
              className={cn(
                'flex items-center gap-2 rounded-lg border p-3 text-left transition-colors',
                visibility === 'PUBLIC'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/40'
              )}
            >
              <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-sm font-medium">Public</p>
                <p className="text-xs text-muted-foreground">All workspace members</p>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setVisibility('PRIVATE')}
              className={cn(
                'flex items-center gap-2 rounded-lg border p-3 text-left transition-colors',
                visibility === 'PRIVATE'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/40'
              )}
            >
              <Lock className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-sm font-medium">Private</p>
                <p className="text-xs text-muted-foreground">Invite only</p>
              </div>
            </button>
          </div>
        </div>

        {/* Template */}
        <div className="space-y-2">
          <Label>Template</Label>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {TEMPLATES.map(t => {
              const Icon = t.icon
              return (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setTemplate(t.value)}
                  className={cn(
                    'flex flex-col items-center gap-1 rounded-lg border p-3 text-center transition-colors',
                    template === t.value
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/40'
                  )}
                >
                  <Icon className="h-5 w-5 text-muted-foreground" />
                  <span className="text-xs font-medium">{t.label}</span>
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
          <Button onClick={handleSubmit} disabled={!canSubmit || submitting}>
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                Create space
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
