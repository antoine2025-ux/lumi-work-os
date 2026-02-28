"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import ReactMarkdown from "react-markdown"
import {
  Building2,
  Users,
  Folder,
  Shield,
  Rocket,
  ChevronDown,
  ChevronUp,
  Check,
  ExternalLink,
  Loader2,
  Sparkles,
  X,
} from "lucide-react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import type {
  OnboardingBriefing as OnboardingBriefingType,
  OnboardingBriefingSectionIcon,
} from "@/lib/loopbrain/scenarios/onboarding-briefing"

// =============================================================================
// Types
// =============================================================================

interface OnboardingBriefingProps {
  briefing?: OnboardingBriefingType
  isLoading?: boolean
  onDismiss?: () => void
  /** Storage key prefix for persisting checked actions (defaults to 'ob_actions') */
  storagePrefix?: string
  className?: string
}

// =============================================================================
// Icon map
// =============================================================================

const SECTION_ICONS: Record<OnboardingBriefingSectionIcon, React.ComponentType<{ className?: string }>> = {
  building: Building2,
  users: Users,
  folder: Folder,
  shield: Shield,
  rocket: Rocket,
}

const PRIORITY_LABELS: Record<"high" | "medium" | "low", { label: string; variant: "destructive" | "default" | "secondary" }> = {
  high: { label: "High priority", variant: "destructive" },
  medium: { label: "Medium priority", variant: "default" },
  low: { label: "Low priority", variant: "secondary" },
}

// =============================================================================
// Main component
// =============================================================================

export function OnboardingBriefing({
  briefing,
  isLoading = false,
  onDismiss,
  storagePrefix = "ob_actions",
  className,
}: OnboardingBriefingProps) {
  const [openSections, setOpenSections] = useState<Set<number>>(new Set([0, 1]))
  const [checkedActions, setCheckedActions] = useState<Set<string>>(new Set())

  // Persist checked actions to localStorage
  useEffect(() => {
    if (!briefing) return
    const key = `${storagePrefix}_checked`
    const stored = localStorage.getItem(key)
    if (stored) {
      try {
        setCheckedActions(new Set(JSON.parse(stored) as string[]))
      } catch {
        // ignore parse errors
      }
    }
  }, [briefing, storagePrefix])

  const toggleAction = useCallback(
    (label: string) => {
      setCheckedActions((prev) => {
        const next = new Set(prev)
        if (next.has(label)) {
          next.delete(label)
        } else {
          next.add(label)
        }
        const key = `${storagePrefix}_checked`
        localStorage.setItem(key, JSON.stringify([...next]))
        return next
      })
    },
    [storagePrefix]
  )

  const toggleSection = useCallback((index: number) => {
    setOpenSections((prev) => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }, [])

  // ── Loading state ────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <Card className={cn("border-primary/20", className)}>
        <CardContent className="flex flex-col items-center justify-center gap-3 py-10 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
          <p className="text-sm font-medium">Preparing your briefing…</p>
          <p className="text-xs text-muted-foreground">
            Loopbrain is analysing your workspace — this takes about 10 seconds.
          </p>
        </CardContent>
      </Card>
    )
  }

  if (!briefing) return null

  const completedCount = checkedActions.size
  const totalActions = briefing.suggestedFirstActions.length

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {/* Header */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-background">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h2 className="text-base font-semibold leading-snug">{briefing.greeting}</h2>
                <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                  {briefing.roleSummary}
                </p>
              </div>
            </div>
            {onDismiss && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
                onClick={onDismiss}
                aria-label="Dismiss briefing"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Sections */}
      <div className="flex flex-col gap-2">
        {briefing.sections.map((section, index) => {
          const Icon = SECTION_ICONS[section.icon] ?? Rocket
          const isOpen = openSections.has(index)
          return (
            <Card
              key={section.title}
              className="overflow-hidden border-border/60"
            >
              <button
                type="button"
                className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/40 transition-colors"
                onClick={() => toggleSection(index)}
                aria-expanded={isOpen}
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted">
                  <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <span className="flex-1 text-sm font-medium">{section.title}</span>
                {isOpen ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
              {isOpen && (
                <CardContent className="border-t border-border/40 pt-3 pb-4 px-4">
                  <div className="prose prose-sm max-w-none text-muted-foreground dark:prose-invert
                    prose-p:leading-relaxed prose-li:leading-relaxed
                    prose-headings:text-foreground prose-strong:text-foreground">
                    <ReactMarkdown>{section.content}</ReactMarkdown>
                  </div>
                </CardContent>
              )}
            </Card>
          )
        })}
      </div>

      {/* First Actions */}
      {briefing.suggestedFirstActions.length > 0 && (
        <Card className="border-border/60">
          <CardHeader className="pb-2 pt-4 px-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Your first actions</h3>
              {completedCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  <Check className="mr-1 h-3 w-3" />
                  {completedCount} / {totalActions} done
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-0 pb-4 px-4">
            <ul className="flex flex-col gap-3">
              {briefing.suggestedFirstActions.map((action) => {
                const isChecked = checkedActions.has(action.label)
                const { label: priorityLabel, variant: priorityVariant } =
                  PRIORITY_LABELS[action.priority]
                return (
                  <li
                    key={action.label}
                    className={cn(
                      "flex items-start gap-3 rounded-md border border-border/40 p-3 transition-colors",
                      isChecked && "opacity-60 bg-muted/30"
                    )}
                  >
                    <Checkbox
                      id={`action-${action.label}`}
                      checked={isChecked}
                      onCheckedChange={() => toggleAction(action.label)}
                      className="mt-0.5 shrink-0"
                      aria-label={`Mark "${action.label}" as done`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <label
                          htmlFor={`action-${action.label}`}
                          className={cn(
                            "text-sm font-medium cursor-pointer",
                            isChecked && "line-through text-muted-foreground"
                          )}
                        >
                          {action.label}
                        </label>
                        <Badge variant={priorityVariant} className="text-xs py-0">
                          {priorityLabel}
                        </Badge>
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {action.description}
                      </p>
                    </div>
                    <Link
                      href={action.url}
                      className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={`Open ${action.label}`}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                  </li>
                )
              })}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
