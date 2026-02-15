'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Users, Plus, X, Search, Shield, Eye, UserCheck, Star } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Stakeholder {
  id: string
  role: string
  canEdit: boolean
  canApprove: boolean
  user: {
    id: string
    name: string | null
    email: string
    image: string | null
  }
}

interface Props {
  goalId: string
  stakeholders: Stakeholder[]
}

const ROLE_CONFIG: Record<string, { label: string; icon: typeof Users; className: string }> = {
  OWNER: { label: 'Owner', icon: Star, className: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
  CONTRIBUTOR: { label: 'Contributor', icon: UserCheck, className: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  REVIEWER: { label: 'Reviewer', icon: Shield, className: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  VIEWER: { label: 'Viewer', icon: Eye, className: 'bg-muted/50 text-muted-foreground border-border' },
}

export function StakeholderPanel({ goalId, stakeholders: initialStakeholders }: Props) {
  const router = useRouter()
  const [stakeholders] = useState<Stakeholder[]>(initialStakeholders)
  const [isAdding, setIsAdding] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [availableMembers, setAvailableMembers] = useState<Array<{ id: string; name: string | null; email: string }>>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedRole, setSelectedRole] = useState<string>('CONTRIBUTOR')
  const [addingUserId, setAddingUserId] = useState<string | null>(null)
  const [removingId, setRemovingId] = useState<string | null>(null)

  // Stable key to avoid fetch loop
  const stakeholderIdsKey = useMemo(
    () => stakeholders.map(s => s.user.id).sort().join(','),
    [stakeholders]
  )

  const loadMembers = useCallback(async () => {
    const idsSet = new Set(stakeholderIdsKey ? stakeholderIdsKey.split(',') : [])
    setIsLoading(true)
    try {
      const response = await fetch('/api/workspaces/current/members')
      if (response.ok) {
        const data = await response.json()
        const members = (data.members || data || []).filter(
          (m: { userId: string }) => !idsSet.has(m.userId)
        )
        setAvailableMembers(
          members.map((m: { userId: string; user?: { name: string | null; email: string } }) => ({
            id: m.userId,
            name: m.user?.name ?? null,
            email: m.user?.email ?? '',
          }))
        )
      }
    } catch {
      console.error('Failed to load members')
    } finally {
      setIsLoading(false)
    }
  }, [stakeholderIdsKey])

  useEffect(() => {
    if (isAdding) {
      loadMembers()
    }
  }, [isAdding, loadMembers])

  const handleAdd = async (userId: string) => {
    setAddingUserId(userId)
    try {
      const response = await fetch(`/api/goals/${goalId}/stakeholders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          role: selectedRole,
          canEdit: selectedRole === 'OWNER' || selectedRole === 'CONTRIBUTOR',
          canApprove: selectedRole === 'REVIEWER' || selectedRole === 'OWNER',
        }),
      })
      if (response.ok) {
        router.refresh()
        setIsAdding(false)
        setSearchQuery('')
      }
    } catch {
      console.error('Failed to add stakeholder')
    } finally {
      setAddingUserId(null)
    }
  }

  const handleRemove = async (userId: string) => {
    setRemovingId(userId)
    try {
      const response = await fetch(`/api/goals/${goalId}/stakeholders?userId=${userId}`, {
        method: 'DELETE',
      })
      if (response.ok) {
        router.refresh()
      }
    } catch {
      console.error('Failed to remove stakeholder')
    } finally {
      setRemovingId(null)
    }
  }

  const filteredMembers = availableMembers.filter(m =>
    (m.name?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
    m.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg flex items-center gap-2 text-foreground">
            <Users className="w-5 h-5" />
            Stakeholders
          </h3>
          {!isAdding && (
            <button
              onClick={() => setIsAdding(true)}
              className="inline-flex items-center px-3 py-2 text-sm border border-border rounded-lg hover:bg-muted/50 transition-colors text-foreground"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Stakeholder
            </button>
          )}
        </div>

        {/* Add Stakeholder Interface */}
        {isAdding && (
          <div className="space-y-3 border border-border rounded-lg p-4 bg-muted/30">
            <div className="flex items-center gap-2">
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm outline-none focus:border-primary"
              >
                <option value="CONTRIBUTOR">Contributor</option>
                <option value="REVIEWER">Reviewer</option>
                <option value="VIEWER">Viewer</option>
                <option value="OWNER">Owner</option>
              </select>
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search members..."
                  className="w-full pl-10 px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                />
              </div>
              <button
                onClick={() => { setIsAdding(false); setSearchQuery('') }}
                className="inline-flex items-center px-3 py-2 text-sm border border-border rounded-lg hover:bg-muted/50 transition-colors text-foreground"
              >
                Cancel
              </button>
            </div>

            {isLoading ? (
              <div className="text-center py-4 text-sm text-muted-foreground">Loading members...</div>
            ) : filteredMembers.length === 0 ? (
              <div className="text-center py-4 text-sm text-muted-foreground">
                {searchQuery ? 'No members found' : 'No available members'}
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {filteredMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded border border-border hover:border-primary transition-colors"
                  >
                    <div>
                      <div className="font-medium text-foreground">{member.name ?? member.email}</div>
                      {member.name && <div className="text-sm text-muted-foreground">{member.email}</div>}
                    </div>
                    <button
                      onClick={() => handleAdd(member.id)}
                      disabled={addingUserId === member.id}
                      className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                      {addingUserId === member.id ? 'Adding...' : 'Add'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Stakeholders List */}
        {stakeholders.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-2 text-muted-foreground/50" />
            <p className="text-sm">No stakeholders assigned yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {stakeholders.map((s) => {
              const config = ROLE_CONFIG[s.role] ?? ROLE_CONFIG.VIEWER
              const Icon = config.icon
              return (
                <div
                  key={s.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded hover:bg-muted/70 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
                      {(s.user.name ?? s.user.email)[0].toUpperCase()}
                    </div>
                    <div>
                      <div className="font-medium text-foreground">{s.user.name ?? s.user.email}</div>
                      {s.user.name && <div className="text-xs text-muted-foreground">{s.user.email}</div>}
                    </div>
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border ${config.className}`}>
                      <Icon className="w-3 h-3" />
                      {config.label}
                    </span>
                  </div>
                  <button
                    onClick={() => handleRemove(s.user.id)}
                    disabled={removingId === s.user.id}
                    className="p-2 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <X className="w-4 h-4 text-red-400" />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
