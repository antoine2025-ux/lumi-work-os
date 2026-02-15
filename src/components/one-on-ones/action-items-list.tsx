'use client'

import { useState } from 'react'
import { Plus, Calendar as CalendarIcon } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

interface ActionItem {
  id: string
  content: string
  assigneeId: string
  status: string
  dueDate: string | Date | null
  createdAt: string | Date
  updatedAt: string | Date
}

interface Participant {
  id: string
  name: string | null
  email: string
  image: string | null
}

interface ActionItemsListProps {
  items: ActionItem[]
  meetingId: string
  participants: Participant[]
  currentUserId: string
  onToggle: (id: string, status: string) => void
  onAdd: (content: string, assigneeId: string) => void
  onDelete: (id: string) => void
}

function getInitials(name: string | null, email: string): string {
  if (name) {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }
  return email[0].toUpperCase()
}

function formatDueDate(date: string | Date | null): string | null {
  if (!date) return null
  const d = new Date(date)
  const now = new Date()
  const diffMs = d.getTime() - now.getTime()
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays < 0) return `${Math.abs(diffDays)}d overdue`
  if (diffDays === 0) return 'Due today'
  if (diffDays === 1) return 'Due tomorrow'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function ActionItemsList({
  items,
  participants,
  currentUserId,
  onToggle,
  onAdd,
  onDelete,
}: ActionItemsListProps) {
  const [newContent, setNewContent] = useState('')

  const participantMap = new Map(participants.map((p) => [p.id, p]))

  const handleAdd = () => {
    const trimmed = newContent.trim()
    if (!trimmed) return
    onAdd(trimmed, currentUserId)
    setNewContent('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleAdd()
    }
  }

  const openItems = items.filter((i) => i.status === 'OPEN')
  const doneItems = items.filter((i) => i.status !== 'OPEN')

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-foreground">
        Action Items
        {openItems.length > 0 && (
          <span className="ml-1.5 text-xs text-muted-foreground font-normal">
            ({openItems.length} open)
          </span>
        )}
      </h3>

      {items.length === 0 && (
        <p className="text-sm text-muted-foreground py-2">
          No action items yet. Add one below.
        </p>
      )}

      {/* Open items */}
      <div className="space-y-1">
        {openItems.map((item) => {
          const assignee = participantMap.get(item.assigneeId)
          const dueDateStr = formatDueDate(item.dueDate)
          const isOverdue = dueDateStr?.includes('overdue')

          return (
            <div
              key={item.id}
              className="flex items-start gap-2 p-2 rounded-md group hover:bg-muted/50 transition-colors"
            >
              <Checkbox
                checked={false}
                onCheckedChange={() => onToggle(item.id, 'DONE')}
                className="mt-0.5"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm">{item.content}</p>
                <div className="flex items-center gap-2 mt-1">
                  {assignee && (
                    <div className="flex items-center gap-1">
                      <Avatar className="h-4 w-4">
                        <AvatarImage src={assignee.image ?? undefined} />
                        <AvatarFallback className="text-[8px] bg-primary/10">
                          {getInitials(assignee.name, assignee.email)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-[11px] text-muted-foreground">
                        {assignee.name ?? assignee.email}
                      </span>
                    </div>
                  )}
                  {dueDateStr && (
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-[10px]',
                        isOverdue && 'text-destructive border-destructive/30'
                      )}
                    >
                      <CalendarIcon className="h-2.5 w-2.5 mr-0.5" />
                      {dueDateStr}
                    </Badge>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                onClick={() => onDelete(item.id)}
              >
                &times;
              </Button>
            </div>
          )
        })}
      </div>

      {/* Completed items */}
      {doneItems.length > 0 && (
        <div className="space-y-1 pt-2 border-t border-border/50">
          <p className="text-xs text-muted-foreground font-medium">
            Completed ({doneItems.length})
          </p>
          {doneItems.map((item) => (
            <div
              key={item.id}
              className="flex items-start gap-2 p-2 rounded-md opacity-60"
            >
              <Checkbox
                checked={true}
                onCheckedChange={() => onToggle(item.id, 'OPEN')}
                className="mt-0.5"
              />
              <p className="text-sm line-through text-muted-foreground flex-1">
                {item.content}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Add new */}
      <div className="flex items-center gap-2 pt-1">
        <Input
          value={newContent}
          onChange={(e) => setNewContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add an action item..."
          className="text-sm h-8"
        />
        <Button
          size="sm"
          variant="outline"
          onClick={handleAdd}
          disabled={!newContent.trim()}
          className="h-8 shrink-0"
        >
          <Plus className="h-3 w-3 mr-1" />
          Add
        </Button>
      </div>
    </div>
  )
}
