"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { CalendarIcon, AlertCircle, Loader2, Users, ClipboardList } from "lucide-react"
import type { ExtractedTask, MeetingTaskExtractionResult } from "@/lib/loopbrain/scenarios/meeting-task-extraction"

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface MeetingTaskReviewProps {
  extraction: MeetingTaskExtractionResult
  /** Called with the user-confirmed tasks after any edits */
  onConfirm: (selected: ExtractedTask[]) => Promise<void>
  onCancel: () => void
  isCreating?: boolean
}

// ---------------------------------------------------------------------------
// Priority colours
// ---------------------------------------------------------------------------

const PRIORITY_COLORS: Record<ExtractedTask['priority'], string> = {
  urgent: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400',
  high: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400',
  medium: 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400',
  low: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400',
}

// ---------------------------------------------------------------------------
// Editable task state
// ---------------------------------------------------------------------------

interface EditableTask extends ExtractedTask {
  checked: boolean
}

// ---------------------------------------------------------------------------
// Simple date-picker popover
// ---------------------------------------------------------------------------

function DatePickerButton({
  value,
  onChange,
}: {
  value: string | null
  onChange: (date: string | null) => void
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors border border-border rounded px-2 py-1"
        >
          <CalendarIcon className="h-3 w-3" />
          {value ?? 'No deadline'}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-3">
        <Input
          type="date"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value || null)}
          className="text-sm h-8"
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="mt-2 text-xs text-muted-foreground hover:text-foreground underline"
          >
            Clear
          </button>
        )}
      </PopoverContent>
    </Popover>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MeetingTaskReview({
  extraction,
  onConfirm,
  onCancel,
  isCreating = false,
}: MeetingTaskReviewProps) {
  const [tasks, setTasks] = useState<EditableTask[]>(
    extraction.tasks.map((t) => ({ ...t, checked: true }))
  )

  const selectedCount = tasks.filter((t) => t.checked).length

  const updateTask = (idx: number, patch: Partial<EditableTask>) => {
    setTasks((prev) => prev.map((t, i) => (i === idx ? { ...t, ...patch } : t)))
  }

  const handleConfirm = async () => {
    const selected = tasks.filter((t) => t.checked).map(({ checked: _checked, ...rest }) => rest)
    await onConfirm(selected)
  }

  // ---- Empty state ----
  if (extraction.tasks.length === 0) {
    return (
      <Card className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">No action items found</span>
        </div>
        <p className="text-xs text-muted-foreground">
          {extraction.meetingSummary || 'No tasks were identified in these meeting notes.'}
        </p>
        <p className="text-xs text-muted-foreground">
          Try adding clearer task language like &ldquo;John will…&rdquo; or &ldquo;Action: …&rdquo;
        </p>
        <Button variant="outline" size="sm" onClick={onCancel}>
          Dismiss
        </Button>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {/* Header summary */}
      <Card className="p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Meeting Tasks</span>
          <Badge variant="outline" className="text-xs">
            {extraction.confidence} confidence
          </Badge>
        </div>

        {extraction.meetingSummary && (
          <p className="text-xs text-muted-foreground leading-relaxed">
            {extraction.meetingSummary}
          </p>
        )}

        {extraction.attendeesDetected.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <Users className="h-3 w-3 text-muted-foreground flex-shrink-0" />
            {extraction.attendeesDetected.map((name) => (
              <Badge key={name} variant="secondary" className="text-xs py-0">
                {name}
              </Badge>
            ))}
          </div>
        )}
      </Card>

      {/* Task cards */}
      <div className="space-y-2">
        {tasks.map((task, idx) => (
          <Card
            key={idx}
            className={cn(
              'p-3 space-y-2 transition-opacity',
              !task.checked && 'opacity-50'
            )}
          >
            {/* Row 1: checkbox + title */}
            <div className="flex items-start gap-2">
              <Checkbox
                id={`task-${idx}`}
                checked={task.checked}
                onCheckedChange={(v) => updateTask(idx, { checked: Boolean(v) })}
                className="mt-0.5"
              />
              <div className="flex-1 min-w-0">
                <Input
                  value={task.title}
                  onChange={(e) => updateTask(idx, { title: e.target.value })}
                  className="h-7 text-sm font-medium border-transparent hover:border-border focus:border-border px-0 focus-visible:ring-0"
                  disabled={!task.checked || isCreating}
                />
              </div>
              <Badge
                variant="outline"
                className={cn('text-xs flex-shrink-0', PRIORITY_COLORS[task.priority])}
              >
                {task.priority}
              </Badge>
            </div>

            {/* Row 2: assignee + deadline + project */}
            <div className="flex items-center gap-2 flex-wrap ml-6">
              {/* Assignee */}
              <Select
                value={task.assigneeSuggestion.personId ?? '__none__'}
                onValueChange={(v) =>
                  updateTask(idx, {
                    assigneeSuggestion: {
                      ...task.assigneeSuggestion,
                      personId: v === '__none__' ? null : v,
                      confidence: 'high',
                    },
                  })
                }
                disabled={!task.checked || isCreating}
              >
                <SelectTrigger className="h-7 w-auto text-xs gap-1 border-dashed">
                  <SelectValue
                    placeholder={
                      task.assigneeSuggestion.personName || 'No assignee'
                    }
                  />
                  {task.assigneeSuggestion.confidence === 'low' &&
                    task.assigneeSuggestion.personName && (
                      <AlertCircle className="h-3 w-3 text-amber-500" />
                    )}
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No assignee</SelectItem>
                  {task.assigneeSuggestion.personId && (
                    <SelectItem value={task.assigneeSuggestion.personId}>
                      {task.assigneeSuggestion.personName}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>

              {/* Deadline */}
              <DatePickerButton
                value={task.deadlineSuggestion.date}
                onChange={(date) =>
                  updateTask(idx, {
                    deadlineSuggestion: {
                      ...task.deadlineSuggestion,
                      date,
                    },
                  })
                }
              />

              {/* Project */}
              {task.projectSuggestion.projectName && (
                <Badge
                  variant="outline"
                  className="text-xs text-muted-foreground"
                >
                  {task.projectSuggestion.projectName}
                  {task.projectSuggestion.confidence === 'low' && (
                    <AlertCircle className="h-3 w-3 ml-1 text-amber-500 inline" />
                  )}
                </Badge>
              )}
              {!task.projectSuggestion.projectName && (
                <Badge
                  variant="outline"
                  className="text-xs text-muted-foreground border-amber-300"
                >
                  No project
                </Badge>
              )}
            </div>

            {/* Source quote */}
            {task.sourceText && (
              <blockquote className="ml-6 text-xs text-muted-foreground italic border-l-2 border-border pl-2 truncate">
                {task.sourceText}
              </blockquote>
            )}
          </Card>
        ))}
      </div>

      {/* Footer actions */}
      <div className="flex items-center justify-between pt-1">
        <button
          type="button"
          onClick={onCancel}
          disabled={isCreating}
          className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
        >
          Cancel
        </button>

        <Button
          size="sm"
          onClick={handleConfirm}
          disabled={selectedCount === 0 || isCreating}
          className="text-xs"
        >
          {isCreating ? (
            <>
              <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
              Creating…
            </>
          ) : (
            `Create ${selectedCount} Task${selectedCount !== 1 ? 's' : ''}`
          )}
        </Button>
      </div>
    </div>
  )
}
