'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, FileText } from 'lucide-react'

interface Section {
  id: string
  title: string
  slug: string
  spaceId: string | null
}

interface QuickCreatePageDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  spaceId: string
  spaceName: string
  /** Pre-select a section when opening from within a section card. */
  defaultSectionId?: string | null
  /** Called after the page is successfully created, before navigation. */
  onSuccess?: () => void
}

export function QuickCreatePageDialog({
  open,
  onOpenChange,
  spaceId,
  spaceName,
  defaultSectionId,
  onSuccess,
}: QuickCreatePageDialogProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [pageTitle, setPageTitle] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [sections, setSections] = useState<Section[]>([])
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return

    fetch('/api/wiki/pages?limit=50')
      .then((r) => (r.ok ? r.json() : null))
      .then((result) => {
        if (!result) return
        const pages: (Section & { parentId: string | null })[] = result.data ?? result
        if (!Array.isArray(pages)) return

        const rootPages = pages.filter(
          (p) => p.parentId === null && p.spaceId === spaceId
        )
        setSections(rootPages)

        // Use explicit default from caller, fall back to URL-based matching
        if (defaultSectionId) {
          setSelectedSectionId(defaultSectionId)
        } else {
          const currentSlug = pathname?.split('/wiki/')?.[1]?.split('/')?.[0] ?? ''
          const matched = rootPages.find((p) => p.slug === currentSlug)
          setSelectedSectionId(matched ? matched.id : null)
        }
      })
      .catch(() => {
        // Silently ignore — section picker is optional
      })
  }, [open, pathname, spaceId, defaultSectionId])

  const handleCreate = async () => {
    if (!pageTitle.trim()) return

    setSubmitting(true)
    setError('')

    try {
      const body: Record<string, unknown> = {
        title: pageTitle.trim(),
        spaceId,
        content: '',
      }
      if (selectedSectionId && selectedSectionId !== '__none__') body.parentId = selectedSectionId

      const res = await fetch('/api/wiki/pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create page')
      }

      const page = await res.json()
      onSuccess?.()
      window.dispatchEvent(new CustomEvent('workspacePagesRefreshed'))
      onOpenChange(false)
      setPageTitle('')
      router.push(`/wiki/${page.slug}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create page')
    } finally {
      setSubmitting(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && pageTitle.trim()) {
      e.preventDefault()
      handleCreate()
    }
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) setError('')
    onOpenChange(open)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            New Page in {spaceName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="pageTitle">Page Title</Label>
            <Input
              id="pageTitle"
              placeholder="Enter page title..."
              value={pageTitle}
              onChange={(e) => setPageTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
            />
          </div>

          {sections.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="sectionPicker">Section (optional)</Label>
              <Select
                value={selectedSectionId ?? '__none__'}
                onValueChange={(v) => setSelectedSectionId(v === '__none__' ? null : v)}
              >
                <SelectTrigger id="sectionPicker">
                  <SelectValue placeholder="No section — top level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No section — top level</SelectItem>
                  {sections.map((section) => (
                    <SelectItem key={section.id} value={section.id}>
                      {section.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={!pageTitle.trim() || submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
