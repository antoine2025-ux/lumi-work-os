// Example integration for /app/projects/[id]/page.tsx
// This shows how to integrate the demo components into the existing project page

import { MinimalBoard, FocusBoard } from '@/components/demo/kanban'

// Add this to your existing project page component
export function ProjectPageWithDemoBoards() {
  const [viewMode, setViewMode] = useState<'original' | 'minimal' | 'focus'>('original')

  return (
    <div>
      {/* Your existing project header and navigation */}
      
      {/* Add view mode selector */}
      <div className="flex items-center space-x-2 mb-6">
        <Button
          variant={viewMode === 'original' ? 'default' : 'outline'}
          onClick={() => setViewMode('original')}
          size="sm"
        >
          Original
        </Button>
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

      {/* Conditional rendering based on view mode */}
      {viewMode === 'original' && (
        // Your existing kanban board implementation
        <KanbanBoard 
          projectId={projectId} 
          workspaceId={currentWorkspace?.id || 'workspace-1'}
          onTasksUpdated={loadProject}
          filteredTasks={isFiltered ? filteredTasks : undefined}
          epicId={selectedEpicId}
        />
      )}

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
      <Card className="border-0 shadow-sm" style={{ backgroundColor: colors.surface }}>
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
