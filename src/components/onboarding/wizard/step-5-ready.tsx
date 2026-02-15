'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  CheckCircle2,
  ArrowRight,
  Loader2,
  Users,
  Building2,
  Rocket,
  Target,
} from 'lucide-react'
import Link from 'next/link'

interface OnboardingSummary {
  workspaceName: string
  inviteCount: number
  departmentCount: number
  teamCount: number
  spaceName: string | null
}

interface Step5ReadyProps {
  summary: OnboardingSummary
  submitting: boolean
  onComplete: () => void
}

export function Step5Ready({ summary, submitting, onComplete }: Step5ReadyProps) {
  const items: Array<{ label: string; value: string; icon: React.ElementType }> = []

  if (summary.workspaceName) {
    items.push({ label: 'Workspace', value: summary.workspaceName, icon: Building2 })
  }
  if (summary.inviteCount > 0) {
    items.push({
      label: 'Invites sent',
      value: `${summary.inviteCount} teammate${summary.inviteCount === 1 ? '' : 's'}`,
      icon: Users,
    })
  }
  if (summary.departmentCount > 0) {
    items.push({
      label: 'Departments',
      value: `${summary.departmentCount} created`,
      icon: Building2,
    })
  }
  if (summary.teamCount > 0) {
    items.push({
      label: 'Teams',
      value: `${summary.teamCount} created`,
      icon: Users,
    })
  }
  if (summary.spaceName) {
    items.push({ label: 'First space', value: summary.spaceName, icon: Rocket })
  }

  return (
    <Card className="border-border/50">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
          <CheckCircle2 className="h-6 w-6 text-green-500" />
        </div>
        <CardTitle className="text-2xl">You&apos;re all set!</CardTitle>
        <CardDescription className="text-base">
          Your workspace is ready. Here&apos;s what we set up.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6 pt-4">
        {/* Summary list */}
        {items.length > 0 && (
          <div className="space-y-2">
            {items.map((item, i) => {
              const Icon = item.icon
              return (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-lg border border-border/50 bg-muted/30 px-4 py-3"
                >
                  <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm text-muted-foreground">{item.label}</span>
                  <span className="ml-auto text-sm font-medium">{item.value}</span>
                </div>
              )
            })}
          </div>
        )}

        {/* Quick links */}
        <div className="grid grid-cols-3 gap-2">
          <QuickLink href="/spaces" icon={Rocket} label="Go to your space" />
          <QuickLink href="/org" icon={Users} label="Invite more people" />
          <QuickLink href="/goals" icon={Target} label="Set up goals" />
        </div>

        {/* Complete button */}
        <Button
          className="w-full"
          size="lg"
          disabled={submitting}
          onClick={onComplete}
        >
          {submitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Finishing up...
            </>
          ) : (
            <>
              Get started
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}

function QuickLink({
  href,
  icon: Icon,
  label,
}: {
  href: string
  icon: React.ElementType
  label: string
}) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-1.5 rounded-lg border border-border/50 p-3 text-center transition-colors hover:bg-muted/50"
    >
      <Icon className="h-4 w-4 text-muted-foreground" />
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
    </Link>
  )
}
