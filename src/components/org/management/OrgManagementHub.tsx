'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Building2,
  FileText,
  LayoutGrid,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Target,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react'
import { CreateEntityModal } from '@/components/org/management/CreateEntityModal'
import { AssignEntityDialog } from '@/components/org/management/AssignEntityDialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

type FilterType = 'all' | 'departments' | 'teams' | 'job-descriptions' | 'role-cards'

interface ManagementItem {
  type: 'department' | 'team' | 'job-description' | 'role-card'
  id: string
  name: string
  description: string | null
  ownerName?: string | null
  ownerPersonId?: string | null
  departmentId?: string | null
  departmentName?: string | null
  leaderId?: string | null
  leaderName?: string | null
  assignedToName?: string | null
  teamName?: string | null
  level?: string | null
  jobFamily?: string | null
  color?: string | null
  positionId?: string | null
  teamCount?: number
  peopleCount?: number
  positionCount?: number
  createdAt: string
}

interface Counts {
  departments: number
  teams: number
  jobDescriptions: number
  roleCards: number
  total: number
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TABS: { key: FilterType; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'departments', label: 'Departments' },
  { key: 'teams', label: 'Teams' },
  { key: 'job-descriptions', label: 'Job Descriptions' },
  { key: 'role-cards', label: 'Role Cards' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function typeIcon(type: ManagementItem['type']) {
  switch (type) {
    case 'department':
      return <Building2 className="h-4 w-4 text-indigo-400" />
    case 'team':
      return <Users className="h-4 w-4 text-emerald-400" />
    case 'job-description':
      return <FileText className="h-4 w-4 text-amber-400" />
    case 'role-card':
      return <Target className="h-4 w-4 text-pink-400" />
  }
}

function typeLabel(type: ManagementItem['type']) {
  switch (type) {
    case 'department':
      return 'Dept'
    case 'team':
      return 'Team'
    case 'job-description':
      return 'JD'
    case 'role-card':
      return 'Role'
  }
}

function contextCell(item: ManagementItem): string {
  switch (item.type) {
    case 'department':
      return '—'
    case 'team':
      return item.departmentName ?? 'No department'
    case 'job-description':
      return item.jobFamily ?? '—'
    case 'role-card':
      return item.teamName ?? 'Unassigned'
  }
}

function detailsCell(item: ManagementItem) {
  switch (item.type) {
    case 'department': {
      const tc = item.teamCount ?? 0
      const pc = item.peopleCount ?? 0
      return (
        <span className="text-muted-foreground">
          {tc} team{tc !== 1 ? 's' : ''} · {pc} people
        </span>
      )
    }
    case 'team': {
      const pc = item.peopleCount ?? 0
      return (
        <span className="flex items-center gap-2 text-muted-foreground">
          {pc} people{item.leaderName ? ` · ${item.leaderName}` : ''}
        </span>
      )
    }
    case 'job-description': {
      const pc = item.positionCount ?? 0
      return (
        <span className="flex items-center gap-2 text-muted-foreground">
          {pc} pos.
          {item.level && (
            <Badge
              variant="outline"
              className="text-xs border-border text-muted-foreground py-0"
            >
              {item.level}
            </Badge>
          )}
        </span>
      )
    }
    case 'role-card':
      return (
        <span className="text-muted-foreground">
          {item.assignedToName ?? (
            <span className="text-slate-600 italic">Template</span>
          )}
        </span>
      )
  }
}

// ─── Skeleton rows ────────────────────────────────────────────────────────────

function SkeletonRows() {
  return (
    <>
      {[1, 2, 3, 4, 5].map((i) => (
        <TableRow key={i} className="border-border hover:bg-transparent">
          <TableCell className="py-3 px-4">
            <div className="h-5 w-12 rounded bg-[#1e293b] animate-pulse" />
          </TableCell>
          <TableCell className="py-3 px-4">
            <div className="h-4 w-40 rounded bg-[#1e293b] animate-pulse" />
          </TableCell>
          <TableCell className="py-3 px-4 hidden sm:table-cell">
            <div className="h-4 w-24 rounded bg-[#1e293b] animate-pulse" />
          </TableCell>
          <TableCell className="py-3 px-4 hidden md:table-cell">
            <div className="h-4 w-32 rounded bg-[#1e293b] animate-pulse" />
          </TableCell>
          <TableCell className="py-3 px-4 w-10" />
        </TableRow>
      ))}
    </>
  )
}

// ─── Row actions ──────────────────────────────────────────────────────────────

function RowActions({
  item,
  onEdit,
  onDelete,
  onAssign,
}: {
  item: ManagementItem
  onEdit: (item: ManagementItem) => void
  onDelete: (item: ManagementItem) => void
  onAssign: (item: ManagementItem) => void
}) {
  const showAssign = item.type === 'job-description' || item.type === 'role-card'
  const showDelete = item.type === 'job-description' || item.type === 'role-card'
  const showArchive = item.type === 'department' || item.type === 'team'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
        >
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Actions</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="bg-card border-border text-foreground min-w-[140px]"
      >
        <DropdownMenuItem
          onClick={() => onEdit(item)}
          className="gap-2 text-sm cursor-pointer hover:bg-[#1e293b] focus:bg-[#1e293b]"
        >
          <Pencil className="h-3.5 w-3.5" />
          Edit
        </DropdownMenuItem>
        {showAssign && (
          <DropdownMenuItem
            onClick={() => onAssign(item)}
            className="gap-2 text-sm cursor-pointer hover:bg-[#1e293b] focus:bg-[#1e293b]"
          >
            <UserPlus className="h-3.5 w-3.5" />
            Assign
          </DropdownMenuItem>
        )}
        {showArchive && (
          <DropdownMenuItem
            onClick={() => onDelete(item)}
            className="gap-2 text-sm cursor-pointer text-amber-400 hover:bg-amber-950/30 focus:bg-amber-950/30"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Archive
          </DropdownMenuItem>
        )}
        {showDelete && (
          <DropdownMenuItem
            onClick={() => onDelete(item)}
            className="gap-2 text-sm cursor-pointer text-red-400 hover:bg-red-950/30 focus:bg-red-950/30"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function OrgManagementHub() {
  const [items, setItems] = useState<ManagementItem[]>([])
  const [counts, setCounts] = useState<Counts>({
    departments: 0,
    teams: 0,
    jobDescriptions: 0,
    roleCards: 0,
    total: 0,
  })
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState<FilterType>('all')
  const [search, setSearch] = useState('')
  const [error, setError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState<ManagementItem | null>(null)
  const [assignItem, setAssignItem] = useState<ManagementItem | null>(null)

  const fetchItems = useCallback(async (filter: FilterType, searchValue: string) => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ type: filter })
      if (searchValue) params.set('search', searchValue)
      const res = await fetch(`/api/org/management?${params}`)
      if (!res.ok) {
        setError('Failed to load org data')
        return
      }
      const data = await res.json()
      setItems(data.items ?? [])
      setCounts(
        data.counts ?? { departments: 0, teams: 0, jobDescriptions: 0, roleCards: 0, total: 0 }
      )
    } catch {
      setError('Network error — please retry')
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial load and filter changes fetch immediately
  useEffect(() => {
    fetchItems(activeFilter, search)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFilter])

  // Search changes are debounced
  const handleSearchChange = (value: string) => {
    setSearch(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      fetchItems(activeFilter, value)
    }, 300)
  }

  const handleFilterChange = (filter: FilterType) => {
    setActiveFilter(filter)
    // fetchItems called via the useEffect above
  }

  const handleCreate = () => {
    setEditItem(null)
    setShowModal(true)
  }

  const handleEdit = (item: ManagementItem) => {
    setEditItem(item)
    setShowModal(true)
  }

  const handleModalClose = () => {
    setShowModal(false)
    setEditItem(null)
  }

  const handleModalCreated = () => {
    fetchItems(activeFilter, search)
  }

  const handleDelete = async (item: ManagementItem) => {
    const label = item.type.replace('-', ' ')
    if (!confirm(`Delete ${label} "${item.name}"? This cannot be undone.`)) return

    const urlMap: Record<ManagementItem['type'], string> = {
      department: `/api/org/structure/departments/${item.id}`,
      team: `/api/org/structure/teams/${item.id}`,
      'job-description': `/api/org/job-descriptions/${item.id}`,
      'role-card': `/api/org/role-templates/${item.id}`,
    }

    try {
      const res = await fetch(urlMap[item.type], { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) {
        // Show the server error (e.g. "has teams", "has positions")
        alert(data.error ?? data.hint ?? `Failed to delete ${label}`)
        return
      }
      fetchItems(activeFilter, search)
    } catch {
      alert('Failed to delete. Please try again.')
    }
  }

  const handleAssign = (item: ManagementItem) => {
    setAssignItem(item)
  }

  const tabCounts: Record<FilterType, number> = {
    all: counts.total,
    departments: counts.departments,
    teams: counts.teams,
    'job-descriptions': counts.jobDescriptions,
    'role-cards': counts.roleCards,
  }

  // Extract departments from current items for the modal's Team form
  const departmentOptions = items
    .filter((i) => i.type === 'department')
    .map((i) => ({ id: i.id, name: i.name }))

  return (
    <div className="p-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
            <LayoutGrid className="h-6 w-6" />
            Org Management
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your organization&apos;s structure, roles, and job descriptions
          </p>
        </div>
        <Button onClick={handleCreate} className="shrink-0">
          <Plus className="h-4 w-4 mr-1.5" />
          Create
        </Button>
      </div>

      {/* Filter tabs + Search */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        {/* Type filter tabs */}
        <div className="flex items-center gap-1 flex-wrap">
          {TABS.map(({ key, label }) => {
            const count = tabCounts[key]
            const active = activeFilter === key
            return (
              <button
                key={key}
                type="button"
                onClick={() => handleFilterChange(key)}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-all duration-150',
                  active
                    ? 'bg-card border border-border text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-card/60 border border-transparent'
                )}
              >
                {label}
                {!loading && (
                  <span
                    className={cn(
                      'text-[11px] rounded-full px-1.5 py-0 min-w-[1.25rem] text-center',
                      active
                        ? 'bg-[#243B7D] text-foreground'
                        : 'bg-[#1e293b] text-muted-foreground'
                    )}
                  >
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Search */}
        <div className="sm:ml-auto w-full sm:w-64">
          <Input
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search…"
            className="bg-card border-border text-foreground placeholder:text-slate-600 h-8 text-sm"
          />
        </div>
      </div>

      {/* Error */}
      {error && (
        <p className="mb-4 text-sm text-red-400 bg-red-950/40 border border-red-900/50 rounded px-3 py-2">
          {error}
        </p>
      )}

      {/* Table */}
      <Card className="border-border bg-card">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground text-xs font-semibold uppercase tracking-wide w-20 py-3 px-4">
                  Type
                </TableHead>
                <TableHead className="text-muted-foreground text-xs font-semibold uppercase tracking-wide py-3 px-4">
                  Name
                </TableHead>
                <TableHead className="text-muted-foreground text-xs font-semibold uppercase tracking-wide py-3 px-4 hidden sm:table-cell">
                  Context
                </TableHead>
                <TableHead className="text-muted-foreground text-xs font-semibold uppercase tracking-wide py-3 px-4 hidden md:table-cell">
                  Details
                </TableHead>
                <TableHead className="w-10 py-3 px-4" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <SkeletonRows />
              ) : items.length === 0 ? (
                <TableRow className="border-0 hover:bg-transparent">
                  <TableCell colSpan={5} className="py-16 text-center">
                    <LayoutGrid className="h-10 w-10 text-slate-700 mx-auto mb-3" />
                    <p className="text-muted-foreground font-medium">
                      {search
                        ? `No results for "${search}"`
                        : activeFilter !== 'all'
                          ? `No ${activeFilter.replace('-', ' ')} found`
                          : 'No org structure yet'}
                    </p>
                    {!search && activeFilter === 'all' && (
                      <p className="text-slate-600 text-sm mt-1">
                        Click + Create to get started
                      </p>
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item) => (
                  <TableRow
                    key={`${item.type}-${item.id}`}
                    className="border-border hover:bg-[#0f172a]/60 transition-colors"
                  >
                    {/* Type */}
                    <TableCell className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        {typeIcon(item.type)}
                        <span className="text-[11px] text-muted-foreground hidden sm:inline">
                          {typeLabel(item.type)}
                        </span>
                        {item.color && (
                          <span
                            className="h-2 w-2 rounded-full shrink-0"
                            style={{ backgroundColor: item.color }}
                          />
                        )}
                      </div>
                    </TableCell>

                    {/* Name */}
                    <TableCell className="py-3 px-4">
                      <span className="font-medium text-foreground text-sm">{item.name}</span>
                      {item.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1 max-w-xs">
                          {item.description}
                        </p>
                      )}
                    </TableCell>

                    {/* Context */}
                    <TableCell className="py-3 px-4 hidden sm:table-cell">
                      <span className="text-sm text-muted-foreground">{contextCell(item)}</span>
                    </TableCell>

                    {/* Details */}
                    <TableCell className="py-3 px-4 hidden md:table-cell text-sm">
                      {detailsCell(item)}
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="py-3 px-4 text-right">
                      <RowActions
                        item={item}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        onAssign={handleAssign}
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Footer count */}
      {!loading && items.length > 0 && (
        <p className="mt-3 text-xs text-slate-600 text-right">
          {items.length} item{items.length !== 1 ? 's' : ''}
          {search && ` matching "${search}"`}
        </p>
      )}

      {/* Create / Edit modal */}
      <CreateEntityModal
        open={showModal}
        onClose={handleModalClose}
        onCreated={handleModalCreated}
        editItem={editItem}
        departments={departmentOptions}
      />

      {/* Assign dialog */}
      <AssignEntityDialog
        open={!!assignItem}
        onClose={() => setAssignItem(null)}
        onAssigned={() => {
          setAssignItem(null)
          fetchItems(activeFilter, search)
        }}
        item={assignItem}
      />
    </div>
  )
}
