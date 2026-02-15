'use client'

import { useState, useEffect } from 'react'
import { AlertOctagon, ChevronDown, ChevronUp } from 'lucide-react'

interface Conflict {
  goalId: string
  goalTitle: string
  reason: string
  severity: 'low' | 'medium' | 'high'
}

interface Props {
  goalId: string
  /** Pre-loaded conflicts from conflictsWith relation */
  knownConflicts?: Array<{ id: string; title: string }>
}

const SEVERITY_CONFIG: Record<string, { className: string; dotColor: string }> = {
  high: { className: 'border-red-500/30', dotColor: 'bg-red-500' },
  medium: { className: 'border-orange-500/30', dotColor: 'bg-orange-500' },
  low: { className: 'border-amber-500/30', dotColor: 'bg-amber-500' },
}

export function ConflictIndicator({ goalId, knownConflicts }: Props) {
  const [conflicts, setConflicts] = useState<Conflict[]>([])
  const [expanded, setExpanded] = useState(false)
  const [loaded, setLoaded] = useState(false)

  // If we have known conflicts from the database, show them as basic entries
  const hasKnownConflicts = knownConflicts && knownConflicts.length > 0

  useEffect(() => {
    // Only auto-detect conflicts if we don't have pre-loaded ones
    if (!hasKnownConflicts && !loaded) {
      detectConflicts()
    }
  }, [goalId, hasKnownConflicts, loaded])

  const detectConflicts = async () => {
    try {
      const response = await fetch(`/api/goals/${goalId}/context`)
      if (response.ok) {
        const data = await response.json()
        if (data.conflicts) {
          setConflicts(data.conflicts)
        }
      }
    } catch {
      // Silently fail - conflict detection is non-critical
    } finally {
      setLoaded(true)
    }
  }

  const allConflicts: Conflict[] = [
    ...(hasKnownConflicts
      ? knownConflicts.map(c => ({
          goalId: c.id,
          goalTitle: c.title,
          reason: 'Recorded conflict',
          severity: 'medium' as const,
        }))
      : []),
    ...conflicts,
  ]

  if (allConflicts.length === 0) return null

  return (
    <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-4">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full"
      >
        <div className="flex items-center gap-2">
          <AlertOctagon className="w-4 h-4 text-red-400" />
          <span className="text-sm font-medium text-red-400">
            {allConflicts.length} Potential Conflict{allConflicts.length !== 1 ? 's' : ''}
          </span>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-red-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-red-400" />
        )}
      </button>

      {expanded && (
        <div className="mt-3 space-y-2">
          {allConflicts.map((conflict, idx) => {
            const config = SEVERITY_CONFIG[conflict.severity] ?? SEVERITY_CONFIG.medium
            return (
              <div
                key={`${conflict.goalId}-${idx}`}
                className={`flex items-start gap-3 p-3 rounded border ${config.className} bg-background/50`}
              >
                <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${config.dotColor}`} />
                <div>
                  <div className="text-sm font-medium text-foreground">
                    {conflict.goalTitle}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {conflict.reason}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
