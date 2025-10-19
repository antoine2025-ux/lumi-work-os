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
    setActiveTask(active.data.current?.task || null)
  }, [])

  const handleDragOver = useCallback((event: DragOverEvent) => {
    // Handle drag over events for visual feedback
    // This could be used to show drop zones or highlight areas
  }, [])

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event
    
    setActiveTask(null)

    if (!over) return

    const activeTask = active.data.current?.task
    const overColumn = over.data.current?.column

    if (!activeTask) return

    // If dropping on a column (status change)
    if (overColumn) {
      const newStatus = overColumn.status
      if (activeTask.status !== newStatus) {
        await onTaskMove(activeTask.id, newStatus)
      }
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
            <div className="bg-white border-2 border-blue-400 rounded-lg shadow-2xl p-3 max-w-[220px] transform rotate-2 scale-105 opacity-95">
              <div className="font-medium text-sm text-gray-900 truncate mb-1">
                {activeTask.title}
              </div>
              <div className="text-xs text-gray-500 mb-2">
                {activeTask.description && activeTask.description.length > 0 
                  ? activeTask.description.substring(0, 50) + (activeTask.description.length > 50 ? '...' : '')
                  : 'No description'
                }
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${
                    activeTask.priority === 'URGENT' ? 'bg-red-500' :
                    activeTask.priority === 'HIGH' ? 'bg-orange-500' :
                    activeTask.priority === 'MEDIUM' ? 'bg-yellow-500' : 'bg-green-500'
                  }`} />
                  <span className="text-xs text-gray-600 font-medium">
                    {activeTask.priority}
                  </span>
                </div>
                {activeTask.assignee && (
                  <span className="text-xs text-gray-500">
                    {activeTask.assignee.name}
                  </span>
                )}
              </div>
              {activeTask.dependsOn.length > 0 && (
                <div className="flex items-center space-x-1 mt-2">
                  <div className="w-1 h-1 bg-blue-500 rounded-full" />
                  <span className="text-xs text-blue-600 font-medium">
                    {activeTask.dependsOn.length} dependency
                  </span>
                </div>
              )}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </DragDropContext.Provider>
  )
}
