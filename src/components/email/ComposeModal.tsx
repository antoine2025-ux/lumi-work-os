"use client"

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Pencil, Send } from 'lucide-react'

interface ComposeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSent?: () => void
  replyTo?: { to: string; subject: string; threadId?: string }
}

export function ComposeModal({
  open,
  onOpenChange,
  onSent,
  replyTo,
}: ComposeModalProps) {
  const [to, setTo] = useState(replyTo?.to ?? '')
  const [subject, setSubject] = useState(
    replyTo ? (replyTo.subject?.startsWith('Re:') ? replyTo.subject : `Re: ${replyTo.subject ?? ''}`) : ''
  )
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setTo(replyTo?.to ?? '')
      setSubject(
        replyTo ? (replyTo.subject?.startsWith('Re:') ? replyTo.subject : `Re: ${replyTo.subject ?? ''}`) : ''
      )
      setBody('')
      setError(null)
    }
  }, [open, replyTo])

  const handleSend = async () => {
    if (!to.trim() || !subject.trim()) {
      setError('To and Subject are required')
      return
    }
    setSending(true)
    setError(null)
    try {
      const res = await fetch('/api/integrations/gmail/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: to.trim(),
          subject: subject.trim(),
          body: body.trim() || '(No content)',
          replyToThreadId: replyTo?.threadId,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'Failed to send')
      }
      setTo('')
      setSubject('')
      setBody('')
      onOpenChange(false)
      onSent?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send email')
    } finally {
      setSending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="w-5 h-5" />
            Compose
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 flex-1 min-h-0 overflow-y-auto">
          <div>
            <label className="text-sm font-medium mb-1 block">To</label>
            <input
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="recipient@example.com"
              className="w-full px-3 py-2 border rounded-lg bg-background"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject"
              className="w-full px-3 py-2 border rounded-lg bg-background"
            />
          </div>
          <div className="flex-1 min-h-[200px]">
            <label className="text-sm font-medium mb-1 block">Message</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your message..."
              className="w-full h-48 px-3 py-2 border rounded-lg bg-background resize-none"
            />
          </div>
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={sending}>
            <Send className="w-4 h-4 mr-2" />
            {sending ? 'Sending...' : 'Send'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
