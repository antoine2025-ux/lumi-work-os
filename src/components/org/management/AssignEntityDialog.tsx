'use client'

import { useEffect, useState } from 'react'
import { Loader2, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ManagementItem {
  type: 'department' | 'team' | 'job-description' | 'role-card'
  id: string
  name: string
}

interface PersonOption {
  /** OrgPosition.id — used directly as positionId for assignment */
  id: string
  fullName: string
}

export interface AssignEntityDialogProps {
  open: boolean
  onClose: () => void
  onAssigned: () => void
  item: ManagementItem | null
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AssignEntityDialog({ open, onClose, onAssigned, item }: AssignEntityDialogProps) {
  const [people, setPeople] = useState<PersonOption[]>([])
  const [loadingPeople, setLoadingPeople] = useState(false)
  const [selectedId, setSelectedId] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setSelectedId('')
    setError(null)
    setLoadingPeople(true)
    fetch('/api/org/people')
      .then((r) => r.json())
      .then((d) => {
        const raw: Array<{ id: string; fullName: string }> = d?.data?.people ?? []
        setPeople(raw.map((p) => ({ id: p.id, fullName: p.fullName })))
      })
      .catch(() => setPeople([]))
      .finally(() => setLoadingPeople(false))
  }, [open])

  const handleAssign = async () => {
    if (!item || !selectedId) return
    setSaving(true)
    setError(null)
    try {
      let res: Response

      if (item.type === 'job-description') {
        // Link the JD to the selected position
        res = await fetch(`/api/org/positions/${selectedId}/job-description`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jobDescriptionId: item.id }),
        })
      } else {
        // role-card: set positionId on the role card
        res = await fetch(`/api/org/role-templates/${item.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ positionId: selectedId }),
        })
      }

      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Assignment failed')
      onAssigned()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  const typeLabel = item?.type === 'job-description' ? 'Job Description' : 'Role Card'

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-w-sm bg-card border-border text-foreground">
        <DialogHeader>
          <DialogTitle className="text-foreground text-base flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            Assign {typeLabel}
          </DialogTitle>
        </DialogHeader>

        {item && (
          <p className="text-sm text-muted-foreground -mt-1">
            Assigning <span className="font-medium text-foreground">{item.name}</span> to a person
          </p>
        )}

        <div className="mt-2 space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Person
          </Label>
          <Select
            value={selectedId || '_none'}
            onValueChange={(v) => setSelectedId(v === '_none' ? '' : v)}
            disabled={loadingPeople}
          >
            <SelectTrigger className="bg-[#050816] border-border text-foreground focus:border-blue-700 h-9 text-sm">
              <SelectValue placeholder={loadingPeople ? 'Loading…' : 'Select person…'} />
            </SelectTrigger>
            <SelectContent className="bg-card border-border text-foreground max-h-60">
              <SelectItem value="_none" className="text-muted-foreground focus:bg-[#1e293b]">
                — Select person —
              </SelectItem>
              {people.map((p) => (
                <SelectItem key={p.id} value={p.id} className="focus:bg-[#1e293b]">
                  {p.fullName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {error && (
          <p className="text-sm text-red-400 bg-red-950/40 border border-red-900/50 rounded px-3 py-2">
            {error}
          </p>
        )}

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={saving}
            className="border-border text-muted-foreground hover:text-foreground hover:bg-[#1e293b]"
          >
            Cancel
          </Button>
          <Button onClick={handleAssign} disabled={!selectedId || saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Assigning…
              </>
            ) : (
              'Assign'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
