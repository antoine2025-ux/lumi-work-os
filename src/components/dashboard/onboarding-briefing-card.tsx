"use client"

import { useState, useEffect, useCallback } from "react"
import { BookOpen, X, ChevronRight } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { OnboardingBriefing } from "@/components/loopbrain/OnboardingBriefing"
import type { OnboardingBriefing as OnboardingBriefingType } from "@/lib/loopbrain/scenarios/onboarding-briefing"
import { cn } from "@/lib/utils"

// =============================================================================
// Types
// =============================================================================

interface OnboardingInsight {
  id: string
  createdAt: string
  metadata: {
    userId?: string
    briefing?: OnboardingBriefingType
  }
}

interface OnboardingBriefingCardProps {
  userId: string
  className?: string
}

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000

// =============================================================================
// Component
// =============================================================================

export function OnboardingBriefingCard({
  userId,
  className,
}: OnboardingBriefingCardProps) {
  const [insight, setInsight] = useState<OnboardingInsight | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function fetchBriefingInsight() {
      try {
        const res = await fetch(
          "/api/loopbrain/insights?category=ONBOARDING&status=ACTIVE&limit=1",
          { cache: "no-store" }
        )
        if (!res.ok || cancelled) return
        const data = (await res.json()) as { insights?: OnboardingInsight[] }
        const items = data.insights ?? []
        if (items.length === 0) return

        const item = items[0]
        // Only show if the insight belongs to this user and is within 30 days
        const createdAt = new Date(item.createdAt).getTime()
        const isRecent = Date.now() - createdAt < THIRTY_DAYS_MS
        const belongsToUser = item.metadata?.userId === userId

        if (isRecent && belongsToUser && item.metadata?.briefing) {
          setInsight(item)
        }
      } catch {
        // Non-fatal: card simply won't appear
      }
    }

    void fetchBriefingInsight()
    return () => {
      cancelled = true
    }
  }, [userId])

  const handleDismiss = useCallback(async () => {
    if (!insight) return
    setIsDismissed(true)
    setIsOpen(false)
    try {
      await fetch("/api/loopbrain/insights/dismiss", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ insightIds: [insight.id] }),
      })
    } catch {
      // Non-fatal
    }
  }, [insight])

  if (!insight || isDismissed) return null

  const briefing = insight.metadata.briefing!

  return (
    <>
      <Card
        className={cn(
          "border-primary/30 bg-gradient-to-br from-primary/5 via-background to-background cursor-pointer hover:border-primary/50 transition-colors",
          className
        )}
        onClick={() => setIsOpen(true)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") setIsOpen(true)
        }}
        aria-label="View your onboarding briefing"
      >
        <CardContent className="flex items-center gap-4 px-5 py-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15">
            <BookOpen className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">Your Briefing is Ready</p>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {briefing.greeting}
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-xs text-primary font-medium">View briefing</span>
            <ChevronRight className="h-3.5 w-3.5 text-primary" />
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation()
              void handleDismiss()
            }}
            aria-label="Dismiss briefing"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </CardContent>
      </Card>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="sr-only">Onboarding Briefing</DialogTitle>
          </DialogHeader>
          <OnboardingBriefing
            briefing={briefing}
            onDismiss={handleDismiss}
            storagePrefix={`ob_${userId}`}
          />
        </DialogContent>
      </Dialog>
    </>
  )
}
