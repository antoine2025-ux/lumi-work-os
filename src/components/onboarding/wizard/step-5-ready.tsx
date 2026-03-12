'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle2, ArrowRight, Loader2, Building2, Users } from 'lucide-react'
import Link from 'next/link'

interface OnboardingSummary {
  workspaceName: string
}

interface Step5ReadyProps {
  summary: OnboardingSummary
  submitting: boolean
  onComplete: () => void
}

export function Step5Ready({ summary, submitting, onComplete }: Step5ReadyProps) {
  return (
    <Card className="border-border/50">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
          <CheckCircle2 className="h-6 w-6 text-green-500" />
        </div>
        <CardTitle className="text-2xl">You&apos;re all set!</CardTitle>
        <CardDescription className="text-base">
          Your workspace is ready. Set up your organization structure to start inviting team members.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6 pt-4">
        {summary.workspaceName && (
          <div className="flex items-center gap-3 rounded-lg border border-border/50 bg-muted/30 px-4 py-3">
            <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-sm text-muted-foreground">Workspace</span>
            <span className="ml-auto text-sm font-medium">{summary.workspaceName}</span>
          </div>
        )}

        <div className="flex flex-col gap-3">
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
                Go to dashboard
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>

          <Button
            variant="outline"
            size="lg"
            className="w-full"
            asChild
          >
            <Link href="/org">
              <Users className="mr-2 h-4 w-4" />
              Set up organization
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
