'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Building2,
  UsersRound,
  ArrowLeft,
  ArrowRight,
  Plus,
  X,
  Loader2,
  ChevronRight,
} from 'lucide-react'
import type { OnboardingStep3Data } from '@/lib/validations/onboarding'
import { cn } from '@/lib/utils'

interface DeptRow {
  name: string
  leadName: string
}

interface TeamRow {
  name: string
  departmentName: string
}

interface Step3OrgStructureProps {
  submitting: boolean
  onSubmit: (data: OnboardingStep3Data) => void
  onBack: () => void
}

export function Step3OrgStructure({ submitting, onSubmit, onBack }: Step3OrgStructureProps) {
  const [departments, setDepartments] = useState<DeptRow[]>([{ name: '', leadName: '' }])
  const [teams, setTeams] = useState<TeamRow[]>([{ name: '', departmentName: '' }])

  // Department helpers
  const addDept = () => setDepartments(prev => [...prev, { name: '', leadName: '' }])
  const removeDept = (i: number) => setDepartments(prev => prev.filter((_, idx) => idx !== i))
  const updateDept = (i: number, field: keyof DeptRow, value: string) => {
    setDepartments(prev => prev.map((d, idx) => (idx === i ? { ...d, [field]: value } : d)))
  }

  // Team helpers
  const addTeam = () => setTeams(prev => [...prev, { name: '', departmentName: '' }])
  const removeTeam = (i: number) => setTeams(prev => prev.filter((_, idx) => idx !== i))
  const updateTeam = (i: number, field: keyof TeamRow, value: string) => {
    setTeams(prev => prev.map((t, idx) => (idx === i ? { ...t, [field]: value } : t)))
  }

  const validDepts = departments.filter(d => d.name.trim().length >= 2)
  const deptNames = validDepts.map(d => d.name.trim())
  const validTeams = teams.filter(t => t.name.trim().length >= 2 && t.departmentName.trim().length > 0)

  const handleSubmit = () => {
    if (submitting) return
    onSubmit({
      departments: validDepts.map(d => ({
        name: d.name.trim(),
        leadName: d.leadName.trim() || undefined,
      })),
      teams: validTeams.map(t => ({
        name: t.name.trim(),
        departmentName: t.departmentName.trim(),
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
          <Building2 className="h-6 w-6 text-primary" />
        </div>
        <CardTitle className="text-2xl">Org structure</CardTitle>
        <CardDescription className="text-base">
          Create departments and teams. You can refine this later.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6 pt-4">
        {/* Departments */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2 text-sm font-semibold">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            Departments
          </Label>
          {departments.map((dept, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                placeholder="e.g. Engineering"
                value={dept.name}
                onChange={e => updateDept(i, 'name', e.target.value)}
                className="flex-1"
                autoFocus={i === 0}
              />
              <Input
                placeholder="Lead (optional)"
                value={dept.leadName}
                onChange={e => updateDept(i, 'leadName', e.target.value)}
                className="w-[160px]"
              />
              {departments.length > 1 && (
                <Button variant="ghost" size="icon" onClick={() => removeDept(i)} className="shrink-0">
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={addDept}>
            <Plus className="mr-2 h-3.5 w-3.5" />
            Add department
          </Button>
        </div>

        {/* Teams */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2 text-sm font-semibold">
            <UsersRound className="h-4 w-4 text-muted-foreground" />
            Teams
          </Label>
          {teams.map((team, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                placeholder="e.g. Frontend"
                value={team.name}
                onChange={e => updateTeam(i, 'name', e.target.value)}
                className="flex-1"
              />
              <div className="w-[180px]">
                <Select
                  value={team.departmentName}
                  onValueChange={val => updateTeam(i, 'departmentName', val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Department" />
                  </SelectTrigger>
                  <SelectContent>
                    {deptNames.length === 0 ? (
                      <SelectItem value="__none" disabled>
                        Add a department first
                      </SelectItem>
                    ) : (
                      deptNames.map(name => (
                        <SelectItem key={name} value={name}>
                          {name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              {teams.length > 1 && (
                <Button variant="ghost" size="icon" onClick={() => removeTeam(i)} className="shrink-0">
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={addTeam}>
            <Plus className="mr-2 h-3.5 w-3.5" />
            Add team
          </Button>
        </div>

        {/* Live preview */}
        {validDepts.length > 0 && (
          <div className="rounded-lg border border-border/50 bg-muted/30 p-4 space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Preview</p>
            {validDepts.map(dept => (
              <div key={dept.name}>
                <div className="flex items-center gap-1.5 text-sm font-medium">
                  <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                  {dept.name}
                  {dept.leadName && (
                    <span className="text-xs text-muted-foreground ml-1">({dept.leadName})</span>
                  )}
                </div>
                {validTeams
                  .filter(t => t.departmentName === dept.name.trim())
                  .map(t => (
                    <div
                      key={t.name}
                      className={cn(
                        'flex items-center gap-1.5 text-sm text-muted-foreground ml-5 mt-0.5'
                      )}
                    >
                      <ChevronRight className="h-3 w-3" />
                      <UsersRound className="h-3.5 w-3.5" />
                      {t.name}
                    </div>
                  ))}
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 pt-1">
          <Button variant="ghost" onClick={onBack} disabled={submitting}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div className="flex-1" />
          <Button variant="ghost" onClick={handleSkip} disabled={submitting} className="text-muted-foreground">
            I&apos;ll do this later
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
