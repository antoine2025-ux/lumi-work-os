'use client'

import { useState, useEffect } from 'react'
import { Lightbulb, AlertTriangle, TrendingUp, Users, BarChart3, Check, X, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Recommendation {
  id: string
  type: string
  priority: string
  title: string
  description: string
  suggestedActions: Array<Record<string, unknown>>
  automatable: boolean
  confidence: number
  impact: number
  status: string
}

interface Props {
  goalId: string
}

const TYPE_ICONS: Record<string, typeof AlertTriangle> = {
  PROGRESS_AT_RISK: AlertTriangle,
  RESOURCE_REALLOCATION: BarChart3,
  TIMELINE_ADJUSTMENT: TrendingUp,
  STAKEHOLDER_ENGAGEMENT: Users,
  PROJECT_PRIORITIZATION: BarChart3,
}

const PRIORITY_COLORS: Record<string, string> = {
  URGENT: 'bg-red-500/10 text-red-400 border-red-500/20',
  HIGH: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  MEDIUM: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  LOW: 'bg-muted/50 text-muted-foreground border-border',
}

export function RecommendationsPanel({ goalId }: Props) {
  const router = useRouter()
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  useEffect(() => {
    loadRecommendations()
  }, [goalId])

  const loadRecommendations = async () => {
    try {
      const response = await fetch(`/api/goals/${goalId}/recommendations?status=PENDING`)
      if (response.ok) {
        const data = await response.json()
        setRecommendations(data)
      }
    } catch {
      console.error('Failed to load recommendations')
    } finally {
      setLoading(false)
    }
  }

  const handleAction = async (recId: string, status: 'ACKNOWLEDGED' | 'DISMISSED') => {
    setUpdatingId(recId)
    try {
      const response = await fetch(`/api/goals/${goalId}/recommendations?recId=${recId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (response.ok) {
        setRecommendations(prev => prev.filter(r => r.id !== recId))
        router.refresh()
      }
    } catch {
      console.error('Failed to update recommendation')
    } finally {
      setUpdatingId(null)
    }
  }

  if (loading) {
    return (
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Loading recommendations...</span>
        </div>
      </div>
    )
  }

  if (recommendations.length === 0) return null

  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <div className="space-y-4">
        <h3 className="font-semibold text-lg flex items-center gap-2 text-foreground">
          <Lightbulb className="w-5 h-5 text-amber-400" />
          AI Recommendations
          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
            {recommendations.length}
          </span>
        </h3>

        <div className="space-y-3">
          {recommendations.map((rec) => {
            const Icon = TYPE_ICONS[rec.type] ?? Lightbulb
            const priorityClass = PRIORITY_COLORS[rec.priority] ?? PRIORITY_COLORS.LOW

            return (
              <div key={rec.id} className="border border-border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <Icon className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
                    <div>
                      <h4 className="font-medium text-foreground">{rec.title}</h4>
                      <p className="text-sm text-muted-foreground mt-1">{rec.description}</p>
                    </div>
                  </div>
                  <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border shrink-0 ${priorityClass}`}>
                    {rec.priority}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>Confidence: {Math.round(rec.confidence * 100)}%</span>
                  <span>Impact: {Math.round(rec.impact * 100)}%</span>
                  {rec.automatable && (
                    <span className="text-primary">Automatable</span>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => handleAction(rec.id, 'ACKNOWLEDGED')}
                    disabled={updatingId === rec.id}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-primary/10 text-primary border border-primary/20 rounded-lg hover:bg-primary/20 transition-colors disabled:opacity-50"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Acknowledge
                  </button>
                  <button
                    onClick={() => handleAction(rec.id, 'DISMISSED')}
                    disabled={updatingId === rec.id}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-muted-foreground border border-border rounded-lg hover:bg-muted/50 transition-colors disabled:opacity-50"
                  >
                    <X className="w-3.5 h-3.5" />
                    Dismiss
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
