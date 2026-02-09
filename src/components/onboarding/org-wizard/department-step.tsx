'use client'

import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Building2 } from 'lucide-react'

interface DepartmentStepProps {
  departmentName: string
  setDepartmentName: (value: string) => void
  departmentDescription: string
  setDepartmentDescription: (value: string) => void
}

export function DepartmentStep({
  departmentName,
  setDepartmentName,
  departmentDescription,
  setDepartmentDescription,
}: DepartmentStepProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Building2 className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Create Your First Department</h3>
      </div>

      <p className="text-sm text-muted-foreground">
        Departments help organize teams by function (e.g., Engineering, Sales, Operations).
        You can add more departments later.
      </p>

      <div className="space-y-2">
        <Label htmlFor="dept-name">Department Name *</Label>
        <Input
          id="dept-name"
          placeholder="Engineering"
          value={departmentName}
          onChange={(e) => setDepartmentName(e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="dept-desc">Description (optional)</Label>
        <Textarea
          id="dept-desc"
          placeholder="Responsible for product development and technical infrastructure"
          value={departmentDescription}
          onChange={(e) => setDepartmentDescription(e.target.value)}
          rows={3}
        />
      </div>
    </div>
  )
}
