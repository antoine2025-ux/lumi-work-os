'use client'

import { useEffect, useState } from 'react'
import { Lightbulb, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface SuggestedPoint {
  content: string
  source: 'GOAL' | 'REVIEW' | 'ACTION_ITEM'
  sourceId: string
}

interface AutoSuggestPointsProps {
  employeeId: string
  managerId: string
  seriesId?: string
  existingContents: string[]
  onAdd: (content: string, source: string, sourceId: string) => void
}

const sourceLabels: Record<string, string> = {
  GOAL: 'Goal',
  REVIEW: 'Review',
  ACTION_ITEM: 'Follow-up',
}

const sourceColors: Record<string, string> = {
  GOAL: 'text-blue-600 border-blue-200 bg-blue-50',
  REVIEW: 'text-purple-600 border-purple-200 bg-purple-50',
  ACTION_ITEM: 'text-amber-600 border-amber-200 bg-amber-50',
}

export function AutoSuggestPoints({
  employeeId,
  managerId,
  seriesId,
  existingContents,
  onAdd,
}: AutoSuggestPointsProps) {
  const [suggestions, setSuggestions] = useState<SuggestedPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    async function fetchSuggestions() {
      try {
        const params = new URLSearchParams({
          employeeId,
          managerId,
          ...(seriesId && { seriesId }),
        })
        const res = await fetch(`/api/one-on-ones/suggestions?${params}`)
        if (res.ok) {
          const data = await res.json()
          setSuggestions(data)
        }
      } catch {
        // Suggestions are best-effort; fail silently
      } finally {
        setLoading(false)
      }
    }

    fetchSuggestions()
  }, [employeeId, managerId, seriesId])

  // Filter out already-added suggestions
  const filteredSuggestions = suggestions.filter(
    (s) =>
      !addedIds.has(s.sourceId) &&
      !existingContents.some((c) => c.includes(s.content))
  )

  if (loading || filteredSuggestions.length === 0) return null

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
        <h4 className="text-xs font-medium text-muted-foreground">
          Suggested Topics
        </h4>
      </div>

      <div className="space-y-1">
        {filteredSuggestions.map((suggestion) => (
          <div
            key={suggestion.sourceId}
            className="flex items-center gap-2 p-2 rounded-md bg-muted/30 border border-border/50"
          >
            <div className="flex-1 min-w-0">
              <p className="text-xs">{suggestion.content}</p>
              <Badge
                variant="outline"
                className={cn(
                  'text-[10px] mt-0.5',
                  sourceColors[suggestion.source]
                )}
              >
                {sourceLabels[suggestion.source]}
              </Badge>
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-2 text-xs"
              onClick={() => {
                onAdd(suggestion.content, suggestion.source, suggestion.sourceId)
                setAddedIds((prev) => new Set(prev).add(suggestion.sourceId))
              }}
            >
              <Plus className="h-3 w-3 mr-0.5" />
              Add
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}
