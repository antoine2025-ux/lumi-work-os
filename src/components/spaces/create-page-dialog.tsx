"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2, FileText } from "lucide-react"

interface Space {
  id: string
  name: string
  isPersonal: boolean
  children?: Space[]
}

interface CreatePageDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  workspaceSlug?: string
}

function flattenSpaces(
  spaces: Space[],
  prefix = "",
): Array<{ id: string; label: string }> {
  return spaces.flatMap((space) => [
    {
      id: space.id,
      label: prefix + space.name + (space.isPersonal ? " (Personal)" : ""),
    },
    ...(space.children ? flattenSpaces(space.children, prefix + "\u00a0\u00a0") : []),
  ])
}

export function CreatePageDialog({
  open,
  onOpenChange,
}: CreatePageDialogProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [spaces, setSpaces] = useState<Space[]>([])
  const [selectedSpaceId, setSelectedSpaceId] = useState("")
  const [pageTitle, setPageTitle] = useState("")
  const [loadingSpaces, setLoadingSpaces] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setLoadingSpaces(true)
    fetch("/api/spaces")
      .then((res) => res.json())
      .then((data: { spaces?: Space[] }) => {
        const list = data.spaces ?? []
        setSpaces(list)
        const personal = list.find((s) => s.isPersonal)
        if (personal) setSelectedSpaceId(personal.id)
      })
      .catch(() => setError("Failed to load spaces"))
      .finally(() => setLoadingSpaces(false))
  }, [open])

  function handleClose() {
    setPageTitle("")
    setSelectedSpaceId("")
    setError(null)
    onOpenChange(false)
  }

  async function handleCreate() {
    if (!selectedSpaceId || !pageTitle.trim()) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch("/api/wiki/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: pageTitle.trim(),
          spaceId: selectedSpaceId,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? "Failed to create page")
      }
      const page = await res.json()
      queryClient.invalidateQueries({ queryKey: ["sidebar-pages"] })
      handleClose()
      router.push(`/wiki/${page.slug ?? page.id}`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setSubmitting(false)
    }
  }

  const flatSpaces = flattenSpaces(spaces)

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            New Page
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Space selector */}
          <div className="space-y-1.5">
            <Label>Space</Label>
            {loadingSpaces ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading spaces…
              </div>
            ) : (
              <Select value={selectedSpaceId} onValueChange={setSelectedSpaceId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a space…" />
                </SelectTrigger>
                <SelectContent>
                  {flatSpaces.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Page title */}
          <div className="space-y-1.5">
            <Label htmlFor="page-title">Title *</Label>
            <Input
              id="page-title"
              placeholder="e.g. Q1 Planning, Team Handbook…"
              value={pageTitle}
              onChange={(e) => setPageTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              autoFocus
              maxLength={255}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={handleClose} disabled={submitting}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!selectedSpaceId || !pageTitle.trim() || submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating…
                </>
              ) : (
                "Create Page"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
