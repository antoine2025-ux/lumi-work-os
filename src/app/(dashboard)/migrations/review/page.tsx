"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { 
  Download, 
  CheckCircle, 
  XCircle, 
  Eye, 
  FileText, 
  Calendar,
  User,
  Tag,
  Folder,
  AlertCircle,
  CheckSquare,
  Square
} from "lucide-react"

interface MigrationPreview {
  id: string
  title: string
  content: string
  type: string
  metadata: {
    originalId: string
    originalUrl?: string
    createdAt: string
    updatedAt: string
    author?: string
    tags?: string[]
    category?: string
    parentId?: string
    attachments?: Array<{
      id: string
      name: string
      url: string
      type: string
      size: number
    }>
  }
}

interface MigrationSession {
  id: string
  platform: string
  status: 'preview' | 'approved' | 'rejected' | 'imported'
  totalItems: number
  approvedItems: number
  rejectedItems: number
  createdAt: string
  items: MigrationPreview[]
}

export default function MigrationReviewPage() {
  const [migrationSessions, setMigrationSessions] = useState<MigrationSession[]>([])
  const [selectedSession, setSelectedSession] = useState<MigrationSession | null>(null)
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(false)
  const [isImporting, setIsImporting] = useState(false)

  // Load migration sessions
  useEffect(() => {
    loadMigrationSessions()
  }, [])

  const loadMigrationSessions = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/migrations/sessions')
      if (response.ok) {
        const sessions = await response.json()
        setMigrationSessions(sessions)
        if (sessions.length > 0) {
          setSelectedSession(sessions[0])
        }
      }
    } catch (error) {
      console.error('Error loading migration sessions:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleItemToggle = (itemId: string) => {
    const newSelected = new Set(selectedItems)
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId)
    } else {
      newSelected.add(itemId)
    }
    setSelectedItems(newSelected)
  }

  const handleSelectAll = () => {
    if (!selectedSession) return
    
    if (selectedItems.size === selectedSession.items.length) {
      setSelectedItems(new Set())
    } else {
      setSelectedItems(new Set(selectedSession.items.map(item => item.id)))
    }
  }

  const handleApproveSelected = async () => {
    if (!selectedSession || selectedItems.size === 0) return

    try {
      setIsImporting(true)
      const response = await fetch('/api/migrations/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: selectedSession.id,
          itemIds: Array.from(selectedItems)
        })
      })

      if (response.ok) {
        const result = await response.json()
        console.log('Import result:', result)
        
        // Reload sessions
        await loadMigrationSessions()
        setSelectedItems(new Set())
        
        // Show success message
        alert(`Successfully imported ${result.importedCount} items!`)
      } else {
        const error = await response.json()
        alert(`Import failed: ${error.error}`)
      }
    } catch (error) {
      console.error('Error importing items:', error)
      alert('Import failed. Please try again.')
    } finally {
      setIsImporting(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'preview':
        return <Eye className="h-4 w-4 text-blue-500" />
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'imported':
        return <CheckSquare className="h-4 w-4 text-green-600" />
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'preview':
        return 'bg-blue-500'
      case 'approved':
        return 'bg-green-500'
      case 'rejected':
        return 'bg-red-500'
      case 'imported':
        return 'bg-green-600'
      default:
        return 'bg-gray-500'
    }
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading migration sessions...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center space-x-2">
          <Download className="h-8 w-8 text-primary" />
          <span>Migration Review</span>
        </h1>
        <p className="text-muted-foreground">
          Review and approve migrated content before publishing to your wiki
        </p>
      </div>

      {migrationSessions.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Migration Sessions</h3>
            <p className="text-muted-foreground mb-4">
              No migration sessions found. Start a migration from the Settings page.
            </p>
            <Button onClick={() => window.location.href = '/settings'}>
              Go to Settings
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Migration Sessions List */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Migration Sessions</h2>
            {migrationSessions.map((session) => (
              <Card 
                key={session.id}
                className={`cursor-pointer transition-colors ${
                  selectedSession?.id === session.id ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => setSelectedSession(session)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium capitalize">{session.platform}</h3>
                    <div className="flex items-center space-x-1">
                      {getStatusIcon(session.status)}
                      <Badge className={getStatusColor(session.status)}>
                        {session.status}
                      </Badge>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    {formatDate(session.createdAt)}
                  </p>
                  <div className="flex justify-between text-sm">
                    <span>Total: {session.totalItems}</span>
                    <span>Approved: {session.approvedItems}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Migration Items Review */}
          {selectedSession && (
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">
                  Review Items - {selectedSession.platform}
                </h2>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    onClick={handleSelectAll}
                    size="sm"
                  >
                    {selectedItems.size === selectedSession.items.length ? (
                      <Square className="h-4 w-4 mr-2" />
                    ) : (
                      <CheckSquare className="h-4 w-4 mr-2" />
                    )}
                    {selectedItems.size === selectedSession.items.length ? 'Deselect All' : 'Select All'}
                  </Button>
                  <Button
                    onClick={handleApproveSelected}
                    disabled={selectedItems.size === 0 || isImporting}
                    size="sm"
                  >
                    {isImporting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Importing...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Import Selected ({selectedItems.size})
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                {selectedSession.items.map((item) => (
                  <Card key={item.id} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex items-start space-x-3">
                        <Checkbox
                          checked={selectedItems.has(item.id)}
                          onCheckedChange={() => handleItemToggle(item.id)}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-medium truncate">{item.title}</h3>
                            <Badge variant="outline" className="ml-2">
                              {item.type}
                            </Badge>
                          </div>
                          
                          <div className="flex items-center space-x-4 text-sm text-muted-foreground mb-2">
                            <div className="flex items-center space-x-1">
                              <User className="h-3 w-3" />
                              <span>{item.metadata.author || 'Unknown'}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Calendar className="h-3 w-3" />
                              <span>{formatDate(item.metadata.createdAt)}</span>
                            </div>
                            {item.metadata.category && (
                              <div className="flex items-center space-x-1">
                                <Folder className="h-3 w-3" />
                                <span>{item.metadata.category}</span>
                              </div>
                            )}
                          </div>

                          {item.metadata.tags && item.metadata.tags.length > 0 && (
                            <div className="flex items-center space-x-1 mb-2">
                              <Tag className="h-3 w-3 text-muted-foreground" />
                              <div className="flex flex-wrap gap-1">
                                {item.metadata.tags.map((tag, index) => (
                                  <Badge key={index} variant="secondary" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="text-sm text-muted-foreground">
                            <p className="line-clamp-2">
                              {item.content.replace(/<[^>]*>/g, '').substring(0, 200)}...
                            </p>
                          </div>

                          {item.metadata.attachments && item.metadata.attachments.length > 0 && (
                            <div className="mt-2 text-sm text-muted-foreground">
                              <FileText className="h-3 w-3 inline mr-1" />
                              {item.metadata.attachments.length} attachment(s)
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
