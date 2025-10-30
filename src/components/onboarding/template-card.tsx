import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { MoreHorizontal, Calendar, Users, Eye } from 'lucide-react'
import { format } from 'date-fns'

interface TemplateCardProps {
  template: {
    id: string
    name: string
    description?: string | null
    durationDays: number
    visibility: 'PRIVATE' | 'ORG'
    createdAt: string
    createdBy: {
      name: string | null
      email: string
    }
    tasks: Array<{
      id: string
      title: string
      order: number
    }>
  }
  onEdit?: (templateId: string) => void
  onDuplicate?: (templateId: string) => void
  onDelete?: (templateId: string) => void
}

export function TemplateCard({ template, onEdit, onDuplicate, onDelete }: TemplateCardProps) {
  const getVisibilityBadge = (visibility: string) => {
    switch (visibility) {
      case 'ORG':
        return (
          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
            <Users className="h-3 w-3 mr-1" />
            Organization
          </Badge>
        )
      case 'PRIVATE':
        return (
          <Badge variant="outline">
            <Eye className="h-3 w-3 mr-1" />
            Private
          </Badge>
        )
      default:
        return <Badge variant="secondary">{visibility}</Badge>
    }
  }

  const sortedTasks = [...template.tasks].sort((a, b) => a.order - b.order)

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg font-medium">{template.name}</CardTitle>
            {template.description && (
              <p className="text-sm text-muted-foreground">{template.description}</p>
            )}
            <div className="flex items-center gap-2">
              {getVisibilityBadge(template.visibility)}
              <Badge variant="outline" className="bg-gray-100">
                <Calendar className="h-3 w-3 mr-1" />
                {template.durationDays} days
              </Badge>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onEdit && (
                <DropdownMenuItem onClick={() => onEdit(template.id)}>
                  Edit Template
                </DropdownMenuItem>
              )}
              {onDuplicate && (
                <DropdownMenuItem onClick={() => onDuplicate(template.id)}>
                  Duplicate Template
                </DropdownMenuItem>
              )}
              {onDelete && (
                <DropdownMenuItem 
                  onClick={() => onDelete(template.id)}
                  className="text-destructive"
                >
                  Delete Template
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Tasks</span>
            <span className="font-medium">{template.tasks.length}</span>
          </div>
          
          <div className="space-y-1">
            {sortedTasks.slice(0, 5).map((task) => (
              <div key={task.id} className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 bg-gray-300 rounded-full flex-shrink-0" />
                <span className="text-muted-foreground">{task.title}</span>
              </div>
            ))}
            {template.tasks.length > 5 && (
              <p className="text-xs text-muted-foreground">
                +{template.tasks.length - 5} more tasks
              </p>
            )}
          </div>
        </div>
        
        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground">
            Created by {template.createdBy.name || template.createdBy.email} • {' '}
            {format(new Date(template.createdAt), 'MMM d, yyyy')}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}









