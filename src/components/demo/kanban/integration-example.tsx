// Example integration for /app/projects/[id]/page.tsx
// This shows how to integrate the demo components into the existing project page

import { useState } from 'react'
import { MinimalBoard, FocusBoard } from '@/components/demo/kanban'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

// Add this to your existing project page component
// Note: In actual usage, you would have projectId, currentWorkspace, etc. from your page context
export function ProjectPageWithDemoBoards() {
  const [viewMode, setViewMode] = useState<'minimal' | 'focus'>('minimal')

  return (
    <div>
      {/* Your existing project header and navigation */}
      
      {/* Add view mode selector */}
      <div className="flex items-center space-x-2 mb-6">
        <Button
          variant={viewMode === 'minimal' ? 'default' : 'outline'}
          onClick={() => setViewMode('minimal')}
          size="sm"
        >
          Minimal Board
        </Button>
        <Button
          variant={viewMode === 'focus' ? 'default' : 'outline'}
          onClick={() => setViewMode('focus')}
          size="sm"
        >
          Focus Board
        </Button>
      </div>

      {/* 
        In your actual implementation, you can add an 'original' view mode
        that renders your existing KanbanBoard component with props like:
        - projectId (from route params)
        - workspaceId (from currentWorkspace context)
        - onTasksUpdated (your refresh callback)
        - filteredTasks, epicId (from your filter state)
      */}

      {viewMode === 'minimal' && (
        <MinimalBoard className="mt-4" />
      )}

      {viewMode === 'focus' && (
        <FocusBoard className="mt-4" />
      )}
    </div>
  )
}

// Alternative: Replace the entire kanban section with demo components
export function ProjectPageWithReplacedBoards() {
  const [currentView, setCurrentView] = useState<'minimal' | 'focus'>('minimal')

  return (
    <div>
      {/* Your existing project header and navigation */}
      
      {/* Replace the existing kanban board section with: */}
      <Card className="border-0 shadow-sm bg-card">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {/* Your existing filters and controls */}
              
              {/* Add view switcher */}
              <Button
                variant={currentView === 'minimal' ? 'default' : 'outline'}
                onClick={() => setCurrentView('minimal')}
                size="sm"
                className="h-8 px-3 text-xs"
              >
                Minimal
              </Button>
              <Button
                variant={currentView === 'focus' ? 'default' : 'outline'}
                onClick={() => setCurrentView('focus')}
                size="sm"
                className="h-8 px-3 text-xs"
              >
                Focus
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {currentView === 'minimal' && <MinimalBoard />}
          {currentView === 'focus' && <FocusBoard />}
        </CardContent>
      </Card>
    </div>
  )
}
