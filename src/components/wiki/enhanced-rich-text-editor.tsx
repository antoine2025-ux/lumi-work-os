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
  Plus,
  Type,
  Palette,
  Table,
  CheckSquare,
  Minus,
  MoreHorizontal
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

export function EnhancedRichTextEditor({ 
  content, 
  onChange, 
  placeholder = "Start writing...", 
  editable = true,
  className = "",
  showToolbar = true
}: RichTextEditorProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [showEmbedPalette, setShowEmbedPalette] = useState(false)
  const editorRef = useRef<HTMLDivElement>(null)
  const [currentFormat, setCurrentFormat] = useState<string[]>([])

  // Initialize editor content
  useEffect(() => {
    if (editorRef.current && !isEditing) {
      editorRef.current.innerHTML = content || ''
    }
  }, [content, isEditing])

  // Handle content changes
  const handleContentChange = () => {
    if (editorRef.current) {
      const newContent = editorRef.current.innerHTML
      onChange(newContent)
    }
  }

  // Format text
  const formatText = (command: string, value?: string) => {
    document.execCommand(command, false, value)
    editorRef.current?.focus()
    handleContentChange()
  }

  // Insert content
  const insertContent = (html: string) => {
    document.execCommand('insertHTML', false, html)
    editorRef.current?.focus()
    handleContentChange()
  }

  // Insert heading
  const insertHeading = (level: number) => {
    const headingText = `Heading ${level}`
    const headingHtml = `<h${level}>${headingText}</h${level}>`
    insertContent(headingHtml)
  }

  // Insert list
  const insertList = (ordered: boolean = false) => {
    const listType = ordered ? 'ol' : 'ul'
    const listHtml = `<${listType}><li>List item</li></${listType}>`
    insertContent(listHtml)
  }

  // Insert quote
  const insertQuote = () => {
    const quoteHtml = '<blockquote>Quote text</blockquote>'
    insertContent(quoteHtml)
  }

  // Insert code block
  const insertCodeBlock = () => {
    const codeHtml = '<pre><code>Code block</code></pre>'
    insertContent(codeHtml)
  }

  // Insert table
  const insertTable = () => {
    const tableHtml = `
      <table style="border-collapse: collapse; width: 100%;">
        <thead>
          <tr>
            <th style="border: 1px solid #ddd; padding: 8px;">Header 1</th>
            <th style="border: 1px solid #ddd; padding: 8px;">Header 2</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="border: 1px solid #ddd; padding: 8px;">Cell 1</td>
            <td style="border: 1px solid #ddd; padding: 8px;">Cell 2</td>
          </tr>
        </tbody>
      </table>
    `
    insertContent(tableHtml)
  }

  // Insert checklist
  const insertChecklist = () => {
    const checklistHtml = `
      <div style="margin: 8px 0;">
        <label style="display: flex; align-items: center; gap: 8px;">
          <input type="checkbox" style="margin: 0;">
          <span>Checklist item</span>
        </label>
      </div>
    `
    insertContent(checklistHtml)
  }

  // Insert horizontal rule
  const insertHorizontalRule = () => {
    const hrHtml = '<hr style="margin: 16px 0; border: none; border-top: 1px solid #ddd;">'
    insertContent(hrHtml)
  }

  // Insert embed
  const insertEmbed = (embed: EmbedData) => {
    const embedHtml = `<div data-embed-id="${embed.id}" class="embed-placeholder" style="border: 2px dashed #ddd; padding: 16px; margin: 16px 0; text-align: center; color: #666;">
      <strong>${embed.title}</strong><br>
      <small>${embed.description}</small>
    </div>`
    insertContent(embedHtml)
  }

  // Handle embed palette selection
  const handleEmbedSelect = (embed: EmbedData) => {
    insertEmbed(embed)
    setShowEmbedPalette(false)
  }

  // Toolbar component
  const Toolbar = () => {
    if (!showToolbar || !editable) return null

    return (
      <div className="border-b border-border p-3 bg-muted">
        <div className="flex items-center gap-1 flex-wrap">
          {/* Text Formatting */}
          <div className="flex items-center gap-1 border-r border-border pr-2 mr-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => formatText('bold')}
              className="h-8 w-8 p-0"
            >
              <Bold className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => formatText('italic')}
              className="h-8 w-8 p-0"
            >
              <Italic className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => formatText('underline')}
              className="h-8 w-8 p-0"
            >
              <Underline className="h-4 w-4" />
            </Button>
          </div>

          {/* Headings */}
          <div className="flex items-center gap-1 border-r border-border pr-2 mr-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => insertHeading(1)}
              className="h-8 w-8 p-0"
            >
              <Heading1 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => insertHeading(2)}
              className="h-8 w-8 p-0"
            >
              <Heading2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => insertHeading(3)}
              className="h-8 w-8 p-0"
            >
              <Heading3 className="h-4 w-4" />
            </Button>
          </div>

          {/* Lists */}
          <div className="flex items-center gap-1 border-r border-border pr-2 mr-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => insertList(false)}
              className="h-8 w-8 p-0"
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => insertList(true)}
              className="h-8 w-8 p-0"
            >
              <ListOrdered className="h-4 w-4" />
            </Button>
          </div>

          {/* Special Elements */}
          <div className="flex items-center gap-1 border-r border-border pr-2 mr-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={insertQuote}
              className="h-8 w-8 p-0"
            >
              <Quote className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={insertCodeBlock}
              className="h-8 w-8 p-0"
            >
              <Code className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={insertTable}
              className="h-8 w-8 p-0"
            >
              <Table className="h-4 w-4" />
            </Button>
          </div>

          {/* Interactive Elements */}
          <div className="flex items-center gap-1 border-r border-border pr-2 mr-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={insertChecklist}
              className="h-8 w-8 p-0"
            >
              <CheckSquare className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={insertHorizontalRule}
              className="h-8 w-8 p-0"
            >
              <Minus className="h-4 w-4" />
            </Button>
          </div>

          {/* Links and Media */}
          <div className="flex items-center gap-1 border-r border-border pr-2 mr-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => formatText('createLink', 'https://')}
              className="h-8 w-8 p-0"
            >
              <Link className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => formatText('insertImage', 'https://')}
              className="h-8 w-8 p-0"
            >
              <Image className="h-4 w-4" />
            </Button>
          </div>

          {/* Embed */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowEmbedPalette(true)}
              className="h-8 w-8 p-0"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`border border-border rounded-lg bg-card ${className}`}>
      <Toolbar />
      
      <div
        ref={editorRef}
        contentEditable={editable}
        onInput={handleContentChange}
        onFocus={() => setIsEditing(true)}
        onBlur={() => setIsEditing(false)}
        className="min-h-[200px] p-4 focus:outline-none prose prose-slate max-w-none"
        style={{
          minHeight: '200px',
          outline: 'none'
        }}
        suppressContentEditableWarning={true}
      >
        {!content && (
          <div className="text-gray-400 italic">
            {placeholder}
          </div>
        )}
      </div>

      {/* Embed Command Palette */}
      {showEmbedPalette && (
        <EmbedCommandPalette
          onSelect={handleEmbedSelect}
          onClose={() => setShowEmbedPalette(false)}
        />
      )}
    </div>
  )
}
