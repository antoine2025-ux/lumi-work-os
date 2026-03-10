"use client"

import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/button'
import { parseEmbedUrl, type EmbedProvider } from '@/lib/wiki/embed-utils'

const PROVIDER_LABELS: Record<EmbedProvider, string> = {
  youtube: 'YouTube video',
  loom: 'Loom video',
  figma: 'Figma file',
  'google-sheets': 'Google Sheet',
  'google-docs': 'Google Doc',
  generic: 'embed',
}

export interface PasteEmbedPromptProps {
  url: string
  position: { top: number; left: number } | null
  onEmbed: () => void
  onKeepAsLink: () => void
  onDismiss: () => void
}

export function PasteEmbedPrompt({
  url,
  position,
  onEmbed,
  onKeepAsLink,
  onDismiss,
}: PasteEmbedPromptProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const result = parseEmbedUrl(url.trim())
  const provider = result?.provider ?? 'generic'
  const label = PROVIDER_LABELS[provider]

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onDismiss()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onDismiss])

  if (!position || !result) return null

  return createPortal(
    <div className="fixed inset-0 z-50">
      <div
        className="fixed inset-0 z-40"
        aria-hidden
        onClick={onDismiss}
      />
      <div
        ref={containerRef}
        className="fixed z-50 min-w-[280px] max-w-[320px] rounded-md border bg-popover p-3 shadow-md"
        style={{
          top: `${position.top}px`,
          left: `${position.left}px`,
        }}
        onMouseDown={(e) => e.preventDefault()}
      >
        <p className="text-sm text-popover-foreground mb-3">
          Embed this {label}?
        </p>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={onEmbed} className="flex-1">
            Embed
          </Button>
          <Button size="sm" variant="outline" onClick={onKeepAsLink}>
            Keep as link
          </Button>
          <Button size="sm" variant="ghost" onClick={onDismiss}>
            Cancel
          </Button>
        </div>
      </div>
    </div>,
    document.body
  )
}
