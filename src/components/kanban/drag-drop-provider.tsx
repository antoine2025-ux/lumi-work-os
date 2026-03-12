"use client"

import React, { createContext, useContext, useState, useCallback } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  CollisionDetection,
} from '@dnd-kit/core'
import { DraggableTaskCard } from './draggable-task-card'

interface DragTask {
  id: string
  title: string
  description: string
  status: string
  priority: string
  dependsOn: string[]
  [key: string]: unknown
}

interface DragDropContextType {
  activeTask: DragTask | null
  onTaskMove: (taskId: string, newStatus: string, newOrder?: number) => Promise<void>
  onTaskReorder: (taskId: string, newOrder: number) => Promise<void>
}

const DragDropContext = createContext<DragDropContextType | null>(null)

export const useDragDrop = () => {
  const context = useContext(DragDropContext)
  if (!context) {
    throw new Error('useDragDrop must be used within a DragDropProvider')
  }
  return context
}

interface DragDropProviderProps {
  children: React.ReactNode
  onTaskMove: (taskId: string, newStatus: string, newOrder?: number) => Promise<void>
  onTaskReorder: (taskId: string, newOrder: number) => Promise<void>
}

export function DragDropProvider({ 
  children, 
  onTaskMove, 
  onTaskReorder 
}: DragDropProviderProps) {
  const [activeTask, setActiveTask] = useState<DragTask | null>(null)
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event
    const task = active.data.current?.task
    if (task) {
      // Ensure dependsOn is always an array
      const normalizedTask = {
        ...task,
        dependsOn: task.dependsOn || []
      }
      setActiveTask(normalizedTask)
    } else {
      setActiveTask(null)
    }
  }, [])

  const handleDragOver = useCallback((_event: DragOverEvent) => {
    // Handle drag over events for visual feedback
    // This could be used to show drop zones or highlight areas
  }, [])

  // Helper function to map column ID to status
  const statusFromColumnId = (columnId: string): string | null => {
    const columnIdToStatus: Record<string, string> = {
      'todo': 'TODO',
      'in-progress': 'IN_PROGRESS',
      'in-review': 'IN_REVIEW',
      'done': 'DONE',
      'blocked': 'BLOCKED'
    }
    return columnIdToStatus[columnId] || null
  }

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event

    setActiveTask(null)

    if (!over) {
      return
    }

    const activeTask = active.data.current?.task
    const overColumn = over.data.current?.column
    const overType = over.data.current?.type

    if (!activeTask) {
      return
    }

    // Try to get status from column data first, then fall back to column ID mapping
    let newStatus: string | null = null

    if (overColumn && overType === 'column') {
      // Column data has status directly
      newStatus = overColumn.status
    } else {
      // Try to extract status from column ID
      newStatus = statusFromColumnId(String(over.id))
    }

    if (!newStatus) {
      return
    }

    if (activeTask.status !== newStatus) {
      await onTaskMove(activeTask.id, newStatus)
    }
  }, [onTaskMove])

  const collisionDetection: CollisionDetection = closestCorners

  return (
    <DragDropContext.Provider value={{ activeTask, onTaskMove, onTaskReorder }}>
      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        {children}
        <DragOverlay>
          {activeTask ? (
            <div className="pointer-events-none w-fit max-w-full">
              <DraggableTaskCard task={activeTask as unknown as React.ComponentProps<typeof DraggableTaskCard>['task']} isOverlay />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </DragDropContext.Provider>
  )
}
