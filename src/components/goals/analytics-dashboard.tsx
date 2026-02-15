'use client'

import { useState, useEffect } from 'react'
import {
  BarChart3, TrendingUp, TrendingDown, AlertTriangle,
  Clock, Activity, Target, Loader2,
} from 'lucide-react'

interface Analytics {
  progressVelocity: number
  projectedCompletion: string | null
  riskScore: number
  updateFrequency: number
  stakeholderEngagement: number
  teamProductivity: number | null
  projectAlignment: number | null
  calculatedAt: string
}

interface Props {
  goalId: string
}

export function AnalyticsDashboard({ goalId }: Props) {
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAnalytics()
  }, [goalId])

  const loadAnalytics = async () => {
    try {
      const response = await fetch(`/api/goals/${goalId}/analytics`)
      if (response.ok) {
        const data = await response.json()
        setAnalytics(data)
      }
    } catch {
      console.error('Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Loading analytics...</span>
        </div>
      </div>
    )
  }

  if (!analytics) return null

  const riskColor = analytics.riskScore > 70 ? 'text-red-400' :
    analytics.riskScore > 40 ? 'text-orange-400' :
    analytics.riskScore > 20 ? 'text-amber-400' : 'text-green-400'

  const riskBg = analytics.riskScore > 70 ? 'bg-red-500' :
    analytics.riskScore > 40 ? 'bg-orange-500' :
    analytics.riskScore > 20 ? 'bg-amber-500' : 'bg-green-500'

  const velocityTrend = analytics.progressVelocity > 3 ? 'positive' :
    analytics.progressVelocity > 0 ? 'neutral' : 'negative'

  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg flex items-center gap-2 text-foreground">
            <BarChart3 className="w-5 h-5" />
            Goal Analytics
          </h3>
          {analytics.calculatedAt && (
            <span className="text-xs text-muted-foreground">
              Updated {new Date(analytics.calculatedAt).toLocaleString()}
            </span>
          )}
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Risk Score */}
          <div className="bg-muted/30 rounded-lg p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <AlertTriangle className="w-4 h-4" />
              Risk Score
            </div>
            <div className={`text-2xl font-bold ${riskColor}`}>
              {Math.round(analytics.riskScore)}%
            </div>
            <div className="w-full bg-muted/50 rounded-full h-1.5 mt-2">
              <div
                className={`${riskBg} h-1.5 rounded-full transition-all`}
                style={{ width: `${analytics.riskScore}%` }}
              />
            </div>
          </div>

          {/* Velocity */}
          <div className="bg-muted/30 rounded-lg p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              {velocityTrend === 'positive' ? (
                <TrendingUp className="w-4 h-4 text-green-400" />
              ) : velocityTrend === 'negative' ? (
                <TrendingDown className="w-4 h-4 text-red-400" />
              ) : (
                <TrendingUp className="w-4 h-4" />
              )}
              Velocity
            </div>
            <div className="text-2xl font-bold text-foreground">
              {analytics.progressVelocity > 0 ? '+' : ''}{analytics.progressVelocity.toFixed(1)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">pts/week</div>
          </div>

          {/* Update Frequency */}
          <div className="bg-muted/30 rounded-lg p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <Activity className="w-4 h-4" />
              Activity
            </div>
            <div className="text-2xl font-bold text-foreground">
              {analytics.updateFrequency.toFixed(1)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">updates/week</div>
          </div>

          {/* Projected Completion */}
          <div className="bg-muted/30 rounded-lg p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <Clock className="w-4 h-4" />
              Projected
            </div>
            <div className="text-lg font-bold text-foreground">
              {analytics.projectedCompletion
                ? new Date(analytics.projectedCompletion).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })
                : 'N/A'}
            </div>
            <div className="text-xs text-muted-foreground mt-1">completion</div>
          </div>
        </div>

        {/* Additional Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Stakeholder Engagement */}
          <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
            <span className="text-sm text-muted-foreground">Stakeholder Engagement</span>
            <span className="text-sm font-medium text-foreground">
              {Math.round(analytics.stakeholderEngagement)}%
            </span>
          </div>

          {/* Team Productivity */}
          {analytics.teamProductivity !== null && (
            <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
              <span className="text-sm text-muted-foreground">Team Productivity</span>
              <span className="text-sm font-medium text-foreground">
                {Math.round(analytics.teamProductivity)}%
              </span>
            </div>
          )}

          {/* Project Alignment */}
          {analytics.projectAlignment !== null && (
            <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
              <div className="flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Project Alignment</span>
              </div>
              <span className="text-sm font-medium text-foreground">
                {Math.round(analytics.projectAlignment)}%
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
