'use client'

import { useState } from 'react'
import { KeyResultUpdate } from './key-result-update'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface Props {
  goalId: string
  keyResult: {
    id: string
    title: string
    currentValue: number
    targetValue: number
    unit: string | null
    progress: number
    status: string
    updates?: Array<{
      id: string
      newValue: number
      note: string | null
      createdAt: string
      createdBy: {
        name: string | null
      }
    }>
  }
}

export function KeyResultCard({ goalId, keyResult }: Props) {
  const [showUpdateDialog, setShowUpdateDialog] = useState(false)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ON_TRACK':
        return 'bg-green-500/10 text-green-400'
      case 'AT_RISK':
        return 'bg-yellow-500/10 text-yellow-400'
      case 'OFF_TRACK':
        return 'bg-red-500/10 text-red-400'
      default:
        return 'bg-muted/50 text-muted-foreground'
    }
  }

  const getTrendIcon = () => {
    if (!keyResult.updates || keyResult.updates.length < 2) return <Minus className="w-4 h-4 text-muted-foreground" />
    
    const latest = keyResult.updates[0].newValue
    const previous = keyResult.updates[1].newValue
    
    if (latest > previous) return <TrendingUp className="w-4 h-4 text-green-400" />
    if (latest < previous) return <TrendingDown className="w-4 h-4 text-red-400" />
    return <Minus className="w-4 h-4 text-muted-foreground" />
  }

  return (
    <>
      <div
        className="border-l-4 border-primary pl-4 py-3 hover:bg-muted/20 cursor-pointer transition-colors rounded-r"
        onClick={() => setShowUpdateDialog(true)}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm text-foreground">{keyResult.title}</span>
              <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${getStatusColor(keyResult.status)}`}>
                {keyResult.status.replace('_', ' ')}
              </span>
              {getTrendIcon()}
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Current: <span className="font-semibold text-foreground">{keyResult.currentValue}</span>
              </span>
              <span className="text-muted-foreground">
                Target: <span className="font-semibold text-foreground">{keyResult.targetValue}</span>
              </span>
              {keyResult.unit && (
                <span className="text-muted-foreground">{keyResult.unit}</span>
              )}
            </div>

            <div className="w-full bg-muted/30 rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all"
                style={{ width: `${keyResult.progress}%` }}
              />
            </div>

            {keyResult.updates && keyResult.updates.length > 0 && (
              <div className="text-xs text-muted-foreground mt-2">
                Last updated by {keyResult.updates[0].createdBy.name || 'Unknown'} on{' '}
                {new Date(keyResult.updates[0].createdAt).toLocaleDateString()}
                {keyResult.updates[0].note && (
                  <span className="block mt-1 italic">&ldquo;{keyResult.updates[0].note}&rdquo;</span>
                )}
              </div>
            )}
          </div>

          <div className="text-right">
            <div className="text-lg font-bold text-primary">
              {Math.round(keyResult.progress)}%
            </div>
          </div>
        </div>
      </div>

      <KeyResultUpdate
        goalId={goalId}
        keyResult={keyResult}
        isOpen={showUpdateDialog}
        onClose={() => setShowUpdateDialog(false)}
      />
    </>
  )
}
