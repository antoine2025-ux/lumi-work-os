import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

interface ProgressBarProps {
  value: number
  className?: string
  showLabel?: boolean
}

export function ProgressBar({ value, className, showLabel = true }: ProgressBarProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Progress value={value} className="flex-1" />
      {showLabel && (
        <span className="text-sm text-muted-foreground min-w-[3rem] text-right">
          {value}%
        </span>
      )}
    </div>
  )
}






