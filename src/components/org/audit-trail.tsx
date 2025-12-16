"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  History, 
  User, 
  Building, 
  Calendar, 
  ArrowRight,
  Filter,
  Download
} from 'lucide-react'
import { PermissionGuard } from './permission-guard'

interface AuditLogEntry {
  id: string
  action: string
  entityType: string
  entityId: string
  oldValues?: any
  newValues?: any
  metadata?: any
  createdAt: string
  user: {
    id: string
    name: string
    email: string
  }
}

interface AuditTrailProps {
  workspaceId: string
  entityType?: string
  entityId?: string
  userId?: string
}

export function AuditTrail({ workspaceId, entityType, entityId, userId }: AuditTrailProps) {
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState({
    entityType: entityType || '',
    userId: userId || '',
    action: '',
  })

  useEffect(() => {
    loadAuditLogs()
  }, [workspaceId, filters])

  async function loadAuditLogs() {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        workspaceId,
        ...(filters.entityType && { entityType: filters.entityType }),
        ...(filters.userId && { userId: filters.userId }),
        ...(filters.action && { action: filters.action }),
        limit: '50',
      })

      const response = await fetch(`/api/org/audit?${params}`)
      if (!response.ok) {
        throw new Error('Failed to load audit logs')
      }

      const data = await response.json()
      setLogs(data.logs)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load audit logs')
    } finally {
      setLoading(false)
    }
  }

  function getActionColor(action: string): string {
    switch (action) {
      case 'CREATE': return 'bg-green-100 text-green-800'
      case 'UPDATE': return 'bg-blue-100 text-blue-800'
      case 'DELETE': return 'bg-red-100 text-red-800'
      case 'ASSIGN': return 'bg-purple-100 text-purple-800'
      case 'UNASSIGN': return 'bg-orange-100 text-orange-800'
      case 'MOVE': return 'bg-yellow-100 text-yellow-800'
      case 'PROMOTE': return 'bg-indigo-100 text-indigo-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  function getEntityIcon(entityType: string) {
    switch (entityType) {
      case 'USER': return <User className="h-4 w-4" />
      case 'POSITION': return <Building className="h-4 w-4" />
      case 'ROLE': return <Building className="h-4 w-4" />
      case 'ASSIGNMENT': return <ArrowRight className="h-4 w-4" />
      default: return <History className="h-4 w-4" />
    }
  }

  function formatChangeDescription(log: AuditLogEntry): string {
    const { action, entityType, oldValues, newValues } = log
    
    switch (action) {
      case 'CREATE':
        return `Created ${entityType.toLowerCase()} "${newValues?.title || newValues?.name || entityId}"`
      case 'UPDATE':
        const changes = []
        if (oldValues?.title !== newValues?.title) {
          changes.push(`title: "${oldValues?.title}" → "${newValues?.title}"`)
        }
        if (oldValues?.department !== newValues?.department) {
          changes.push(`department: "${oldValues?.department}" → "${newValues?.department}"`)
        }
        if (oldValues?.userId !== newValues?.userId) {
          changes.push(`assignment changed`)
        }
        return `Updated ${entityType.toLowerCase()}: ${changes.join(', ')}`
      case 'ASSIGN':
        return `Assigned user to ${entityType.toLowerCase()}`
      case 'UNASSIGN':
        return `Unassigned user from ${entityType.toLowerCase()}`
      case 'MOVE':
        return `Moved ${entityType.toLowerCase()} to different department`
      case 'PROMOTE':
        return `Promoted user in ${entityType.toLowerCase()}`
      default:
        return `${action} ${entityType.toLowerCase()}`
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Audit Trail
          </CardTitle>
          <CardDescription>Loading audit history...</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Audit Trail
          </CardTitle>
          <CardDescription>Error loading audit history: {error}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Audit Trail
        </CardTitle>
        <CardDescription>
          Complete history of organizational changes
        </CardDescription>
        <div className="flex gap-2 mt-4">
          <PermissionGuard permission="canViewAuditLog">
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </PermissionGuard>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-96">
          <div className="space-y-4">
            {logs.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                No audit logs found
              </div>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="flex items-start gap-3 p-3 border rounded-lg">
                  <div className="flex-shrink-0 mt-1">
                    {getEntityIcon(log.entityType)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={getActionColor(log.action)}>
                        {log.action}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {log.entityType}
                      </span>
                    </div>
                    <p className="text-sm font-medium">
                      {formatChangeDescription(log)}
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <span>by {log.user.name}</span>
                      <Calendar className="h-3 w-3" />
                      <span>{new Date(log.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

