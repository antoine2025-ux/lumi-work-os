"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export type TemplateCategory =
  | "meetings"
  | "engineering"
  | "product"
  | "operations"
  | "general"
  | "custom"

export interface SaveAsTemplateFormValues {
  name: string
  description?: string
  category: TemplateCategory
}

export interface SaveAsTemplateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultName: string
  onSave: (values: SaveAsTemplateFormValues) => Promise<void>
  isSaving?: boolean
}

const CATEGORY_OPTIONS: { value: TemplateCategory; label: string }[] = [
  { value: "meetings", label: "Meetings" },
  { value: "engineering", label: "Engineering" },
  { value: "product", label: "Product" },
  { value: "operations", label: "Operations" },
  { value: "general", label: "General" },
  { value: "custom", label: "Custom" },
]

export function SaveAsTemplateDialog({
  open,
  onOpenChange,
  defaultName,
  onSave,
  isSaving = false,
}: SaveAsTemplateDialogProps) {
  const [name, setName] = useState(defaultName)
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState<TemplateCategory>("custom")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setName(defaultName)
      setDescription("")
      setCategory("custom")
      setError(null)
    }
  }, [open, defaultName])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!name.trim()) {
      setError("Name is required")
      return
    }
    try {
      await onSave({ name: name.trim(), description: description.trim() || undefined, category })
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save template")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save as Template</DialogTitle>
          <DialogDescription>
            Save this page as a reusable template for future pages
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="template-name">Name</Label>
            <Input
              id="template-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Meeting Notes"
              maxLength={255}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="template-description">Description (optional)</Label>
            <Textarea
              id="template-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of when to use this template"
              rows={2}
              maxLength={500}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="template-category">Category</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as TemplateCategory)}>
              <SelectTrigger id="template-category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving || !name.trim()}>
              {isSaving ? "Saving..." : "Save Template"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
