"use client"

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Mail, Search, Pencil, X, Reply, Forward, Archive } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ComposeModal } from './ComposeModal'
import { EmailBodyRenderer } from './EmailBodyRenderer'

export interface EmailMessage {
  id: string
  threadId?: string
  subject: string
  from: { name: string; email: string }
  to: { name: string; email: string }
  date: string
  snippet: string
  body: string
  isUnread: boolean
}

type TabType = 'inbox' | 'sent' | 'drafts'

interface EmailModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Pre-select this email when modal opens (e.g. from widget click) */
  initialEmailId?: string | null
}

function formatEmailTime(dateStr: string): string {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return d.toLocaleDateString()
  } catch {
    return dateStr
  }
}

export function EmailModal({ open, onOpenChange, initialEmailId }: EmailModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('inbox')
  const [emails, setEmails] = useState<EmailMessage[]>([])
  const [selectedEmail, setSelectedEmail] = useState<EmailMessage | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [connected, setConnected] = useState(false)
  const [composeOpen, setComposeOpen] = useState(false)

  const folderMap: Record<TabType, string> = {
    inbox: 'INBOX',
    sent: 'SENT',
    drafts: 'DRAFTS',
  }

  const searchParams = useSearchParams()

  const fetchMessages = useCallback(async () => {
    setLoading(true)
    try {
      const folder = folderMap[activeTab]
      const res = await fetch(
        `/api/integrations/gmail/messages?folder=${folder.toLowerCase()}&limit=20`,
        { cache: 'no-store' }
      )
      const data = await res.json()
      const messages = data.messages ?? []
      setConnected(data.connected)
      setEmails(messages)
      if (!data.connected) {
        setSelectedEmail(null)
      } else if (initialEmailId) {
        const preSelect = messages.find((m: EmailMessage) => m.id === initialEmailId)
        setSelectedEmail(preSelect ?? null)
      } else if (selectedEmail && !messages.some((m: EmailMessage) => m.id === selectedEmail.id)) {
        setSelectedEmail(null)
      }
    } catch {
      setEmails([])
      setConnected(false)
    } finally {
      setLoading(false)
    }
  }, [activeTab, initialEmailId])

  useEffect(() => {
    if (open) {
      fetchMessages()
    }
  }, [open, fetchMessages])

  // Refetch when returning from OAuth callback (gmail=connected in URL)
  useEffect(() => {
    if (open && searchParams.get('gmail') === 'connected') {
      fetchMessages()
      // Clear the param from URL without full navigation
      const url = new URL(window.location.href)
      url.searchParams.delete('gmail')
      url.searchParams.delete('message')
      window.history.replaceState({}, '', url.pathname + url.search)
    }
  }, [open, searchParams, fetchMessages])

  const handleArchive = async () => {
    if (!selectedEmail) return
    try {
      await fetch('/api/integrations/gmail/archive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId: selectedEmail.id }),
      })
      setEmails((prev) => prev.filter((e) => e.id !== selectedEmail.id))
      setSelectedEmail(null)
    } catch {
      // ignore
    }
  }

  const filteredEmails = searchQuery
    ? emails.filter(
        (e) =>
          e.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
          e.from.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          e.from.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
          e.snippet.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : emails

  const inboxCount = activeTab === 'inbox' ? emails.filter((e) => e.isUnread).length : 0
  const draftsCount = activeTab === 'drafts' ? emails.length : 0

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="max-w-[95vw] w-[95vw] h-[90vh] p-0 flex flex-col [&>button]:hidden"
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          <DialogTitle className="sr-only">Email</DialogTitle>
          {/* Header */}
          <div className="flex items-center gap-4 px-4 py-3 border-b">
            <Mail className="w-5 h-5 flex-shrink-0" />
            <span className="font-semibold">Email</span>

            {/* Search */}
            <div className="flex-1 max-w-md mx-auto">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  placeholder="Search emails..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-muted rounded-lg text-sm"
                />
              </div>
            </div>

            {/* Compose button */}
            <Button
              variant="default"
              className="bg-amber-500 text-black hover:bg-amber-600"
              onClick={() => setComposeOpen(true)}
            >
              <Pencil className="w-4 h-4 mr-2" />
              Compose
            </Button>

            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Body - Split pane */}
          <div className="flex flex-1 overflow-hidden">
            {/* Left: Email list */}
            <div className="w-[450px] border-r flex flex-col flex-shrink-0 min-w-0">
              {/* Tabs */}
              <div className="flex gap-6 px-4 py-3 border-b">
                <button
                  className={cn(
                    'text-sm',
                    activeTab === 'inbox' && 'font-semibold'
                  )}
                  onClick={() => setActiveTab('inbox')}
                >
                  Inbox {inboxCount > 0 && <span className="text-amber-500 ml-1">{inboxCount}</span>}
                </button>
                <button
                  className={cn(
                    'text-sm text-muted-foreground',
                    activeTab === 'sent' && 'font-semibold text-foreground'
                  )}
                  onClick={() => setActiveTab('sent')}
                >
                  Sent
                </button>
                <button
                  className={cn(
                    'text-sm text-muted-foreground',
                    activeTab === 'drafts' && 'font-semibold text-foreground'
                  )}
                  onClick={() => setActiveTab('drafts')}
                >
                  Drafts {draftsCount > 0 && <span className="text-amber-500 ml-1">{draftsCount}</span>}
                </button>
              </div>

              {/* Email list */}
              <div className="flex-1 overflow-y-auto">
                {!connected ? (
                  <div className="p-6 text-center">
                    <p className="text-sm text-muted-foreground mb-4">Connect Gmail to see emails</p>
                    <Button
                      variant="outline"
                      onClick={() => window.location.assign('/api/integrations/gmail/connect')}
                    >
                      Connect Gmail
                    </Button>
                  </div>
                ) : loading ? (
                  <div className="p-6 text-center text-muted-foreground text-sm">Loading...</div>
                ) : filteredEmails.length === 0 ? (
                  <div className="p-6 text-center text-muted-foreground text-sm">
                    No emails in {activeTab}
                  </div>
                ) : (
                  filteredEmails.map((email) => (
                    <button
                      key={email.id}
                      type="button"
                      onClick={() => setSelectedEmail(email)}
                      className={cn(
                        'w-full text-left px-4 py-3 border-b hover:bg-muted/50 transition-colors',
                        selectedEmail?.id === email.id && 'bg-muted'
                      )}
                    >
                      <div className="flex items-start gap-2">
                        {email.isUnread && (
                          <div className="w-2 h-2 rounded-full bg-amber-500 mt-2 flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-baseline gap-2">
                            <span
                              className={cn(
                                'font-medium truncate',
                                email.isUnread && 'font-semibold'
                              )}
                            >
                              {email.from.name}
                            </span>
                            <span className="text-xs text-muted-foreground flex-shrink-0">
                              {formatEmailTime(email.date)}
                            </span>
                          </div>
                          <p className="text-sm truncate">{email.subject}</p>
                          <p className="text-xs text-muted-foreground truncate">{email.snippet}</p>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Right: Email detail */}
            <div className="flex-1 flex flex-col min-w-0">
              {selectedEmail ? (
                <>
                  {/* Email header */}
                  <div className="px-6 py-4 border-b">
                    <h2 className="text-xl font-semibold mb-4">{selectedEmail.subject}</h2>

                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10 flex-shrink-0">
                        <AvatarFallback className="bg-blue-500 text-white">
                          {selectedEmail.from.name
                            .split(' ')
                            .map((n) => n[0])
                            .join('')
                            .slice(0, 2)
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{selectedEmail.from.name}</p>
                        <p className="text-sm text-muted-foreground truncate">
                          To: {selectedEmail.to.email}
                        </p>
                      </div>
                      <span className="text-sm text-muted-foreground flex-shrink-0">
                        {formatEmailTime(selectedEmail.date)}
                      </span>
                    </div>
                  </div>

                  {/* Email body - light background for marketing emails */}
                  <div className="flex-1 overflow-y-auto">
                    <div className="bg-white rounded-lg m-4 min-h-[200px]">
                      <EmailBodyRenderer
                        html={selectedEmail.body || selectedEmail.snippet || ''}
                        className="w-full"
                      />
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 px-6 py-4 border-t">
                    <Button variant="secondary" size="sm">
                      <Reply className="w-4 h-4 mr-2" />
                      Reply
                    </Button>
                    <Button variant="secondary" size="sm">
                      <Forward className="w-4 h-4 mr-2" />
                      Forward
                    </Button>
                    <Button variant="secondary" size="sm" onClick={handleArchive}>
                      <Archive className="w-4 h-4 mr-2" />
                      Archive
                    </Button>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-muted-foreground">
                  Select an email to read
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ComposeModal - will be implemented in ComposeModal.tsx */}
      {composeOpen && (
        <ComposeModal
          open={composeOpen}
          onOpenChange={setComposeOpen}
          onSent={() => {
            setComposeOpen(false)
            fetchMessages()
          }}
        />
      )}
    </>
  )
}
