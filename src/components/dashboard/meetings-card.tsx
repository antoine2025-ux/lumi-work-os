"use client"

import { useState, useMemo } from 'react'
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Video, Phone, Calendar, RefreshCw, AlertCircle, ExternalLink, Maximize2 } from "lucide-react"
import { useTheme } from "@/components/theme-provider"
import { useCalendarEvents, CalendarEvent } from "@/hooks/use-calendar-events"
import { signIn } from "next-auth/react"
import { CalendarModal } from "@/components/calendar/calendar-modal"

interface MeetingsCardProps {
  className?: string
}

export function MeetingsCard({ className }: MeetingsCardProps) {
  const { themeConfig } = useTheme()
  const { events, isLoading, error, needsAuth, refetch } = useCalendarEvents()
  const [calendarModalOpen, setCalendarModalOpen] = useState(false)

  const handleConnectCalendar = () => {
    signIn('google', { callbackUrl: '/' })
  }

  const handleOpenCalendar = () => {
    setCalendarModalOpen(true)
  }

  const handleMeetingClick = (meeting: CalendarEvent) => {
    if (meeting.meetingLink && meeting.type === 'video') {
      // Direct to meeting link for video meetings
      window.open(meeting.meetingLink, '_blank')
    } else {
      // For non-video meetings or meetings without links, redirect to Google Calendar
      // We'll use a generic calendar link since we don't have the specific event ID
      window.open('https://calendar.google.com/calendar/', '_blank')
    }
  }

  // Filter to today's events only
  const todayEvents = useMemo(() => {
    const today = new Date()
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    return events.filter((event) => {
      if (!event.startTime) return false
      // Date-only format "yyyy-MM-dd" - compare directly
      if (event.startTime.length === 10 && !event.startTime.includes('T')) {
        return event.startTime === todayStr
      }
      const eventDate = new Date(event.startTime)
      return (
        eventDate.getDate() === today.getDate() &&
        eventDate.getMonth() === today.getMonth() &&
        eventDate.getFullYear() === today.getFullYear()
      )
    })
  }, [events])

  const formatTime = (timeString: string) => {
    // If it's "All day", return as is
    if (timeString === 'All day') return timeString
    
    // Try to parse and format the time
    try {
      const [time, period] = timeString.split(' ')
      const [hours, minutes] = time.split(':')
      return `${hours}:${minutes} ${period}`
    } catch {
      return timeString
    }
  }

  return (
    <>
      <div className={`bg-card rounded-md border border-border flex flex-col h-full min-h-0 ${className || ''}`}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" aria-hidden />
            <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Calendar</h3>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {isLoading ? '...' : todayEvents.length}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleOpenCalendar}
              disabled={isLoading}
              className="h-6 w-6 p-0"
              title="Open full calendar"
            >
              <Maximize2 className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={refetch}
              disabled={isLoading}
              className="h-6 w-6 p-0"
            >
              <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
        <div className="p-3 flex-1 space-y-2 max-h-[340px] overflow-y-auto dashboard-card-scroll">
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, index) => (
              <div key={index} className="flex items-center space-x-3 p-2 rounded-md animate-pulse">
                <div className="w-4 h-4 bg-muted rounded"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </div>
                <div className="w-12 h-5 bg-muted rounded"></div>
              </div>
            ))}
          </div>
        ) : needsAuth ? (
          <div className="text-center py-6">
            <Calendar className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-3">
              Connect your Google Calendar to see today&apos;s meetings
            </p>
            <Button onClick={handleConnectCalendar} size="sm">
              <Calendar className="h-4 w-4 mr-2" />
              Connect Calendar
            </Button>
          </div>
        ) : error ? (
          <div className="text-center py-6">
            <AlertCircle className="h-8 w-8 mx-auto mb-3 text-destructive" />
            <p className="text-sm text-destructive mb-3">{error}</p>
            <Button onClick={refetch} size="sm" variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        ) : todayEvents.length === 0 ? (
          <div className="text-center py-6">
            <Calendar className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No meetings scheduled for today</p>
          </div>
        ) : (
          todayEvents.map((meeting: CalendarEvent) => (
            <div 
              key={meeting.id} 
              className="flex items-center space-x-3 p-2 rounded-md hover:bg-muted transition-colors cursor-pointer group bg-muted/50"
              onClick={() => handleMeetingClick(meeting)}
              title={meeting.meetingLink && meeting.type === 'video' ? 'Click to join meeting' : 'Click to view in calendar'}
            >
              <div className="flex-shrink-0">
                {meeting.type === 'video' ? (
                  <Video className="h-4 w-4 text-blue-400" />
                ) : (
                  <Phone className="h-4 w-4 text-green-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: themeConfig.foreground }}>
                  {meeting.title}
                </p>
                <div className="flex items-center space-x-2 text-xs" style={{ color: themeConfig.mutedForeground }}>
                  <span>{formatTime(meeting.time)}</span>
                  <span>•</span>
                  <span>{meeting.duration}</span>
                  {meeting.attendees > 0 && (
                    <>
                      <span>•</span>
                      <span>{meeting.attendees} people</span>
                    </>
                  )}
                  {meeting.team && (
                    <>
                      <span>•</span>
                      <span>{meeting.team}</span>
                    </>
                  )}
                </div>
                {meeting.meetingLink && meeting.type === 'video' && (
                  <div className="mt-1">
                    <span className="text-xs text-blue-400 font-medium">
                      Click to join meeting
                    </span>
                  </div>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <Badge 
                  variant={meeting.priority === 'HIGH' ? 'destructive' : 'secondary'}
                  className="text-xs"
                >
                  {meeting.priority}
                </Badge>
                <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
          ))
        )}
        </div>
      </div>
    
    <CalendarModal 
      open={calendarModalOpen} 
      onOpenChange={setCalendarModalOpen} 
    />
  </>
  )
}
