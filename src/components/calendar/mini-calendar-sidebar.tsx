'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { format } from 'date-fns'
import { getMonthDates, isInCurrentMonth } from '@/lib/calendar-utils'
import { cn } from '@/lib/utils'

interface MiniCalendarSidebarProps {
  currentDate: Date
  selectedDate: Date
  onDateChange: (date: Date) => void
  /** Optional content to render below the month grid (e.g. search, my calendars) */
  children?: React.ReactNode
}

export function MiniCalendarSidebar({
  currentDate,
  selectedDate,
  onDateChange,
  children,
}: MiniCalendarSidebarProps) {
  const today = new Date()
  const daysInMonth = getMonthDates(currentDate, 0) // Sunday first for conventional month view

  const prevMonth = () => {
    const newDate = new Date(currentDate)
    newDate.setMonth(newDate.getMonth() - 1)
    onDateChange(newDate)
  }

  const nextMonth = () => {
    const newDate = new Date(currentDate)
    newDate.setMonth(newDate.getMonth() + 1)
    onDateChange(newDate)
  }

  const navigateToDay = (date: Date) => {
    onDateChange(date)
  }

  const isSelected = (date: Date) => {
    return (
      date.getDate() === selectedDate.getDate() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getFullYear() === selectedDate.getFullYear()
    )
  }

  return (
    <div className="w-64 border-r border-border flex flex-col flex-shrink-0 bg-card">
      {/* Month grid */}
      <div className="p-4 flex-shrink-0">
      {/* Month header */}
      <div className="flex items-center justify-between mb-4">
        <span className="font-medium text-sm">{format(currentDate, 'MMMM yyyy')}</span>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={prevMonth}
            className="p-1 rounded hover:bg-muted transition-colors"
            aria-label="Previous month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={nextMonth}
            className="p-1 rounded hover:bg-muted transition-colors"
            aria-label="Next month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 text-xs text-muted-foreground mb-2">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <div key={i} className="text-center">
            {d}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-1">
        {daysInMonth.map((date) => {
          const dayIsToday = date.toDateString() === today.toDateString()
          const dayIsSelected = isSelected(date)
          const dayIsCurrentMonth = isInCurrentMonth(date, currentDate)

          return (
            <button
              key={date.toISOString()}
              type="button"
              onClick={() => navigateToDay(date)}
              className={cn(
                'w-8 h-8 text-sm rounded-full flex items-center justify-center transition-colors',
                dayIsToday && 'bg-amber-500 text-black font-semibold',
                dayIsSelected && !dayIsToday && 'bg-muted',
                dayIsCurrentMonth ? 'text-foreground' : 'text-muted-foreground/50',
                'hover:bg-muted'
              )}
            >
              {format(date, 'd')}
            </button>
          )
        })}
      </div>
      </div>
      {children}
    </div>
  )
}
