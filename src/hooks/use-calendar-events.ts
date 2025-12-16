import { useState, useEffect } from 'react'

export interface CalendarEvent {
  id: string
  title: string
  time: string
  duration: string
  attendees: number
  team: string
  priority: 'HIGH' | 'MEDIUM' | 'LOW'
  type: 'video' | 'phone'
  description?: string
  location?: string
  startTime?: string
  endTime?: string
  meetingLink?: string
}

export interface CalendarEventsResponse {
  events: CalendarEvent[]
  error?: string
  needsAuth?: boolean
}

export function useCalendarEvents() {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [needsAuth, setNeedsAuth] = useState(false)

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setIsLoading(true)
        setError(null)
        setNeedsAuth(false)

        const response = await fetch('/api/calendar/events')
        const data: CalendarEventsResponse = await response.json()

        if (!response.ok) {
          if (data.needsAuth) {
            setNeedsAuth(true)
            setError('Google Calendar not connected')
          } else {
            setError(data.error || 'Failed to fetch calendar events')
          }
          return
        }

        setEvents(data.events || [])
      } catch (err) {
        setError('Failed to fetch calendar events')
        console.error('Error fetching calendar events:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchEvents()
  }, [])

  const refetch = () => {
    setIsLoading(true)
    setError(null)
    setNeedsAuth(false)
    
    fetch('/api/calendar/events')
      .then(response => response.json())
      .then((data: CalendarEventsResponse) => {
        if (!data.error) {
          setEvents(data.events || [])
        } else {
          setError(data.error)
          if (data.needsAuth) {
            setNeedsAuth(true)
          }
        }
      })
      .catch(err => {
        setError('Failed to fetch calendar events')
        console.error('Error fetching calendar events:', err)
      })
      .finally(() => {
        setIsLoading(false)
      })
  }

  return {
    events,
    isLoading,
    error,
    needsAuth,
    refetch
  }
}
