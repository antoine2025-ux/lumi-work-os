'use client'

import { useState, useEffect } from 'react'
import { MessageSquarePlus, Clock, AlertTriangle, ChevronDown, ChevronUp, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface CheckIn {
  id: string
  period: string
  progressUpdate: number | null
  blockers: string | null
  support: string | null
  confidence: number | null
  createdAt: string
  user: {
    id: string
    name: string | null
    email: string
    image: string | null
  }
}

interface Props {
  goalId: string
  currentProgress: number
}

function getCurrentWeekPeriod(): string {
  const now = new Date()
  const year = now.getFullYear()
  const d = new Date(now.getTime())
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7))
  const week1 = new Date(d.getFullYear(), 0, 4)
  const week = 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7)
  return `${year}-W${String(week).padStart(2, '0')}`
}

export function CheckInPanel({ goalId, currentProgress }: Props) {
  const router = useRouter()
  const [checkIns, setCheckIns] = useState<CheckIn[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form state
  const [progressUpdate, setProgressUpdate] = useState<string>(String(Math.round(currentProgress)))
  const [blockers, setBlockers] = useState('')
  const [support, setSupport] = useState('')
  const [confidence, setConfidence] = useState<string>('0.8')

  useEffect(() => {
    loadCheckIns()
  }, [goalId])

  const loadCheckIns = async () => {
    try {
      const response = await fetch(`/api/goals/${goalId}/check-ins`)
      if (response.ok) {
        setCheckIns(await response.json())
      }
    } catch {
      console.error('Failed to load check-ins')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/goals/${goalId}/check-ins`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          period: getCurrentWeekPeriod(),
          progressUpdate: progressUpdate ? parseFloat(progressUpdate) : undefined,
          blockers: blockers || undefined,
          support: support || undefined,
          confidence: confidence ? parseFloat(confidence) : undefined,
        }),
      })

      if (response.ok) {
        router.refresh()
        setShowForm(false)
        setBlockers('')
        setSupport('')
        loadCheckIns()
      }
    } catch {
      console.error('Failed to submit check-in')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg flex items-center gap-2 text-foreground">
            <MessageSquarePlus className="w-5 h-5" />
            Check-Ins
            {checkIns.length > 0 && (
              <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                {checkIns.length}
              </span>
            )}
          </h3>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center px-3 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              <MessageSquarePlus className="w-4 h-4 mr-2" />
              Weekly Check-In
            </button>
          )}
        </div>

        {/* Check-In Form */}
        {showForm && (
          <div className="space-y-4 border border-border rounded-lg p-4 bg-muted/30">
            <div className="text-sm font-medium text-foreground">
              Check-in for {getCurrentWeekPeriod()}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-muted-foreground block mb-1">
                  Progress Update (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={progressUpdate}
                  onChange={(e) => setProgressUpdate(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground outline-none focus:border-primary transition-colors"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground block mb-1">
                  Confidence (0-1)
                </label>
                <input
                  type="number"
                  min="0"
                  max="1"
                  step="0.1"
                  value={confidence}
                  onChange={(e) => setConfidence(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground outline-none focus:border-primary transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="text-sm text-muted-foreground block mb-1">
                Blockers
              </label>
              <textarea
                value={blockers}
                onChange={(e) => setBlockers(e.target.value)}
                placeholder="Any blockers preventing progress?"
                rows={2}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground outline-none focus:border-primary resize-none transition-colors"
              />
            </div>

            <div>
              <label className="text-sm text-muted-foreground block mb-1">
                Support Needed
              </label>
              <textarea
                value={support}
                onChange={(e) => setSupport(e.target.value)}
                placeholder="What support do you need?"
                rows={2}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground outline-none focus:border-primary resize-none transition-colors"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Check-In'}
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Check-In History */}
        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground py-4">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Loading check-ins...</span>
          </div>
        ) : checkIns.length > 0 ? (
          <div className="space-y-2">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {showHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              {showHistory ? 'Hide' : 'Show'} history ({checkIns.length})
            </button>

            {showHistory && (
              <div className="space-y-2">
                {checkIns.map((ci) => (
                  <div key={ci.id} className="border border-border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-sm font-medium text-foreground">{ci.period}</span>
                        <span className="text-xs text-muted-foreground">
                          by {ci.user.name ?? ci.user.email}
                        </span>
                      </div>
                      {ci.progressUpdate !== null && (
                        <span className="text-sm font-medium text-primary">
                          {ci.progressUpdate}%
                        </span>
                      )}
                    </div>

                    {ci.confidence !== null && (
                      <div className="text-xs text-muted-foreground">
                        Confidence: {Math.round(ci.confidence * 100)}%
                      </div>
                    )}

                    {ci.blockers && (
                      <div className="flex items-start gap-2 text-sm">
                        <AlertTriangle className="w-3.5 h-3.5 text-orange-400 mt-0.5 shrink-0" />
                        <span className="text-muted-foreground">{ci.blockers}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No check-ins yet this period.</p>
        )}
      </div>
    </div>
  )
}
