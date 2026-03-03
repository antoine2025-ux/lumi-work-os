"use client"

import { useState } from "react"
import { Globe, Lock, Loader2, AlignLeft, Palette } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

interface CreateSpaceDialogProps {
  open: boolean
  onClose: () => void
  onCreated?: () => void
}

const COLOR_OPTIONS = [
  { label: "Blue", value: "#3b82f6" },
  { label: "Green", value: "#22c55e" },
  { label: "Purple", value: "#a855f7" },
  { label: "Orange", value: "#f97316" },
  { label: "Pink", value: "#ec4899" },
  { label: "Teal", value: "#14b8a6" },
  { label: "Red", value: "#ef4444" },
  { label: "Slate", value: "#64748b" },
]

export function CreateSpaceDialog({ open, onClose, onCreated }: CreateSpaceDialogProps) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [visibility, setVisibility] = useState<"PUBLIC" | "PRIVATE">("PUBLIC")
  const [color, setColor] = useState("#3b82f6")
  const [expandedOption, setExpandedOption] = useState<'description' | 'visibility' | 'color' | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function reset() {
    setName("")
    setDescription("")
    setVisibility("PUBLIC")
    setColor("#3b82f6")
    setExpandedOption(null)
    setError(null)
  }

  function handleClose() {
    reset()
    onClose()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return

    setIsSubmitting(true)
    setError(null)

    try {
      const res = await fetch("/api/spaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), description: description.trim() || undefined, visibility, color }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        const msg =
          typeof data.error === 'string'
            ? data.error
            : data.error?.message ?? "Failed to create space"
        throw new Error(msg)
      }

      reset()
      onCreated?.()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Space</DialogTitle>
          <DialogDescription>
            Spaces organise your projects and wiki pages. Choose a name and who can access it.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Name Input */}
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Space name"
            maxLength={100}
            required
            autoFocus
          />

          {/* Horizontal Pills Row */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Description Pill */}
            <button
              type="button"
              onClick={() => setExpandedOption(expandedOption === 'description' ? null : 'description')}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-md border border-border text-sm transition-colors",
                expandedOption === 'description' ? "bg-accent" : "hover:bg-accent/50"
              )}
            >
              <AlignLeft className="w-4 h-4" />
              <span className="text-muted-foreground">Description</span>
              <span className="text-foreground">
                {description ? (description.length > 20 ? description.slice(0, 20) + '...' : description) : 'Not set'}
              </span>
            </button>

            {/* Visibility Pill */}
            <button
              type="button"
              onClick={() => setExpandedOption(expandedOption === 'visibility' ? null : 'visibility')}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-md border border-border text-sm transition-colors",
                expandedOption === 'visibility' ? "bg-accent" : "hover:bg-accent/50"
              )}
            >
              {visibility === 'PUBLIC' ? <Globe className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
              <span className="text-muted-foreground">Visibility</span>
              <span className="text-foreground">{visibility === 'PUBLIC' ? 'Public' : 'Private'}</span>
            </button>

            {/* Colour Pill */}
            <button
              type="button"
              onClick={() => setExpandedOption(expandedOption === 'color' ? null : 'color')}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-md border border-border text-sm transition-colors",
                expandedOption === 'color' ? "bg-accent" : "hover:bg-accent/50"
              )}
            >
              <Palette className="w-4 h-4" />
              <span className="text-muted-foreground">Colour</span>
              <div className="w-4 h-4 rounded-full border border-border" style={{ backgroundColor: color }} />
            </button>
          </div>

          {/* Expanded Options */}
          {expandedOption === 'description' && (
            <div className="pt-2">
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What is this space for?"
                rows={3}
                maxLength={500}
                className="w-full"
              />
            </div>
          )}

          {expandedOption === 'visibility' && (
            <div className="pt-2 space-y-2">
              <button
                type="button"
                onClick={() => setVisibility('PUBLIC')}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-md border text-left transition-colors",
                  visibility === 'PUBLIC' 
                    ? "border-primary bg-accent" 
                    : "border-border hover:bg-accent/50"
                )}
              >
                <Globe className="w-4 h-4" />
                <div>
                  <div className="font-medium text-sm">Public</div>
                  <div className="text-xs text-muted-foreground">All workspace members</div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setVisibility('PRIVATE')}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-md border text-left transition-colors",
                  visibility === 'PRIVATE' 
                    ? "border-primary bg-accent" 
                    : "border-border hover:bg-accent/50"
                )}
              >
                <Lock className="w-4 h-4" />
                <div>
                  <div className="font-medium text-sm">Private</div>
                  <div className="text-xs text-muted-foreground">Invited members only</div>
                </div>
              </button>
            </div>
          )}

          {expandedOption === 'color' && (
            <div className="pt-2">
              <div className="grid grid-cols-4 gap-2">
                {COLOR_OPTIONS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    title={c.label}
                    onClick={() => setColor(c.value)}
                    className={cn(
                      "w-10 h-10 rounded-full border-2 transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-1",
                      color === c.value ? "scale-110 ring-2 ring-offset-1" : ""
                    )}
                    style={{
                      backgroundColor: c.value,
                      borderColor: color === c.value ? c.value : "transparent",
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || isSubmitting}>
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create Space
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
