'use client'

import { useState, useEffect } from 'react'
import {
  ClipboardCheck, Calendar, User, Star, Loader2,
  ChevronRight, Users,
} from 'lucide-react'

interface Review {
  id: string
  period: string
  status: string
  overallScore: number | null
  createdAt: string
  employee: { id: string; name: string | null; email: string; image: string | null }
  manager: { id: string; name: string | null; email: string; image: string | null }
}

interface Meeting {
  id: string
  scheduledAt: string
  status: string
  employee: { id: string; name: string | null; email: string; image: string | null }
  manager: { id: string; name: string | null; email: string; image: string | null }
}

interface Props {
  workspaceSlug: string
  currentUser: { userId: string; email: string; name?: string | null }
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-muted/50 text-muted-foreground',
  IN_PROGRESS: 'bg-blue-500/10 text-blue-400',
  PENDING_APPROVAL: 'bg-amber-500/10 text-amber-400',
  COMPLETED: 'bg-green-500/10 text-green-400',
  SCHEDULED: 'bg-blue-500/10 text-blue-400',
  CANCELLED: 'bg-red-500/10 text-red-400',
  RESCHEDULED: 'bg-orange-500/10 text-orange-400',
}

export function PerformanceDashboard(_props: Props) {
  const [reviews, setReviews] = useState<Review[]>([])
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'reviews' | 'meetings'>('reviews')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [reviewsRes, meetingsRes] = await Promise.all([
        fetch('/api/performance/reviews'),
        fetch('/api/performance/one-on-ones'),
      ])

      if (reviewsRes.ok) setReviews(await reviewsRes.json())
      if (meetingsRes.ok) setMeetings(await meetingsRes.json())
    } catch {
      console.error('Failed to load performance data')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex items-center gap-1 bg-muted/30 rounded-lg p-1 w-fit">
        <button
          onClick={() => setActiveTab('reviews')}
          className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'reviews'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <ClipboardCheck className="w-4 h-4" />
          Reviews ({reviews.length})
        </button>
        <button
          onClick={() => setActiveTab('meetings')}
          className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'meetings'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Users className="w-4 h-4" />
          1:1 Meetings ({meetings.length})
        </button>
      </div>

      {/* Reviews Tab */}
      {activeTab === 'reviews' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Performance Reviews</h2>
          </div>

          {reviews.length === 0 ? (
            <div className="bg-card rounded-lg border border-border p-12 text-center">
              <ClipboardCheck className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
              <h3 className="font-medium text-foreground mb-1">No Reviews Yet</h3>
              <p className="text-sm text-muted-foreground">
                Performance reviews will appear here once created by administrators.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {reviews.map((review) => (
                <div
                  key={review.id}
                  className="bg-card rounded-lg border border-border p-4 hover:border-primary/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <div className="font-medium text-foreground">
                          {review.employee.name ?? review.employee.email}
                        </div>
                        <div className="text-sm text-muted-foreground flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5" />
                          {review.period}
                          <span className="text-muted-foreground/50">|</span>
                          Manager: {review.manager.name ?? review.manager.email}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {review.overallScore !== null && (
                        <div className="flex items-center gap-1 text-sm">
                          <Star className="w-4 h-4 text-amber-400" />
                          <span className="font-medium text-foreground">
                            {review.overallScore.toFixed(0)}%
                          </span>
                        </div>
                      )}
                      <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${STATUS_COLORS[review.status] ?? STATUS_COLORS.DRAFT}`}>
                        {review.status.replace('_', ' ')}
                      </span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 1:1 Meetings Tab */}
      {activeTab === 'meetings' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">1:1 Meetings</h2>
          </div>

          {meetings.length === 0 ? (
            <div className="bg-card rounded-lg border border-border p-12 text-center">
              <Calendar className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
              <h3 className="font-medium text-foreground mb-1">No Meetings Scheduled</h3>
              <p className="text-sm text-muted-foreground">
                1:1 meetings with goal progress discussions will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {meetings.map((meeting) => (
                <div
                  key={meeting.id}
                  className="bg-card rounded-lg border border-border p-4 hover:border-primary/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Users className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <div className="font-medium text-foreground">
                          {meeting.employee.name ?? meeting.employee.email}
                          <span className="text-muted-foreground font-normal"> with </span>
                          {meeting.manager.name ?? meeting.manager.email}
                        </div>
                        <div className="text-sm text-muted-foreground flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(meeting.scheduledAt).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${STATUS_COLORS[meeting.status] ?? STATUS_COLORS.SCHEDULED}`}>
                      {meeting.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
