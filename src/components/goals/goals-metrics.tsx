'use client'

import { TrendingUp, Target, CheckCircle2, AlertTriangle } from 'lucide-react'

interface Metrics {
  total: number
  byStatus: Record<string, number>
  byLevel: Record<string, number>
  averageProgress: number
  onTrack: number
  atRisk: number
  completed: number
}

interface Props {
  metrics: Metrics
}

export function GoalsMetrics({ metrics }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="bg-card rounded-lg border border-border p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Total Goals</p>
            <p className="text-2xl font-semibold text-foreground">{metrics.total}</p>
          </div>
          <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
            <Target className="w-5 h-5 text-blue-500" />
          </div>
        </div>
      </div>

      <div className="bg-card rounded-lg border border-border p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Average Progress</p>
            <p className="text-2xl font-semibold text-foreground">
              {Math.round(metrics.averageProgress)}%
            </p>
          </div>
          <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-green-500" />
          </div>
        </div>
      </div>

      <div className="bg-card rounded-lg border border-border p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">On Track</p>
            <p className="text-2xl font-semibold text-green-500">{metrics.onTrack}</p>
          </div>
          <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
          </div>
        </div>
      </div>

      <div className="bg-card rounded-lg border border-border p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">At Risk</p>
            <p className="text-2xl font-semibold text-orange-500">{metrics.atRisk}</p>
          </div>
          <div className="w-10 h-10 bg-orange-500/10 rounded-lg flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
          </div>
        </div>
      </div>
    </div>
  )
}
