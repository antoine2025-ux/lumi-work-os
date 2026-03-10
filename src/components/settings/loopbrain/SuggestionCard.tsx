"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Sparkles, X } from "lucide-react"
import type { PolicySuggestion } from "@/lib/loopbrain/policies/types"

interface SuggestionCardProps {
  suggestion: PolicySuggestion
  onApply: () => void
  onDismiss: () => void
}

export function SuggestionCard({ suggestion, onApply, onDismiss }: SuggestionCardProps) {
  const [isApplying, setIsApplying] = useState(false)

  const handleApply = () => {
    setIsApplying(true)
    try {
      onApply()
    } finally {
      setIsApplying(false)
    }
  }

  const severityColor = {
    low: "bg-blue-500/10 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300",
    medium: "bg-yellow-500/10 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-300",
    high: "bg-red-500/10 text-red-700 dark:bg-red-500/20 dark:text-red-300",
  }[suggestion.severity]

  return (
    <Card className="p-4 bg-purple-500/5 border-purple-500/20 dark:bg-purple-500/10 dark:border-purple-500/30">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Sparkles className="w-4 h-4 text-purple-500 shrink-0" />
          <h4 className="font-medium text-sm">{suggestion.title}</h4>
          <Badge variant="outline" className={severityColor}>
            {suggestion.severity}
          </Badge>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onDismiss()
          }}
          className="h-6 w-6 p-0 shrink-0"
        >
          <X className="w-3 h-3" />
        </Button>
      </div>

      {suggestion.currentText && (
        <div className="mb-2 text-xs">
          <span className="text-muted-foreground">Current:</span>
          <p className="mt-1 text-foreground/70 font-mono bg-background/50 p-2 rounded">
            {suggestion.currentText}
          </p>
        </div>
      )}

      <div className="mb-2 text-xs">
        <span className="text-muted-foreground">Issue:</span>
        <p className="mt-1 text-foreground/70">{suggestion.issue}</p>
      </div>

      <div className="mb-3 text-xs">
        <span className="text-muted-foreground">Suggested:</span>
        <p className="mt-1 text-foreground font-mono bg-background/50 p-2 rounded">
          {suggestion.suggestedFix}
        </p>
      </div>

      {suggestion.reasoning && (
        <p className="text-xs text-muted-foreground italic mb-3">
          {suggestion.reasoning}
        </p>
      )}

      <Button
        type="button"
        size="sm"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          handleApply()
        }}
        disabled={isApplying}
        className="w-full"
      >
        <Sparkles className="w-3 h-3 mr-1" />
        {isApplying ? "Applying..." : "Apply Suggestion"}
      </Button>
    </Card>
  )
}
