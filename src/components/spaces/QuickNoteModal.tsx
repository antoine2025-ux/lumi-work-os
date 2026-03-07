"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogFooter, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, Trash2 } from "lucide-react"
import { useQueryClient } from "@tanstack/react-query"
import { useToast } from "@/components/ui/use-toast"

interface QuickNoteModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  note?: { id: string; title: string; content: string } | null
}

export function QuickNoteModal({ open, onOpenChange, note }: QuickNoteModalProps) {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const isEditMode = !!note

  // Reset form when dialog opens/closes or note changes
  useEffect(() => {
    if (open) {
      if (note) {
        setTitle(note.title)
        setContent(note.content)
      } else {
        setTitle("")
        setContent("")
      }
    }
  }, [open, note])

  const handleSave = async () => {
    if (isSubmitting) return

    setIsSubmitting(true)
    try {
      const url = isEditMode ? `/api/personal-notes/${note.id}` : '/api/personal-notes'
      const method = isEditMode ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: { message: 'Failed to save note' } }))
        console.error('API Error Response:', errorData)
        // Handle both { error: { message: "..." } } and { error: "..." } formats
        const errorMessage = typeof errorData.error === 'string'
          ? errorData.error
          : errorData.error?.message || errorData.message || 'Failed to save note'
        throw new Error(errorMessage)
      }

      await queryClient.invalidateQueries({ queryKey: ["personal-notes"] })
      onOpenChange(false)
      
      toast({
        description: isEditMode ? "Note saved" : "Note created",
      })
    } catch (error) {
      console.error('Error saving note:', error)
      toast({
        description: error instanceof Error ? error.message : 'Failed to save note',
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!isEditMode || isDeleting) return

    const confirmed = window.confirm('Are you sure you want to delete this note?')
    if (!confirmed) return

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/personal-notes/${note.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: { message: 'Failed to delete note' } }))
        // Handle both { error: { message: "..." } } and { error: "..." } formats
        const errorMessage = typeof errorData.error === 'string'
          ? errorData.error
          : errorData.error?.message || errorData.message || 'Failed to delete note'
        throw new Error(errorMessage)
      }

      await queryClient.invalidateQueries({ queryKey: ["personal-notes"] })
      onOpenChange(false)
      
      toast({
        description: "Note deleted",
      })
    } catch (error) {
      console.error('Error deleting note:', error)
      toast({
        description: error instanceof Error ? error.message : 'Failed to delete note',
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      handleSave()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0" onKeyDown={handleKeyDown}>
        <DialogTitle className="sr-only">
          {isEditMode ? 'Edit Note' : 'New Note'}
        </DialogTitle>
        <div className="p-6 space-y-4">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Note title..."
            className="text-lg font-medium border-0 px-0 focus-visible:ring-0 focus-visible:ring-offset-0"
            autoFocus
          />
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Start writing..."
            className="min-h-[200px] resize-none text-sm leading-relaxed border-0 px-0 focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </div>

        <DialogFooter className="border-t border-border pt-3 px-6 pb-6 flex items-center justify-between">
          <div>
            {isEditMode && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleDelete}
                disabled={isDeleting || isSubmitting}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </>
                )}
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting || isDeleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={isSubmitting || isDeleting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save'
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
