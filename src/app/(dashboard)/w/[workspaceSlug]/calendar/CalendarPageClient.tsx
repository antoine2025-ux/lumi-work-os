'use client'

/**
 * Calendar page client component
 * Manages calendar state and coordinates view components
 */

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Calendar, AlertCircle, Loader2, Search, Plus, Check, X } from 'lucide-react'
import { useQuery, useQueries } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import type { CalendarEvent } from '@/hooks/use-calendar-events'
import { useCalendarRange, fetchCalendarEvents } from '@/hooks/use-calendar-range'
import { useDeleteCalendarEvent } from '@/hooks/use-calendar-mutations'
import { getDateRangeForView } from '@/lib/calendar-utils'
import { CalendarHeader } from '@/components/calendar/calendar-header'
import { CalendarView } from '@/components/calendar/calendar-view'
import { MiniCalendarSidebar } from '@/components/calendar/mini-calendar-sidebar'
import { EventDetailPanel } from '@/components/calendar/event-detail-panel'
import { CreateEventDialog } from '@/components/calendar/create-event-dialog'
import { EditEventDialog } from '@/components/calendar/edit-event-dialog'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { signIn } from 'next-auth/react'
import { cn } from '@/lib/utils'

type ViewType = 'day' | 'week' | 'month'

const MY_CALENDAR_COLOR = '#f59e0b'
const ADDED_CALENDAR_COLORS = ['#8b5cf6', '#10b981', '#3b82f6', '#ec4899', '#06b6d4'] as const

interface Person {
  id: string
  name: string
  email: string
  color?: string
}

export function CalendarPageClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session } = useSession()

  // Get initial state from URL params
  const viewParam = searchParams.get('view') as ViewType | null
  const dateParam = searchParams.get('date')

  const [view, setView] = useState<ViewType>(viewParam || 'week')
  const [showWeekend, setShowWeekend] = useState(false)
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

  // My Calendars state
  const [addedCalendars, setAddedCalendars] = useState<Person[]>([])
  const [visibleCalendars, setVisibleCalendars] = useState<string[]>(['me'])
  const [searchQuery, setSearchQuery] = useState('')

  const currentUser: Person | null = session?.user
    ? {
        id: (session.user as { id?: string }).id ?? '',
        name: session.user.name || session.user.email?.split('@')[0] || 'You',
        email: session.user.email || '',
      }
    : null

  const getNextColor = useCallback(
    () => ADDED_CALENDAR_COLORS[addedCalendars.length % ADDED_CALENDAR_COLORS.length],
    [addedCalendars.length]
  )

  const addCalendar = useCallback(
    (person: Person) => {
      if (person.id === currentUser?.id) return
      if (addedCalendars.some((p) => p.id === person.id)) return
      setAddedCalendars((prev) => [...prev, { ...person, color: getNextColor() }])
      setVisibleCalendars((prev) => [...prev, person.id])
      setSearchQuery('')
    },
    [addedCalendars, currentUser?.id, getNextColor]
  )

  const toggleCalendar = useCallback((id: string) => {
    setVisibleCalendars((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    )
  }, [])

  const removeCalendar = useCallback((id: string) => {
    setAddedCalendars((prev) => prev.filter((p) => p.id !== id))
    setVisibleCalendars((prev) => prev.filter((c) => c !== id))
  }, [])

  // Mutations
  const deleteEvent = useDeleteCalendarEvent()

  // Get date range for current view
  const { start, end } = getDateRangeForView(view, currentDate)

  // Search org members
  const { data: searchData } = useQuery({
    queryKey: ['calendar-search', searchQuery],
    queryFn: async () => {
      const res = await fetch(`/api/org/people/search?q=${encodeURIComponent(searchQuery)}`)
      if (!res.ok) throw new Error('Search failed')
      return res.json()
    },
    enabled: searchQuery.length > 1,
  })
  const searchResults = (searchData?.people ?? []) as Person[]

  // Fetch calendars: 'me' + each added person
  const myCalendarQuery = useCalendarRange({
    start,
    end,
    personId: undefined,
    enabled: visibleCalendars.includes('me'),
  })

  const addedCalendarQueries = useQueries({
    queries: addedCalendars.map((person) => ({
      queryKey: ['calendar-events', start.toISOString(), end.toISOString(), person.id],
      queryFn: () => fetchCalendarEvents(start, end, person.id),
      staleTime: 30 * 60 * 1000,
      enabled: visibleCalendars.includes(person.id),
    })),
  })

  const isLoading = myCalendarQuery.isLoading
  const error = myCalendarQuery.error
  const needsAuth = myCalendarQuery.data?.needsAuth

  const combinedEvents = useMemo(() => {
    const events: CalendarEvent[] = []
    if (visibleCalendars.includes('me') && myCalendarQuery.data?.events) {
      events.push(
        ...myCalendarQuery.data.events.map((e) => ({ ...e, color: MY_CALENDAR_COLOR }))
      )
    }
    addedCalendars.forEach((person, i) => {
      if (!visibleCalendars.includes(person.id)) return
      const q = addedCalendarQueries[i]
      const personEvents = (q?.data?.events ?? []) as CalendarEvent[]
      const color = person.color ?? ADDED_CALENDAR_COLORS[i % ADDED_CALENDAR_COLORS.length]
      events.push(...personEvents.map((e) => ({ ...e, color })))
    })
    return events
  }, [visibleCalendars, myCalendarQuery.data?.events, addedCalendars, addedCalendarQueries])

  const events = combinedEvents

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
    <div className="flex flex-col p-6 h-[calc(100vh-8rem)] min-h-0">
      <CalendarHeader
        currentDate={currentDate}
        view={view}
        onViewChange={handleViewChange}
        onDateChange={handleDateChange}
        needsAuth={needsAuth}
        onCreateEvent={handleCreateEvent}
        showWeekend={showWeekend}
        onShowWeekendChange={setShowWeekend}
      />

      <div className="flex flex-1 min-h-0 overflow-hidden mt-4">
        <MiniCalendarSidebar
          currentDate={currentDate}
          selectedDate={currentDate}
          onDateChange={handleDateChange}
        >
          <div className="p-4 border-t border-border flex flex-col gap-4 flex-shrink-0">
            {/* Search for people */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search for people"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm bg-muted rounded-lg border-none focus:ring-1 focus:ring-primary focus:outline-none"
              />
              {searchQuery && searchResults.length > 0 && (
                <div className="absolute mt-1 left-0 right-0 w-full max-w-[224px] bg-card border border-border rounded-lg shadow-lg z-10">
                  {searchResults.map((person) => (
                    <button
                      key={person.id}
                      type="button"
                      onClick={() => addCalendar(person)}
                      className="w-full flex items-center gap-3 px-3 py-2 hover:bg-muted text-left"
                    >
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="text-xs">
                          {person.name[0]?.toUpperCase() ?? '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{person.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{person.email}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* My Calendars */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">My Calendars</span>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground p-1"
                  aria-label="Add calendar"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-2">
                {currentUser && (
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={visibleCalendars.includes('me')}
                      onChange={() => toggleCalendar('me')}
                      className="sr-only"
                    />
                    <div
                      className={cn(
                        'w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0',
                        visibleCalendars.includes('me')
                          ? 'bg-amber-500 border-amber-500'
                          : 'border-muted-foreground'
                      )}
                    >
                      {visibleCalendars.includes('me') && (
                        <Check className="w-3 h-3 text-black" />
                      )}
                    </div>
                    <span className="text-sm truncate">
                      {currentUser.name} (You)
                    </span>
                  </label>
                )}
                {addedCalendars.map((person) => (
                  <label
                    key={person.id}
                    className="flex items-center gap-3 cursor-pointer group min-w-0"
                  >
                    <input
                      type="checkbox"
                      checked={visibleCalendars.includes(person.id)}
                      onChange={() => toggleCalendar(person.id)}
                      className="sr-only"
                    />
                    <div
                      className={cn(
                        'w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0',
                        visibleCalendars.includes(person.id)
                          ? 'border-current'
                          : 'border-muted-foreground'
                      )}
                      style={{
                        backgroundColor: visibleCalendars.includes(person.id)
                          ? person.color ?? ADDED_CALENDAR_COLORS[0]
                          : 'transparent',
                        borderColor: visibleCalendars.includes(person.id)
                          ? person.color ?? ADDED_CALENDAR_COLORS[0]
                          : undefined,
                      }}
                    >
                      {visibleCalendars.includes(person.id) && (
                        <Check className="w-3 h-3 text-white" />
                      )}
                    </div>
                    <span className="text-sm flex-1 truncate min-w-0">{person.name}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        removeCalendar(person.id)
                      }}
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive flex-shrink-0 p-0.5"
                      aria-label={`Remove ${person.name} calendar`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </MiniCalendarSidebar>
        <div className="flex-1 overflow-auto pl-4 space-y-3">
          <CalendarView
            view={view}
            currentDate={currentDate}
            events={events}
            onEventClick={handleEventClick}
            onDayClick={handleDayClick}
            showWeekend={showWeekend}
          />
          {events.length === 0 && !needsAuth && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Calendar className="h-12 w-12 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">
                No events scheduled for this {view}
              </p>
            </div>
          )}
        </div>
      </div>

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
    </div>
  )
}
