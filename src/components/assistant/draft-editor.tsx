"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { 
  Save, 
  X, 
  Eye, 
  Edit,
  CheckCircle
} from "lucide-react"

interface DraftEditorProps {
  title: string
  body: string
  format: 'markdown' | 'html'
  onSave: (title: string, body: string) => void
  onCancel: () => void
}

export function DraftEditor({ title, body, format, onSave, onCancel }: DraftEditorProps) {
  const [editTitle, setEditTitle] = useState(title)
  const [editBody, setEditBody] = useState(body)
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit')
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    setHasChanges(editTitle !== title || editBody !== body)
  }, [editTitle, editBody, title, body])

  const handleSave = () => {
    onSave(editTitle, editBody)
  }

  const renderPreview = () => {
    if (format === 'markdown') {
      // Simple markdown preview - in a real app you'd use a proper markdown renderer
      return (
        <div className="prose prose-sm max-w-none">
          <h1>{editTitle}</h1>
          <div className="whitespace-pre-wrap">{editBody}</div>
        </div>
      )
    } else {
      // HTML preview
      return (
        <div 
          className="prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: editBody }}
        />
      )
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl h-[80vh] flex flex-col">
        <CardHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Edit className="h-5 w-5" />
              <span>Edit Draft</span>
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Badge variant="outline">{format.toUpperCase()}</Badge>
              <div className="flex space-x-1">
                <Button
                  variant={viewMode === 'edit' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('edit')}
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
                <Button
                  variant={viewMode === 'preview' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('preview')}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  Preview
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="flex-1 flex flex-col space-y-4 overflow-hidden">
          <Input
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            placeholder="Document title"
            className="flex-shrink-0"
          />
          
          <div className="flex-1 flex flex-col">
            {viewMode === 'edit' ? (
              <Textarea
                value={editBody}
                onChange={(e) => setEditBody(e.target.value)}
                placeholder="Document content"
                className="flex-1 resize-none"
              />
            ) : (
              <div className="flex-1 overflow-y-auto border rounded p-4 bg-gray-50">
                {renderPreview()}
              </div>
            )}
          </div>
          
          <div className="flex items-center justify-between flex-shrink-0">
            <div className="text-sm text-gray-500">
              {hasChanges ? (
                <span className="text-orange-600">• Unsaved changes</span>
              ) : (
                <span className="text-green-600">✓ Saved</span>
              )}
            </div>
            
            <div className="flex space-x-2">
              <Button variant="outline" onClick={onCancel}>
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
              <Button 
                onClick={handleSave}
                disabled={!hasChanges}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Save className="h-4 w-4 mr-1" />
                Save Changes
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
