'use client'

import { useState } from 'react'
import { CheckCircle, XCircle, Clock, MessageSquare, ShieldCheck, AlertTriangle } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Approval {
  id: string
  status: string
  comment: string | null
  createdAt: string
  approver: {
    id: string
    name: string | null
    email: string
    image: string | null
  }
}

interface Props {
  goalId: string
  approvals: Approval[]
  currentUserId: string
}

const STATUS_CONFIG: Record<string, { label: string; icon: typeof Clock; className: string }> = {
  PENDING: { label: 'Pending', icon: Clock, className: 'bg-amber-500/10 text-amber-400' },
  APPROVED: { label: 'Approved', icon: CheckCircle, className: 'bg-green-500/10 text-green-400' },
  REJECTED: { label: 'Rejected', icon: XCircle, className: 'bg-red-500/10 text-red-400' },
  CHANGES_REQUESTED: { label: 'Changes Requested', icon: AlertTriangle, className: 'bg-orange-500/10 text-orange-400' },
}

export function ApprovalWorkflow({ goalId, approvals: initialApprovals, currentUserId }: Props) {
  const router = useRouter()
  const [approvals] = useState<Approval[]>(initialApprovals)
  const [respondingTo, setRespondingTo] = useState<string | null>(null)
  const [comment, setComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleRespond = async (approvalId: string, status: 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED') => {
    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/goals/${goalId}/approvals?approvalId=${approvalId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, comment: comment || undefined }),
      })
      if (response.ok) {
        router.refresh()
        setRespondingTo(null)
        setComment('')
      }
    } catch {
      console.error('Failed to respond to approval')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (approvals.length === 0) return null

  const pendingCount = approvals.filter(a => a.status === 'PENDING').length
  const approvedCount = approvals.filter(a => a.status === 'APPROVED').length
  const allApproved = pendingCount === 0 && approvedCount === approvals.length

  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg flex items-center gap-2 text-foreground">
            <ShieldCheck className="w-5 h-5" />
            Approval Status
          </h3>
          <div className="flex items-center gap-2">
            {allApproved ? (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-green-500/10 text-green-400">
                <CheckCircle className="w-3 h-3" />
                All Approved
              </span>
            ) : pendingCount > 0 ? (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-amber-500/10 text-amber-400">
                <Clock className="w-3 h-3" />
                {pendingCount} Pending
              </span>
            ) : null}
          </div>
        </div>

        <div className="space-y-3">
          {approvals.map((approval) => {
            const config = STATUS_CONFIG[approval.status] ?? STATUS_CONFIG.PENDING
            const Icon = config.icon
            const isMyApproval = approval.approver.id === currentUserId
            const canRespond = isMyApproval && approval.status === 'PENDING'

            return (
              <div key={approval.id} className="border border-border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
                      {(approval.approver.name ?? approval.approver.email)[0].toUpperCase()}
                    </div>
                    <div>
                      <div className="font-medium text-foreground">
                        {approval.approver.name ?? approval.approver.email}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(approval.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${config.className}`}>
                    <Icon className="w-3 h-3" />
                    {config.label}
                  </span>
                </div>

                {approval.comment && (
                  <div className="flex items-start gap-2 text-sm text-muted-foreground bg-muted/30 rounded p-3">
                    <MessageSquare className="w-4 h-4 mt-0.5 shrink-0" />
                    <p>{approval.comment}</p>
                  </div>
                )}

                {canRespond && respondingTo !== approval.id && (
                  <button
                    onClick={() => setRespondingTo(approval.id)}
                    className="text-sm text-primary hover:underline"
                  >
                    Respond to this approval request
                  </button>
                )}

                {respondingTo === approval.id && (
                  <div className="space-y-3 border-t border-border pt-3">
                    <textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Add a comment (optional)..."
                      rows={2}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:border-primary outline-none transition-colors resize-none text-sm"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleRespond(approval.id, 'APPROVED')}
                        disabled={isSubmitting}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-green-500/10 text-green-400 border border-green-500/20 rounded-lg hover:bg-green-500/20 transition-colors disabled:opacity-50"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        Approve
                      </button>
                      <button
                        onClick={() => handleRespond(approval.id, 'CHANGES_REQUESTED')}
                        disabled={isSubmitting}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded-lg hover:bg-orange-500/20 transition-colors disabled:opacity-50"
                      >
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Request Changes
                      </button>
                      <button
                        onClick={() => handleRespond(approval.id, 'REJECTED')}
                        disabled={isSubmitting}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg hover:bg-red-500/20 transition-colors disabled:opacity-50"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Reject
                      </button>
                      <button
                        onClick={() => { setRespondingTo(null); setComment('') }}
                        className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
