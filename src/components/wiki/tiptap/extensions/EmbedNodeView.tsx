"use client"

import { useState, useCallback } from 'react'
import { NodeViewWrapper } from '@tiptap/react'
import {
  Youtube,
  Figma,
  Video,
  FileSpreadsheet,
  FileText,
  Link2,
  ExternalLink,
  X,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { EmbedProvider } from '@/lib/wiki/embed-utils'

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
  generic: 'Embed',
}

interface EmbedNodeViewProps {
  node: {
    attrs: {
      src?: string
      embedUrl?: string
      provider?: EmbedProvider
      title?: string
      width?: string
      height?: number
      embedId?: string | null
    }
  }
  selected?: boolean
  deleteNode?: () => void
}

export function EmbedNodeView({ node, selected, deleteNode }: EmbedNodeViewProps) {
  const attrs = node.attrs
  const embedUrl = attrs.embedUrl ?? ''
  const src = attrs.src ?? embedUrl
  const provider = (attrs.provider ?? 'generic') as EmbedProvider
  const title = attrs.title ?? ''
  const height = typeof attrs.height === 'number' ? attrs.height : 400
  const embedId = attrs.embedId

  const [loaded, setLoaded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [retryKey, setRetryKey] = useState(0)

  const Icon = PROVIDER_ICONS[provider] ?? Link2
  const label = PROVIDER_LABELS[provider] ?? 'Embed'

  const handleLoad = useCallback(() => {
    setLoaded(true)
    setLoading(false)
    setError(false)
  }, [])

  const handleError = useCallback(() => {
    setError(true)
    setLoading(false)
    setLoaded(false)
  }, [])

  const handleClickToLoad = useCallback(() => {
    if (!embedUrl) return
    setLoading(true)
    setError(false)
  }, [embedUrl])

  const handleRetry = useCallback(() => {
    setError(false)
    setRetryKey((k) => k + 1)
    setLoading(true)
  }, [])

  const openExternal = useCallback(() => {
    if (src) window.open(src, '_blank', 'noopener,noreferrer')
  }, [src])

  // Legacy embed: embedId only, no embedUrl
  if (embedId && !embedUrl) {
    return (
      <NodeViewWrapper
        className={cn(
          'my-4 rounded-lg border overflow-hidden',
          'border-border bg-muted/30',
          selected && 'ring-2 ring-primary'
        )}
      >
        <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
          <Link2 className="h-4 w-4 flex-shrink-0" />
          <span>Embed: {embedId}</span>
        </div>
      </NodeViewWrapper>
    )
  }

  // No embed URL
  if (!embedUrl) {
    return (
      <NodeViewWrapper
        className={cn(
          'my-4 rounded-lg border overflow-hidden',
          'border-border bg-muted/30',
          selected && 'ring-2 ring-primary'
        )}
      >
        <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
          <Link2 className="h-4 w-4 flex-shrink-0" />
          <span>Invalid embed</span>
        </div>
      </NodeViewWrapper>
    )
  }

  return (
    <NodeViewWrapper
      className={cn(
        'my-4 rounded-lg border overflow-hidden',
        'border-border bg-background',
        selected && 'ring-2 ring-primary'
      )}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Provider bar */}
      <div className="flex items-center justify-between gap-2 px-3 py-2 text-sm border-b border-border bg-muted/30">
        <div className="flex items-center gap-2 text-muted-foreground min-w-0">
          <Icon className="h-4 w-4 flex-shrink-0" />
          <span className="truncate">{label}</span>
          {title && (
            <span className="truncate text-muted-foreground/80">— {title}</span>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={openExternal}
            title="Open in new tab"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </Button>
          {deleteNode && hovered && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-destructive hover:text-destructive"
              onClick={deleteNode}
              title="Remove embed"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Content area */}
      <div className="relative" style={{ minHeight: height }}>
        {!loaded && !loading && !error && (
          <button
            type="button"
            onClick={handleClickToLoad}
            className="w-full flex flex-col items-center justify-center gap-2 py-12 px-4 border border-dashed border-border rounded-b-lg bg-muted/20 hover:bg-muted/40 transition-colors cursor-pointer"
          >
            <Icon className="h-10 w-10 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Click to load</span>
          </button>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center gap-2 py-12 px-4 bg-muted/20 animate-pulse rounded-b-lg">
            <Loader2 className="h-10 w-10 text-muted-foreground animate-spin" />
            <span className="text-sm text-muted-foreground">Loading...</span>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center gap-3 py-12 px-4 bg-muted/20 rounded-b-lg">
            <span className="text-sm text-muted-foreground">
              Could not load embed
            </span>
            <Button variant="outline" size="sm" onClick={handleRetry}>
              Retry
            </Button>
          </div>
        )}

        {(loading || loaded) && !error && (
          <iframe
            key={retryKey}
            src={embedUrl}
            title={title || label}
            className={cn(
              'w-full border-0 rounded-b-lg',
              !loaded && 'absolute inset-0 opacity-0 pointer-events-none'
            )}
            style={{ height }}
            sandbox="allow-scripts allow-same-origin allow-popups"
            onLoad={handleLoad}
            onError={handleError}
          />
        )}
      </div>
    </NodeViewWrapper>
  )
}
