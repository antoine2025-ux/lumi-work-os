'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Mail } from 'lucide-react'
import type { RoleCardData } from './positions-step'

interface InviteStepProps {
  inviteEmail: string
  setInviteEmail: (value: string) => void
  inviteRole: 'ADMIN' | 'EDITOR' | 'VIEWER'
  setInviteRole: (value: 'ADMIN' | 'EDITOR' | 'VIEWER') => void
  invitePosition: string
  setInvitePosition: (value: string) => void
  roleCards: RoleCardData[]
}

export function InviteStep({
  inviteEmail,
  setInviteEmail,
  inviteRole,
  setInviteRole,
  invitePosition,
  setInvitePosition,
  roleCards,
}: InviteStepProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Mail className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Invite Your First Team Member</h3>
      </div>

      <p className="text-sm text-muted-foreground">
        Optionally add a team member. If you enter an email, we&apos;ll create an invite and show you a shareable link (no email is sent). Leave blank to skip and invite later from Org.
      </p>

      <div className="space-y-2">
        <Label htmlFor="invite-email">Email Address *</Label>
        <Input
          id="invite-email"
          type="email"
          placeholder="colleague@company.com"
          value={inviteEmail}
          onChange={(e) => setInviteEmail(e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="invite-position">Position *</Label>
        <Select value={invitePosition} onValueChange={setInvitePosition}>
          <SelectTrigger id="invite-position">
            <SelectValue placeholder="Select a position" />
          </SelectTrigger>
          <SelectContent>
            {roleCards.map((role, index) => (
              <SelectItem key={index} value={index.toString()}>
                {role.name} ({role.level})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="invite-role">Access Level *</Label>
        <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as 'ADMIN' | 'EDITOR' | 'VIEWER')}>
          <SelectTrigger id="invite-role">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="VIEWER">
              Viewer - Can view org structure
            </SelectItem>
            <SelectItem value="EDITOR">
              Editor - Can edit and contribute
            </SelectItem>
            <SelectItem value="ADMIN">
              Admin - Full workspace control
            </SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          {inviteRole === 'VIEWER' && 'Can view org structure and projects'}
          {inviteRole === 'EDITOR' && 'Can edit org structure, create projects, and invite members'}
          {inviteRole === 'ADMIN' && 'Full control: manage org structure, settings, and all features'}
        </p>
      </div>
    </div>
  )
}
