'use client'

import { useState } from 'react'
import { GoalCard } from './goal-card'
import { CreateGoalDialog } from './create-goal-dialog'
import { GoalsFilters } from './goals-filters'
import { GoalsMetrics } from './goals-metrics'
import { Plus, Target } from 'lucide-react'

interface Goal {
  id: string
  title: string
  description: string | null
  level: string
  status: string
  progress: number
  quarter: string | null
  startDate: Date
  endDate: Date
  owner: {
    id: string
    name: string | null
    email: string
  } | null
  objectives: any[]
  linkedProjects: any[]
}

interface Metrics {
  total: number
  byStatus: Record<string, number>
  byLevel: Record<string, number>
  averageProgress: number
  onTrack: number
  atRisk: number
  completed: number
}

interface Props {
  goals: Goal[]
  metrics: Metrics
  currentUser: {
    userId: string
    email: string
    name?: string | null
  }
  workspaceSlug: string
  initialFilters: {
    quarter?: string
    level?: string
    status?: string
  }
}

export function GoalsDashboard({ goals, metrics, currentUser, workspaceSlug, initialFilters }: Props) {
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [selectedLevel, setSelectedLevel] = useState(initialFilters.level || 'ALL')
  const [selectedQuarter, setSelectedQuarter] = useState(initialFilters.quarter || '')
  const [selectedStatus, setSelectedStatus] = useState(initialFilters.status || 'ALL')

  const filteredGoals = goals.filter(goal => {
    if (selectedLevel !== 'ALL' && goal.level !== selectedLevel) return false
    if (selectedStatus !== 'ALL' && goal.status !== selectedStatus) return false
    return true
  })

  return (
    <div className="space-y-6">
      {/* Metrics Overview */}
      <GoalsMetrics metrics={metrics} />
      
      {/* Filters and Actions */}
      <div className="bg-card rounded-lg border border-border p-4">
        <div className="flex items-center justify-between">
          <GoalsFilters
            selectedLevel={selectedLevel}
            selectedQuarter={selectedQuarter}
            selectedStatus={selectedStatus}
            onLevelChange={setSelectedLevel}
            onQuarterChange={setSelectedQuarter}
            onStatusChange={setSelectedStatus}
          />
          
          <button
            onClick={() => setShowCreateDialog(true)}
            className="inline-flex items-center px-3 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Goal
          </button>
        </div>
      </div>

      {/* Goals Grid */}
      {filteredGoals.length === 0 ? (
        <div className="bg-card rounded-lg border border-border p-12">
          <div className="text-center">
            <div className="w-12 h-12 bg-muted/50 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Target className="w-6 h-6 text-muted-foreground" />
            </div>
            <h3 className="text-sm font-medium text-foreground mb-2">No goals found</h3>
            <p className="text-sm text-muted-foreground mb-4">Start by creating your first goal or OKR</p>
            <button
              onClick={() => setShowCreateDialog(true)}
              className="inline-flex items-center px-3 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Goal
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredGoals.map(goal => (
            <GoalCard
              key={goal.id}
              goal={goal}
              workspaceSlug={workspaceSlug}
              currentUser={currentUser}
            />
          ))}
        </div>
      )}

      {/* Create Goal Dialog */}
      {showCreateDialog && (
        <CreateGoalDialog
          isOpen={showCreateDialog}
          onClose={() => setShowCreateDialog(false)}
          workspaceSlug={workspaceSlug}
        />
      )}
    </div>
  )
}
