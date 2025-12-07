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
import { arrayMove } from '@dnd-kit/sortable'
import { DraggableTaskCard } from './draggable-task-card'

interface DragDropContextType {
  activeTask: any | null
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
  const [activeTask, setActiveTask] = useState<any | null>(null)
  
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
    console.log('[DND] start', {
      taskId: active.id,
      fromStatus: task?.status,
      taskData: task
    })
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

  const handleDragOver = useCallback((event: DragOverEvent) => {
    // Handle drag over events for visual feedback
    // This could be used to show drop zones or highlight areas
    const { active, over } = event
    const task = active.data.current?.task
    console.log('[DND] over', {
      taskId: active.id,
      fromStatus: task?.status,
      overId: over?.id,
      overData: over?.data.current
    })
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
    
    console.log('[DND] end', {
      taskId: active.id,
      fromStatus: active.data.current?.task?.status,
      overId: over?.id,
      activeData: active.data.current,
      overData: over?.data.current
    })
    
    setActiveTask(null)

    if (!over) {
      console.log('[DND] No drop target')
      return
    }

    const activeTask = active.data.current?.task
    const overColumn = over.data.current?.column
    const overType = over.data.current?.type

    if (!activeTask) {
      console.log('[DND] No active task data')
      return
    }

    // Try to get status from column data first, then fall back to column ID mapping
    let newStatus: string | null = null
    
    if (overColumn && overType === 'column') {
      // Column data has status directly
      newStatus = overColumn.status
      console.log('[DND] Got status from column data', { newStatus })
    } else {
      // Try to extract status from column ID
      newStatus = statusFromColumnId(over.id)
      console.log('[DND] Computed nextStatus from column ID', { columnId: over.id, nextStatus: newStatus })
    }

    if (!newStatus) {
      console.log('[DND] Could not determine new status', { overId: over.id, overData: over.data.current })
      return
    }

    if (activeTask.status !== newStatus) {
      console.log('[DND] Moving task', { from: activeTask.status, to: newStatus })
      await onTaskMove(activeTask.id, newStatus)
    } else {
      console.log('[DND] Task already in target status, skipping move')
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
              <DraggableTaskCard task={activeTask} isOverlay />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </DragDropContext.Provider>
  )
}
