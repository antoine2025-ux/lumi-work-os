"use client"

import React from 'react'
import { Button } from '@/components/ui/button'
import { LayoutGrid, List, Calendar } from 'lucide-react'

export type ViewMode = 'board' | 'list' | 'calendar'

interface ViewSwitcherProps {
  currentView: ViewMode
  onViewChange: (view: ViewMode) => void
}

export function ViewSwitcher({ currentView, onViewChange }: ViewSwitcherProps) {
  const views = [
    {
      id: 'board' as ViewMode,
      label: 'Board',
      icon: LayoutGrid,
      description: 'Kanban board view'
    },
    {
      id: 'list' as ViewMode,
      label: 'List',
      icon: List,
      description: 'List view'
    },
    {
      id: 'calendar' as ViewMode,
      label: 'Calendar',
      icon: Calendar,
      description: 'Calendar view'
    }
  ]

  return (
    <div className="flex items-center gap-1 bg-muted p-1 rounded-lg">
      {views.map((view) => {
        const Icon = view.icon
        const isActive = currentView === view.id
        
        return (
          <Button
            key={view.id}
            variant={isActive ? "default" : "ghost"}
            size="sm"
            onClick={() => onViewChange(view.id)}
            className={`flex items-center gap-2 ${
              isActive 
                ? 'bg-background text-foreground shadow-sm' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
            title={view.description}
          >
            <Icon className="h-4 w-4" />
            <span className="hidden sm:inline">{view.label}</span>
          </Button>
        )
      })}
    </div>
  )
}
