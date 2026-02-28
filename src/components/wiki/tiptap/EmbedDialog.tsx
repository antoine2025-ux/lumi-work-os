"use client"

import { useState, useEffect, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { parseEmbedUrl, type EmbedProvider } from '@/lib/wiki/embed-utils'
import {
  Youtube,
  Figma,
  Video,
  FileSpreadsheet,
  FileText,
  Link2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Editor } from '@tiptap/core'

const PROVIDER_ICONS: Record<EmbedProvider, React.ComponentType<{ className?: string }>> = {
  youtube: Youtube,
  loom: Video,
  figma: Figma,
  'google-sheets': FileSpreadsheet,
  'google-docs': FileText,
  generic: Link2,
}

const PROVIDER_LABELS: Record<EmbedProvider, string> = {
  youtube: 'YouTube',
  loom: 'Loom',
  figma: 'Figma',
  'google-sheets': 'Google Sheets',
  'google-docs': 'Google Docs',
  generic: 'Generic iframe',
}

export interface EmbedDialogProps {
  open: boolean
  onClose: () => void
  editor: Editor | null
  initialProvider?: EmbedProvider
}

export function EmbedDialog({
  open,
  onClose,
  editor,
  initialProvider,
}: EmbedDialogProps) {
  const [url, setUrl] = useState('')

  const result = url.trim() ? parseEmbedUrl(url.trim()) : null
  const isValid = result !== null
  const provider = result?.provider ?? initialProvider ?? 'generic'
  const Icon = PROVIDER_ICONS[provider]
  const label = PROVIDER_LABELS[provider]

  const handleEmbed = useCallback(() => {
    if (!editor || !result) return
    editor
      .chain()
      .focus()
      .setEmbed({
        src: result.src,
        embedUrl: result.embedUrl,
        provider: result.provider,
        title: result.title,
      })
      .run()
    setUrl('')
    onClose()
  }, [editor, result, onClose])

  const handleClose = useCallback(() => {
    setUrl('')
    onClose()
  }, [onClose])

  useEffect(() => {
    if (!open) {
      setUrl('')
    }
  }, [open])

  const getStatusMessage = () => {
    if (!url.trim()) return null
    if (!result) return { text: 'Invalid URL', variant: 'error' as const }
    if (result.provider === 'generic')
      return { text: 'Will embed as generic iframe', variant: 'info' as const }
    return { text: 'Ready to embed', variant: 'success' as const }
  }

  const status = getStatusMessage()

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={handleClose}>
        <DialogHeader>
          <DialogTitle>Embed content</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Input
              placeholder="Paste a URL to embed (YouTube, Figma, Loom, Google Docs...)"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="font-mono text-sm"
              autoFocus
            />
          </div>
          {url.trim() && (
            <div className="flex items-center gap-2 min-h-8">
              {result ? (
                <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-muted">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{label}</span>
                </div>
              ) : null}
              {status && (
                <span
                  className={cn(
                    'text-sm',
                    status.variant === 'error' && 'text-destructive',
                    status.variant === 'info' && 'text-muted-foreground',
                    status.variant === 'success' && 'text-muted-foreground'
                  )}
                >
                  {status.text}
                </span>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleEmbed} disabled={!isValid}>
            Embed
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
