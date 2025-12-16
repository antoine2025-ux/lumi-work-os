"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Video, Phone, Calendar, RefreshCw, AlertCircle, ExternalLink } from "lucide-react"
import { useTheme } from "@/components/theme-provider"
import { useCalendarEvents, CalendarEvent } from "@/hooks/use-calendar-events"
import { signIn } from "next-auth/react"

interface MeetingsCardProps {
  className?: string
}

export function MeetingsCard({ className }: MeetingsCardProps) {
  const { themeConfig } = useTheme()
  const { events, isLoading, error, needsAuth, refetch } = useCalendarEvents()

  const handleConnectCalendar = () => {
    signIn('google', { callbackUrl: '/' })
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
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center justify-between">
          <span>Today's Meetings</span>
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="text-xs">
              {isLoading ? '...' : events.length}
            </Badge>
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
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 max-h-[340px] overflow-y-auto dashboard-card-scroll">
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, index) => (
              <div key={index} className="flex items-center space-x-3 p-3 rounded-lg animate-pulse">
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
              Connect your Google Calendar to see today's meetings
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
        ) : events.length === 0 ? (
          <div className="text-center py-6">
            <Calendar className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No meetings scheduled for today</p>
          </div>
        ) : (
          events.map((meeting: CalendarEvent) => (
            <div 
              key={meeting.id} 
              className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted transition-colors cursor-pointer group bg-muted/50"
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
      </CardContent>
    </Card>
  )
}
