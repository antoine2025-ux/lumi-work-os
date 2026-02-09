'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Briefcase, Plus, X } from 'lucide-react'

export interface RoleCardData {
  name: string
  description: string
  level: string
}

interface PositionsStepProps {
  roleCards: RoleCardData[]
  setRoleCards: (cards: RoleCardData[]) => void
}

const LEVELS = ['ENTRY', 'JUNIOR', 'MID', 'SENIOR', 'LEAD', 'PRINCIPAL', 'EXECUTIVE']

export function PositionsStep({ roleCards, setRoleCards }: PositionsStepProps) {
  const [currentRole, setCurrentRole] = useState<RoleCardData>({
    name: '',
    description: '',
    level: 'MID',
  })

  const addRole = () => {
    if (currentRole.name.trim()) {
      setRoleCards([...roleCards, currentRole])
      setCurrentRole({ name: '', description: '', level: 'MID' })
    }
  }

  const removeRole = (index: number) => {
    setRoleCards(roleCards.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Briefcase className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Define Key Positions</h3>
      </div>

      <p className="text-sm text-muted-foreground">
        Create 2-5 role cards that define positions in your organization (e.g., Software Engineer, Product Manager).
        You&apos;ll assign these to team members when you invite them.
      </p>

      {/* Added Role Cards */}
      {roleCards.length > 0 && (
        <div className="space-y-2">
          <Label>Added Positions ({roleCards.length}/5)</Label>
          <div className="space-y-2">
            {roleCards.map((role, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-lg"
              >
                <div>
                  <p className="font-medium">{role.name}</p>
                  <p className="text-sm text-muted-foreground">{role.level}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeRole(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add New Role Card */}
      {roleCards.length < 5 && (
        <div className="space-y-3 p-4 border rounded-lg">
          <div className="space-y-2">
            <Label htmlFor="role-name">Position Name *</Label>
            <Input
              id="role-name"
              placeholder="Software Engineer"
              value={currentRole.name}
              onChange={(e) =>
                setCurrentRole({ ...currentRole, name: e.target.value })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role-level">Level *</Label>
            <Select
              value={currentRole.level}
              onValueChange={(value) =>
                setCurrentRole({ ...currentRole, level: value })
              }
            >
              <SelectTrigger id="role-level">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LEVELS.map((level) => (
                  <SelectItem key={level} value={level}>
                    {level}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="role-desc">Description (optional)</Label>
            <Textarea
              id="role-desc"
              placeholder="Designs, develops, and maintains software systems"
              value={currentRole.description}
              onChange={(e) =>
                setCurrentRole({ ...currentRole, description: e.target.value })
              }
              rows={2}
            />
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={addRole}
            disabled={!currentRole.name.trim()}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Position
          </Button>
        </div>
      )}

      {roleCards.length < 2 && (
        <p className="text-sm text-amber-600 dark:text-amber-400">
          Please add at least 2 positions to continue
        </p>
      )}
    </div>
  )
}
