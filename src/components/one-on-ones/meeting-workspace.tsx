'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Video, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent } from '@/components/ui/card'
import { NotesEditor } from './notes-editor'
import { TalkingPointsList } from './talking-points-list'
import { ActionItemsList } from './action-items-list'
import { AutoSuggestPoints } from './auto-suggest-points'

interface TalkingPoint {
  id: string
  content: string
  addedBy: string
  isDiscussed: boolean
  source: string | null
  sourceId: string | null
  sortOrder: number
  createdAt: string | Date
}

interface ActionItem {
  id: string
  content: string
  assigneeId: string
  status: string
  dueDate: string | Date | null
  createdAt: string | Date
  updatedAt: string | Date
}

interface Participant {
  id: string
  name: string | null
  email: string
  image: string | null
}

interface MeetingData {
  id: string
  seriesId: string | null
  scheduledAt: string | Date
  status: string
  calendarEventId: string | null
  managerNotes: string | null
  employeeNotes: string | null
  sharedNotes: string | null
  employee: Participant
  manager: Participant
  talkingPoints: TalkingPoint[]
  actionItems: ActionItem[]
  series: { id: string; frequency: string; duration: number } | null
}

interface MeetingWorkspaceProps {
  meeting: MeetingData
  currentUserId: string
  workspaceSlug: string
}

function getInitials(name: string | null, email: string): string {
  if (name) {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }
  return email[0].toUpperCase()
}

const statusLabels: Record<string, string> = {
  SCHEDULED: 'Scheduled',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  RESCHEDULED: 'Rescheduled',
}

export function MeetingWorkspace({
  meeting: initialMeeting,
  currentUserId,
  workspaceSlug,
}: MeetingWorkspaceProps) {
  const router = useRouter()
  const [meeting, setMeeting] = useState(initialMeeting)
  const isManager = currentUserId === meeting.manager.id
  const otherPerson = isManager ? meeting.employee : meeting.manager
  const participants = [meeting.manager, meeting.employee]

  // ---- API helpers ----

  const updateMeeting = useCallback(
    async (data: Record<string, unknown>) => {
      const res = await fetch(`/api/one-on-ones/meetings/${meeting.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (res.ok) {
        const updated = await res.json()
        setMeeting((prev) => ({ ...prev, ...updated }))
      }
    },
    [meeting.id]
  )

  const addTalkingPoint = useCallback(
    async (content: string, source?: string, sourceId?: string) => {
      const res = await fetch(
        `/api/one-on-ones/meetings/${meeting.id}/talking-points`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content, source, sourceId }),
        }
      )
      if (res.ok) {
        const point = await res.json()
        setMeeting((prev) => ({
          ...prev,
          talkingPoints: [...prev.talkingPoints, point],
        }))
      }
    },
    [meeting.id]
  )

  const toggleTalkingPoint = useCallback(
    async (id: string, isDiscussed: boolean) => {
      const res = await fetch(
        `/api/one-on-ones/meetings/${meeting.id}/talking-points`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, isDiscussed }),
        }
      )
      if (res.ok) {
        setMeeting((prev) => ({
          ...prev,
          talkingPoints: prev.talkingPoints.map((p) =>
            p.id === id ? { ...p, isDiscussed } : p
          ),
        }))
      }
    },
    [meeting.id]
  )

  const deleteTalkingPoint = useCallback(
    async (id: string) => {
      const res = await fetch(
        `/api/one-on-ones/meetings/${meeting.id}/talking-points?id=${id}`,
        { method: 'DELETE' }
      )
      if (res.ok) {
        setMeeting((prev) => ({
          ...prev,
          talkingPoints: prev.talkingPoints.filter((p) => p.id !== id),
        }))
      }
    },
    [meeting.id]
  )

  const addActionItem = useCallback(
    async (content: string, assigneeId: string) => {
      const res = await fetch(
        `/api/one-on-ones/meetings/${meeting.id}/action-items`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content, assigneeId }),
        }
      )
      if (res.ok) {
        const item = await res.json()
        setMeeting((prev) => ({
          ...prev,
          actionItems: [...prev.actionItems, item],
        }))
      }
    },
    [meeting.id]
  )

  const toggleActionItem = useCallback(
    async (id: string, status: string) => {
      const res = await fetch(
        `/api/one-on-ones/meetings/${meeting.id}/action-items`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, status }),
        }
      )
      if (res.ok) {
        setMeeting((prev) => ({
          ...prev,
          actionItems: prev.actionItems.map((i) =>
            i.id === id ? { ...i, status } : i
          ),
        }))
      }
    },
    [meeting.id]
  )

  const deleteActionItem = useCallback(
    async (id: string) => {
      const res = await fetch(
        `/api/one-on-ones/meetings/${meeting.id}/action-items?id=${id}`,
        { method: 'DELETE' }
      )
      if (res.ok) {
        setMeeting((prev) => ({
          ...prev,
          actionItems: prev.actionItems.filter((i) => i.id !== id),
        }))
      }
    },
    [meeting.id]
  )

  const handleStatusChange = useCallback(
    async (newStatus: string) => {
      await updateMeeting({ status: newStatus })
      router.refresh()
    },
    [updateMeeting, router]
  )

  const meetingDate = new Date(meeting.scheduledAt)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {meeting.seriesId && (
            <Link href={`/w/${workspaceSlug}/one-on-ones/${meeting.seriesId}`}>
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
            </Link>
          )}
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={otherPerson.image ?? undefined} />
              <AvatarFallback className="text-xs bg-primary/10 text-primary">
                {getInitials(otherPerson.name, otherPerson.email)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-lg font-semibold">
                1:1 with {otherPerson.name ?? otherPerson.email}
              </h2>
              <p className="text-xs text-muted-foreground">
                {meetingDate.toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}{' '}
                at{' '}
                {meetingDate.toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                })}
                {meeting.series && ` \u00b7 ${meeting.series.duration}m`}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline">
            {statusLabels[meeting.status] ?? meeting.status}
          </Badge>

          {meeting.calendarEventId && (
            <Button variant="outline" size="sm" asChild>
              <a
                href={`https://calendar.google.com/calendar/event?eid=${meeting.calendarEventId}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Video className="h-3 w-3 mr-1" />
                Join
                <ExternalLink className="h-3 w-3 ml-1" />
              </a>
            </Button>
          )}

          {meeting.status === 'SCHEDULED' && (
            <Button
              size="sm"
              onClick={() => handleStatusChange('IN_PROGRESS')}
            >
              Start Meeting
            </Button>
          )}
          {meeting.status === 'IN_PROGRESS' && (
            <Button
              size="sm"
              onClick={() => handleStatusChange('COMPLETED')}
            >
              Complete Meeting
            </Button>
          )}
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Talking Points + Action Items */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardContent className="p-4 space-y-4">
              <TalkingPointsList
                points={meeting.talkingPoints}
                meetingId={meeting.id}
                onToggle={toggleTalkingPoint}
                onAdd={(content) => addTalkingPoint(content)}
                onDelete={deleteTalkingPoint}
              />

              <AutoSuggestPoints
                employeeId={meeting.employee.id}
                managerId={meeting.manager.id}
                seriesId={meeting.seriesId ?? undefined}
                existingContents={meeting.talkingPoints.map((p) => p.content)}
                onAdd={(content, source, sourceId) =>
                  addTalkingPoint(content, source, sourceId)
                }
              />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <ActionItemsList
                items={meeting.actionItems}
                meetingId={meeting.id}
                participants={participants}
                currentUserId={currentUserId}
                onToggle={toggleActionItem}
                onAdd={addActionItem}
                onDelete={deleteActionItem}
              />
            </CardContent>
          </Card>
        </div>

        {/* Right columns: Notes */}
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <NotesEditor
                  label={`${meeting.manager.name ?? 'Manager'}'s Notes`}
                  value={meeting.managerNotes}
                  onSave={(val) => updateMeeting({ managerNotes: val })}
                  placeholder="Manager's private notes..."
                  disabled={!isManager}
                />
                <NotesEditor
                  label="Shared Notes"
                  value={meeting.sharedNotes}
                  onSave={(val) => updateMeeting({ sharedNotes: val })}
                  placeholder="Notes visible to both..."
                />
                <NotesEditor
                  label={`${meeting.employee.name ?? 'Report'}'s Notes`}
                  value={meeting.employeeNotes}
                  onSave={(val) => updateMeeting({ employeeNotes: val })}
                  placeholder="Report's private notes..."
                  disabled={isManager}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
