"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Check, Loader2, X } from "lucide-react"

export interface ExecutionPlanStep {
  id: string
  toolName: string
  label: string
  status: 'pending' | 'executing' | 'success' | 'error'
  children?: Array<{
    id: string
    label: string
    status: 'pending' | 'executing' | 'success' | 'error'
  }>
}

export interface ExecutionPlanViewProps {
  plan: {
    title: string
    description?: string
    steps: ExecutionPlanStep[]
  }
  onConfirm: () => void
  onModify?: () => void
  isExecuting: boolean
}

function StatusIcon({ status }: { status: ExecutionPlanStep['status'] }) {
  switch (status) {
    case 'pending':
      return (
        <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/40" />
      )
    case 'executing':
      return (
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
      )
    case 'success':
      return (
        <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
      )
    case 'error':
      return (
        <X className="h-4 w-4 text-red-500 dark:text-red-400" />
      )
  }
}

function StepItem({ 
  label, 
  status, 
  isChild = false 
}: { 
  label: string
  status: ExecutionPlanStep['status']
  isChild?: boolean
}) {
  return (
    <div className="flex items-start gap-2.5">
      {/* Tree line prefix for child items */}
      {isChild && (
        <span className="text-[11px] text-muted-foreground flex-shrink-0 mt-0.5">
          ├──
        </span>
      )}
      
      {/* Status icon */}
      <div className="flex-shrink-0 mt-0.5">
        <StatusIcon status={status} />
      </div>

      {/* Label */}
      <span
        className={cn(
          "text-[11px] leading-relaxed transition-colors",
          status === 'pending' && "text-muted-foreground",
          status === 'executing' && "text-foreground font-medium",
          status === 'success' && "text-foreground",
          status === 'error' && "text-red-600 dark:text-red-400"
        )}
      >
        {label}
      </span>
    </div>
  )
}

export function ExecutionPlanView({
  plan,
  onConfirm,
  onModify,
  isExecuting,
}: ExecutionPlanViewProps) {
  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-medium mb-1">
          Execution Plan
        </p>
        <p className="text-xs font-semibold text-foreground">
          {plan.title}
        </p>
        {plan.description && (
          <p className="text-[11px] text-muted-foreground mt-1">
            {plan.description}
          </p>
        )}
      </div>

      {/* Steps */}
      <div className="px-4 py-3 space-y-2">
        {plan.steps.map((step) => (
          <div key={step.id} className="space-y-1.5">
            {/* Parent step */}
            <StepItem
              label={step.label}
              status={step.status}
              isChild={false}
            />

            {/* Child steps with indentation */}
            {step.children && step.children.length > 0 && (
              <div className="ml-3 space-y-1.5 border-l border-border/50 pl-2">
                {step.children.map((child) => (
                  <StepItem
                    key={child.id}
                    label={child.label}
                    status={child.status}
                    isChild={true}
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="px-4 py-2.5 border-t border-border flex items-center gap-2">
        {onModify && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onModify}
            disabled={isExecuting}
            className="text-xs text-muted-foreground hover:bg-muted"
          >
            Modify
          </Button>
        )}
        <Button
          size="sm"
          onClick={onConfirm}
          disabled={isExecuting}
          className={cn(
            "text-xs font-medium",
            "bg-green-600 text-white hover:bg-green-700",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          {isExecuting ? (
            <>
              <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
              Executing...
            </>
          ) : (
            "Approve & Execute"
          )}
        </Button>
      </div>
    </div>
  )
}
