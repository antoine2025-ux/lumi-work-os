'use client'

import { EditGoalDialog } from './edit-goal-dialog'
import { ObjectivesManager } from './objectives-manager'
import { ProjectLinker } from './project-linker'
import { StakeholderPanel } from './stakeholder-panel'
import { ApprovalWorkflow } from './approval-workflow'
import { AlignmentIndicator } from './alignment-indicator'
import { ConflictIndicator } from './conflict-indicator'
import { AnalyticsDashboard } from './analytics-dashboard'
import { RecommendationsPanel } from './recommendations-panel'
import { CheckInPanel } from './check-in-panel'
import { ArrowLeft, Edit, Trash2, Calendar } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface Props {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Complex Prisma GoalWithDetails type; proper typing requires deep refactor
  goal: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Server auth shape varies
  currentUser: any
  workspaceSlug: string
}

export function GoalDetail({ goal, currentUser, workspaceSlug }: Props) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null)

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this goal?')) return
    
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/goals/${goal.id}`, {
        method: 'DELETE',
      })
      if (response.ok) {
        router.push(`/w/${workspaceSlug}/goals`)
      }
    } catch (error: unknown) {
      console.error('Failed to delete goal:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleManualSync = async () => {
    setIsSyncing(true)
    try {
      const response = await fetch(`/api/goals/${goal.id}/sync-projects`, {
        method: 'POST',
      })
      
      if (response.ok) {
        const result = await response.json()
        setLastSyncTime(new Date())
        
        // Show success message
        console.log(`[Sync] Updated from ${result.previousProgress}% to ${result.newProgress}%`)
        
        // Refresh the page to show updated progress
        window.location.reload()
      }
    } catch (error: unknown) {
      console.error('[Sync] Failed:', error)
      alert('Sync failed. Please try again.')
    } finally {
      setIsSyncing(false)
    }
  }

  const getLevelBadgeClass = (level: string) => {
    switch (level) {
      case 'COMPANY': return 'bg-purple-500/10 text-purple-400 border-purple-500/20'
      case 'DEPARTMENT': return 'bg-blue-500/10 text-blue-400 border-blue-500/20'
      case 'TEAM': return 'bg-green-500/10 text-green-400 border-green-500/20'
      case 'INDIVIDUAL': return 'bg-muted/50 text-muted-foreground border-border'
      default: return 'bg-muted/50 text-muted-foreground border-border'
    }
  }

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'bg-muted/50 text-muted-foreground'
      case 'ACTIVE': return 'bg-blue-500/10 text-blue-400'
      case 'PAUSED': return 'bg-orange-500/10 text-orange-400'
      case 'COMPLETED': return 'bg-green-500/10 text-green-400'
      case 'CANCELLED': return 'bg-red-500/10 text-red-400'
      default: return 'bg-muted/50 text-muted-foreground'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link href={`/w/${workspaceSlug}/goals`}>
          <button className="inline-flex items-center px-3 py-2 text-sm border border-border rounded-lg hover:bg-muted/50 transition-colors text-foreground">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Goals
          </button>
        </Link>
        <div className="flex gap-2">
          <button 
            onClick={() => setShowEditDialog(true)}
            className="inline-flex items-center px-3 py-2 text-sm border border-border rounded-lg hover:bg-muted/50 transition-colors text-foreground"
          >
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </button>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="inline-flex items-center px-3 py-2 text-sm border border-border rounded-lg hover:bg-red-500/10 hover:text-red-400 transition-colors text-muted-foreground disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </button>
        </div>
      </div>

      {/* Goal Info */}
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="space-y-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{goal.title}</h1>
            {goal.description && (
              <p className="text-muted-foreground mt-2">{goal.description}</p>
            )}
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border ${getLevelBadgeClass(goal.level)}`}>
              {goal.level}
            </span>
            <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${getStatusBadgeClass(goal.status)}`}>
              {goal.status}
            </span>
            {goal.quarter && (
              <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border border-border text-muted-foreground">
                {goal.quarter}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span>
              {new Date(goal.startDate).toLocaleDateString()} -{' '}
              {new Date(goal.endDate).toLocaleDateString()}
            </span>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-foreground">Overall Progress</span>
              <span className="text-lg font-bold text-primary">
                {Math.round(goal.progress)}%
              </span>
            </div>
            <div className="w-full bg-muted/30 rounded-full h-3">
              <div
                className="bg-primary h-3 rounded-full transition-all"
                style={{ width: `${goal.progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Alignment & Conflicts */}
      {goal.parentId && (
        <div className="bg-card rounded-lg border border-border p-6">
          <AlignmentIndicator
            alignmentScore={goal.alignmentScore ?? 0}
            parentTitle={goal.parent?.title}
          />
        </div>
      )}

      <ConflictIndicator
        goalId={goal.id}
        knownConflicts={goal.conflictsWith ?? []}
      />

      {/* Approval Workflow */}
      {(goal.approvals?.length ?? 0) > 0 && (
        <ApprovalWorkflow
          goalId={goal.id}
          approvals={goal.approvals ?? []}
          currentUserId={currentUser?.userId ?? currentUser?.id ?? ''}
        />
      )}

      {/* Analytics Dashboard */}
      <AnalyticsDashboard goalId={goal.id} />

      {/* AI Recommendations */}
      <RecommendationsPanel goalId={goal.id} />

      {/* Objectives & Key Results Manager */}
      <ObjectivesManager goalId={goal.id} objectives={goal.objectives} />

      {/* Check-Ins */}
      <CheckInPanel goalId={goal.id} currentProgress={goal.progress} />

      {/* Stakeholders */}
      <StakeholderPanel
        goalId={goal.id}
        stakeholders={goal.stakeholders ?? []}
      />

      {/* Project Linker */}
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">Linked Projects</h3>
          {(goal.linkedProjects || []).length > 0 && (
            <button
              onClick={handleManualSync}
              disabled={isSyncing}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSyncing ? 'Syncing...' : 'Sync Progress'}
            </button>
          )}
        </div>
        {lastSyncTime && (
          <p className="text-xs text-muted-foreground mb-3">
            Last synced: {lastSyncTime.toLocaleTimeString()}
          </p>
        )}
        <ProjectLinker
          goalId={goal.id}
          linkedProjects={goal.linkedProjects || []}
          workspaceSlug={workspaceSlug}
        />
      </div>

      {/* Edit Goal Dialog */}
      <EditGoalDialog
        isOpen={showEditDialog}
        onClose={() => setShowEditDialog(false)}
        goal={goal}
      />
    </div>
  )
}
