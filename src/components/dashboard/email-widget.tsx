"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { Mail, Expand, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { EmailModal } from "@/components/email/EmailModal"
import type { EmailMessage } from "@/components/email/EmailModal"
import { cn } from "@/lib/utils"

interface EmailWidgetProps {
  className?: string
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

export function EmailWidget({ className }: EmailWidgetProps) {
  const searchParams = useSearchParams()
  const [emailModalOpen, setEmailModalOpen] = useState(false)
  const [initialEmailId, setInitialEmailId] = useState<string | null>(null)

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['gmail', 'messages', 'inbox'],
    queryFn: async () => {
      const res = await fetch('/api/integrations/gmail/messages?folder=inbox&limit=5', {
        cache: 'no-store',
      })
      const json = await res.json()
      return { connected: json.connected, messages: (json.messages ?? []) as EmailMessage[] }
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  })

  const connected = data?.connected ?? false
  const emails = data?.messages ?? []

  // Auto-open modal when returning from Gmail OAuth callback
  useEffect(() => {
    if (searchParams.get('gmail') === 'connected') {
      setEmailModalOpen(true)
      refetch()
    }
  }, [searchParams, refetch])

  const handleEmailClick = (email: EmailMessage) => {
    setInitialEmailId(email.id)
    setEmailModalOpen(true)
  }

  const handleModalClose = (open: boolean) => {
    if (!open) setInitialEmailId(null)
    setEmailModalOpen(open)
  }

  return (
    <>
      <div className={cn('bg-card rounded-md border border-border flex flex-col h-full min-h-0', className)}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-muted-foreground" aria-hidden />
            <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Email</h3>
          </div>
          <div className="flex items-center gap-2">
            {connected && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={() => refetch()}
                disabled={isLoading}
                aria-label="Refresh emails"
              >
                <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={() => setEmailModalOpen(true)}
              aria-label="Expand email"
            >
              <Expand className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="p-3 flex-1">
          {!connected ? (
            <div className="text-center py-8">
              <Mail className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-4">Connect Gmail to see emails</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEmailModalOpen(true)}
              >
                Open Email
              </Button>
            </div>
          ) : isLoading ? (
            <div className="space-y-2 py-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex gap-2 p-2 animate-pulse">
                  <div className="w-2 h-2 rounded-full bg-muted mt-1.5 flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : emails.length === 0 ? (
            <div className="text-center py-8">
              <Mail className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No emails in inbox</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => setEmailModalOpen(true)}
              >
                Open Email
              </Button>
            </div>
          ) : (
            <div className="space-y-0 max-h-[260px] overflow-y-auto dashboard-card-scroll">
              {emails.map((email) => (
                <button
                  key={email.id}
                  type="button"
                  onClick={() => handleEmailClick(email)}
                  className={cn(
                    'w-full text-left px-3 py-2 rounded-md hover:bg-muted/50 transition-colors border-b border-border/50 last:border-0',
                    email.isUnread && 'bg-muted/30'
                  )}
                >
                  <div className="flex items-start gap-2">
                    {email.isUnread && (
                      <div className="w-2 h-2 rounded-full bg-amber-500 mt-1.5 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline gap-2">
                        <span
                          className={cn(
                            'text-sm truncate',
                            email.isUnread ? 'font-semibold' : 'font-medium'
                          )}
                        >
                          {email.from.name}
                        </span>
                        <span className="text-xs text-muted-foreground flex-shrink-0">
                          {formatEmailTime(email.date)}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{email.subject}</p>
                    </div>
                  </div>
                </button>
              ))}
              <div className="pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-muted-foreground"
                  onClick={() => setEmailModalOpen(true)}
                >
                  View all emails
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <EmailModal
        open={emailModalOpen}
        onOpenChange={handleModalClose}
        initialEmailId={initialEmailId}
      />
    </>
  )
}