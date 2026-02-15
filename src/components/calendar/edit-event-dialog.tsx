'use client'

import { useState, useEffect } from 'react'
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
import type { CalendarEvent } from '@/hooks/use-calendar-events'
import { useUpdateCalendarEvent, CalendarScopeError } from '@/hooks/use-calendar-mutations'

interface EditEventDialogProps {
  event: CalendarEvent | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onNeedsReAuth?: () => void
}

export function EditEventDialog({
  event,
  open,
  onOpenChange,
  onNeedsReAuth,
}: EditEventDialogProps) {
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('10:00')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [enableMeet, setEnableMeet] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updateEvent = useUpdateCalendarEvent()

  // Populate form when event changes
  useEffect(() => {
    if (!event) return

    setTitle(event.title || '')
    setDescription(event.description || '')
    setLocation(event.location || '')
    setEnableMeet(event.type === 'video')
    setError(null)

    if (event.startTime) {
      const start = new Date(event.startTime)
      setDate(format(start, 'yyyy-MM-dd'))
      setStartTime(format(start, 'HH:mm'))
    }
    if (event.endTime) {
      const end = new Date(event.endTime)
      setEndTime(format(end, 'HH:mm'))
    }
  }, [event])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!event) return
    setError(null)

    if (!title.trim()) {
      setError('Title is required')
      return
    }

    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    const startISO = new Date(`${date}T${startTime}`).toISOString()
    const endISO = new Date(`${date}T${endTime}`).toISOString()

    try {
      await updateEvent.mutateAsync({
        eventId: event.id,
        title: title.trim(),
        description,
        location,
        startTime: startISO,
        endTime: endISO,
        timeZone: tz,
        enableMeet,
      })

      onOpenChange(false)
    } catch (err) {
      if (err instanceof CalendarScopeError) {
        onNeedsReAuth?.()
        return
      }
      setError(err instanceof Error ? err.message : 'Failed to update event')
    }
  }

  if (!event) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Event</DialogTitle>
          <DialogDescription>Update your Google Calendar event</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="edit-title">Title</Label>
            <Input
              id="edit-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Meeting title"
              required
            />
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label htmlFor="edit-date">Date</Label>
            <Input
              id="edit-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          {/* Time inputs */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-start">Start time</Label>
              <Input
                id="edit-start"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-end">End time</Label>
              <Input
                id="edit-end"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="edit-description">Description</Label>
            <Textarea
              id="edit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Event details..."
              rows={3}
            />
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="edit-location">Location</Label>
            <Input
              id="edit-location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Room name or address"
            />
          </div>

          {/* Google Meet toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Video className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="edit-meet">Google Meet</Label>
            </div>
            <Switch id="edit-meet" checked={enableMeet} onCheckedChange={setEnableMeet} />
          </div>

          {/* Error message */}
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateEvent.isPending}>
              {updateEvent.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
