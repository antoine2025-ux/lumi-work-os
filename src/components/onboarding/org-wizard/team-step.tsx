'use client'

import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Users } from 'lucide-react'

interface TeamStepProps {
  teamName: string
  setTeamName: (value: string) => void
  teamDescription: string
  setTeamDescription: (value: string) => void
  departmentName: string
}

export function TeamStep({
  teamName,
  setTeamName,
  teamDescription,
  setTeamDescription,
  departmentName,
}: TeamStepProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Users className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Create Your First Team</h3>
      </div>

      <p className="text-sm text-muted-foreground">
        Teams are groups of people working together within the <strong>{departmentName}</strong> department.
        You&apos;ll be assigned as the team lead.
      </p>

      <div className="space-y-2">
        <Label htmlFor="team-name">Team Name *</Label>
        <Input
          id="team-name"
          placeholder="Platform Team"
          value={teamName}
          onChange={(e) => setTeamName(e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="team-desc">Description (optional)</Label>
        <Textarea
          id="team-desc"
          placeholder="Builds and maintains core platform infrastructure"
          value={teamDescription}
          onChange={(e) => setTeamDescription(e.target.value)}
          rows={3}
        />
      </div>
    </div>
  )
}
