'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { Loader2, Video } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { useCreateCalendarEvent, CalendarScopeError } from '@/hooks/use-calendar-mutations'

interface CreateEventDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultDate?: Date
  onNeedsReAuth?: () => void
}

export function CreateEventDialog({
  open,
  onOpenChange,
  defaultDate,
  onNeedsReAuth,
}: CreateEventDialogProps) {
  const dateStr = defaultDate ? format(defaultDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')

  const [title, setTitle] = useState('')
  const [date, setDate] = useState(dateStr)
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('10:00')
  const [allDay, setAllDay] = useState(false)
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [attendees, setAttendees] = useState('')
  const [enableMeet, setEnableMeet] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createEvent = useCreateCalendarEvent()

  const resetForm = () => {
    setTitle('')
    setDate(format(new Date(), 'yyyy-MM-dd'))
    setStartTime('09:00')
    setEndTime('10:00')
    setAllDay(false)
    setDescription('')
    setLocation('')
    setAttendees('')
    setEnableMeet(false)
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!title.trim()) {
      setError('Title is required')
      return
    }

    const attendeeList = attendees
      .split(',')
      .map((email) => email.trim())
      .filter(Boolean)

    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone

    let startISO: string
    let endISO: string

    if (allDay) {
      startISO = date
      endISO = date
    } else {
      startISO = new Date(`${date}T${startTime}`).toISOString()
      endISO = new Date(`${date}T${endTime}`).toISOString()
    }

    try {
      await createEvent.mutateAsync({
        title: title.trim(),
        description: description || undefined,
        location: location || undefined,
        startTime: startISO,
        endTime: endISO,
        timeZone: tz,
        attendees: attendeeList.length > 0 ? attendeeList : undefined,
        enableMeet,
        allDay,
      })

      resetForm()
      onOpenChange(false)
    } catch (err) {
      if (err instanceof CalendarScopeError) {
        onNeedsReAuth?.()
        return
      }
      setError(err instanceof Error ? err.message : 'Failed to create event')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v) }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Event</DialogTitle>
          <DialogDescription>Add a new event to your Google Calendar</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="event-title">Title</Label>
            <Input
              id="event-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Meeting title"
              required
            />
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label htmlFor="event-date">Date</Label>
            <Input
              id="event-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          {/* All Day toggle */}
          <div className="flex items-center justify-between">
            <Label htmlFor="all-day">All day</Label>
            <Switch id="all-day" checked={allDay} onCheckedChange={setAllDay} />
          </div>

          {/* Time inputs (hidden for all-day events) */}
          {!allDay && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start-time">Start time</Label>
                <Input
                  id="start-time"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-time">End time</Label>
                <Input
                  id="end-time"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  required
                />
              </div>
            </div>
          )}

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="event-description">Description</Label>
            <Textarea
              id="event-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Event details..."
              rows={3}
            />
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="event-location">Location</Label>
            <Input
              id="event-location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Room name or address"
            />
          </div>

          {/* Attendees */}
          <div className="space-y-2">
            <Label htmlFor="event-attendees">Attendees</Label>
            <Input
              id="event-attendees"
              value={attendees}
              onChange={(e) => setAttendees(e.target.value)}
              placeholder="email@example.com, another@example.com"
            />
            <p className="text-xs text-muted-foreground">Separate multiple emails with commas</p>
          </div>

          {/* Google Meet toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Video className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="enable-meet">Add Google Meet</Label>
            </div>
            <Switch id="enable-meet" checked={enableMeet} onCheckedChange={setEnableMeet} />
          </div>

          {/* Error message */}
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { resetForm(); onOpenChange(false) }}>
              Cancel
            </Button>
            <Button type="submit" disabled={createEvent.isPending}>
              {createEvent.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Event
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
