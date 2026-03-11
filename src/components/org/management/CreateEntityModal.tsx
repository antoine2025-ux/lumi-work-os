'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

// ─── Types ────────────────────────────────────────────────────────────────────

type EntityTypeSel = 'department' | 'team' | 'job-description' | 'role-card'

/** Minimal shape the hub provides for each management item */
interface HubItem {
  type: 'department' | 'team' | 'job-description' | 'role-card'
  id: string
  name: string
  description: string | null
  ownerPersonId?: string | null
  departmentId?: string | null
  leaderId?: string | null
  level?: string | null
  jobFamily?: string | null
  positionId?: string | null
  // JD-specific (may be absent in hub summary)
  responsibilities?: string[]
  requiredSkills?: string[]
  preferredSkills?: string[]
  keyMetrics?: string[]
  // Role-card-specific
  roleInOrg?: string | null
  focusArea?: string | null
  managerNotes?: string | null
}

interface PersonOption {
  /** OrgPosition.id — used directly as positionId */
  id: string
  fullName: string
}

export interface CreateEntityModalProps {
  open: boolean
  onClose: () => void
  onCreated: () => void
  /** If set, modal is in edit mode for this item */
  editItem?: HubItem | null
  /** Existing departments for the Team form */
  departments: Array<{ id: string; name: string }>
}

// ─── Colors ───────────────────────────────────────────────────────────────────

const COLOR_PALETTE = [
  { label: 'Indigo', value: '#6366f1' },
  { label: 'Blue', value: '#3b82f6' },
  { label: 'Cyan', value: '#06b6d4' },
  { label: 'Emerald', value: '#10b981' },
  { label: 'Amber', value: '#f59e0b' },
  { label: 'Rose', value: '#f43f5e' },
  { label: 'Purple', value: '#a855f7' },
  { label: 'Slate', value: '#64748b' },
]

const LEVEL_OPTIONS = ['Junior', 'Mid', 'Senior', 'Lead', 'Principal', 'Staff', 'Director']

// ─── Helpers ──────────────────────────────────────────────────────────────────

function typeLabelFull(t: EntityTypeSel | '') {
  switch (t) {
    case 'department': return 'Department'
    case 'team': return 'Team'
    case 'job-description': return 'Job Description'
    case 'role-card': return 'Role Card'
    default: return ''
  }
}

/** Split comma-separated or newline-separated text to a trimmed string array */
function splitLines(s: string) {
  return s.split('\n').map((l) => l.trim()).filter(Boolean)
}
function splitCommas(s: string) {
  return s.split(',').map((l) => l.trim()).filter(Boolean)
}

// ─── Form field helpers ───────────────────────────────────────────────────────

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {label}{required && <span className="ml-0.5 text-red-400">*</span>}
      </Label>
      {children}
    </div>
  )
}

const INPUT_CLS = 'bg-[#050816] border-border text-foreground placeholder:text-slate-600 focus:border-blue-700 h-8 text-sm'
const TEXTAREA_CLS = 'bg-[#050816] border-border text-foreground placeholder:text-slate-600 focus:border-blue-700 text-sm resize-none'

// ─── Main component ───────────────────────────────────────────────────────────

export function CreateEntityModal({
  open,
  onClose,
  onCreated,
  editItem,
  departments,
}: CreateEntityModalProps) {
  const isEdit = Boolean(editItem)
  const editType = editItem?.type ?? null

  const [entityType, setEntityType] = useState<EntityTypeSel | ''>('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // People fetched on open
  const [people, setPeople] = useState<PersonOption[]>([])
  const [loadingPeople, setLoadingPeople] = useState(false)

  // ── Department form
  const [deptForm, setDeptForm] = useState({ name: '', description: '', ownerPositionId: '', color: '' })

  // ── Team form
  const [teamForm, setTeamForm] = useState({ name: '', description: '', departmentId: '', leaderId: '', color: '' })

  // ── JD form
  const [jdForm, setJdForm] = useState({
    title: '', summary: '', level: '', jobFamily: '',
    responsibilities: '', requiredSkills: '', preferredSkills: '', keyMetrics: '',
    assignToPositionId: '',
  })

  // ── Role Card form
  const [rcForm, setRcForm] = useState({
    roleName: '', roleDescription: '', jobFamily: '', level: '',
    roleInOrg: '', focusArea: '', managerNotes: '',
    assignToPositionId: '',
  })

  // ─── On open: reset + fetch people + pre-populate if edit ─────────────────

  useEffect(() => {
    if (!open) return

    setError(null)
    setSaving(false)

    // Set entity type
    if (editItem) {
      setEntityType(editItem.type)
    } else {
      setEntityType('')
    }

    // Pre-populate forms in edit mode
    if (editItem) {
      switch (editItem.type) {
        case 'department':
          setDeptForm({
            name: editItem.name,
            description: editItem.description ?? '',
            ownerPositionId: editItem.ownerPersonId ?? '',
            color: '',
          })
          break
        case 'team':
          setTeamForm({
            name: editItem.name,
            description: editItem.description ?? '',
            departmentId: editItem.departmentId ?? '',
            leaderId: editItem.leaderId ?? '',
            color: '',
          })
          break
        case 'job-description':
          // Fetch full JD data to get arrays
          fetch(`/api/org/job-descriptions/${editItem.id}`)
            .then((r) => r.json())
            .then((d) => {
              const jd = d.jobDescription
              if (jd) {
                setJdForm({
                  title: jd.title ?? '',
                  summary: jd.summary ?? '',
                  level: jd.level ?? '',
                  jobFamily: jd.jobFamily ?? '',
                  responsibilities: (jd.responsibilities ?? []).join('\n'),
                  requiredSkills: (jd.requiredSkills ?? []).join(', '),
                  preferredSkills: (jd.preferredSkills ?? []).join(', '),
                  keyMetrics: (jd.keyMetrics ?? []).join(', '),
                  assignToPositionId: '',
                })
              }
            })
            .catch(() => {})
          break
        case 'role-card':
          // Fetch full role card data
          fetch(`/api/org/role-templates/${editItem.id}`)
            .then((r) => r.json())
            .then((d) => {
              const t = d.template
              if (t) {
                setRcForm({
                  roleName: t.roleName ?? '',
                  roleDescription: t.roleDescription ?? '',
                  jobFamily: t.jobFamily ?? '',
                  level: t.level ?? '',
                  roleInOrg: t.roleInOrg ?? '',
                  focusArea: t.focusArea ?? '',
                  managerNotes: t.managerNotes ?? '',
                  assignToPositionId: t.positionId ?? '',
                })
              }
            })
            .catch(() => {})
          break
      }
    } else {
      // Reset all forms for create mode
      setDeptForm({ name: '', description: '', ownerPositionId: '', color: '' })
      setTeamForm({ name: '', description: '', departmentId: '', leaderId: '', color: '' })
      setJdForm({ title: '', summary: '', level: '', jobFamily: '', responsibilities: '', requiredSkills: '', preferredSkills: '', keyMetrics: '', assignToPositionId: '' })
      setRcForm({ roleName: '', roleDescription: '', jobFamily: '', level: '', roleInOrg: '', focusArea: '', managerNotes: '', assignToPositionId: '' })
    }

    // Fetch people list (needed for owner/leader/assign selects)
    setLoadingPeople(true)
    fetch('/api/org/people')
      .then((r) => r.json())
      .then((d) => {
        const raw: Array<{ id: string; fullName: string }> = d?.data?.people ?? []
        setPeople(raw.map((p) => ({ id: p.id, fullName: p.fullName })))
      })
      .catch(() => setPeople([]))
      .finally(() => setLoadingPeople(false))
  }, [open, editItem])

  // ─── Type change resets relevant form ────────────────────────────────────

  const handleTypeChange = (t: EntityTypeSel) => {
    setEntityType(t)
    setError(null)
  }

  // ─── Submit ───────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!entityType) return
    setSaving(true)
    setError(null)

    try {
      if (isEdit) {
        await handleEdit()
      } else {
        await handleCreate()
      }
      onCreated()
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  const handleCreate = async () => {
    switch (entityType) {
      case 'department': {
        if (!deptForm.name.trim()) throw new Error('Department name is required')
        const res = await fetch('/api/org/structure/departments/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: deptForm.name.trim(),
            ...(deptForm.description.trim() && { description: deptForm.description.trim() }),
            ...(deptForm.ownerPositionId && { ownerPersonId: deptForm.ownerPositionId }),
            ...(deptForm.color && { color: deptForm.color }),
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? 'Failed to create department')
        break
      }

      case 'team': {
        if (!teamForm.name.trim()) throw new Error('Team name is required')
        const res = await fetch('/api/org/structure/teams/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: teamForm.name.trim(),
            ...(teamForm.departmentId && { departmentId: teamForm.departmentId }),
            ...(teamForm.description.trim() && { description: teamForm.description.trim() }),
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? 'Failed to create team')
        break
      }

      case 'job-description': {
        if (!jdForm.title.trim()) throw new Error('Title is required')
        const res = await fetch('/api/org/job-descriptions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: jdForm.title.trim(),
            ...(jdForm.summary.trim() && { summary: jdForm.summary.trim() }),
            ...(jdForm.level && { level: jdForm.level }),
            ...(jdForm.jobFamily.trim() && { jobFamily: jdForm.jobFamily.trim() }),
            responsibilities: splitLines(jdForm.responsibilities),
            requiredSkills: splitCommas(jdForm.requiredSkills),
            preferredSkills: splitCommas(jdForm.preferredSkills),
            keyMetrics: splitCommas(jdForm.keyMetrics),
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? 'Failed to create job description')
        // Link to position if assigned
        if (jdForm.assignToPositionId && data.jobDescription?.id) {
          await fetch(`/api/org/positions/${jdForm.assignToPositionId}/job-description`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jobDescriptionId: data.jobDescription.id }),
          })
        }
        break
      }

      case 'role-card': {
        if (!rcForm.roleName.trim()) throw new Error('Role name is required')
        if (!rcForm.jobFamily.trim()) throw new Error('Job family is required')
        if (!rcForm.level) throw new Error('Level is required')
        if (!rcForm.roleDescription.trim()) throw new Error('Description is required')
        const res = await fetch('/api/org/role-templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roleName: rcForm.roleName.trim(),
            jobFamily: rcForm.jobFamily.trim(),
            level: rcForm.level,
            roleDescription: rcForm.roleDescription.trim(),
            ...(rcForm.roleInOrg.trim() && { roleInOrg: rcForm.roleInOrg.trim() }),
            ...(rcForm.focusArea.trim() && { focusArea: rcForm.focusArea.trim() }),
            ...(rcForm.managerNotes.trim() && { managerNotes: rcForm.managerNotes.trim() }),
            ...(rcForm.assignToPositionId && { positionId: rcForm.assignToPositionId }),
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? 'Failed to create role card')
        break
      }
    }
  }

  const handleEdit = async () => {
    if (!editItem) return

    switch (entityType) {
      case 'department': {
        if (!deptForm.name.trim()) throw new Error('Department name is required')
        const res = await fetch(`/api/org/structure/departments/${editItem.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: deptForm.name.trim(),
            description: deptForm.description.trim() || null,
            ownerPersonId: deptForm.ownerPositionId || null,
            color: deptForm.color || null,
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? 'Failed to update department')
        break
      }

      case 'team': {
        if (!teamForm.name.trim()) throw new Error('Team name is required')
        const res = await fetch(`/api/org/structure/teams/${editItem.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: teamForm.name.trim(),
            description: teamForm.description.trim() || null,
            departmentId: teamForm.departmentId || null,
            leaderId: teamForm.leaderId || null,
            color: teamForm.color || null,
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? 'Failed to update team')
        break
      }

      case 'job-description': {
        if (!jdForm.title.trim()) throw new Error('Title is required')
        const res = await fetch(`/api/org/job-descriptions/${editItem.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: jdForm.title.trim(),
            summary: jdForm.summary.trim() || null,
            level: jdForm.level || null,
            jobFamily: jdForm.jobFamily.trim() || null,
            responsibilities: splitLines(jdForm.responsibilities),
            requiredSkills: splitCommas(jdForm.requiredSkills),
            preferredSkills: splitCommas(jdForm.preferredSkills),
            keyMetrics: splitCommas(jdForm.keyMetrics),
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? 'Failed to update job description')
        break
      }

      case 'role-card': {
        if (!rcForm.roleName.trim()) throw new Error('Role name is required')
        if (!rcForm.jobFamily.trim()) throw new Error('Job family is required')
        if (!rcForm.level) throw new Error('Level is required')
        if (!rcForm.roleDescription.trim()) throw new Error('Description is required')
        const res = await fetch(`/api/org/role-templates/${editItem.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roleName: rcForm.roleName.trim(),
            jobFamily: rcForm.jobFamily.trim(),
            level: rcForm.level,
            roleDescription: rcForm.roleDescription.trim(),
            roleInOrg: rcForm.roleInOrg.trim() || null,
            focusArea: rcForm.focusArea.trim() || null,
            managerNotes: rcForm.managerNotes.trim() || null,
            positionId: rcForm.assignToPositionId || undefined,
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? 'Failed to update role card')
        break
      }
    }
  }

  // ─── Form sections ────────────────────────────────────────────────────────

  const peopleSelect = (value: string, onChange: (v: string) => void, placeholder = 'Select person…') => (
    <Select value={value} onValueChange={onChange} disabled={loadingPeople}>
      <SelectTrigger className={INPUT_CLS + ' h-8'}>
        <SelectValue placeholder={loadingPeople ? 'Loading…' : placeholder} />
      </SelectTrigger>
      <SelectContent className="bg-card border-border text-foreground">
        <SelectItem value="_none" className="text-muted-foreground focus:bg-[#1e293b]">None</SelectItem>
        {people.map((p) => (
          <SelectItem key={p.id} value={p.id} className="focus:bg-[#1e293b]">
            {p.fullName}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )

  const deptFormSection = (
    <div className="space-y-3 mt-4">
      <Field label="Name" required>
        <Input
          value={deptForm.name}
          onChange={(e) => setDeptForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="e.g., Engineering"
          className={INPUT_CLS}
          autoFocus
        />
      </Field>
      <Field label="Description">
        <Textarea
          value={deptForm.description}
          onChange={(e) => setDeptForm((f) => ({ ...f, description: e.target.value }))}
          placeholder="Optional department overview"
          className={TEXTAREA_CLS}
          rows={2}
        />
      </Field>
      <Field label="Owner">
        {peopleSelect(deptForm.ownerPositionId || '_none', (v) => setDeptForm((f) => ({ ...f, ownerPositionId: v === '_none' ? '' : v })))}
      </Field>
      <Field label="Color">
        <Select value={deptForm.color || '_none'} onValueChange={(v) => setDeptForm((f) => ({ ...f, color: v === '_none' ? '' : v }))}>
          <SelectTrigger className={INPUT_CLS + ' h-8'}>
            <SelectValue placeholder="Select color…" />
          </SelectTrigger>
          <SelectContent className="bg-card border-border text-foreground">
            <SelectItem value="_none" className="text-muted-foreground focus:bg-[#1e293b]">None</SelectItem>
            {COLOR_PALETTE.map((c) => (
              <SelectItem key={c.value} value={c.value} className="focus:bg-[#1e293b]">
                <span className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full inline-block" style={{ backgroundColor: c.value }} />
                  {c.label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
    </div>
  )

  const teamFormSection = (
    <div className="space-y-3 mt-4">
      <Field label="Name" required>
        <Input
          value={teamForm.name}
          onChange={(e) => setTeamForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="e.g., Platform"
          className={INPUT_CLS}
          autoFocus
        />
      </Field>
      <Field label="Department">
        <Select
          value={teamForm.departmentId || '_none'}
          onValueChange={(v) => setTeamForm((f) => ({ ...f, departmentId: v === '_none' ? '' : v }))}
        >
          <SelectTrigger className={INPUT_CLS + ' h-8'}>
            <SelectValue placeholder="Select department…" />
          </SelectTrigger>
          <SelectContent className="bg-card border-border text-foreground">
            <SelectItem value="_none" className="text-muted-foreground focus:bg-[#1e293b]">No department</SelectItem>
            {departments.map((d) => (
              <SelectItem key={d.id} value={d.id} className="focus:bg-[#1e293b]">{d.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field label="Description">
        <Textarea
          value={teamForm.description}
          onChange={(e) => setTeamForm((f) => ({ ...f, description: e.target.value }))}
          placeholder="Optional team overview"
          className={TEXTAREA_CLS}
          rows={2}
        />
      </Field>
      <Field label="Team Lead">
        {peopleSelect(teamForm.leaderId || '_none', (v) => setTeamForm((f) => ({ ...f, leaderId: v === '_none' ? '' : v })))}
      </Field>
    </div>
  )

  const jdFormSection = (
    <div className="space-y-3 mt-4">
      <Field label="Title" required>
        <Input
          value={jdForm.title}
          onChange={(e) => setJdForm((f) => ({ ...f, title: e.target.value }))}
          placeholder="e.g., Software Engineer"
          className={INPUT_CLS}
          autoFocus
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Level">
          <Select value={jdForm.level || '_none'} onValueChange={(v) => setJdForm((f) => ({ ...f, level: v === '_none' ? '' : v }))}>
            <SelectTrigger className={INPUT_CLS + ' h-8'}>
              <SelectValue placeholder="Select…" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border text-foreground">
              <SelectItem value="_none" className="text-muted-foreground focus:bg-[#1e293b]">None</SelectItem>
              {LEVEL_OPTIONS.map((l) => (
                <SelectItem key={l} value={l} className="focus:bg-[#1e293b]">{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Job Family">
          <Input
            value={jdForm.jobFamily}
            onChange={(e) => setJdForm((f) => ({ ...f, jobFamily: e.target.value }))}
            placeholder="e.g., Engineering"
            className={INPUT_CLS}
          />
        </Field>
      </div>
      <Field label="Summary">
        <Textarea
          value={jdForm.summary}
          onChange={(e) => setJdForm((f) => ({ ...f, summary: e.target.value }))}
          placeholder="2-3 sentence overview"
          className={TEXTAREA_CLS}
          rows={2}
        />
      </Field>
      <Field label="Responsibilities (one per line)">
        <Textarea
          value={jdForm.responsibilities}
          onChange={(e) => setJdForm((f) => ({ ...f, responsibilities: e.target.value }))}
          placeholder={'Own the backend architecture\nLead code reviews'}
          className={TEXTAREA_CLS}
          rows={3}
        />
      </Field>
      <Field label="Required Skills (comma-separated)">
        <Input
          value={jdForm.requiredSkills}
          onChange={(e) => setJdForm((f) => ({ ...f, requiredSkills: e.target.value }))}
          placeholder="TypeScript, React, PostgreSQL"
          className={INPUT_CLS}
        />
      </Field>
      <Field label="Preferred Skills (comma-separated)">
        <Input
          value={jdForm.preferredSkills}
          onChange={(e) => setJdForm((f) => ({ ...f, preferredSkills: e.target.value }))}
          placeholder="Go, Kubernetes"
          className={INPUT_CLS}
        />
      </Field>
      {!isEdit && (
        <div className="pt-2 border-t border-border">
          <Field label="Assign to person (optional)">
            {peopleSelect(
              jdForm.assignToPositionId || '_none',
              (v) => setJdForm((f) => ({ ...f, assignToPositionId: v === '_none' ? '' : v })),
              'Save as template'
            )}
          </Field>
        </div>
      )}
    </div>
  )

  const rcFormSection = (
    <div className="space-y-3 mt-4">
      <Field label="Role Name" required>
        <Input
          value={rcForm.roleName}
          onChange={(e) => setRcForm((f) => ({ ...f, roleName: e.target.value }))}
          placeholder="e.g., Epic Owner"
          className={INPUT_CLS}
          autoFocus
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Job Family" required>
          <Input
            value={rcForm.jobFamily}
            onChange={(e) => setRcForm((f) => ({ ...f, jobFamily: e.target.value }))}
            placeholder="e.g., Engineering"
            className={INPUT_CLS}
          />
        </Field>
        <Field label="Level" required>
          <Select value={rcForm.level || '_none'} onValueChange={(v) => setRcForm((f) => ({ ...f, level: v === '_none' ? '' : v }))}>
            <SelectTrigger className={INPUT_CLS + ' h-8'}>
              <SelectValue placeholder="Select…" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border text-foreground">
              <SelectItem value="_none" className="text-muted-foreground focus:bg-[#1e293b]">None</SelectItem>
              {LEVEL_OPTIONS.map((l) => (
                <SelectItem key={l} value={l} className="focus:bg-[#1e293b]">{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>
      <Field label="Description" required>
        <Textarea
          value={rcForm.roleDescription}
          onChange={(e) => setRcForm((f) => ({ ...f, roleDescription: e.target.value }))}
          placeholder="What does this role do?"
          className={TEXTAREA_CLS}
          rows={3}
        />
      </Field>
      <Field label="Role in Org">
        <Input
          value={rcForm.roleInOrg}
          onChange={(e) => setRcForm((f) => ({ ...f, roleInOrg: e.target.value }))}
          placeholder="e.g., Epic Owner for Platform Migration"
          className={INPUT_CLS}
        />
      </Field>
      <Field label="Focus Area">
        <Input
          value={rcForm.focusArea}
          onChange={(e) => setRcForm((f) => ({ ...f, focusArea: e.target.value }))}
          placeholder="e.g., Leading auth migration + API redesign"
          className={INPUT_CLS}
        />
      </Field>
      <Field label="Manager Notes">
        <Textarea
          value={rcForm.managerNotes}
          onChange={(e) => setRcForm((f) => ({ ...f, managerNotes: e.target.value }))}
          placeholder="Context for this role assignment"
          className={TEXTAREA_CLS}
          rows={2}
        />
      </Field>
      <div className="pt-2 border-t border-border">
        <Field label="Assign to person">
          {peopleSelect(
            rcForm.assignToPositionId || '_none',
            (v) => setRcForm((f) => ({ ...f, assignToPositionId: v === '_none' ? '' : v })),
            'Save as template'
          )}
        </Field>
      </div>
    </div>
  )

  // ─── Disable logic ────────────────────────────────────────────────────────

  const canSubmit = !saving && Boolean(entityType)

  const activeType = isEdit ? editType : entityType

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-w-lg max-h-[88vh] overflow-y-auto bg-card border-border text-foreground">
        <DialogHeader>
          <DialogTitle className="text-foreground text-base">
            {isEdit ? `Edit ${typeLabelFull(activeType ?? '')}` : 'Create new'}
          </DialogTitle>
        </DialogHeader>

        {/* Type selector (create mode only) */}
        {!isEdit && (
          <div className="mt-4">
            <Field label="What do you want to create?" required>
              <Select
                value={entityType}
                onValueChange={(v) => handleTypeChange(v as EntityTypeSel)}
              >
                <SelectTrigger className={INPUT_CLS + ' h-9'}>
                  <SelectValue placeholder="Select type…" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border text-foreground">
                  <SelectItem value="department" className="focus:bg-[#1e293b]">🏢 Department</SelectItem>
                  <SelectItem value="team" className="focus:bg-[#1e293b]">👥 Team</SelectItem>
                  <SelectItem value="job-description" className="focus:bg-[#1e293b]">📋 Job Description</SelectItem>
                  <SelectItem value="role-card" className="focus:bg-[#1e293b]">🎯 Role Card</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
        )}

        {/* Cascading form */}
        {activeType === 'department' && deptFormSection}
        {activeType === 'team' && teamFormSection}
        {activeType === 'job-description' && jdFormSection}
        {activeType === 'role-card' && rcFormSection}

        {/* Error */}
        {error && (
          <p className="mt-3 text-sm text-red-400 bg-red-950/40 border border-red-900/50 rounded px-3 py-2">
            {error}
          </p>
        )}

        <DialogFooter className="mt-4 gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={saving}
            className="border-border text-muted-foreground hover:text-foreground hover:bg-[#1e293b]"
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {isEdit ? 'Saving…' : 'Creating…'}
              </>
            ) : isEdit ? (
              `Save ${typeLabelFull(activeType ?? '')}`
            ) : (
              `Create ${typeLabelFull(entityType)}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
