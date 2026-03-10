/**
 * Calendar header component
 * Compact single-row: icon, title, nav, view tabs, create button
 */

import { ChevronLeft, ChevronRight, Calendar, Plus, X } from 'lucide-react'
import { formatDateRange } from '@/lib/calendar-utils'
import { cn } from '@/lib/utils'

interface CalendarHeaderProps {
  currentDate: Date
  view: 'day' | 'week' | 'month'
  onViewChange: (view: 'day' | 'week' | 'month') => void
  onDateChange: (date: Date) => void
  needsAuth?: boolean
  onCreateEvent?: () => void
  onClose?: () => void
  showWeekend?: boolean
  onShowWeekendChange?: (show: boolean) => void
}

export function CalendarHeader({
  currentDate,
  view,
  onViewChange,
  onDateChange,
  needsAuth = false,
  onCreateEvent,
  onClose,
  showWeekend = false,
  onShowWeekendChange,
}: CalendarHeaderProps) {
  const handlePrevious = () => {
    const newDate = new Date(currentDate)
    switch (view) {
      case 'day':
        newDate.setDate(newDate.getDate() - 1)
        break
      case 'week':
        newDate.setDate(newDate.getDate() - 7)
        break
      case 'month':
        newDate.setMonth(newDate.getMonth() - 1)
        break
    }
    onDateChange(newDate)
  }

  const handleNext = () => {
    const newDate = new Date(currentDate)
    switch (view) {
      case 'day':
        newDate.setDate(newDate.getDate() + 1)
        break
      case 'week':
        newDate.setDate(newDate.getDate() + 7)
        break
      case 'month':
        newDate.setMonth(newDate.getMonth() + 1)
        break
    }
    onDateChange(newDate)
  }

  const dateLabel = formatDateRange(view, currentDate)

  return (
    <div className="flex items-center gap-4 p-4 border-b border-border bg-card shrink-0">
      <Calendar className="w-5 h-5 text-muted-foreground shrink-0" />
      <span className="font-semibold text-lg text-foreground">Calendar</span>

      {/* Navigation inline */}
      <div className="flex items-center gap-2 ml-4">
        <button
          type="button"
          onClick={handlePrevious}
          className="p-1.5 rounded hover:bg-muted transition-colors"
          aria-label="Previous"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm text-muted-foreground min-w-[120px] text-center">
          {dateLabel}
        </span>
        <button
          type="button"
          onClick={handleNext}
          className="p-1.5 rounded hover:bg-muted transition-colors"
          aria-label="Next"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* View tabs */}
      <div className="flex items-center gap-2 ml-auto">
        {view === 'week' && onShowWeekendChange && (
          <button
            type="button"
            onClick={() => onShowWeekendChange(!showWeekend)}
            className={cn(
              'px-2 py-1 text-xs rounded',
              showWeekend ? 'bg-muted' : 'text-muted-foreground'
            )}
          >
            {showWeekend ? 'Hide' : 'Show'} Weekend
          </button>
        )}
        <div className="flex bg-muted rounded-lg p-1">
          {(['day', 'week', 'month'] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => onViewChange(v)}
              className={cn(
                'px-3 py-1 text-sm rounded capitalize',
                view === v ? 'bg-amber-500 text-black font-medium' : 'hover:bg-muted/80'
              )}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Create button */}
      {onCreateEvent && !needsAuth && (
        <button
          type="button"
          onClick={onCreateEvent}
          className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-black rounded-lg font-medium hover:bg-amber-600 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Event
        </button>
      )}

      {/* Close */}
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="ml-2 p-1.5 rounded hover:bg-muted transition-colors"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
