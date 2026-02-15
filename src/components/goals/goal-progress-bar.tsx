'use client'

import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

interface Props {
  progress: number
  showLabel?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export function GoalProgressBar({ progress, showLabel = true, size = 'md' }: Props) {
  const progressColor =
    progress >= 75
      ? 'text-green-600'
      : progress >= 50
      ? 'text-blue-600'
      : progress >= 25
      ? 'text-amber-600'
      : 'text-red-600'

  const heightClass = size === 'sm' ? 'h-1' : size === 'md' ? 'h-2' : 'h-3'

  return (
    <div className="w-full">
      {showLabel && (
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium text-gray-700">Progress</span>
          <span className={cn('text-sm font-bold', progressColor)}>
            {Math.round(progress)}%
          </span>
        </div>
      )}
      <Progress value={progress} className={heightClass} />
    </div>
  )
}
