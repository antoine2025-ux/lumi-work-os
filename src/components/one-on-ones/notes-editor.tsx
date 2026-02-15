'use client'

import { useState, useCallback } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

interface NotesEditorProps {
  label: string
  value: string | null
  onSave: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function NotesEditor({
  label,
  value,
  onSave,
  placeholder = 'Add notes...',
  className,
  disabled = false,
}: NotesEditorProps) {
  const [localValue, setLocalValue] = useState(value ?? '')
  const [isDirty, setIsDirty] = useState(false)

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setLocalValue(e.target.value)
      setIsDirty(true)
    },
    []
  )

  const handleBlur = useCallback(() => {
    if (isDirty) {
      onSave(localValue)
      setIsDirty(false)
    }
  }, [isDirty, localValue, onSave])

  return (
    <div className={cn('space-y-1.5', className)}>
      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {label}
      </label>
      <Textarea
        value={localValue}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder={placeholder}
        disabled={disabled}
        className="min-h-[120px] resize-y text-sm"
      />
      {isDirty && (
        <p className="text-xs text-muted-foreground">
          Changes will save when you click away
        </p>
      )}
    </div>
  )
}
