"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Badge } from "@/components/ui/badge"
import { 
  Command as CommandIcon,
  Filter,
  LayoutGrid,
  Bell,
  MoreHorizontal,
  Plus,
  Calendar,
  User,
  Tag,
  CheckCircle,
  Clock,
  AlertCircle,
  X
} from "lucide-react"

interface TopBarActionsProps {
  colors: {
    background: string
    surface: string
    surfaceElevated: string
    text: string
    textSecondary: string
    textMuted: string
    border: string
    borderLight: string
    primary: string
    success: string
    warning: string
    error: string
  }
  onNewTask?: () => void
  onFilterChange?: (filters: FilterState) => void
}

interface FilterState {
  assignee?: string
  status?: string
  dueDate?: string
  tags?: string[]
}

interface SavedView {
  id: string
  name: string
  filters: FilterState
  isDefault: boolean
}

interface Notification {
  id: string
  kind: 'mention' | 'assignment' | 'due_date' | 'comment'
  title: string
  message: string
  readAt?: string
  createdAt: string
}

// Mock data
const mockSavedViews: SavedView[] = [
  { id: '1', name: 'My Tasks', filters: { assignee: 'me' }, isDefault: true },
  { id: '2', name: 'Overdue', filters: { dueDate: 'overdue' }, isDefault: false },
  { id: '3', name: 'High Priority', filters: { tags: ['urgent', 'high'] }, isDefault: false },
  { id: '4', name: 'In Review', filters: { status: 'IN_REVIEW' }, isDefault: false }
]

const mockNotifications: Notification[] = [
  { 
    id: '1', 
    kind: 'mention', 
    title: 'Mentioned in comment', 
    message: 'John Doe mentioned you in a comment on "Design Mockups"',
    createdAt: '2024-01-20T10:30:00Z'
  },
  { 
    id: '2', 
    kind: 'assignment', 
    title: 'New task assigned', 
    message: 'You have been assigned to "User Testing" task',
    createdAt: '2024-01-20T09:15:00Z'
  },
  { 
    id: '3', 
    kind: 'due_date', 
    title: 'Task due soon', 
    message: 'Market Research is due tomorrow',
    createdAt: '2024-01-19T16:45:00Z',
    readAt: '2024-01-20T08:00:00Z'
  }
]

const mockUsers = [
  { id: '1', name: 'John Doe', email: 'john@example.com', avatar: 'JD' },
  { id: '2', name: 'Jane Smith', email: 'jane@example.com', avatar: 'JS' },
  { id: '3', name: 'Mike Johnson', email: 'mike@example.com', avatar: 'MJ' }
]

const mockTags = ['urgent', 'high', 'medium', 'low', 'design', 'development', 'testing', 'review']

export default function TopBarActions({ colors, onNewTask, onFilterChange }: TopBarActionsProps) {
  const [commandOpen, setCommandOpen] = useState(false)
  const [filterOpen, setFilterOpen] = useState(false)
  const [viewOpen, setViewOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [activeFilters, setActiveFilters] = useState<FilterState>({})
  const [savedViews] = useState<SavedView[]>(mockSavedViews)
  const [notifications] = useState<Notification[]>(mockNotifications)

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) {
        switch (e.key) {
          case 'k':
            e.preventDefault()
            setCommandOpen(true)
            break
          case 'n':
            e.preventDefault()
            onNewTask?.()
            break
        }
      }
      
      if (e.key === 'f' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault()
        setFilterOpen(true)
      }
      
      if (e.key === 'Escape') {
        setCommandOpen(false)
        setFilterOpen(false)
        setViewOpen(false)
        setMoreOpen(false)
        setNotificationsOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onNewTask])

  const handleFilterChange = (newFilters: FilterState) => {
    setActiveFilters(newFilters)
    onFilterChange?.(newFilters)
  }

  const clearAllFilters = () => {
    setActiveFilters({})
    onFilterChange?.({})
  }

  const unreadCount = notifications.filter(n => !n.readAt).length

  return (
    <div className="flex items-center space-x-2">
      {/* Command Palette */}
      <Dialog open={commandOpen} onOpenChange={setCommandOpen}>
        <DialogContent className="max-w-lg" style={{ backgroundColor: colors.surfaceElevated }}>
          <DialogHeader>
            <DialogTitle style={{ color: colors.text }}>Command Palette</DialogTitle>
            <DialogDescription style={{ color: colors.textSecondary }}>
              Quick actions and navigation
            </DialogDescription>
          </DialogHeader>
          <Command>
            <CommandInput placeholder="Type a command or search..." />
            <CommandList>
              <CommandEmpty>No results found.</CommandEmpty>
              <CommandGroup heading="Tasks">
                <CommandItem onSelect={() => { onNewTask?.(); setCommandOpen(false) }}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create new task
                </CommandItem>
                <CommandItem onSelect={() => { setCommandOpen(false) }}>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Mark task as done
                </CommandItem>
              </CommandGroup>
              <CommandGroup heading="Navigation">
                <CommandItem onSelect={() => { setCommandOpen(false) }}>
                  <LayoutGrid className="mr-2 h-4 w-4" />
                  Go to To Do column
                </CommandItem>
                <CommandItem onSelect={() => { setCommandOpen(false) }}>
                  <Clock className="mr-2 h-4 w-4" />
                  Go to In Progress column
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>

      {/* Filter Popover */}
      <Popover open={filterOpen} onOpenChange={setFilterOpen}>
        <PopoverTrigger asChild>
          <Button 
            variant="outline" 
            size="sm"
            className="flex items-center space-x-2"
            style={{ 
              backgroundColor: colors.surface,
              borderColor: colors.border,
              color: colors.text 
            }}
          >
            <Filter className="h-4 w-4" />
            <span>Filter</span>
            {Object.keys(activeFilters).length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {Object.keys(activeFilters).length}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" style={{ backgroundColor: colors.surfaceElevated }}>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium" style={{ color: colors.text }}>Assignee</label>
              <select 
                className="w-full mt-1 p-2 rounded border"
                style={{ backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }}
                value={activeFilters.assignee || ''}
                onChange={(e) => handleFilterChange({ ...activeFilters, assignee: e.target.value || undefined })}
              >
                <option value="">All assignees</option>
                {mockUsers.map(user => (
                  <option key={user.id} value={user.id}>{user.name}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="text-sm font-medium" style={{ color: colors.text }}>Status</label>
              <select 
                className="w-full mt-1 p-2 rounded border"
                style={{ backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }}
                value={activeFilters.status || ''}
                onChange={(e) => handleFilterChange({ ...activeFilters, status: e.target.value || undefined })}
              >
                <option value="">All statuses</option>
                <option value="TODO">To Do</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="IN_REVIEW">In Review</option>
                <option value="DONE">Done</option>
                <option value="BLOCKED">Blocked</option>
              </select>
            </div>
            
            <div>
              <label className="text-sm font-medium" style={{ color: colors.text }}>Due Date</label>
              <select 
                className="w-full mt-1 p-2 rounded border"
                style={{ backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }}
                value={activeFilters.dueDate || ''}
                onChange={(e) => handleFilterChange({ ...activeFilters, dueDate: e.target.value || undefined })}
              >
                <option value="">All dates</option>
                <option value="overdue">Overdue</option>
                <option value="today">Due today</option>
                <option value="tomorrow">Due tomorrow</option>
                <option value="this-week">This week</option>
              </select>
            </div>
            
            <div className="flex justify-between">
              <Button 
                variant="outline" 
                size="sm"
                onClick={clearAllFilters}
                style={{ backgroundColor: colors.surface, borderColor: colors.border }}
              >
                Clear all
              </Button>
              <Button 
                size="sm"
                onClick={() => setFilterOpen(false)}
                style={{ backgroundColor: colors.primary }}
              >
                Apply filters
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* View Switcher */}
      <Popover open={viewOpen} onOpenChange={setViewOpen}>
        <PopoverTrigger asChild>
          <Button 
            variant="outline" 
            size="sm"
            className="flex items-center space-x-2"
            style={{ 
              backgroundColor: colors.surface,
              borderColor: colors.border,
              color: colors.text 
            }}
          >
            <LayoutGrid className="h-4 w-4" />
            <span>Kanban</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64" style={{ backgroundColor: colors.surfaceElevated }}>
          <div className="space-y-2">
            <div className="text-sm font-medium" style={{ color: colors.text }}>Saved Views</div>
            {savedViews.map(view => (
              <div 
                key={view.id}
                className="flex items-center justify-between p-2 rounded hover:bg-gray-100 cursor-pointer"
                style={{ backgroundColor: view.isDefault ? colors.surface : 'transparent' }}
                onClick={() => {
                  handleFilterChange(view.filters)
                  setViewOpen(false)
                }}
              >
                <span className="text-sm" style={{ color: colors.text }}>{view.name}</span>
                {view.isDefault && (
                  <Badge variant="secondary" className="text-xs">Default</Badge>
                )}
              </div>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* Notifications */}
      <Popover open={notificationsOpen} onOpenChange={setNotificationsOpen}>
        <PopoverTrigger asChild>
          <Button 
            variant="outline" 
            size="sm"
            className="relative"
            style={{ 
              backgroundColor: colors.surface,
              borderColor: colors.border,
              color: colors.text 
            }}
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <Badge 
                className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                style={{ backgroundColor: colors.error, color: 'white' }}
              >
                {unreadCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" style={{ backgroundColor: colors.surfaceElevated }}>
          <div className="space-y-2">
            <div className="text-sm font-medium" style={{ color: colors.text }}>Notifications</div>
            {notifications.length === 0 ? (
              <div className="text-sm text-center py-4" style={{ color: colors.textSecondary }}>
                No notifications
              </div>
            ) : (
              notifications.map(notification => (
                <div 
                  key={notification.id}
                  className={`p-3 rounded border-l-4 ${
                    notification.readAt ? 'opacity-60' : ''
                  }`}
                  style={{ 
                    backgroundColor: colors.surface,
                    borderLeftColor: notification.readAt ? colors.border : colors.primary
                  }}
                >
                  <div className="text-sm font-medium" style={{ color: colors.text }}>
                    {notification.title}
                  </div>
                  <div className="text-xs mt-1" style={{ color: colors.textSecondary }}>
                    {notification.message}
                  </div>
                  <div className="text-xs mt-1" style={{ color: colors.textMuted }}>
                    {new Date(notification.createdAt).toLocaleDateString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* More Menu */}
      <Popover open={moreOpen} onOpenChange={setMoreOpen}>
        <PopoverTrigger asChild>
          <Button 
            variant="outline" 
            size="sm"
            style={{ 
              backgroundColor: colors.surface,
              borderColor: colors.border,
              color: colors.text 
            }}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48" style={{ backgroundColor: colors.surfaceElevated }}>
          <div className="space-y-1">
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full justify-start"
              onClick={() => setMoreOpen(false)}
            >
              Export CSV
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full justify-start"
              onClick={() => setMoreOpen(false)}
            >
              Project Settings
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full justify-start"
              onClick={() => setMoreOpen(false)}
            >
              Templates
            </Button>
            <div className="border-t my-1" style={{ borderColor: colors.border }} />
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full justify-start text-red-600"
              onClick={() => setMoreOpen(false)}
            >
              Delete Project
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {/* Active Filters Chips */}
      {Object.keys(activeFilters).length > 0 && (
        <div className="flex items-center space-x-2 ml-4">
          {Object.entries(activeFilters).map(([key, value]) => {
            if (!value) return null
            return (
              <Badge 
                key={key}
                variant="secondary"
                className="flex items-center space-x-1"
                style={{ backgroundColor: colors.surface, color: colors.text }}
              >
                <span>{key}: {Array.isArray(value) ? value.join(', ') : value}</span>
                <X 
                  className="h-3 w-3 cursor-pointer" 
                  onClick={() => {
                    const newFilters = { ...activeFilters }
                    delete newFilters[key as keyof FilterState]
                    handleFilterChange(newFilters)
                  }}
                />
              </Badge>
            )
          })}
        </div>
      )}
    </div>
  )
}








