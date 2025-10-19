"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  History, 
  User, 
  Clock, 
  Eye, 
  RotateCcw, 
  X,
  FileText,
  Calendar
} from "lucide-react"

interface WikiVersion {
  id: string
  version: number
  content: string
  createdAt: string
  createdBy: {
    id: string
    name: string
    email: string
  }
}

interface VersionHistoryProps {
  pageId: string
  onClose: () => void
  onRestore?: (version: WikiVersion) => void
}

export function VersionHistory({ pageId, onClose, onRestore }: VersionHistoryProps) {
  const [versions, setVersions] = useState<WikiVersion[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedVersion, setSelectedVersion] = useState<WikiVersion | null>(null)

  useEffect(() => {
    const fetchVersions = async () => {
      try {
        const response = await fetch(`/api/wiki/pages/${pageId}/versions`)
        if (response.ok) {
          const data = await response.json()
          setVersions(data)
        }
      } catch (error) {
        console.error('Error fetching versions:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchVersions()
  }, [pageId])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString()
    }
  }

  const stripHtml = (html: string) => {
    if (!html) return ''
    return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim()
  }

  const handleRestore = (version: WikiVersion) => {
    if (onRestore) {
      onRestore(version)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <History className="h-5 w-5" />
              <span>Version History</span>
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="overflow-y-auto max-h-[70vh]">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading version history...</p>
            </div>
          ) : versions.length > 0 ? (
            <div className="space-y-4">
              {versions.map((version) => {
                const { date, time } = formatDate(version.createdAt)
                const isSelected = selectedVersion?.id === version.id
                
                return (
                  <div
                    key={version.id}
                    className={`border rounded-lg p-4 transition-colors ${
                      isSelected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <Badge variant="outline">v{version.version}</Badge>
                          {version.version === Math.max(...versions.map(v => v.version)) && (
                            <Badge variant="default">Current</Badge>
                          )}
                        </div>
                        
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground mb-3">
                          <div className="flex items-center space-x-1">
                            <User className="h-4 w-4" />
                            <span>{version.createdBy.name}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-4 w-4" />
                            <span>{date}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Clock className="h-4 w-4" />
                            <span>{time}</span>
                          </div>
                        </div>

                        <div className="text-sm text-muted-foreground line-clamp-3">
                          {stripHtml(version.content)}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedVersion(
                            selectedVersion?.id === version.id ? null : version
                          )}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          {isSelected ? 'Hide' : 'Preview'}
                        </Button>
                        
                        {version.version !== Math.max(...versions.map(v => v.version)) && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRestore(version)}
                          >
                            <RotateCcw className="h-4 w-4 mr-1" />
                            Restore
                          </Button>
                        )}
                      </div>
                    </div>

                    {isSelected && (
                      <div className="mt-4 pt-4 border-t">
                        <div className="bg-muted p-4 rounded-lg">
                          <div className="flex items-center space-x-2 mb-2">
                            <FileText className="h-4 w-4" />
                            <span className="font-medium">Content Preview</span>
                          </div>
                          <div 
                            className="prose prose-sm max-w-none"
                            dangerouslySetInnerHTML={{ __html: version.content }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <History className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No version history</h3>
              <p className="text-muted-foreground">
                This page doesn't have any version history yet.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
