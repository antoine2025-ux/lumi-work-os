'use client'

import { getAvailableQuarters } from '@/lib/goals/utils'

interface Props {
  selectedLevel: string
  selectedQuarter: string
  selectedStatus: string
  onLevelChange: (level: string) => void
  onQuarterChange: (quarter: string) => void
  onStatusChange: (status: string) => void
}

export function GoalsFilters({
  selectedLevel,
  selectedQuarter,
  selectedStatus,
  onLevelChange,
  onQuarterChange,
  onStatusChange,
}: Props) {
  return (
    <div className="flex items-center space-x-4">
      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1">Level</label>
        <select
          value={selectedLevel}
          onChange={(e) => onLevelChange(e.target.value)}
          className="text-sm border border-border rounded-md px-3 py-1.5 bg-background text-foreground focus:border-primary focus:ring-1 focus:ring-primary"
        >
          <option value="ALL">All Levels</option>
          <option value="COMPANY">Company</option>
          <option value="DEPARTMENT">Department</option>
          <option value="TEAM">Team</option>
          <option value="INDIVIDUAL">Individual</option>
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1">Status</label>
        <select
          value={selectedStatus}
          onChange={(e) => onStatusChange(e.target.value)}
          className="text-sm border border-border rounded-md px-3 py-1.5 bg-background text-foreground focus:border-primary focus:ring-1 focus:ring-primary"
        >
          <option value="ALL">All Statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="ACTIVE">Active</option>
          <option value="PAUSED">Paused</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1">Quarter</label>
        <select
          value={selectedQuarter}
          onChange={(e) => onQuarterChange(e.target.value)}
          className="text-sm border border-border rounded-md px-3 py-1.5 bg-background text-foreground focus:border-primary focus:ring-1 focus:ring-primary"
        >
          <option value="">All Quarters</option>
          {getAvailableQuarters(1).map((quarter) => (
            <option key={quarter} value={quarter}>
              {quarter}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
