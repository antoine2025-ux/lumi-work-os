"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  FileText, 
  Edit, 
  Download, 
  CheckCircle, 
  RefreshCw,
  ExternalLink
} from "lucide-react"
import { DraftEditor } from "./draft-editor"

interface DraftCardProps {
  title: string
  body: string
  format: 'markdown' | 'html'
  onUpdate: (updates: { draftTitle?: string; draftBody?: string }) => void
  onPublish: () => void
  onRegenerate: () => void
}

export function DraftCard({ 
  title, 
  body, 
  format, 
  onUpdate, 
  onPublish, 
  onRegenerate 
}: DraftCardProps) {
  const [showEditor, setShowEditor] = useState(false)
  const [isRegenerating, setIsRegenerating] = useState(false)

  const handleRegenerate = async () => {
    setIsRegenerating(true)
    try {
      await onRegenerate()
    } finally {
      setIsRegenerating(false)
    }
  }

  const handleEditorSave = (newTitle: string, newBody: string) => {
    onUpdate({
      draftTitle: newTitle,
      draftBody: newBody
    })
    setShowEditor(false)
  }

  const handleDownload = () => {
    const blob = new Blob([body], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${title}.${format === 'markdown' ? 'md' : 'html'}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const previewBody = body.length > 500 ? body.substring(0, 500) + '...' : body

  return (
    <>
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2 text-green-900">
              <FileText className="h-5 w-5" />
              <span>Draft Ready</span>
            </CardTitle>
            <Badge variant="outline" className="text-green-700">
              {format.toUpperCase()}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-medium text-green-900 mb-2">{title}</h3>
            <div className="bg-white p-3 rounded border text-sm text-gray-700 max-h-40 overflow-y-auto">
              <pre className="whitespace-pre-wrap font-sans">{previewBody}</pre>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => setShowEditor(true)}
              variant="outline"
              size="sm"
              className="text-green-700 border-green-300 hover:bg-green-100"
            >
              <Edit className="h-4 w-4 mr-1" />
              Edit
            </Button>
            
            <Button
              onClick={handleRegenerate}
              disabled={isRegenerating}
              variant="outline"
              size="sm"
              className="text-green-700 border-green-300 hover:bg-green-100"
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${isRegenerating ? 'animate-spin' : ''}`} />
              Regenerate
            </Button>
            
            <Button
              onClick={handleDownload}
              variant="outline"
              size="sm"
              className="text-green-700 border-green-300 hover:bg-green-100"
            >
              <Download className="h-4 w-4 mr-1" />
              Download
            </Button>
            
            <Button
              onClick={onPublish}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              Publish to Wiki
            </Button>
          </div>
        </CardContent>
      </Card>

      {showEditor && (
        <DraftEditor
          title={title}
          body={body}
          format={format}
          onSave={handleEditorSave}
          onCancel={() => setShowEditor(false)}
        />
      )}
    </>
  )
}
