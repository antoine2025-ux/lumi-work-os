'use client'

/**
 * Calendar page client component
 * Manages calendar state and coordinates view components
 */

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Calendar, AlertCircle, Loader2 } from 'lucide-react'
import type { CalendarEvent } from '@/hooks/use-calendar-events'
import { useCalendarRange } from '@/hooks/use-calendar-range'
import { useDeleteCalendarEvent } from '@/hooks/use-calendar-mutations'
import { getDateRangeForView } from '@/lib/calendar-utils'
import { CalendarHeader } from '@/components/calendar/calendar-header'
import { CalendarView } from '@/components/calendar/calendar-view'
import { EventDetailPanel } from '@/components/calendar/event-detail-panel'
import { CreateEventDialog } from '@/components/calendar/create-event-dialog'
import { EditEventDialog } from '@/components/calendar/edit-event-dialog'
import { Button } from '@/components/ui/button'
import { signIn } from 'next-auth/react'

type ViewType = 'day' | 'week' | 'month'

export function CalendarPageClient() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Get initial state from URL params
  const viewParam = searchParams.get('view') as ViewType | null
  const dateParam = searchParams.get('date')

  const [view, setView] = useState<ViewType>(viewParam || 'week')
  const [currentDate, setCurrentDate] = useState<Date>(() => {
    if (dateParam) {
      const parsed = new Date(dateParam)
      return isNaN(parsed.getTime()) ? new Date() : parsed
    }
    return new Date()
  })
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [detailPanelOpen, setDetailPanelOpen] = useState(false)

  // Create/Edit dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)
  const [createDefaultDate, setCreateDefaultDate] = useState<Date | undefined>()

  // Mutations
  const deleteEvent = useDeleteCalendarEvent()

  // Get date range for current view
  const { start, end } = getDateRangeForView(view, currentDate)

  // Fetch events with TanStack Query
  const { data, isLoading, error } = useCalendarRange({ start, end })

  const events = data?.events || []
  const needsAuth = data?.needsAuth || false

  // Update URL when view or date changes
  useEffect(() => {
    const params = new URLSearchParams()
    params.set('view', view)
    params.set('date', currentDate.toISOString().split('T')[0])

    router.replace(`?${params.toString()}`, { scroll: false })
  }, [view, currentDate, router])

  const handleViewChange = (newView: ViewType) => {
    setView(newView)
  }

  const handleDateChange = (newDate: Date) => {
    setCurrentDate(newDate)
  }

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event)
    setDetailPanelOpen(true)
  }

  const handleDayClick = (date: Date) => {
    setCreateDefaultDate(date)
    setCreateDialogOpen(true)
  }

  const handleCreateEvent = () => {
    setCreateDefaultDate(currentDate)
    setCreateDialogOpen(true)
  }

  const handleEditEvent = (event: CalendarEvent) => {
    setDetailPanelOpen(false)
    setEditingEvent(event)
    setEditDialogOpen(true)
  }

  const handleDeleteEvent = async (eventId: string) => {
    await deleteEvent.mutateAsync({ eventId })
    setDetailPanelOpen(false)
    setSelectedEvent(null)
  }

  const handleNeedsReAuth = () => {
    signIn('google', { callbackUrl: window.location.href })
  }

  const handleConnectCalendar = () => {
    signIn('google', { callbackUrl: window.location.href })
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="p-6">
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <AlertCircle className="h-12 w-12 text-destructive" />
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-2">Failed to load calendar</h3>
            <p className="text-sm text-muted-foreground">
              {error instanceof Error ? error.message : 'An error occurred while loading your calendar'}
            </p>
          </div>
          <Button onClick={() => window.location.reload()} variant="outline">
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  // Calendar not connected state
  if (needsAuth) {
    return (
      <div className="p-6">
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <Calendar className="h-12 w-12 text-muted-foreground" />
          <div className="text-center max-w-md">
            <h3 className="text-lg font-semibold mb-2">Connect Your Calendar</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Connect your Google Calendar to view and manage your meetings in Loopwell.
            </p>
            <Button onClick={handleConnectCalendar}>
              <Calendar className="h-4 w-4 mr-2" />
              Connect Google Calendar
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Main calendar view
  return (
    <div className="p-6 space-y-4">
      <CalendarHeader
        currentDate={currentDate}
        view={view}
        onViewChange={handleViewChange}
        onDateChange={handleDateChange}
        needsAuth={needsAuth}
        onCreateEvent={handleCreateEvent}
      />

      <CalendarView
        view={view}
        currentDate={currentDate}
        events={events}
        onEventClick={handleEventClick}
        onDayClick={handleDayClick}
      />

      <EventDetailPanel
        event={selectedEvent}
        open={detailPanelOpen}
        onOpenChange={setDetailPanelOpen}
        onEdit={handleEditEvent}
        onDelete={handleDeleteEvent}
        isDeleting={deleteEvent.isPending}
      />

      <CreateEventDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        defaultDate={createDefaultDate}
        onNeedsReAuth={handleNeedsReAuth}
      />

      <EditEventDialog
        event={editingEvent}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onNeedsReAuth={handleNeedsReAuth}
      />

      {/* Empty state when no events */}
      {events.length === 0 && !needsAuth && (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Calendar className="h-12 w-12 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">
            No events scheduled for this {view}
          </p>
        </div>
      )}
    </div>
  )
}
