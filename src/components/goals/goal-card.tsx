'use client'

import Link from 'next/link'
import { Target, User, Calendar } from 'lucide-react'

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
}

interface Props {
  goal: Goal
  workspaceSlug: string
  currentUser: any
}

const levelColors = {
  COMPANY: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  DEPARTMENT: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  TEAM: 'bg-green-500/10 text-green-400 border-green-500/20',
  INDIVIDUAL: 'bg-muted/50 text-muted-foreground border-border',
}

const _statusColors = {
  DRAFT: 'bg-muted/50 text-muted-foreground',
  ACTIVE: 'bg-blue-500/10 text-blue-400',
  PAUSED: 'bg-yellow-500/10 text-yellow-400',
  COMPLETED: 'bg-green-500/10 text-green-400',
  CANCELLED: 'bg-red-500/10 text-red-400',
}

export function GoalCard({ goal, workspaceSlug, currentUser: _currentUser }: Props) {
  const getStatusColor = (status: string, progress: number) => {
    if (status === 'COMPLETED') return 'text-green-400 bg-green-500/10'
    if (progress >= 70) return 'text-green-400 bg-green-500/10'
    if (progress >= 30) return 'text-blue-400 bg-blue-500/10'
    return 'text-orange-400 bg-orange-500/10'
  }

  const getLevelColor = (level: string) => {
    return levelColors[level as keyof typeof levelColors] || levelColors.INDIVIDUAL
  }

  return (
    <Link href={`/w/${workspaceSlug}/goals/${goal.id}`}>
      <div className="bg-card rounded-lg border border-border p-4 hover:border-border/80 hover:bg-card/80 transition-all cursor-pointer">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="text-sm font-medium text-foreground mb-1 line-clamp-2">
              {goal.title}
            </h3>
            {goal.description && (
              <p className="text-xs text-muted-foreground line-clamp-1">{goal.description}</p>
            )}
          </div>
          <div className="ml-3">
            <Target className="w-4 h-4 text-muted-foreground" />
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-muted-foreground">Progress</span>
            <span className={`text-xs font-medium ${getStatusColor(goal.status, goal.progress).split(' ')[0]}`}>
              {Math.round(goal.progress)}%
            </span>
          </div>
          <div className="w-full bg-muted/30 rounded-full h-1.5">
            <div
              className="bg-primary h-1.5 rounded-full transition-all"
              style={{ width: `${goal.progress}%` }}
            />
          </div>
        </div>

        {/* Metadata */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border ${getLevelColor(goal.level)}`}>
              {goal.level}
            </span>
            
            <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${getStatusColor(goal.status, goal.progress)}`}>
              {goal.status}
            </span>
          </div>

          <div className="flex items-center space-x-2 text-xs text-muted-foreground">
            {goal.owner && (
              <div className="flex items-center">
                <User className="w-3 h-3 mr-1" />
                {goal.owner.name?.split(' ')[0] || goal.owner.email.split('@')[0]}
              </div>
            )}
            
            {goal.quarter && (
              <div className="flex items-center">
                <Calendar className="w-3 h-3 mr-1" />
                {goal.quarter}
              </div>
            )}
          </div>
        </div>

        {/* Objectives Summary */}
        {goal.objectives && goal.objectives.length > 0 && (
          <div className="mt-3 pt-3 border-t border-border/50">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{goal.objectives.length} objectives</span>
              <span>
                {goal.objectives.filter((obj: any) => obj.progress >= 100).length} completed
              </span>
            </div>
          </div>
        )}
      </div>
    </Link>
  )
}
