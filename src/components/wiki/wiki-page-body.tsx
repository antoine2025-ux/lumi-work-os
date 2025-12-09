"use client"

import { Button } from "@/components/ui/button"
import { ExternalLink } from "lucide-react"
import { groupConsecutiveCodeBlocks } from "@/lib/wiki/content-processor"

interface WikiPageBodyProps {
  page: {
    id: string
    title: string
    content: string
    slug: string
    updatedAt: string | Date
    workspace_type?: string | null
  }
  showOpenButton?: boolean
  className?: string
}

/**
 * Reusable component for rendering wiki page content
 * Used in both the native wiki route and embedded views (e.g., project Files tab)
 * 
 * This component renders:
 * - Page header with "Last updated" info
 * - Page title
 * - Page content (HTML or Markdown) with grouped code blocks
 * 
 * No background, borders, or containers - just the content structure
 */
export function WikiPageBody({ page, showOpenButton = false, className = "" }: WikiPageBodyProps) {
  // Process content to group consecutive code blocks
  const processedContent = groupConsecutiveCodeBlocks(page.content || '')
  
  // Format updated date
  const formatDate = (date: string | Date) => {
    const d = typeof date === 'string' ? new Date(date) : date
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  // Check if content is HTML or Markdown
  const isHtml = processedContent?.includes('<') && (
    processedContent.includes('<div') || 
    processedContent.includes('<p>') || 
    processedContent.includes('<h1') ||
    processedContent.includes('<ul') ||
    processedContent.includes('<ol')
  )

  return (
    <div className={`max-w-4xl mx-auto w-full min-w-0 ${className}`}>
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 w-full min-w-0">
        <div className="text-sm text-muted-foreground">
          Last updated {formatDate(page.updatedAt)}
        </div>
        {showOpenButton && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2"
            onClick={() => window.open(`/wiki/${page.slug}`, '_blank')}
            title="Open in new tab"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Open in Spaces
          </Button>
        )}
      </div>

      {/* Page Title */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-foreground">
          {page.title}
        </h1>
      </div>

      {/* Page Content - Exact same rendering as native wiki page */}
      <div className="prose prose-foreground max-w-none min-h-[400px] dark:prose-invert">
        {isHtml ? (
          <div 
            dangerouslySetInnerHTML={{ __html: processedContent || '<p>No content available.</p>' }}
            className="text-foreground leading-relaxed"
          />
        ) : (
          // Render Markdown - basic rendering without external library (same as wiki route)
          <div 
            dangerouslySetInnerHTML={{ __html: markdownToHtml(processedContent || 'No content available.') }}
            className="text-foreground leading-relaxed"
          />
        )}
      </div>
    </div>
  )
}

/**
 * Convert markdown to HTML (same logic as wiki route)
 */
function markdownToHtml(md: string): string {
  let html = md
  
  // Headers
  html = html.replace(/^### (.*$)/gim, '<h3 class="text-lg font-bold mb-3 mt-6">$1</h3>')
  html = html.replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold mb-4 mt-8">$1</h2>')
  html = html.replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mb-6 mt-8">$1</h1>')
  
  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong class="font-bold">$1</strong>')
  
  // Lists
  html = html.replace(/^\- (.*$)/gim, '<li class="mb-1">$1</li>')
  html = html.replace(/^(\d+)\. (.*$)/gim, '<li class="mb-1">$2</li>')
  
  // Wrap consecutive list items in ul/ol
  html = html.replace(/(<li[^>]*>.*<\/li>\n?)+/g, (match) => {
    if (match.includes('</li>')) {
      return '<ul class="list-disc pl-6 mb-4 space-y-1">' + match + '</ul>'
    }
    return match
  })
  
  // Paragraphs
  html = html.replace(/\n\n/g, '</p><p class="mb-4 leading-relaxed">')
  html = '<p class="mb-4 leading-relaxed">' + html + '</p>'
  
  // Clean up empty paragraphs
  html = html.replace(/<p class="mb-4 leading-relaxed"><\/p>/g, '')
  html = html.replace(/<p class="mb-4 leading-relaxed">(<h[123])/g, '$1')
  html = html.replace(/(<\/h[123]>)<\/p>/g, '$1')
  
  return html
}



