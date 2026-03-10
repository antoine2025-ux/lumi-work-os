'use client'

import { useEffect, useRef } from 'react'
import { sanitizeHtml } from '@/lib/sanitize-html'

interface EmailBodyRendererProps {
  html: string
  className?: string
}

export function EmailBodyRenderer({ html, className }: EmailBodyRendererProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe) return

    const doc = iframe.contentDocument ?? iframe.contentWindow?.document
    if (!doc) return

    const sanitized = sanitizeHtml(html || '')
    const content = sanitized || '<p style="color:#666">No content</p>'

    doc.open()
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body {
              margin: 0;
              padding: 16px;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              font-size: 14px;
              line-height: 1.5;
              background: #ffffff;
              color: #1a1a1a;
            }
            img {
              max-width: 100%;
              height: auto;
            }
            a {
              color: #2563eb;
              text-decoration: underline;
            }
            table {
              max-width: 100%;
              border-collapse: collapse;
            }
          </style>
        </head>
        <body>
          ${content}
        </body>
      </html>
    `)
    doc.close()

    const updateHeight = () => {
      if (iframe && doc.body) {
        iframe.style.height = Math.max(doc.body.scrollHeight + 24, 300) + 'px'
      }
    }

    const resizeObserver = new ResizeObserver(updateHeight)
    if (doc.body) {
      resizeObserver.observe(doc.body)
    }

    // Recalculate when images load (marketing emails often have async images)
    const imgLoadHandler = () => {
      setTimeout(updateHeight, 100)
    }
    doc.querySelectorAll('img').forEach((img) => {
      img.addEventListener('load', imgLoadHandler)
    })

    updateHeight()

    return () => {
      resizeObserver.disconnect()
      doc.querySelectorAll('img').forEach((img) => {
        img.removeEventListener('load', imgLoadHandler)
      })
    }
  }, [html])

  return (
    <iframe
      ref={iframeRef}
      className={className}
      style={{
        width: '100%',
        border: 'none',
        minHeight: '300px',
        background: 'transparent',
      }}
      sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
      title="Email content"
    />
  )
}
