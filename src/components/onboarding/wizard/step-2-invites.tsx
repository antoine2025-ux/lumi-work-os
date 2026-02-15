'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Users, ArrowLeft, ArrowRight, Plus, X, Loader2 } from 'lucide-react'
import type { OnboardingStep2Data } from '@/lib/validations/onboarding'

interface InviteRow {
  email: string
  role: 'ADMIN' | 'MEMBER' | 'VIEWER'
}

interface Step2InvitesProps {
  submitting: boolean
  onSubmit: (data: OnboardingStep2Data) => void
  onBack: () => void
}

export function Step2Invites({ submitting, onSubmit, onBack }: Step2InvitesProps) {
  const [rows, setRows] = useState<InviteRow[]>([{ email: '', role: 'MEMBER' }])

  const addRow = () => {
    setRows(prev => [...prev, { email: '', role: 'MEMBER' }])
  }

  const removeRow = (index: number) => {
    setRows(prev => prev.filter((_, i) => i !== index))
  }

  const updateRow = (index: number, field: keyof InviteRow, value: string) => {
    setRows(prev =>
      prev.map((row, i) => (i === index ? { ...row, [field]: value } : row))
    )
  }

  const validInvites = rows.filter(
    r => r.email.trim().length > 0 && r.email.includes('@')
  )

  const handleSubmit = () => {
    if (submitting) return
    onSubmit({
      invites: validInvites.map(r => ({
        email: r.email.trim(),
        role: r.role,
      })),
      skipped: false,
    })
  }

  const handleSkip = () => {
    if (submitting) return
    onSubmit({ skipped: true })
  }

  return (
    <Card className="border-border/50">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Users className="h-6 w-6 text-primary" />
        </div>
        <CardTitle className="text-2xl">Invite your team</CardTitle>
        <CardDescription className="text-base">
          Add teammates by email. You can always invite more later.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4 pt-4">
        {/* Invite rows */}
        <div className="space-y-3">
          {rows.map((row, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="flex-1">
                {i === 0 && <Label className="sr-only">Email</Label>}
                <Input
                  type="email"
                  placeholder="colleague@company.com"
                  value={row.email}
                  onChange={e => updateRow(i, 'email', e.target.value)}
                  autoFocus={i === 0}
                />
              </div>
              <div className="w-[130px]">
                {i === 0 && <Label className="sr-only">Role</Label>}
                <Select
                  value={row.role}
                  onValueChange={val => updateRow(i, 'role', val)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                    <SelectItem value="MEMBER">Member</SelectItem>
                    <SelectItem value="VIEWER">Viewer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {rows.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeRow(i)}
                  className="shrink-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>

        {/* Add another */}
        <Button type="button" variant="outline" size="sm" onClick={addRow} className="w-full">
          <Plus className="mr-2 h-4 w-4" />
          Add another
        </Button>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <Button variant="ghost" onClick={onBack} disabled={submitting}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>

          <div className="flex-1" />

          <Button variant="ghost" onClick={handleSkip} disabled={submitting} className="text-muted-foreground">
            I&apos;ll do this later
          </Button>

          <Button
            onClick={handleSubmit}
            disabled={submitting || validInvites.length === 0}
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                Send invites
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
