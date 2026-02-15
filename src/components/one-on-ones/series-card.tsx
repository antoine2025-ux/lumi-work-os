'use client'

import Link from 'next/link'
import { Calendar, Clock, MessageSquare, ChevronRight } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface SeriesCardProps {
  series: {
    id: string
    frequency: string
    duration: number
    isActive: boolean
    manager: { id: string; name: string | null; email: string; image: string | null }
    employee: { id: string; name: string | null; email: string; image: string | null }
    nextMeeting: {
      id: string
      scheduledAt: string | Date
      status: string
    } | null
    _count: { meetings: number }
    openActionItemCount: number
  }
  currentUserId: string
  workspaceSlug: string
}

const frequencyLabels: Record<string, string> = {
  WEEKLY: 'Weekly',
  BIWEEKLY: 'Biweekly',
  MONTHLY: 'Monthly',
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

function formatDate(date: string | Date): string {
  const d = new Date(date)
  const now = new Date()
  const diffMs = d.getTime() - now.getTime()
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Tomorrow'
  if (diffDays < 7) return d.toLocaleDateString('en-US', { weekday: 'long' })
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function SeriesCard({ series, currentUserId, workspaceSlug }: SeriesCardProps) {
  const isManager = series.manager.id === currentUserId
  const otherPerson = isManager ? series.employee : series.manager
  const roleLabel = isManager ? 'Direct report' : 'Manager'

  return (
    <Link href={`/w/${workspaceSlug}/one-on-ones/${series.id}`}>
      <Card
        className={cn(
          'hover:border-primary/30 hover:shadow-sm transition-all cursor-pointer',
          !series.isActive && 'opacity-60'
        )}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={otherPerson.image ?? undefined} />
                <AvatarFallback className="bg-primary/10 text-primary text-sm">
                  {getInitials(otherPerson.name, otherPerson.email)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-sm font-medium text-foreground">
                  {otherPerson.name ?? otherPerson.email}
                </h3>
                <p className="text-xs text-muted-foreground">{roleLabel}</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground mt-1" />
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              <Clock className="h-3 w-3 mr-1" />
              {frequencyLabels[series.frequency] ?? series.frequency} &middot; {series.duration}m
            </Badge>

            {series.nextMeeting && (
              <Badge variant="outline" className="text-xs">
                <Calendar className="h-3 w-3 mr-1" />
                {formatDate(series.nextMeeting.scheduledAt)}
              </Badge>
            )}

            {series.openActionItemCount > 0 && (
              <Badge variant="outline" className="text-xs text-amber-600 border-amber-200">
                <MessageSquare className="h-3 w-3 mr-1" />
                {series.openActionItemCount} open
              </Badge>
            )}

            {!series.isActive && (
              <Badge variant="secondary" className="text-xs text-muted-foreground">
                Paused
              </Badge>
            )}
          </div>

          <div className="mt-2 text-xs text-muted-foreground">
            {series._count.meetings} meeting{series._count.meetings !== 1 ? 's' : ''} held
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
