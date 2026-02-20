'use client'

import { useState, useEffect } from 'react'
import { Check } from 'lucide-react'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

interface MemberPickerProps {
  selectedMembers: string[]
  onMembersChange: (members: string[]) => void
  workspaceId: string
}

interface Member {
  userId: string
  user: {
    id: string
    name: string | null
    email: string
    image: string | null
  }
}

export function MemberPicker({
  selectedMembers,
  onMembersChange,
  workspaceId,
}: MemberPickerProps) {
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!workspaceId) {
      setLoading(false)
      return
    }
    fetch(`/api/workspaces/${workspaceId}/members`)
      .then((r) => r.json())
      .then((data) => {
        setMembers(data.members || [])
      })
      .catch(() => setMembers([]))
      .finally(() => setLoading(false))
  }, [workspaceId])

  const toggleMember = (userId: string) => {
    if (selectedMembers.includes(userId)) {
      onMembersChange(selectedMembers.filter((id) => id !== userId))
    } else {
      onMembersChange([...selectedMembers, userId])
    }
  }

  if (!workspaceId) {
    return (
      <p className="text-sm text-muted-foreground">No workspace selected.</p>
    )
  }

  if (loading) {
    return (
      <p className="text-sm text-muted-foreground">Loading members...</p>
    )
  }

  return (
    <div className="space-y-2">
      <Command className="border rounded-md">
        <CommandInput placeholder="Search members..." />
        <CommandList>
          <CommandEmpty>No members found.</CommandEmpty>
          <CommandGroup className="max-h-[200px] overflow-auto">
            {members.map((member) => (
              <CommandItem
                key={member.userId}
                onSelect={() => toggleMember(member.userId)}
              >
                <div className="flex items-center gap-2 flex-1">
                  <Avatar className="w-6 h-6">
                    <AvatarImage src={member.user.image ?? undefined} />
                    <AvatarFallback>
                      {member.user.name?.[0] ?? member.user.email?.[0] ?? '?'}
                    </AvatarFallback>
                  </Avatar>
                  <span>{member.user.name ?? member.user.email}</span>
                  {selectedMembers.includes(member.userId) && (
                    <Check className="w-4 h-4 ml-auto" />
                  )}
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>

      {selectedMembers.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedMembers.map((userId) => {
            const member = members.find((m) => m.userId === userId)
            return member ? (
              <Badge key={userId} variant="secondary">
                {member.user.name ?? member.user.email}
              </Badge>
            ) : null
          })}
        </div>
      )}
    </div>
  )
}
