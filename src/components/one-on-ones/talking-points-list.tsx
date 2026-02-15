'use client'

import { useState } from 'react'
import { Plus, GripVertical } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface TalkingPoint {
  id: string
  content: string
  addedBy: string
  isDiscussed: boolean
  source: string | null
  sourceId: string | null
  sortOrder: number
  createdAt: string | Date
}

interface TalkingPointsListProps {
  points: TalkingPoint[]
  meetingId: string
  onToggle: (id: string, isDiscussed: boolean) => void
  onAdd: (content: string) => void
  onDelete: (id: string) => void
}

const sourceLabels: Record<string, string> = {
  GOAL: 'Goal',
  REVIEW: 'Review',
  ACTION_ITEM: 'Follow-up',
  MANUAL: 'Manual',
}

const sourceColors: Record<string, string> = {
  GOAL: 'text-blue-600 border-blue-200 bg-blue-50',
  REVIEW: 'text-purple-600 border-purple-200 bg-purple-50',
  ACTION_ITEM: 'text-amber-600 border-amber-200 bg-amber-50',
  MANUAL: '',
}

export function TalkingPointsList({
  points,
  onToggle,
  onAdd,
  onDelete,
}: TalkingPointsListProps) {
  const [newContent, setNewContent] = useState('')

  const handleAdd = () => {
    const trimmed = newContent.trim()
    if (!trimmed) return
    onAdd(trimmed)
    setNewContent('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleAdd()
    }
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-foreground">Talking Points</h3>

      {points.length === 0 && (
        <p className="text-sm text-muted-foreground py-2">
          No talking points yet. Add one below.
        </p>
      )}

      <div className="space-y-1">
        {points.map((point) => (
          <div
            key={point.id}
            className={cn(
              'flex items-start gap-2 p-2 rounded-md group hover:bg-muted/50 transition-colors',
              point.isDiscussed && 'opacity-60'
            )}
          >
            <GripVertical className="h-4 w-4 text-muted-foreground/50 mt-0.5 shrink-0 cursor-grab" />
            <Checkbox
              checked={point.isDiscussed}
              onCheckedChange={(checked) =>
                onToggle(point.id, checked === true)
              }
              className="mt-0.5"
            />
            <div className="flex-1 min-w-0">
              <p
                className={cn(
                  'text-sm',
                  point.isDiscussed && 'line-through text-muted-foreground'
                )}
              >
                {point.content}
              </p>
              {point.source && point.source !== 'MANUAL' && (
                <Badge
                  variant="outline"
                  className={cn('text-[10px] mt-1', sourceColors[point.source])}
                >
                  {sourceLabels[point.source] ?? point.source}
                </Badge>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
              onClick={() => onDelete(point.id)}
            >
              &times;
            </Button>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 pt-1">
        <Input
          value={newContent}
          onChange={(e) => setNewContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add a talking point..."
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
