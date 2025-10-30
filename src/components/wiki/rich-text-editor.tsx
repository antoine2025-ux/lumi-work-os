"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { 
  Bold, 
  Italic, 
  Underline, 
  Strikethrough,
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
  Plus,
  Table,
  X
} from "lucide-react"
import { EmbedCommandPalette } from "@/components/embeds/embed-command-palette"
import { EmbedData } from "@/types/embeds"

interface RichTextEditorProps {
  content: string
  onChange: (content: string) => void
  placeholder?: string
  editable?: boolean
  className?: string
  showToolbar?: boolean
}

export function RichTextEditor({ 
  content, 
  onChange, 
  placeholder = "Start writing...", 
  editable = true,
  className = "",
  showToolbar = true
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const toolbarRef = useRef<HTMLDivElement>(null)
  const deleteButtonRef = useRef<HTMLDivElement>(null)
  const [isFocused, setIsFocused] = useState(false)
  const [showEmbedPalette, setShowEmbedPalette] = useState(false)
  const [embedPalettePosition, setEmbedPalettePosition] = useState({ top: 0, left: 0 })
  const [embeds, setEmbeds] = useState<EmbedData[]>([])
  const [isInsertingEmbed, setIsInsertingEmbed] = useState(false)
  const [showFloatingToolbar, setShowFloatingToolbar] = useState(false)
  const [toolbarPosition, setToolbarPosition] = useState({ top: 0, left: 0 })
  const [showContextMenu, setShowContextMenu] = useState(false)
  const [contextMenuPosition, setContextMenuPosition] = useState({ top: 0, left: 0 })
  const [hoveredTable, setHoveredTable] = useState<HTMLTableElement | null>(null)
  const [deleteButtonPosition, setDeleteButtonPosition] = useState({ top: 0, left: 0 })
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [tableHoverZones, setTableHoverZones] = useState<Array<{ table: HTMLTableElement, top: number, left: number }>>([])

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== content && !isInsertingEmbed) {
      editorRef.current.innerHTML = content
    }
  }, [content, isInsertingEmbed])

  // Create hover zones for tables in the top-right corner
  useEffect(() => {
    if (!editorRef.current) return
    if (!editable) return
    
    const updateHoverZones = () => {
      const tables = editorRef.current!.querySelectorAll('table')
      const zones: Array<{ table: HTMLTableElement, top: number, left: number }> = []
      
      tables.forEach(table => {
        const tableRect = table.getBoundingClientRect()
        const editorRect = editorRef.current!.getBoundingClientRect()
        
        zones.push({
          table: table as HTMLTableElement,
          top: tableRect.top - editorRect.top - 35,
          left: tableRect.right - editorRect.left - 40
        })
      })
      
      setTableHoverZones(zones)
    }
    
    updateHoverZones()
    
    // Update zones on scroll or resize
    const observer = new MutationObserver(updateHoverZones)
    if (editorRef.current) {
      observer.observe(editorRef.current, { childList: true, subtree: true })
    }
    
    window.addEventListener('scroll', updateHoverZones)
    
    return () => {
      observer.disconnect()
      window.removeEventListener('scroll', updateHoverZones)
    }
  }, [content, editable])

  const deleteTable = (table: HTMLTableElement) => {
    table.remove()
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML)
    }
    setHoveredTable(null)
  }

  // Handle text selection for floating toolbar
  useEffect(() => {
    const handleSelectionChange = () => {
      if (typeof window === 'undefined' || !editorRef.current) return

      const selection = window.getSelection()
      if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
        setShowFloatingToolbar(false)
        return
      }

      // Check if selection is within the editor
      const range = selection.getRangeAt(0)
      const commonAncestor = range.commonAncestorContainer
      
      if (!editorRef.current.contains(commonAncestor)) {
        setShowFloatingToolbar(false)
        return
      }

      // Get position of selected text
      const rect = range.getBoundingClientRect()
      const editorRect = editorRef.current.getBoundingClientRect()
      
      setToolbarPosition({
        top: rect.top - editorRect.top - 40,
        left: rect.left - editorRect.left + (rect.width / 2) - 100,
      })
      setShowFloatingToolbar(true)
    }

    document.addEventListener('selectionchange', handleSelectionChange)
    document.addEventListener('mouseup', handleSelectionChange)
    
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange)
      document.removeEventListener('mouseup', handleSelectionChange)
    }
  }, [])

  const execCommand = (command: string, value?: string) => {
    if (typeof document !== 'undefined') {
      document.execCommand(command, false, value)
      if (editorRef.current) {
        onChange(editorRef.current.innerHTML)
      }
      // Hide floating toolbar after applying format
      setShowFloatingToolbar(false)
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

  const insertTable = (rows: number = 3, cols: number = 3) => {
    if (!editorRef.current) return

    const table = document.createElement('table')
    table.style.borderCollapse = 'collapse'
    table.style.width = '100%'
    table.style.margin = '16px 0'
    
    for (let i = 0; i < rows; i++) {
      const row = document.createElement('tr')
      for (let j = 0; j < cols; j++) {
        const cell = document.createElement(i === 0 ? 'th' : 'td')
        cell.style.border = '1px solid #e5e7eb'
        cell.style.padding = '8px 12px'
        cell.style.textAlign = 'left'
        if (i === 0) {
          cell.style.backgroundColor = '#f9fafb'
          cell.style.fontWeight = '600'
        }
        cell.innerHTML = '&nbsp;'
        row.appendChild(cell)
      }
      table.appendChild(row)
    }
    
    // Insert table at current cursor position
    const selection = window.getSelection()
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0)
      range.insertNode(table)
      // Update content
      onChange(editorRef.current.innerHTML)
    }
  }

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    
    if (!editorRef.current) return
    
    const rect = editorRef.current.getBoundingClientRect()
    setContextMenuPosition({
      top: e.clientY - rect.top,
      left: e.clientX - rect.left
    })
    setShowContextMenu(true)
  }

  useEffect(() => {
    const handleClickOutsideContextMenu = (e: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        setShowContextMenu(false)
      }
    }

    if (showContextMenu) {
      document.addEventListener('click', handleClickOutsideContextMenu)
    }
    return () => {
      document.removeEventListener('click', handleClickOutsideContextMenu)
    }
  }, [showContextMenu])

  const toolbarButtons = [
    { icon: Bold, command: 'bold', title: 'Bold' },
    { icon: Italic, command: 'italic', title: 'Italic' },
    { icon: Underline, command: 'underline', title: 'Underline' },
    { icon: Strikethrough, command: 'strikeThrough', title: 'Strikethrough' },
    { icon: Heading1, command: 'formatBlock', value: 'H1', title: 'Heading 1' },
    { icon: Heading2, command: 'formatBlock', value: 'H2', title: 'Heading 2' },
    { icon: Heading3, command: 'formatBlock', value: 'H3', title: 'Heading 3' },
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

  // Floating toolbar buttons - limited set for text selection
  const floatingToolbarButtons = [
    { icon: Bold, command: 'bold', title: 'Bold' },
    { icon: Italic, command: 'italic', title: 'Italic' },
    { icon: Underline, command: 'underline', title: 'Underline' },
    { icon: Strikethrough, command: 'strikeThrough', title: 'Strikethrough' },
    { icon: Heading1, command: 'formatBlock', value: 'H1', title: 'Heading 1' },
    { icon: Heading2, command: 'formatBlock', value: 'H2', title: 'Heading 2' },
    { icon: Heading3, command: 'formatBlock', value: 'H3', title: 'Heading 3' },
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
    <div className={`relative ${showToolbar ? 'border rounded-lg' : ''} ${className}`}>
      {/* Toolbar */}
      {showToolbar && (
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
      )}

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable={editable}
        className={`min-h-[400px] focus:outline-none focus:ring-0 focus:border-0 wiki-editor ${!showToolbar ? 'p-0' : 'p-4'}`}
        onInput={handleInput}
        onPaste={handlePaste}
        onContextMenu={handleContextMenu}
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
        <div className={`absolute text-muted-foreground pointer-events-none ${!showToolbar ? 'top-0 left-0' : 'top-16 left-4'}`}>
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

      {/* Floating Toolbar on Text Selection */}
      {showFloatingToolbar && (
        <div
          ref={toolbarRef}
          className="absolute z-50 flex items-center gap-1 bg-white border rounded-lg shadow-lg p-1"
          style={{
            top: `${toolbarPosition.top}px`,
            left: `${toolbarPosition.left}px`,
            transform: 'translateX(-50%)',
          }}
          onMouseDown={(e) => e.preventDefault()}
        >
          {floatingToolbarButtons.map((button, index) => (
            <Button
              key={index}
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 hover:bg-muted"
              title={button.title}
              onClick={() => execCommand(button.command, button.value)}
            >
              <button.icon className="h-4 w-4" />
            </Button>
          ))}
        </div>
      )}

      {/* Right-Click Context Menu */}
      {showContextMenu && editable && (
        <div
          ref={toolbarRef}
          className="absolute z-50 bg-white border rounded-lg shadow-xl py-1 min-w-[180px]"
          style={{
            top: `${contextMenuPosition.top}px`,
            left: `${contextMenuPosition.left}px`,
          }}
          onMouseDown={(e) => e.preventDefault()}
        >
          <button
            onClick={() => {
              insertTable(2, 2)
              setShowContextMenu(false)
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            <Table className="h-4 w-4" />
            Table (2x2)
          </button>
          <button
            onClick={() => {
              insertTable(3, 3)
              setShowContextMenu(false)
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            <Table className="h-4 w-4" />
            Table (3x3)
          </button>
          <button
            onClick={() => {
              insertTable(4, 4)
              setShowContextMenu(false)
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            <Table className="h-4 w-4" />
            Table (4x4)
          </button>
          <div className="border-t border-gray-200 my-1" />
          <button
            onClick={() => {
              execCommand('insertUnorderedList')
              setShowContextMenu(false)
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            <List className="h-4 w-4" />
            Bullet List
          </button>
          <button
            onClick={() => {
              execCommand('insertOrderedList')
              setShowContextMenu(false)
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            <ListOrdered className="h-4 w-4" />
            Numbered List
          </button>
        </div>
      )}

      {/* Invisible hover zones for each table */}
      {tableHoverZones.map((zone, index) => (
        <div
          key={index}
          className="absolute z-40"
          style={{
            top: `${zone.top - 20}px`,
            left: `${zone.left - 20}px`,
            width: '80px',
            height: '80px',
          }}
          onMouseEnter={() => {
            if (hideTimeoutRef.current) {
              clearTimeout(hideTimeoutRef.current)
              hideTimeoutRef.current = null
            }
            setHoveredTable(zone.table)
            
            // Calculate button position for this table
            const tableRect = zone.table.getBoundingClientRect()
            const editorRect = editorRef.current?.getBoundingClientRect()
            if (editorRect) {
              setDeleteButtonPosition({
                top: tableRect.top - editorRect.top - 35,
                left: tableRect.right - editorRect.left - 20
              })
            }
          }}
          onMouseLeave={() => {
            hideTimeoutRef.current = setTimeout(() => {
              setHoveredTable(null)
            }, 300)
          }}
        />
      ))}

      {/* Table Delete Button */}
      {hoveredTable && editable && (
        <div
          ref={deleteButtonRef}
          className="absolute z-50"
          style={{
            top: `${deleteButtonPosition.top}px`,
            left: `${deleteButtonPosition.left}px`,
            padding: '10px',
          }}
          onMouseEnter={() => {
            // Clear hide timeout when hovering button
            if (hideTimeoutRef.current) {
              clearTimeout(hideTimeoutRef.current)
              hideTimeoutRef.current = null
            }
          }}
          onMouseLeave={() => {
            // Hide when leaving button
            hideTimeoutRef.current = setTimeout(() => {
              setHoveredTable(null)
            }, 200)
          }}
        >
          <div
            className="bg-red-600 text-white rounded-full p-1.5 shadow-lg cursor-pointer hover:bg-red-700 transition-colors"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              deleteTable(hoveredTable)
            }}
            onMouseDown={(e) => e.preventDefault()}
          >
            <X className="h-4 w-4" />
          </div>
        </div>
      )}

    </div>
  )
}

