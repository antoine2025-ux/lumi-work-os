"use client"

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { 
  Bold, 
  Italic, 
  Underline, 
  List, 
  ListOrdered,
  Quote,
  Link,
  X
} from 'lucide-react'

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  rows?: number
  className?: string
  required?: boolean
}

export function RichTextEditor({ 
  value, 
  onChange, 
  placeholder, 
  rows = 8, 
  className = "",
  required = false 
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const [showToolbar, setShowToolbar] = useState(false)
  const [selectedText, setSelectedText] = useState('')
  const [isComposing, setIsComposing] = useState(false)

  const handleInput = () => {
    if (editorRef.current && !isComposing) {
      const html = editorRef.current.innerHTML
      onChange(html)
    }
  }

  const handleSelection = () => {
    const selection = window.getSelection()
    if (!selection || !editorRef.current) return

    const selectedText = selection.toString()
    setSelectedText(selectedText)
    setShowToolbar(selectedText.length > 0)
  }

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value)
    editorRef.current?.focus()
    handleInput()
    setShowToolbar(false)
  }

  const formatBold = () => execCommand('bold')
  const formatItalic = () => execCommand('italic')
  const formatUnderline = () => execCommand('underline')

  const formatBulletList = () => {
    execCommand('insertUnorderedList')
  }

  const formatNumberedList = () => {
    execCommand('insertOrderedList')
  }

  const formatQuote = () => {
    const selection = window.getSelection()
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0)
      const blockquote = document.createElement('blockquote')
      blockquote.style.borderLeft = '4px solid var(--border)'
      blockquote.style.paddingLeft = '16px'
      blockquote.style.margin = '8px 0'
      blockquote.style.fontStyle = 'italic'
      blockquote.style.color = 'var(--muted-foreground)'
      
      try {
        range.surroundContents(blockquote)
        handleInput()
        setShowToolbar(false)
      } catch (e) {
        // If surroundContents fails, insert as HTML
        const content = selection.toString()
        if (content) {
          execCommand('insertHTML', `<blockquote style="border-left: 4px solid var(--border); padding-left: 16px; margin: 8px 0; font-style: italic; color: var(--muted-foreground);">${content}</blockquote>`)
        }
      }
    }
  }

  const formatLink = () => {
    const url = prompt('Enter URL:')
    if (url) {
      execCommand('createLink', url)
    }
  }

  const closeToolbar = () => {
    setShowToolbar(false)
    setSelectedText('')
  }

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value
    }
  }, [value])

  useEffect(() => {
    const editor = editorRef.current
    if (!editor) return

    editor.addEventListener('input', handleInput)
    editor.addEventListener('mouseup', handleSelection)
    editor.addEventListener('keyup', handleSelection)
    editor.addEventListener('compositionstart', () => setIsComposing(true))
    editor.addEventListener('compositionend', () => setIsComposing(false))

    return () => {
      editor.removeEventListener('input', handleInput)
      editor.removeEventListener('mouseup', handleSelection)
      editor.removeEventListener('keyup', handleSelection)
      editor.removeEventListener('compositionstart', () => setIsComposing(true))
      editor.removeEventListener('compositionend', () => setIsComposing(false))
    }
  }, [])

  return (
    <div className="relative">
      <div
        ref={editorRef}
        contentEditable
        className={`min-h-[200px] resize-y border border-input rounded-md bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
        style={{ 
          minHeight: '200px',
          outline: 'none',
          whiteSpace: 'pre-wrap',
          wordWrap: 'break-word'
        }}
        data-placeholder={placeholder}
        suppressContentEditableWarning={true}
      />
      
      {/* Floating Toolbar */}
      {showToolbar && (
        <div className="absolute top-[-50px] left-0 bg-popover border border-border rounded-lg shadow-lg p-2 flex items-center gap-1 z-10">
          <Button
            variant="ghost"
            size="sm"
            onClick={formatBold}
            title="Bold"
            className="h-8 w-8 p-0"
          >
            <Bold className="h-4 w-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={formatItalic}
            title="Italic"
            className="h-8 w-8 p-0"
          >
            <Italic className="h-4 w-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={formatUnderline}
            title="Underline"
            className="h-8 w-8 p-0"
          >
            <Underline className="h-4 w-4" />
          </Button>
          
          <div className="w-px h-6 bg-border mx-1" />
          
          <Button
            variant="ghost"
            size="sm"
            onClick={formatBulletList}
            title="Bullet List"
            className="h-8 w-8 p-0"
          >
            <List className="h-4 w-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={formatNumberedList}
            title="Numbered List"
            className="h-8 w-8 p-0"
          >
            <ListOrdered className="h-4 w-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={formatQuote}
            title="Quote"
            className="h-8 w-8 p-0"
          >
            <Quote className="h-4 w-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={formatLink}
            title="Link"
            className="h-8 w-8 p-0"
          >
            <Link className="h-4 w-4" />
          </Button>
          
          <div className="w-px h-6 bg-border mx-1" />
          
          <Button
            variant="ghost"
            size="sm"
            onClick={closeToolbar}
            title="Close"
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
      
      {/* Formatting Help */}
      <div className="mt-2 text-xs text-muted-foreground">
        <p>💡 <strong>Tip:</strong> Select text to see formatting options. Use the toolbar buttons for rich text formatting.</p>
      </div>
    </div>
  )
}
