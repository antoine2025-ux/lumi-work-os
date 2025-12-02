"use client"

import { useState } from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Edit, Trash2 } from "lucide-react"

interface ProjectHeaderProps {
  project: {
    id: string
    name: string
    description?: string
    color?: string
    members: Array<{
      id: string
      user: { name: string }
      role: string
    }>
    _count: { tasks: number }
  }
  tasks: Array<{ status: string }>
  colors: {
    primary: string
    background: string
    surface: string
    text: string
    textSecondary: string
    textMuted: string
    border: string
    success: string
  }
  currentView?: 'board' | 'epics' | 'tasks' | 'calendar' | 'timeline' | 'files'
  onViewChange?: (view: 'board' | 'epics' | 'tasks' | 'calendar' | 'timeline' | 'files') => void
  onMoreClick?: () => void
  channelHints?: string[]
  onEdit?: () => void
  onDelete?: () => void
}

export function ProjectHeader({
  project,
  tasks,
  colors,
  currentView = 'board',
  onViewChange,
  onMoreClick,
  channelHints = [],
  onEdit,
  onDelete
}: ProjectHeaderProps) {
  const [descriptionExpanded, setDescriptionExpanded] = useState(false)

  const getTaskStatusCount = (status: string) => {
    return tasks.filter(task => task.status === status).length
  }

  const getDescriptionDisplay = () => {
    const description = project.description || 'No description available'
    const maxLength = 350
    
    if (description.length <= maxLength || descriptionExpanded) {
      return description
    }
    
    return description.substring(0, maxLength) + '...'
  }

  const shouldShowExpandButton = () => {
    const description = project.description || 'No description available'
    return description.length > 350
  }

  return (
    <div className="max-w-[1600px] mx-auto px-6 py-2">
      {/* Combined header with progress bar and metrics */}
      <div className="mb-4">
        <div className="flex items-start justify-between mb-2">
          {/* Left side - Project info with description */}
          <div className="flex-1 pr-12 max-w-[900px]">
            <div className="flex items-center space-x-3 mb-3">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: project.color || colors.primary }}
              />
              <h1 className="text-2xl font-light" style={{ color: colors.text }}>
                {project.name}
              </h1>
            </div>
            {/* Description moved here */}
            <div className="mb-3">
              <p className="text-sm leading-relaxed" style={{ color: colors.textMuted }}>
                {getDescriptionDisplay()}
              </p>
              {shouldShowExpandButton() && (
                <button
                  onClick={() => setDescriptionExpanded(!descriptionExpanded)}
                  className="text-xs mt-1 hover:underline font-medium"
                  style={{ color: colors.primary }}
                >
                  {descriptionExpanded ? 'Show less' : 'Show more'}
                </button>
              )}
            </div>
            
            {/* Channel Hints */}
            {channelHints.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {channelHints.map((channel) => (
                  <span
                    key={channel}
                    className="px-3 py-1 text-xs rounded-full bg-slate-800 text-slate-100 border border-slate-700"
                  >
                    #{channel}
                  </span>
                ))}
              </div>
            )}
          </div>
          
        </div>
        
        {/* Progress bar */}
        <div className="mt-4 max-w-[420px]">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium" style={{ color: colors.textSecondary }}>
              Progress
            </span>
            <span className="text-sm" style={{ color: colors.textSecondary }}>
              {getTaskStatusCount('DONE')} of {project._count.tasks} tasks
            </span>
          </div>
          <div className="w-full rounded-full h-2" style={{ backgroundColor: colors.border }}>
            <div 
              className="h-2 rounded-full" 
              style={{ 
                width: `${(getTaskStatusCount('DONE') / project._count.tasks) * 100}%`, 
                backgroundColor: colors.success 
              }} 
            />
          </div>
        </div>

        {/* Minimalistic Navigation Buttons */}
        <div className="mt-4 flex items-center gap-0.5">
          <button
            onClick={() => onViewChange?.('board')}
            className={`px-3 py-1.5 text-sm font-medium transition-colors relative ${
              currentView === 'board'
                ? 'text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            style={currentView === 'board' ? { color: colors.text } : {}}
          >
            Board
            {currentView === 'board' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full" style={{ backgroundColor: colors.primary }} />
            )}
          </button>
          <button
            onClick={() => onViewChange?.('epics')}
            className={`px-3 py-1.5 text-sm font-medium transition-colors relative ${
              currentView === 'epics'
                ? 'text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            style={currentView === 'epics' ? { color: colors.text } : {}}
          >
            Epics
            {currentView === 'epics' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full" style={{ backgroundColor: colors.primary }} />
            )}
          </button>
          <button
            onClick={() => onViewChange?.('tasks')}
            className={`px-3 py-1.5 text-sm font-medium transition-colors relative ${
              currentView === 'tasks'
                ? 'text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            style={currentView === 'tasks' ? { color: colors.text } : {}}
          >
            Tasks
            {currentView === 'tasks' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full" style={{ backgroundColor: colors.primary }} />
            )}
          </button>
          <button
            onClick={() => onViewChange?.('calendar')}
            className={`px-3 py-1.5 text-sm font-medium transition-colors relative ${
              currentView === 'calendar'
                ? 'text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            style={currentView === 'calendar' ? { color: colors.text } : {}}
          >
            Calendar
            {currentView === 'calendar' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full" style={{ backgroundColor: colors.primary }} />
            )}
          </button>
          <button
            onClick={() => onViewChange?.('timeline')}
            className={`px-3 py-1.5 text-sm font-medium transition-colors relative ${
              currentView === 'timeline'
                ? 'text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            style={currentView === 'timeline' ? { color: colors.text } : {}}
          >
            Timeline
            {currentView === 'timeline' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full" style={{ backgroundColor: colors.primary }} />
            )}
          </button>
          <button
            onClick={() => onViewChange?.('files')}
            className={`px-3 py-1.5 text-sm font-medium transition-colors relative ${
              currentView === 'files'
                ? 'text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            style={currentView === 'files' ? { color: colors.text } : {}}
          >
            Files
            {currentView === 'files' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full" style={{ backgroundColor: colors.primary }} />
            )}
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                }}
              >
                …
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  onEdit?.()
                }}
                className="cursor-pointer"
              >
                <Edit className="mr-2 h-4 w-4" />
                Edit Project
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  onDelete?.()
                }}
                className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Project
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  )
}


