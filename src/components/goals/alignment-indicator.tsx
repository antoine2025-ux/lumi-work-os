'use client'

import { GitBranch, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react'

interface Props {
  alignmentScore: number
  parentTitle?: string | null
  compact?: boolean
}

function getAlignmentConfig(score: number) {
  if (score >= 80) {
    return {
      label: 'Strong Alignment',
      icon: CheckCircle,
      barColor: 'bg-green-500',
      textColor: 'text-green-400',
      bgColor: 'bg-green-500/10',
    }
  }
  if (score >= 50) {
    return {
      label: 'Moderate Alignment',
      icon: TrendingUp,
      barColor: 'bg-amber-500',
      textColor: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
    }
  }
  return {
    label: 'Weak Alignment',
    icon: AlertTriangle,
    barColor: 'bg-red-500',
    textColor: 'text-red-400',
    bgColor: 'bg-red-500/10',
  }
}

export function AlignmentIndicator({ alignmentScore, parentTitle, compact = false }: Props) {
  if (alignmentScore === 0 && !parentTitle) return null

  const config = getAlignmentConfig(alignmentScore)
  const Icon = config.icon

  if (compact) {
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${config.bgColor} ${config.textColor}`}
        title={`Alignment: ${Math.round(alignmentScore)}% with parent goal`}
      >
        <GitBranch className="w-3 h-3" />
        {Math.round(alignmentScore)}%
      </span>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          <GitBranch className="w-4 h-4 text-muted-foreground" />
          <span className="text-muted-foreground">Parent Alignment</span>
          {parentTitle && (
            <span className="text-xs text-muted-foreground/70">({parentTitle})</span>
          )}
        </div>
        <div className={`flex items-center gap-1 text-sm font-medium ${config.textColor}`}>
          <Icon className="w-3.5 h-3.5" />
          {Math.round(alignmentScore)}%
        </div>
      </div>
      <div className="w-full bg-muted/30 rounded-full h-2">
        <div
          className={`${config.barColor} h-2 rounded-full transition-all`}
          style={{ width: `${alignmentScore}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground">{config.label}</p>
    </div>
  )
}
