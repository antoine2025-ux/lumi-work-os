"use client"

import { useState } from "react"
import { Users, Settings, FileText, Bell, MoreHorizontal, Command, Download, Trash2, Copy, Share2 } from "lucide-react"
import { CircularActionButton } from "./circular-action-button"

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
  onTaskDrawerOpen?: () => void
  onKanbanOptionsOpen?: () => void
  onNotificationsOpen?: () => void
  onMoreMenuOpen?: () => void
  onCommandPaletteOpen?: () => void
  onProjectSettings?: () => void
  onExportCSV?: () => void
  onDuplicateProject?: () => void
  onShareProject?: () => void
  onDeleteProject?: () => void
}

export function ProjectHeader({
  project,
  tasks,
  colors,
  onTaskDrawerOpen,
  onKanbanOptionsOpen,
  onNotificationsOpen,
  onMoreMenuOpen,
  onCommandPaletteOpen,
  onProjectSettings,
  onExportCSV,
  onDuplicateProject,
  onShareProject,
  onDeleteProject
}: ProjectHeaderProps) {
  const [teamExpanded, setTeamExpanded] = useState(false)
  const [descriptionExpanded, setDescriptionExpanded] = useState(false)
  const [moreExpanded, setMoreExpanded] = useState(false)

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

  const handleTeamClick = () => {
    setTeamExpanded(!teamExpanded)
    setMoreExpanded(false)
  }

  const handleMoreClick = () => {
    setMoreExpanded(!moreExpanded)
    setTeamExpanded(false)
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-2">
      {/* Combined header with progress bar and metrics */}
      <div className="mb-4">
        <div className="flex items-start justify-between mb-2">
          {/* Left side - Project info with description */}
          <div className="flex-1 pr-12 max-w-4xl">
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
          </div>
          
          {/* Right side - All circular buttons aligned with title */}
          <div className="flex items-center space-x-4 flex-shrink-0">
            {/* Team Members - Expandable */}
            <CircularActionButton
              icon={Users}
              label="Team"
              onClick={handleTeamClick}
              isExpanded={teamExpanded}
              colors={colors}
            >
              {teamExpanded && (
                <div className="flex items-center space-x-4">
                  {project.members.slice(0, 3).map((member, index) => (
                    <div key={member.id} className="text-center">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center mb-2" style={{ backgroundColor: colors.surface }}>
                        <Users className="h-5 w-5" style={{ color: colors.textSecondary }} />
                      </div>
                      <p className="text-xs font-medium" style={{ color: colors.text }}>
                        {member.user.name}
                      </p>
                      <p className="text-xs" style={{ color: colors.textMuted }}>
                        {member.role}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CircularActionButton>


            {/* Kanban Options */}
            <CircularActionButton
              icon={Settings}
              label="Kanban"
              onClick={onKanbanOptionsOpen || (() => {})}
              colors={colors}
            />

            {/* Task Drawer */}
            <CircularActionButton
              icon={FileText}
              label="Task"
              onClick={onTaskDrawerOpen || (() => {})}
              colors={colors}
            />

            {/* Filter - DEACTIVATED */}
            {/* <CircularActionButton
              icon={Filter}
              label="Filter"
              onClick={onFilterOpen}
              colors={colors}
            /> */}

            {/* Notifications */}
            <CircularActionButton
              icon={Bell}
              label="Notifications"
              onClick={onNotificationsOpen || (() => {})}
              colors={colors}
            />

            {/* More Menu - Expandable */}
            <CircularActionButton
              icon={MoreHorizontal}
              label="More"
              onClick={handleMoreClick}
              isExpanded={moreExpanded}
              colors={colors}
            >
              {moreExpanded && (
                <div className="flex flex-col space-y-1 min-w-[200px] p-2 rounded-lg shadow-lg border" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
                  {/* Safe Actions */}
                  <button
                    onClick={() => {
                      setMoreExpanded(false)
                      onProjectSettings?.()
                    }}
                    className="flex items-center space-x-2 px-3 py-2 text-sm rounded hover:bg-opacity-80 transition-colors"
                    style={{ backgroundColor: colors.background }}
                  >
                    <Settings className="h-4 w-4" style={{ color: colors.textSecondary }} />
                    <span style={{ color: colors.text }}>Project Settings</span>
                  </button>
                  
                  <button
                    onClick={() => {
                      setMoreExpanded(false)
                      onExportCSV?.()
                    }}
                    className="flex items-center space-x-2 px-3 py-2 text-sm rounded hover:bg-opacity-80 transition-colors"
                    style={{ backgroundColor: colors.background }}
                  >
                    <Download className="h-4 w-4" style={{ color: colors.textSecondary }} />
                    <span style={{ color: colors.text }}>Export CSV</span>
                  </button>
                  
                  <button
                    onClick={() => {
                      setMoreExpanded(false)
                      onDuplicateProject?.()
                    }}
                    className="flex items-center space-x-2 px-3 py-2 text-sm rounded hover:bg-opacity-80 transition-colors"
                    style={{ backgroundColor: colors.background }}
                  >
                    <Copy className="h-4 w-4" style={{ color: colors.textSecondary }} />
                    <span style={{ color: colors.text }}>Duplicate Project</span>
                  </button>
                  
                  <button
                    onClick={() => {
                      setMoreExpanded(false)
                      onShareProject?.()
                    }}
                    className="flex items-center space-x-2 px-3 py-2 text-sm rounded hover:bg-opacity-80 transition-colors"
                    style={{ backgroundColor: colors.background }}
                  >
                    <Share2 className="h-4 w-4" style={{ color: colors.textSecondary }} />
                    <span style={{ color: colors.text }}>Share Project</span>
                  </button>
                  
                  {/* Separator */}
                  <div className="border-t my-1" style={{ borderColor: colors.border }} />
                  
                  {/* Destructive Action */}
                  <button
                    onClick={() => {
                      setMoreExpanded(false)
                      onDeleteProject?.()
                    }}
                    className="flex items-center space-x-2 px-3 py-2 text-sm rounded hover:bg-opacity-80 transition-colors"
                    style={{ backgroundColor: colors.background }}
                  >
                    <Trash2 className="h-4 w-4" style={{ color: '#dc2626' }} />
                    <span style={{ color: '#dc2626' }}>Delete Project</span>
                  </button>
                </div>
              )}
            </CircularActionButton>
          </div>
        </div>
        
        {/* Progress bar */}
        <div className="mt-4 max-w-md">
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
      </div>
    </div>
  )
}


