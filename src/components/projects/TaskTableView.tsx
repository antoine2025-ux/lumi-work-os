'use client'

import React, { useMemo, useState, useCallback } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type RowSelectionState,
} from '@tanstack/react-table'
import { formatDistanceToNow, format } from 'date-fns'
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  Plus,
  User,
  Loader2,
  Check,
} from 'lucide-react'
import { useTaskSidebarStore } from '@/lib/stores/use-task-sidebar-store'
import { useProjectTasks, type ProjectTask } from '@/hooks/use-project-tasks'
import { useProjectEpics } from '@/hooks/use-projects'
import { useQueryClient } from '@tanstack/react-query'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PeoplePicker } from '@/components/shared/people-picker'
import { CreateTaskDialog } from '@/components/tasks/create-task-dialog'
import { cn } from '@/lib/utils'

const STATUS_OPTIONS = [
  { value: 'TODO' as const, label: 'To Do', color: 'bg-muted text-foreground' },
  { value: 'IN_PROGRESS' as const, label: 'In Progress', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300' },
  { value: 'IN_REVIEW' as const, label: 'In Review', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300' },
  { value: 'DONE' as const, label: 'Done', color: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' },
  { value: 'BLOCKED' as const, label: 'Blocked', color: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300' },
]

const PRIORITY_OPTIONS = [
  { value: 'LOW' as const, label: 'Low', color: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' },
  { value: 'MEDIUM' as const, label: 'Medium', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300' },
  { value: 'HIGH' as const, label: 'High', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300' },
  { value: 'URGENT' as const, label: 'Urgent', color: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300' },
]

interface TaskTableViewProps {
  projectId: string
  workspaceId?: string
  onTasksUpdated?: () => void
}

interface TableFilters {
  title: string
  status: string[]
  priority: string[]
  assignee: string[]
  epic: string[]
}

const DEFAULT_FILTERS: TableFilters = {
  title: '',
  status: [],
  priority: [],
  assignee: [],
  epic: [],
}

function formatDueDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  const date = new Date(dateStr)
  const now = new Date()
  const diffTime = date.getTime() - now.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  if (diffDays < 0) return `Overdue ${Math.abs(diffDays)}d`
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Tomorrow'
  return `In ${diffDays}d`
}

export function TaskTableView({
  projectId,
  workspaceId,
  onTasksUpdated,
}: TaskTableViewProps) {
  const { open } = useTaskSidebarStore()
  const queryClient = useQueryClient()
  const { data, isLoading, refetch } = useProjectTasks(projectId)
  const { data: epics = [] } = useProjectEpics(projectId)
  const [sorting, setSorting] = useState<SortingState>([])
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [filters, setFilters] = useState<TableFilters>(DEFAULT_FILTERS)
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null)
  const [successTaskId, setSuccessTaskId] = useState<string | null>(null)
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false)

  const tasks = data?.tasks ?? []
  const pagination = data?.pagination

  const updateTask = useCallback(
    async (
      taskId: string,
      updates: { status?: string; priority?: string; assigneeId?: string | null; dueDate?: string | null; epicId?: string | null }
    ) => {
      setUpdatingTaskId(taskId)
      const prevTasks = queryClient.getQueryData<{ tasks: ProjectTask[] }>(['project-tasks', projectId])
      const prevTask = prevTasks?.tasks?.find((t) => t.id === taskId)
      if (!prevTask) return

      queryClient.setQueryData(['project-tasks', projectId], (old: { tasks: ProjectTask[] } | undefined) => {
        if (!old) return old
        return {
          ...old,
          tasks: old.tasks.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  ...updates,
                  assignee:
                    updates.assigneeId !== undefined
                      ? updates.assigneeId
                        ? { id: updates.assigneeId, name: null, email: '' }
                        : null
                      : t.assignee,
                  epic:
                    updates.epicId !== undefined
                      ? updates.epicId
                        ? epics.find((e) => e.id === updates.epicId) ?? t.epic
                        : null
                      : t.epic,
                }
              : t
          ),
        }
      })

      try {
        const response = await fetch(`/api/tasks/${taskId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        })
        if (!response.ok) throw new Error('Update failed')
        const updated = await response.json()
        queryClient.setQueryData(['project-tasks', projectId], (old: { tasks: ProjectTask[] } | undefined) => {
          if (!old) return old
          return {
            ...old,
            tasks: old.tasks.map((t) => (t.id === taskId ? { ...t, ...updated } : t)),
          }
        })
        setSuccessTaskId(taskId)
        setTimeout(() => setSuccessTaskId(null), 800)
        onTasksUpdated?.()
      } catch {
        queryClient.setQueryData(['project-tasks', projectId], (old: { tasks: ProjectTask[] } | undefined) => {
          if (!old || !prevTask) return old
          return {
            ...old,
            tasks: old.tasks.map((t) => (t.id === taskId ? prevTask : t)),
          }
        })
      } finally {
        setUpdatingTaskId(null)
      }
    },
    [projectId, queryClient, epics, onTasksUpdated]
  )

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (filters.title) {
        const q = filters.title.toLowerCase()
        if (
          !task.title.toLowerCase().includes(q) &&
          !(task.description ?? '').toLowerCase().includes(q)
        ) {
          return false
        }
      }
      if (filters.status.length > 0 && !filters.status.includes(task.status)) return false
      if (filters.priority.length > 0 && !filters.priority.includes(task.priority)) return false
      if (filters.assignee.length > 0) {
        const aid = task.assignee?.id ?? ''
        if (!filters.assignee.includes(aid)) return false
      }
      if (filters.epic.length > 0) {
        const eid = task.epicId ?? ''
        if (!filters.epic.includes(eid)) return false
      }
      return true
    })
  }, [tasks, filters])

  const columns = useMemo<ColumnDef<ProjectTask>[]>(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected()}
            onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
            aria-label="Select all"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(v) => row.toggleSelected(!!v)}
            aria-label="Select row"
          />
        ),
        enableSorting: false,
      },
      {
        accessorKey: 'title',
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3 h-8"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Title
            {column.getIsSorted() === 'asc' ? (
              <ArrowUp className="ml-2 h-4 w-4" />
            ) : column.getIsSorted() === 'desc' ? (
              <ArrowDown className="ml-2 h-4 w-4" />
            ) : (
              <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />
            )}
          </Button>
        ),
        cell: ({ row }) => (
          <button
            type="button"
            onClick={() => open(row.original.id)}
            className="text-left font-medium text-primary hover:underline truncate max-w-[200px]"
          >
            {row.original.title}
          </button>
        ),
      },
      {
        accessorKey: 'status',
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3 h-8"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Status
            {column.getIsSorted() === 'asc' ? (
              <ArrowUp className="ml-2 h-4 w-4" />
            ) : column.getIsSorted() === 'desc' ? (
              <ArrowDown className="ml-2 h-4 w-4" />
            ) : (
              <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />
            )}
          </Button>
        ),
        cell: ({ row }) => {
          const task = row.original
          const opt = STATUS_OPTIONS.find((o) => o.value === task.status) ?? STATUS_OPTIONS[0]
          const isUpdating = updatingTaskId === task.id
          const isSuccess = successTaskId === task.id
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  disabled={isUpdating}
                  className={cn(
                    'rounded-md px-2 py-0.5 text-xs font-medium transition-colors',
                    opt.color,
                    isSuccess && 'ring-2 ring-green-500',
                    'hover:opacity-90 disabled:opacity-50'
                  )}
                >
                  {isUpdating ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    opt.label
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {STATUS_OPTIONS.map((o) => (
                  <DropdownMenuItem
                    key={o.value}
                    onClick={() => updateTask(task.id, { status: o.value })}
                    disabled={task.status === o.value}
                  >
                    <Badge className={o.color}>{o.label}</Badge>
                    {task.status === o.value && <Check className="ml-2 h-4 w-4" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )
        },
      },
      {
        accessorKey: 'priority',
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3 h-8"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Priority
            {column.getIsSorted() === 'asc' ? (
              <ArrowUp className="ml-2 h-4 w-4" />
            ) : column.getIsSorted() === 'desc' ? (
              <ArrowDown className="ml-2 h-4 w-4" />
            ) : (
              <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />
            )}
          </Button>
        ),
        cell: ({ row }) => {
          const task = row.original
          const opt = PRIORITY_OPTIONS.find((o) => o.value === task.priority) ?? PRIORITY_OPTIONS[1]
          const isUpdating = updatingTaskId === task.id
          const isSuccess = successTaskId === task.id
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  disabled={isUpdating}
                  className={cn(
                    'rounded-md px-2 py-0.5 text-xs font-medium transition-colors',
                    opt.color,
                    isSuccess && 'ring-2 ring-green-500',
                    'hover:opacity-90 disabled:opacity-50'
                  )}
                >
                  {isUpdating ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    opt.label
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {PRIORITY_OPTIONS.map((o) => (
                  <DropdownMenuItem
                    key={o.value}
                    onClick={() => updateTask(task.id, { priority: o.value })}
                    disabled={task.priority === o.value}
                  >
                    <Badge className={o.color}>{o.label}</Badge>
                    {task.priority === o.value && <Check className="ml-2 h-4 w-4" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )
        },
      },
      {
        accessorKey: 'assignee',
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3 h-8"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Assignee
            {column.getIsSorted() === 'asc' ? (
              <ArrowUp className="ml-2 h-4 w-4" />
            ) : column.getIsSorted() === 'desc' ? (
              <ArrowDown className="ml-2 h-4 w-4" />
            ) : (
              <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />
            )}
          </Button>
        ),
        cell: ({ row }) => {
          const task = row.original
          const isUpdating = updatingTaskId === task.id
          return (
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  disabled={isUpdating}
                  className="flex items-center gap-2 min-w-0 hover:bg-muted/50 rounded px-2 py-1 -mx-2"
                >
                  {isUpdating ? (
                    <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                  ) : task.assignee ? (
                    <>
                      <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="text-xs font-medium text-primary">
                          {(task.assignee.name ?? task.assignee.email)[0]?.toUpperCase()}
                        </span>
                      </div>
                      <span className="truncate text-sm">{task.assignee.name ?? task.assignee.email}</span>
                    </>
                  ) : (
                    <>
                      <User className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="text-muted-foreground text-sm">Unassigned</span>
                    </>
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-64">
                <PeoplePicker
                  value={task.assignee?.id ?? null}
                  onChange={(id) => updateTask(task.id, { assigneeId: id })}
                  allowClear
                  placeholder="Select assignee..."
                />
              </PopoverContent>
            </Popover>
          )
        },
      },
      {
        id: 'epic',
        accessorFn: (row) => row.epic?.title ?? '',
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3 h-8"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Epic
            {column.getIsSorted() === 'asc' ? (
              <ArrowUp className="ml-2 h-4 w-4" />
            ) : column.getIsSorted() === 'desc' ? (
              <ArrowDown className="ml-2 h-4 w-4" />
            ) : (
              <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />
            )}
          </Button>
        ),
        cell: ({ row }) => {
          const task = row.original
          const isUpdating = updatingTaskId === task.id
          return (
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  disabled={isUpdating}
                  className="flex items-center gap-1 min-w-0 hover:bg-muted/50 rounded px-2 py-1 -mx-2 text-left"
                >
                  {isUpdating ? (
                    <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                  ) : task.epic ? (
                    <Badge
                      variant="secondary"
                      className="truncate max-w-[120px]"
                      style={
                        task.epic.color
                          ? { backgroundColor: `${task.epic.color}20`, color: task.epic.color }
                          : undefined
                      }
                    >
                      {task.epic.title}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground text-sm">—</span>
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-56">
                <Select
                  value={task.epicId ?? 'none'}
                  onValueChange={(v) => updateTask(task.id, { epicId: v === 'none' ? null : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select epic" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No epic</SelectItem>
                    {epics.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </PopoverContent>
            </Popover>
          )
        },
      },
      {
        accessorKey: 'dueDate',
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3 h-8"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Due Date
            {column.getIsSorted() === 'asc' ? (
              <ArrowUp className="ml-2 h-4 w-4" />
            ) : column.getIsSorted() === 'desc' ? (
              <ArrowDown className="ml-2 h-4 w-4" />
            ) : (
              <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />
            )}
          </Button>
        ),
        cell: ({ row }) => {
          const task = row.original
          const isUpdating = updatingTaskId === task.id
          const dateVal = task.dueDate ? task.dueDate.split('T')[0] : ''
          return (
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  disabled={isUpdating}
                  className="flex items-center min-w-0 hover:bg-muted/50 rounded px-2 py-1 -mx-2 text-left text-sm"
                  title={task.dueDate ? format(new Date(task.dueDate), 'PPp') : undefined}
                >
                  {isUpdating ? (
                    <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                  ) : (
                    formatDueDate(task.dueDate)
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-auto">
                <Input
                  type="date"
                  value={dateVal}
                  onChange={(e) => {
                    const v = e.target.value
                    updateTask(task.id, {
                      dueDate: v ? `${v}T23:59:59.999Z` : null,
                    })
                  }}
                />
              </PopoverContent>
            </Popover>
          )
        },
      },
      {
        accessorKey: 'createdAt',
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3 h-8"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Created
            {column.getIsSorted() === 'asc' ? (
              <ArrowUp className="ml-2 h-4 w-4" />
            ) : column.getIsSorted() === 'desc' ? (
              <ArrowDown className="ml-2 h-4 w-4" />
            ) : (
              <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />
            )}
          </Button>
        ),
        cell: ({ row }) => (
          <span className="text-muted-foreground text-sm">
            {formatDistanceToNow(new Date(row.original.createdAt), { addSuffix: true })}
          </span>
        ),
      },
    ],
    [updatingTaskId, successTaskId, updateTask, epics, open]
  )

  const table = useReactTable({
    data: filteredTasks,
    columns,
    state: { sorting, rowSelection },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 50 } },
  })

  const uniqueStatuses = useMemo(() => [...new Set(tasks.map((t) => t.status))], [tasks])
  const uniquePriorities = useMemo(() => [...new Set(tasks.map((t) => t.priority))], [tasks])
  const uniqueAssignees = useMemo(
    () =>
      tasks
        .map((t) => t.assignee)
        .filter((a): a is NonNullable<typeof a> => !!a)
        .reduce(
          (acc, a) => {
            if (!acc.some((x) => x.id === a.id)) acc.push(a)
            return acc
          },
          [] as Array<{ id: string; name: string | null; email: string }>
        ),
    [tasks]
  )
  const uniqueEpics = useMemo(
    () =>
      tasks
        .map((t) => t.epic)
        .filter((e): e is NonNullable<typeof e> => !!e)
        .reduce(
          (acc, e) => {
            if (!acc.some((x) => x.id === e.id)) acc.push(e)
            return acc
          },
          [] as Array<{ id: string; title: string }>
        ),
    [tasks]
  )

  const toggleFilter = (key: keyof TableFilters, value: string) => {
    setFilters((prev) => {
      const arr = prev[key] as string[]
      const next = arr.includes(value)
        ? arr.filter((v) => v !== value)
        : [...arr, value]
      return { ...prev, [key]: next }
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const pageCount = table.getPageCount()
  const rowCount = table.getFilteredRowModel().rows.length

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Tasks</h2>
          <p className="text-sm text-muted-foreground">
            {pagination ? `${pagination.total} task${pagination.total !== 1 ? 's' : ''} total` : ''}
          </p>
        </div>
        <Button onClick={() => setIsCreateTaskOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Task
        </Button>
      </div>

      {/* Filter row */}
      <div className="flex flex-wrap gap-2 items-center">
        <Input
          placeholder="Search title..."
          value={filters.title}
          onChange={(e) => setFilters((p) => ({ ...p, title: e.target.value }))}
          className="h-8 w-48"
        />
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-8">
              Status
              {filters.status.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {filters.status.length}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-48">
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {STATUS_OPTIONS.filter((o) => uniqueStatuses.includes(o.value)).map((o) => (
                <label
                  key={o.value}
                  className="flex items-center gap-2 cursor-pointer py-1"
                >
                  <Checkbox
                    checked={filters.status.includes(o.value)}
                    onCheckedChange={() => toggleFilter('status', o.value)}
                  />
                  <span className="text-sm">{o.label}</span>
                </label>
              ))}
            </div>
          </PopoverContent>
        </Popover>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-8">
              Priority
              {filters.priority.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {filters.priority.length}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-48">
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {PRIORITY_OPTIONS.filter((o) => uniquePriorities.includes(o.value)).map((o) => (
                <label
                  key={o.value}
                  className="flex items-center gap-2 cursor-pointer py-1"
                >
                  <Checkbox
                    checked={filters.priority.includes(o.value)}
                    onCheckedChange={() => toggleFilter('priority', o.value)}
                  />
                  <span className="text-sm">{o.label}</span>
                </label>
              ))}
            </div>
          </PopoverContent>
        </Popover>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-8">
              Assignee
              {filters.assignee.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {filters.assignee.length}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-48">
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {uniqueAssignees.map((a) => (
                <label
                  key={a.id}
                  className="flex items-center gap-2 cursor-pointer py-1"
                >
                  <Checkbox
                    checked={filters.assignee.includes(a.id)}
                    onCheckedChange={() => toggleFilter('assignee', a.id)}
                  />
                  <span className="text-sm truncate">{a.name ?? a.email}</span>
                </label>
              ))}
            </div>
          </PopoverContent>
        </Popover>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-8">
              Epic
              {filters.epic.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {filters.epic.length}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-48">
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {uniqueEpics.map((e) => (
                <label
                  key={e.id}
                  className="flex items-center gap-2 cursor-pointer py-1"
                >
                  <Checkbox
                    checked={filters.epic.includes(e.id)}
                    onCheckedChange={() => toggleFilter('epic', e.id)}
                  />
                  <span className="text-sm truncate">{e.title}</span>
                </label>
              ))}
            </div>
          </PopoverContent>
        </Popover>
        {(filters.title.length > 0 || filters.status.length > 0 || filters.priority.length > 0 || filters.assignee.length > 0 || filters.epic.length > 0) && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8"
            onClick={() => setFilters(DEFAULT_FILTERS)}
          >
            Clear filters
          </Button>
        )}
      </div>

      <div className="rounded-md border overflow-auto max-h-[calc(100vh-320px)]">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="sticky top-0 z-10 bg-background py-2"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                  No tasks yet. Create your first task.
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                  className="even:bg-muted/30 hover:bg-muted/50"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-2">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {rowCount} task{rowCount !== 1 ? 's' : ''}
        </p>
        {pageCount > 1 && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {table.getState().pagination.pageIndex + 1} of {pageCount}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      <CreateTaskDialog
        open={isCreateTaskOpen}
        onOpenChange={setIsCreateTaskOpen}
        projectId={projectId}
        onTaskCreated={() => {
          refetch()
          onTasksUpdated?.()
        }}
      />
    </div>
  )
}
