"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Plus, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Todo } from "./todo-item"

interface TodoQuickAddProps {
  onCreated: (todo: Todo) => void
  placeholder?: string
  anchorType?: 'NONE' | 'PROJECT' | 'TASK' | 'PAGE'
  anchorId?: string
  defaultDueToday?: boolean
  className?: string
}

export function TodoQuickAdd({
  onCreated,
  placeholder = "Add a to-do...",
  anchorType = 'NONE',
  anchorId,
  defaultDueToday = true,
  className
}: TodoQuickAddProps) {
  const [title, setTitle] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isFocused, setIsFocused] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || isSubmitting) return

    setIsSubmitting(true)
    try {
      const payload: Record<string, unknown> = {
        title: title.trim(),
        anchorType,
        anchorId: anchorType !== 'NONE' ? anchorId : null
      }

      // Add due date as today if defaultDueToday is true
      if (defaultDueToday) {
        const today = new Date()
        today.setHours(23, 59, 59, 999)
        payload.dueAt = today.toISOString()
      }

      const response = await fetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create todo')
      }

      const todo = await response.json()
      onCreated(todo)
      setTitle('')
    } catch (error) {
      console.error('Error creating todo:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className={cn("flex items-center gap-2", className)}>
      <div className={cn(
        "flex-1 relative flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors",
        isFocused ? "border-primary ring-1 ring-primary/20" : "border-border"
      )}>
        <Plus className="h-4 w-4 text-muted-foreground shrink-0" />
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          className="border-0 p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0"
          disabled={isSubmitting}
          data-testid="todo-quick-add-input"
        />
      </div>
      
      {title.trim() && (
        <Button 
          type="submit" 
          size="sm" 
          disabled={isSubmitting}
          className="shrink-0"
        >
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            'Add'
          )}
        </Button>
      )}
    </form>
  )
}

