"use client"

import { useEffect, useState } from "react"
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { EmbedData } from "@/types/embeds"

interface EmbedContentRendererProps {
  content: string
  pageId?: string
}

export function EmbedContentRenderer({ content, pageId }: EmbedContentRendererProps) {
  const [embeds, setEmbeds] = useState<EmbedData[]>([])
  const [isClient, setIsClient] = useState(false)

  // Ensure we're on the client side
  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (!isClient) return

    // Extract embed placeholders from content
    const embedPlaceholders = content.match(/<div[^>]*data-embed-id="([^"]*)"[^>]*>/g) || []
    const embedIds = embedPlaceholders.map(placeholder => {
      const match = placeholder.match(/data-embed-id="([^"]*)"/)
      return match ? match[1] : null
    }).filter(Boolean) as string[]

    if (embedIds.length > 0) {
      // In a real implementation, you'd fetch embed data from the database
      // For now, we'll create mock embed data
      const mockEmbeds: EmbedData[] = embedIds.map(id => ({
        id,
        provider: 'github',
        url: 'https://github.com/example/repo',
        title: 'GitHub Repository',
        description: 'This is a GitHub repository embed',
        createdAt: new Date(),
        updatedAt: new Date()
      }))
      
      setEmbeds(mockEmbeds)
    }
  }, [content, isClient])

  // Check if content is HTML or markdown
  const isHtmlContent = content.includes('<div') || content.includes('<h') || content.includes('<p>')
  
  // For server-side rendering, just return the content as-is
  if (!isClient) {
    if (isHtmlContent) {
      return (
        <div className="prose prose-slate max-w-none" dangerouslySetInnerHTML={{ __html: content }} />
      )
    } else {
      return (
        <div className="prose prose-slate max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {content}
          </ReactMarkdown>
        </div>
      )
    }
  }

  // Process content to replace embed placeholders with actual embed components
  const processContent = (htmlContent: string) => {
    let processed = htmlContent

    // Replace embed placeholders with actual embed components
    embeds.forEach(embed => {
      const placeholderRegex = new RegExp(
        `<div[^>]*data-embed-id="${embed.id}"[^>]*>.*?</div>`,
        'gs'
      )
      
      // Create a placeholder for the embed component
      const embedPlaceholder = `<div data-embed-component="${embed.id}" class="my-4"></div>`
      processed = processed.replace(placeholderRegex, embedPlaceholder)
    })

    return processed
  }

  const processedContent = processContent(content)

  if (isHtmlContent) {
    return (
      <div className="prose prose-slate max-w-none" dangerouslySetInnerHTML={{ __html: processedContent }} />
    )
  } else {
    return (
      <div className="prose prose-slate max-w-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {processedContent}
        </ReactMarkdown>
      </div>
    )
  }
}
