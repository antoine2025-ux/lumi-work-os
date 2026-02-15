'use client'

import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

const STEP_LABELS = ['Workspace', 'Invite', 'Org', 'Space', 'Ready']

interface ProgressStepperProps {
  currentStep: number
  totalSteps: number
  /** When true, Step 3 (Org) is shown as skipped/dimmed. */
  skipStep3?: boolean
}

export function ProgressStepper({ currentStep, totalSteps, skipStep3 }: ProgressStepperProps) {
  return (
    <nav aria-label="Onboarding progress" className="w-full">
      <ol className="flex items-center justify-between gap-2">
        {Array.from({ length: totalSteps }, (_, i) => {
          const stepNum = i + 1
          const isCompleted = stepNum < currentStep
          const isCurrent = stepNum === currentStep
          const isSkipped = stepNum === 3 && skipStep3

          return (
            <li key={stepNum} className="flex flex-1 items-center">
              {/* Step circle + label */}
              <div className="flex flex-col items-center gap-1.5 w-full">
                <div
                  className={cn(
                    'flex items-center justify-center w-9 h-9 rounded-full text-sm font-medium transition-colors border-2',
                    isCompleted && 'bg-primary border-primary text-primary-foreground',
                    isCurrent && 'border-primary text-primary bg-primary/10',
                    !isCompleted && !isCurrent && 'border-muted-foreground/30 text-muted-foreground/50',
                    isSkipped && !isCompleted && 'border-dashed opacity-40'
                  )}
                >
                  {isCompleted ? <Check className="w-4 h-4" /> : stepNum}
                </div>
                <span
                  className={cn(
                    'text-xs font-medium transition-colors',
                    isCurrent && 'text-foreground',
                    isCompleted && 'text-muted-foreground',
                    !isCompleted && !isCurrent && 'text-muted-foreground/50',
                    isSkipped && 'line-through opacity-40'
                  )}
                >
                  {STEP_LABELS[i]}
                </span>
              </div>

              {/* Connector line between steps */}
              {stepNum < totalSteps && (
                <div
                  className={cn(
                    'h-px flex-1 mx-1 mt-[-1.25rem]',
                    stepNum < currentStep ? 'bg-primary' : 'bg-muted-foreground/20'
                  )}
                />
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
