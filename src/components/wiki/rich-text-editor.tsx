"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { 
  Bold, 
  Italic, 
  Underline, 
  List, 
  ListOrdered, 
  Quote, 
  Code, 
  Link,
  Image,
  Heading1,
  Heading2,
  Heading3,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Plus
} from "lucide-react"
import { EmbedCommandPalette } from "@/components/embeds/embed-command-palette"
import { EmbedData } from "@/types/embeds"

interface RichTextEditorProps {
  content: string
  onChange: (content: string) => void
  placeholder?: string
  editable?: boolean
  className?: string
}

export function RichTextEditor({ 
  content, 
  onChange, 
  placeholder = "Start writing...", 
  editable = true,
  className = ""
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const [isFocused, setIsFocused] = useState(false)
  const [showEmbedPalette, setShowEmbedPalette] = useState(false)
  const [embedPalettePosition, setEmbedPalettePosition] = useState({ top: 0, left: 0 })
  const [embeds, setEmbeds] = useState<EmbedData[]>([])
  const [isInsertingEmbed, setIsInsertingEmbed] = useState(false)

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== content && !isInsertingEmbed) {
      editorRef.current.innerHTML = content
    }
  }, [content, isInsertingEmbed])

  const execCommand = (command: string, value?: string) => {
    if (typeof document !== 'undefined') {
      document.execCommand(command, false, value)
      if (editorRef.current) {
        onChange(editorRef.current.innerHTML)
      }
    }
  }

  const handleInput = () => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML
      onChange(html)
      
      // Check for slash command (only on client side)
      if (typeof window !== 'undefined') {
        const selection = window.getSelection()
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0)
          const textNode = range.startContainer
          if (textNode.nodeType === Node.TEXT_NODE) {
            const text = textNode.textContent || ""
            const cursorPos = range.startOffset
            const beforeCursor = text.substring(0, cursorPos)
            
            // Check if user typed "/" - simplified detection
            if (beforeCursor.endsWith('/')) {
              console.log('Slash command detected:', beforeCursor)
              const rect = range.getBoundingClientRect()
              setEmbedPalettePosition({
                top: rect.bottom + window.scrollY,
                left: rect.left + window.scrollX
              })
              setShowEmbedPalette(true)
            } else if (showEmbedPalette && !beforeCursor.includes('/')) {
              setShowEmbedPalette(false)
            }
          }
        }
      }
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const text = e.clipboardData.getData('text/plain')
    if (typeof document !== 'undefined') {
      document.execCommand('insertText', false, text)
    }
  }

  const insertLink = () => {
    const url = prompt('Enter URL:')
    if (url) {
      execCommand('createLink', url)
    }
  }

  const insertImage = () => {
    const url = prompt('Enter image URL:')
    if (url) {
      execCommand('insertImage', url)
    }
  }

  const handleEmbed = (embedData: Partial<EmbedData>) => {
    console.log('Creating embed with data:', embedData)
    
    const newEmbed: EmbedData = {
      id: `embed-${Date.now()}`,
      provider: embedData.provider || 'generic',
      url: embedData.url || '',
      title: embedData.title || '',
      description: embedData.description || '',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...embedData
    }
    
    console.log('New embed created:', newEmbed)
    setEmbeds(prev => [...prev, newEmbed])
    
    // Create embed HTML string
    const embedHtml = `
      <div class="embed-placeholder my-4" data-embed-id="${newEmbed.id}" style="display: block !important; margin: 16px 0 !important; border: 1px solid #e5e7eb !important; border-radius: 8px !important; padding: 16px !important; background: white !important;">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
          <span style="font-size: 18px;">${embedData.provider === 'github' ? '🐙' : '🔗'}</span>
          <span style="font-weight: 600; font-size: 14px;">${newEmbed.title}</span>
        </div>
        <p style="color: #666; margin-bottom: 8px; font-size: 14px;">${newEmbed.description}</p>
        <a 
          href="${newEmbed.url}" 
          target="_blank" 
          rel="noopener noreferrer"
          style="color: #0066cc; text-decoration: none; font-size: 12px;"
        >
          Open Link →
        </a>
      </div>
    `
    
    // Get current content and append embed
    const currentContent = editorRef.current?.innerHTML || ''
    const newContent = currentContent + embedHtml
    
    console.log('Current content length:', currentContent.length)
    console.log('New content length:', newContent.length)
    
    // Update the content directly
    onChange(newContent)
    
    setShowEmbedPalette(false)
  }

  const testEmbed = () => {
    console.log('Test embed button clicked')
    handleEmbed({
      provider: 'github',
      url: 'https://github.com/antoine2025-ux/lumi-work-os',
      title: 'antoine2025-ux/lumi-work-os',
      description: 'GitHub repository'
    })
  }

  const toolbarButtons = [
    { icon: Bold, command: 'bold', title: 'Bold' },
    { icon: Italic, command: 'italic', title: 'Italic' },
    { icon: Underline, command: 'underline', title: 'Underline' },
    { icon: Heading1, command: 'formatBlock', value: 'h1', title: 'Heading 1' },
    { icon: Heading2, command: 'formatBlock', value: 'h2', title: 'Heading 2' },
    { icon: Heading3, command: 'formatBlock', value: 'h3', title: 'Heading 3' },
    { icon: List, command: 'insertUnorderedList', title: 'Bullet List' },
    { icon: ListOrdered, command: 'insertOrderedList', title: 'Numbered List' },
    { icon: Quote, command: 'formatBlock', value: 'blockquote', title: 'Quote' },
    { icon: Code, command: 'formatBlock', value: 'pre', title: 'Code Block' },
    { icon: AlignLeft, command: 'justifyLeft', title: 'Align Left' },
    { icon: AlignCenter, command: 'justifyCenter', title: 'Align Center' },
    { icon: AlignRight, command: 'justifyRight', title: 'Align Right' },
    { icon: Plus, action: () => setShowEmbedPalette(true), title: 'Embed' },
    { icon: Plus, action: testEmbed, title: 'Test GitHub Embed' }
  ]

  if (!editable) {
    return (
      <div 
        className={`prose prose-slate max-w-none ${className}`}
        dangerouslySetInnerHTML={{ __html: content }}
      />
    )
  }

  return (
    <div className={`border rounded-lg ${isFocused ? 'ring-2 ring-ring' : ''} ${className}`}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 p-2 border-b bg-muted/50">
        {toolbarButtons.map((button, index) => (
          <Button
            key={index}
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            title={button.title}
            onClick={() => execCommand(button.command, button.value)}
          >
            <button.icon className="h-4 w-4" />
          </Button>
        ))}
        <div className="w-px h-6 bg-border mx-1" />
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2"
          onClick={insertLink}
        >
          <Link className="h-4 w-4 mr-1" />
          Link
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2"
          onClick={insertImage}
        >
          <Image className="h-4 w-4 mr-1" />
          Image
        </Button>
        <div className="w-px h-6 bg-border mx-1" />
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2"
          onClick={() => setShowEmbedPalette(true)}
        >
          <Plus className="h-4 w-4 mr-1" />
          Embed
        </Button>
      </div>

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable={editable}
        className="min-h-[400px] p-4 focus:outline-none"
        onInput={handleInput}
        onPaste={handlePaste}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        data-placeholder={placeholder}
        style={{
          '--tw-prose-body': 'inherit',
          '--tw-prose-headings': 'inherit',
          '--tw-prose-lead': 'inherit',
          '--tw-prose-links': 'inherit',
          '--tw-prose-bold': 'inherit',
          '--tw-prose-counters': 'inherit',
          '--tw-prose-bullets': 'inherit',
          '--tw-prose-hr': 'inherit',
          '--tw-prose-quotes': 'inherit',
          '--tw-prose-quote-borders': 'inherit',
          '--tw-prose-captions': 'inherit',
          '--tw-prose-code': 'inherit',
          '--tw-prose-pre-code': 'inherit',
          '--tw-prose-pre-bg': 'inherit',
          '--tw-prose-th-borders': 'inherit',
          '--tw-prose-td-borders': 'inherit',
        } as React.CSSProperties}
      />
      
      {/* Placeholder */}
      {!content && (
        <div className="absolute top-16 left-4 text-muted-foreground pointer-events-none">
          {placeholder}
        </div>
      )}

      {/* Embed Command Palette */}
      <EmbedCommandPalette
        isOpen={showEmbedPalette}
        onClose={() => setShowEmbedPalette(false)}
        onEmbed={handleEmbed}
        position={embedPalettePosition}
      />
    </div>
  )
}

