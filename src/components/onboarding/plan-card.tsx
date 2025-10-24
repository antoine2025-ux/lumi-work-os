import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { ProgressBar } from './progress-bar'
import { MoreHorizontal, CheckCircle2, Circle, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

interface PlanCardProps {
  plan: {
    id: string
    name: string
    status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'ON_HOLD'
    progressPct: number
    startDate: string
    endDate?: string | null
    employee: {
      name: string | null
      email: string
    }
    template?: {
      name: string
      durationDays: number
    } | null
    tasks: Array<{
      id: string
      title: string
      status: 'PENDING' | 'IN_PROGRESS' | 'DONE'
      order: number
    }>
  }
  onEdit?: (planId: string) => void
  onMarkCompleted?: (planId: string) => void
  onDelete?: (planId: string) => void
}

export function PlanCard({ plan, onEdit, onMarkCompleted, onDelete }: PlanCardProps) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge variant="default" className="bg-blue-100 text-blue-800">Active</Badge>
      case 'COMPLETED':
        return <Badge variant="default" className="bg-green-100 text-green-800">Completed</Badge>
      case 'ON_HOLD':
        return <Badge variant="secondary">On Hold</Badge>
      case 'CANCELLED':
        return <Badge variant="destructive">Cancelled</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getTaskIcon = (status: string) => {
    switch (status) {
      case 'DONE':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />
      case 'IN_PROGRESS':
        return <Clock className="h-4 w-4 text-blue-600" />
      default:
        return <Circle className="h-4 w-4 text-gray-400" />
    }
  }

  const previewTasks = plan.tasks.slice(0, 6)

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg font-medium">{plan.name}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {plan.employee.name || plan.employee.email}
            </p>
            <div className="flex items-center gap-2">
              {getStatusBadge(plan.status)}
              <span className="text-xs text-muted-foreground">
                Started {format(new Date(plan.startDate), 'MMM d, yyyy')}
              </span>
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
                <DropdownMenuItem onClick={() => onEdit(plan.id)}>
                  Edit Plan
                </DropdownMenuItem>
              )}
              {plan.status === 'ACTIVE' && onMarkCompleted && (
                <DropdownMenuItem onClick={() => onMarkCompleted(plan.id)}>
                  Mark Completed
                </DropdownMenuItem>
              )}
              {onDelete && (
                <DropdownMenuItem 
                  onClick={() => onDelete(plan.id)}
                  className="text-destructive"
                >
                  Delete Plan
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <ProgressBar value={plan.progressPct} />
        
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Tasks</span>
            <span className="font-medium">
              {plan.tasks.filter(t => t.status === 'DONE').length} / {plan.tasks.length}
            </span>
          </div>
          
          <div className="space-y-1">
            {previewTasks.map((task) => (
              <div key={task.id} className="flex items-center gap-2 text-sm">
                {getTaskIcon(task.status)}
                <span className={cn(
                  'flex-1',
                  task.status === 'DONE' && 'line-through text-muted-foreground'
                )}>
                  {task.title}
                </span>
              </div>
            ))}
            {plan.tasks.length > 6 && (
              <p className="text-xs text-muted-foreground">
                +{plan.tasks.length - 6} more tasks
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}







