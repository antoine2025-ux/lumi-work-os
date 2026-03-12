'use client'

import { useState, useEffect, useRef } from 'react'
import { Check, ChevronsUpDown, X, User, Search } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PeoplePickerProps {
  value: string | null
  onChange: (personId: string | null) => void
  placeholder?: string
  className?: string
  allowClear?: boolean
}

interface Member {
  userId: string
  user: {
    id: string
    name: string | null
    email: string
    image: string | null
  }
  orgPositionTitle?: string | null
  department?: string | null
}

export function PeoplePicker({
  value,
  onChange,
  placeholder = 'Select person...',
  className,
  allowClear = false,
}: PeoplePickerProps) {
  const [open, setOpen] = useState(false)
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const fetchMembers = async () => {
      setLoading(true)
      try {
        const response = await fetch('/api/workspaces/current/members')
        if (response.ok) {
          const data = await response.json()
          setMembers(data.members || [])
        }
      } catch (error: unknown) {
        console.error('Failed to load members:', error)
      } finally {
        setLoading(false)
      }
    }

    if (open && members.length === 0) {
      fetchMembers()
    }
  }, [open, members.length])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open])

  const selectedMember = members.find((m) => m.userId === value)

  const filteredMembers = members.filter((member) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    const name = member.user.name?.toLowerCase() || ''
    const email = member.user.email.toLowerCase()
    const title = member.orgPositionTitle?.toLowerCase() || ''
    const dept = member.department?.toLowerCase() || ''
    return (
      name.includes(query) ||
      email.includes(query) ||
      title.includes(query) ||
      dept.includes(query)
    )
  })

  const handleSelect = (userId: string) => {
    onChange(userId)
    setOpen(false)
    setSearchQuery('')
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(null)
  }

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background',
          'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-50',
          !selectedMember && 'text-muted-foreground'
        )}
      >
        <span className="flex items-center gap-2 truncate">
          {selectedMember ? (
            <>
              {selectedMember.user.image ? (
                <img
                  src={selectedMember.user.image}
                  alt=""
                  className="h-5 w-5 rounded-full"
                />
              ) : (
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                  {(selectedMember.user.name || selectedMember.user.email)[0].toUpperCase()}
                </div>
              )}
              <span className="truncate">
                {selectedMember.user.name || selectedMember.user.email}
              </span>
            </>
          ) : (
            <>
              <User className="h-4 w-4" />
              {placeholder}
            </>
          )}
        </span>
        <div className="flex items-center gap-1">
          {allowClear && selectedMember && (
            <X
              className="h-4 w-4 shrink-0 opacity-50 hover:opacity-100"
              onClick={handleClear}
            />
          )}
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </div>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-lg">
          <div className="p-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search people..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 w-full rounded-md border border-input bg-background pl-8 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                autoFocus
              />
            </div>
          </div>

          <div className="max-h-60 overflow-y-auto p-1">
            {loading ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Loading members...
              </div>
            ) : filteredMembers.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                {searchQuery ? 'No members found' : 'No members available'}
              </div>
            ) : (
              filteredMembers.map((member) => (
                <button
                  key={member.userId}
                  type="button"
                  onClick={() => handleSelect(member.userId)}
                  className={cn(
                    'relative flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-2 text-sm outline-none',
                    'hover:bg-accent hover:text-accent-foreground',
                    value === member.userId && 'bg-accent text-accent-foreground'
                  )}
                >
                  {member.user.image ? (
                    <img
                      src={member.user.image}
                      alt=""
                      className="h-6 w-6 rounded-full"
                    />
                  ) : (
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                      {(member.user.name || member.user.email)[0].toUpperCase()}
                    </div>
                  )}
                  <div className="flex flex-1 flex-col items-start text-left">
                    <div className="font-medium">
                      {member.user.name || member.user.email}
                    </div>
                    {(member.orgPositionTitle || member.department) && (
                      <div className="text-xs text-muted-foreground">
                        {[member.orgPositionTitle, member.department]
                          .filter(Boolean)
                          .join(' • ')}
                      </div>
                    )}
                  </div>
                  {value === member.userId && (
                    <Check className="h-4 w-4 shrink-0" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
