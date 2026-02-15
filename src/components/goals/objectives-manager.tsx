'use client'

import { useState } from 'react'
import { AddObjectiveDialog } from './add-objective-dialog'
import { KeyResultCard } from './key-result-card'
import { GoalProgressBar } from './goal-progress-bar'
import { Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Props {
  goalId: string
  objectives: any[]
}

export function ObjectivesManager({ goalId, objectives }: Props) {
  const router = useRouter()
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [expandedObjectives, setExpandedObjectives] = useState<Set<string>>(
    new Set(objectives.map(obj => obj.id))
  )
  const [deletingObjective, setDeletingObjective] = useState<string | null>(null)

  const toggleObjective = (objectiveId: string) => {
    const newExpanded = new Set(expandedObjectives)
    if (newExpanded.has(objectiveId)) {
      newExpanded.delete(objectiveId)
    } else {
      newExpanded.add(objectiveId)
    }
    setExpandedObjectives(newExpanded)
  }

  const handleDeleteObjective = async (objectiveId: string, objectiveTitle: string) => {
    if (!confirm(`Are you sure you want to delete "${objectiveTitle}"? This will also delete all its key results.`)) {
      return
    }

    setDeletingObjective(objectiveId)
    try {
      const response = await fetch(`/api/goals/${goalId}/objectives?objectiveId=${objectiveId}`, {
        method: 'DELETE',
      })
      if (response.ok) {
        router.refresh()
      }
    } catch (error) {
      console.error('Failed to delete objective:', error)
    } finally {
      setDeletingObjective(null)
    }
  }

  if (objectives.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-foreground">Objectives & Key Results</h2>
        </div>
        <div className="bg-card rounded-lg border border-border p-12 text-center">
          <div className="space-y-4">
            <div className="text-muted-foreground">
              <Plus className="w-16 h-16 mx-auto mb-4" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">
              No objectives yet
            </h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Break down this goal into measurable objectives with key results to track progress
            </p>
            <button 
              onClick={() => setShowAddDialog(true)}
              className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Objective
            </button>
          </div>
        </div>

        <AddObjectiveDialog
          isOpen={showAddDialog}
          onClose={() => setShowAddDialog(false)}
          goalId={goalId}
        />
      </div>
    )
  }

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'ON_TRACK': return 'bg-green-500/10 text-green-400'
      case 'AT_RISK': return 'bg-orange-500/10 text-orange-400'
      case 'OFF_TRACK': return 'bg-red-500/10 text-red-400'
      default: return 'bg-muted/50 text-muted-foreground'
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground">Objectives & Key Results</h2>
        <button 
          onClick={() => setShowAddDialog(true)}
          className="inline-flex items-center px-3 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Objective
        </button>
      </div>

      <div className="space-y-4">
        {objectives.map((objective) => {
          const isExpanded = expandedObjectives.has(objective.id)
          const isDeleting = deletingObjective === objective.id

          return (
            <div key={objective.id} className="bg-card rounded-lg border border-border overflow-hidden">
              <div className="p-4 space-y-4">
                {/* Objective Header */}
                <div className="flex items-start justify-between gap-4">
                  <button
                    onClick={() => toggleObjective(objective.id)}
                    className="flex items-start gap-3 flex-1 text-left hover:opacity-70 transition-opacity"
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-5 h-5 mt-0.5 flex-shrink-0 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="w-5 h-5 mt-0.5 flex-shrink-0 text-muted-foreground" />
                    )}
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-lg text-foreground">{objective.title}</h3>
                        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border border-border text-muted-foreground">
                          Weight: {objective.weight}
                        </span>
                        <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${getStatusBadgeClass(objective.status)}`}>
                          {objective.status.replace('_', ' ')}
                        </span>
                      </div>
                      {objective.description && (
                        <p className="text-sm text-muted-foreground">{objective.description}</p>
                      )}
                    </div>
                  </button>

                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleDeleteObjective(objective.id, objective.title)}
                      disabled={isDeleting}
                      className="p-2 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                </div>

                {/* Progress Bar */}
                <GoalProgressBar progress={objective.progress} />

                {/* Key Results (Collapsible) */}
                {isExpanded && objective.keyResults.length > 0 && (
                  <div className="space-y-3 pt-2 border-t border-border">
                    <h4 className="text-sm font-medium text-foreground">
                      Key Results ({objective.keyResults.length})
                    </h4>
                    {objective.keyResults.map((kr: any) => (
                      <KeyResultCard
                        key={kr.id}
                        goalId={goalId}
                        keyResult={kr}
                      />
                    ))}
                  </div>
                )}

                {isExpanded && objective.keyResults.length === 0 && (
                  <div className="pt-2 border-t border-border text-center text-sm text-muted-foreground">
                    No key results yet
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <AddObjectiveDialog
        isOpen={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        goalId={goalId}
      />
    </div>
  )
}
