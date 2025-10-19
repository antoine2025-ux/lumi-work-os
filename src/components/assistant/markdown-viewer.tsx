"use client"

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Edit3, Save, X } from 'lucide-react'

interface MarkdownViewerProps {
  content: string
  title: string
  onSave?: (newContent: string) => void
  editable?: boolean
}

export default function MarkdownViewer({ content, title, onSave, editable = false }: MarkdownViewerProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedContent, setEditedContent] = useState(content)

  const handleSave = () => {
    if (onSave) {
      onSave(editedContent)
    }
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditedContent(content)
    setIsEditing(false)
  }

  return (
    <div className="prose prose-gray max-w-none">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 m-0">{title}</h1>
        {editable && (
          <div className="flex space-x-2">
            {isEditing ? (
              <>
                <Button size="sm" onClick={handleSave} className="flex items-center">
                  <Save className="h-4 w-4 mr-1" />
                  Save
                </Button>
                <Button size="sm" variant="outline" onClick={handleCancel} className="flex items-center">
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
              </>
            ) : (
              <Button size="sm" variant="outline" onClick={() => setIsEditing(true)} className="flex items-center">
                <Edit3 className="h-4 w-4 mr-1" />
                Edit
              </Button>
            )}
          </div>
        )}
      </div>

      {isEditing ? (
        <Textarea
          value={editedContent}
          onChange={(e) => setEditedContent(e.target.value)}
          className="min-h-[500px] font-mono text-sm"
          placeholder="Enter markdown content..."
        />
      ) : (
        <div className="markdown-content">
          <ReactMarkdown 
            remarkPlugins={[remarkGfm]}
            components={{
              h1: ({ children }) => <h1 className="text-2xl font-bold text-gray-900 mt-8 mb-4">{children}</h1>,
              h2: ({ children }) => <h2 className="text-xl font-semibold text-gray-800 mt-6 mb-3">{children}</h2>,
              h3: ({ children }) => <h3 className="text-lg font-medium text-gray-700 mt-4 mb-2">{children}</h3>,
              p: ({ children }) => <p className="text-gray-700 mb-4 leading-relaxed">{children}</p>,
              ul: ({ children }) => <ul className="list-disc list-inside mb-4 space-y-1">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal list-inside mb-4 space-y-1">{children}</ol>,
              li: ({ children }) => <li className="text-gray-700">{children}</li>,
              strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
              em: ({ children }) => <em className="italic text-gray-600">{children}</em>,
              code: ({ children }) => <code className="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono">{children}</code>,
              pre: ({ children }) => <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto mb-4">{children}</pre>,
              blockquote: ({ children }) => <blockquote className="border-l-4 border-gray-300 pl-4 italic text-gray-600 mb-4">{children}</blockquote>,
            }}
          >
            {content}
          </ReactMarkdown>
        </div>
      )}
    </div>
  )
}
