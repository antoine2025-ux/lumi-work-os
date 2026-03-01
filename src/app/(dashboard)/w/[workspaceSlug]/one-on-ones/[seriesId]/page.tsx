import { redirect, notFound } from 'next/navigation'
import { Plus } from 'lucide-react'
import Link from 'next/link'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { getSeriesDetail } from '@/lib/one-on-ones/data.server'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MeetingHistory } from '@/components/one-on-ones/meeting-history'

interface Props {
  params: Promise<{ workspaceSlug: string; seriesId: string }>
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

const frequencyLabels: Record<string, string> = {
  WEEKLY: 'Weekly',
  BIWEEKLY: 'Biweekly',
  MONTHLY: 'Monthly',
}

export default async function SeriesDetailPage({ params }: Props) {
  const { workspaceSlug, seriesId } = await params
  const auth = await getUnifiedAuth()

  if (!auth.isAuthenticated) {
    redirect('/login')
  }

  setWorkspaceContext(auth.workspaceId)

  const series = await getSeriesDetail(seriesId, auth.workspaceId)

  if (!series) {
    notFound()
  }

  // Verify the user is a participant (or admin)
  const isParticipant =
    series.managerId === auth.user.userId ||
    series.employeeId === auth.user.userId
  // TODO [BACKLOG]: Also check ADMIN role for access bypass

  if (!isParticipant) {
    notFound()
  }

  const isManager = series.managerId === auth.user.userId
  const otherPerson = isManager ? series.employee : series.manager

  return (
    <div className="min-h-full bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href={`/w/${workspaceSlug}/one-on-ones`}>
                <Button variant="ghost" size="sm">
                  &larr; All 1:1s
                </Button>
              </Link>
              <Avatar className="h-10 w-10">
                <AvatarImage src={otherPerson.image ?? undefined} />
                <AvatarFallback className="bg-primary/10 text-primary">
                  {getInitials(otherPerson.name, otherPerson.email)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-lg font-semibold text-foreground">
                  1:1 with {otherPerson.name ?? otherPerson.email}
                </h1>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge variant="secondary" className="text-xs">
                    {frequencyLabels[series.frequency] ?? series.frequency}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {series.duration}m
                  </span>
                  {!series.isActive && (
                    <Badge variant="outline" className="text-xs text-muted-foreground">
                      Paused
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Quick schedule next meeting link */}
              <ScheduleNextMeetingLink
                seriesId={seriesId}
                managerId={series.managerId}
                employeeId={series.employeeId}
                workspaceSlug={workspaceSlug}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Stats */}
          <div className="lg:col-span-1 space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Meetings held</span>
                  <span className="font-medium">{series.stats.meetingsHeld}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Action items</span>
                  <span className="font-medium">
                    {series.stats.completedActionItems}/{series.stats.totalActionItems}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Open items</span>
                  <span className="font-medium text-amber-600">
                    {series.stats.openActionItems}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Meeting Timeline */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Meeting History</CardTitle>
              </CardHeader>
              <CardContent>
                <MeetingHistory
                  meetings={JSON.parse(JSON.stringify(series.meetings))}
                  seriesId={seriesId}
                  workspaceSlug={workspaceSlug}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Client component for scheduling the next meeting.
 * We use a simple form submission approach.
 */
function ScheduleNextMeetingLink({
  seriesId,
  managerId,
  employeeId,
  workspaceSlug,
}: {
  seriesId: string
  managerId: string
  employeeId: string
  workspaceSlug: string
}) {
  // For now, this is just a link/button that creates a meeting
  // In a full implementation, this would open a date picker dialog
  return (
    <form
      action={async () => {
        'use server'
        const { redirect } = await import('next/navigation')
        const { prisma } = await import('@/lib/db')
        const { setWorkspaceContext } = await import('@/lib/prisma/scopingMiddleware')
        const { getUnifiedAuth } = await import('@/lib/unified-auth')

        const auth = await getUnifiedAuth()
        if (!auth.isAuthenticated) redirect('/login')

        setWorkspaceContext(auth.workspaceId)

        // Schedule for next occurrence (default: tomorrow at 10am)
        const nextDate = new Date()
        nextDate.setDate(nextDate.getDate() + 1)
        nextDate.setHours(10, 0, 0, 0)

        const meeting = await prisma.oneOnOneMeeting.create({
          data: {
            workspaceId: auth.workspaceId,
            seriesId,
            managerId,
            employeeId,
            scheduledAt: nextDate,
            status: 'SCHEDULED',
          },
        })

        redirect(
          `/w/${workspaceSlug}/one-on-ones/${seriesId}/${meeting.id}`
        )
      }}
    >
      <Button type="submit" size="sm">
        <Plus className="h-4 w-4 mr-1" />
        Schedule Next
      </Button>
    </form>
  )
}
