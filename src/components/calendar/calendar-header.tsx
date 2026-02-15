/**
 * Calendar header component
 * Navigation, view toggle, and calendar connection
 */

import { ChevronLeft, ChevronRight, Calendar, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatDateRange } from '@/lib/calendar-utils'
import { cn } from '@/lib/utils'
import { signIn } from 'next-auth/react'

interface CalendarHeaderProps {
  currentDate: Date
  view: 'day' | 'week' | 'month'
  onViewChange: (view: 'day' | 'week' | 'month') => void
  onDateChange: (date: Date) => void
  needsAuth?: boolean
  onCreateEvent?: () => void
}

export function CalendarHeader({
  currentDate,
  view,
  onViewChange,
  onDateChange,
  needsAuth = false,
  onCreateEvent,
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
  
  const handleToday = () => {
    onDateChange(new Date())
  }
  
  const handleConnectCalendar = () => {
    signIn('google', { callbackUrl: window.location.href })
  }

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4">
      {/* Left: Date navigation */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrevious}
            className="h-8 w-8 p-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleToday}
            className="h-8 px-3"
          >
            Today
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleNext}
            className="h-8 w-8 p-0"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="text-lg font-semibold ml-2">
          {formatDateRange(view, currentDate)}
        </div>
      </div>

      {/* Right: View toggle and connect button */}
      <div className="flex items-center gap-2">
        {onCreateEvent && !needsAuth && (
          <Button onClick={onCreateEvent} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            New Event
          </Button>
        )}
        {needsAuth && (
          <Button
            onClick={handleConnectCalendar}
            size="sm"
            variant="default"
          >
            <Calendar className="h-4 w-4 mr-2" />
            Connect Calendar
          </Button>
        )}
        
        <div className="inline-flex items-center rounded-lg border border-border bg-background p-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onViewChange('day')}
            className={cn(
              'h-7 px-3 rounded-md text-sm',
              view === 'day' && 'bg-muted'
            )}
          >
            Day
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onViewChange('week')}
            className={cn(
              'h-7 px-3 rounded-md text-sm',
              view === 'week' && 'bg-muted'
            )}
          >
            Week
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onViewChange('month')}
            className={cn(
              'h-7 px-3 rounded-md text-sm',
              view === 'month' && 'bg-muted'
            )}
          >
            Month
          </Button>
        </div>
      </div>
    </div>
  )
}
