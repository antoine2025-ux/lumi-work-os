'use client'

import React from 'react'
import { CleanDashboard } from '@/components/layout/clean-dashboard'
import { ContextMenu, contextMenuItems } from '@/components/ui/context-menu'
import { useKeyboardShortcutHelp } from '@/hooks/use-keyboard-shortcuts'
import { useState } from 'react'
import { 
  Command, 
  MousePointer, 
  Keyboard, 
  Search,
  Info,
  CheckCircle,
  XCircle
} from 'lucide-react'

// Mock data for demonstration
const mockProject = {
  id: 'project-1',
  name: 'Website Redesign',
  description: 'Complete redesign of the company website with modern UI/UX',
  activeUsers: 3,
  tasks: [
    {
      id: 'task-1',
      title: 'Design Homepage Layout',
      assignee: {
        id: 'user-1',
        name: 'Sarah Chen',
        avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=Sarah'
      },
      dueDate: '2 days',
      priority: 'high' as const,
      status: 'todo' as const,
      description: 'Create a modern, responsive homepage layout with hero section and feature highlights.'
    },
    {
      id: 'task-2',
      title: 'Create Logo Design',
      assignee: {
        id: 'user-2',
        name: 'Tom Wilson',
        avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=Tom'
      },
      dueDate: '3 days',
      priority: 'medium' as const,
      status: 'todo' as const,
      description: 'Design a new logo that reflects the company\'s modern brand identity.'
    },
    {
      id: 'task-3',
      title: 'Code Header Component',
      assignee: {
        id: 'user-3',
        name: 'Mike Johnson',
        avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=Mike'
      },
      dueDate: '1 day',
      priority: 'medium' as const,
      status: 'in_progress' as const,
      description: 'Implement the header component with navigation and responsive design.'
    },
    {
      id: 'task-4',
      title: 'Test Contact Forms',
      assignee: {
        id: 'user-1',
        name: 'Sarah Chen',
        avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=Sarah'
      },
      dueDate: '2 days',
      priority: 'high' as const,
      status: 'in_progress' as const,
      description: 'Test all contact forms for functionality and user experience.'
    },
    {
      id: 'task-5',
      title: 'Setup Database',
      assignee: {
        id: 'user-4',
        name: 'Alex Rodriguez',
        avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=Alex'
      },
      dueDate: '1 day',
      priority: 'low' as const,
      status: 'done' as const,
      description: 'Configure the database schema and initial data migration.'
    },
    {
      id: 'task-6',
      title: 'Deploy API',
      assignee: {
        id: 'user-3',
        name: 'Mike Johnson',
        avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=Mike'
      },
      dueDate: '1 day',
      priority: 'low' as const,
      status: 'done' as const,
      description: 'Deploy the backend API to production environment.'
    },
    {
      id: 'task-7',
      title: 'Write Documentation',
      assignee: {
        id: 'user-2',
        name: 'Tom Wilson',
        avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=Tom'
      },
      dueDate: '4 days',
      priority: 'medium' as const,
      status: 'todo' as const,
      description: 'Create comprehensive documentation for the new website features.'
    },
    {
      id: 'task-8',
      title: 'Optimize Images',
      assignee: {
        id: 'user-4',
        name: 'Alex Rodriguez',
        avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=Alex'
      },
      dueDate: '2 days',
      priority: 'low' as const,
      status: 'in_progress' as const,
      description: 'Optimize all images for web performance and loading speed.'
    }
  ]
}

export default function CleanUIDemoPage() {
  const [showFeatures, setShowFeatures] = useState(true)
  const { shortcuts, getShortcutsByCategory, getShortcutString } = useKeyboardShortcutHelp()

  const handleTaskUpdate = (taskId: string, updates: any) => {
    console.log('Task updated:', taskId, updates)
    // In a real app, this would update the task in the database
  }

  const handleTaskCreate = (task: any) => {
    console.log('Task created:', task)
    // In a real app, this would create a new task in the database
  }

  const handleProjectAction = (action: string, projectId: string) => {
    console.log(`${action} project:`, projectId)
  }

  const handleTaskAction = (action: string, taskId: string) => {
    console.log(`${action} task:`, taskId)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Feature showcase banner */}
      {showFeatures && (
        <div className="bg-blue-50 border-b border-blue-200 px-6 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-blue-600" />
                <span className="font-medium text-blue-900">New Features Available!</span>
              </div>
              <div className="text-sm text-blue-700">
                Try Cmd+K for command palette, right-click for context menus, and keyboard shortcuts
              </div>
            </div>
            <button
              onClick={() => setShowFeatures(false)}
              className="text-blue-600 hover:text-blue-800"
            >
              <XCircle className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Feature overview */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Lumi Work OS - Phase 1 Features</h1>
          <p className="text-gray-600 mb-6">
            Experience the new command palette, context menus, unified search, and keyboard shortcuts.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* CmdK Command Palette */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center space-x-3 mb-3">
                <Command className="h-6 w-6 text-blue-600" />
                <h3 className="font-semibold text-gray-900">Command Palette</h3>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                Press <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">⌘K</kbd> to open the command palette for quick navigation and actions.
              </p>
              <div className="text-xs text-gray-500">
                Try: "create task", "go to wiki", "search projects"
              </div>
            </div>

            {/* Right-click Menus */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center space-x-3 mb-3">
                <MousePointer className="h-6 w-6 text-green-600" />
                <h3 className="font-semibold text-gray-900">Context Menus</h3>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                Right-click on any task, project, or wiki page for contextual actions.
              </p>
              <div className="text-xs text-gray-500">
                Try right-clicking on the tasks below
              </div>
            </div>

            {/* Keyboard Shortcuts */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center space-x-3 mb-3">
                <Keyboard className="h-6 w-6 text-purple-600" />
                <h3 className="font-semibold text-gray-900">Keyboard Shortcuts</h3>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                Use keyboard shortcuts for faster navigation and actions.
              </p>
              <div className="text-xs text-gray-500">
                <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">N</kbd> new task, 
                <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs ml-1">/</kbd> search
              </div>
            </div>

            {/* Unified Search */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center space-x-3 mb-3">
                <Search className="h-6 w-6 text-orange-600" />
                <h3 className="font-semibold text-gray-900">Unified Search</h3>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                Search across projects, tasks, wiki pages, and people with advanced operators.
              </p>
              <div className="text-xs text-gray-500">
                Try: <code>#project status:doing @user</code>
              </div>
            </div>
          </div>

          {/* Keyboard shortcuts reference */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
              <Keyboard className="h-5 w-5 mr-2 text-purple-600" />
              Keyboard Shortcuts Reference
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {(['navigation', 'creation', 'action', 'search'] as const).map(category => (
                <div key={category}>
                  <h4 className="font-medium text-gray-700 mb-2 capitalize">{category}</h4>
                  <div className="space-y-1">
                    {getShortcutsByCategory(category).map((shortcut, index) => (
                      <div key={index} className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">{shortcut.description}</span>
                        <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">
                          {getShortcutString(shortcut)}
                        </kbd>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Interactive demo with context menus */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Interactive Demo</h3>
          <p className="text-sm text-gray-600 mb-6">
            Try right-clicking on the project and tasks below to see context menus in action.
          </p>

          {/* Project with context menu */}
          <div className="mb-6">
            <ContextMenu items={contextMenuItems.project(mockProject)}>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 cursor-pointer hover:bg-blue-100 transition-colors">
                <h4 className="font-semibold text-blue-900">{mockProject.name}</h4>
                <p className="text-sm text-blue-700">{mockProject.description}</p>
                <div className="flex items-center mt-2 text-xs text-blue-600">
                  <span>Right-click for actions</span>
                </div>
              </div>
            </ContextMenu>
          </div>

          {/* Sample tasks with context menus */}
          <div className="space-y-3">
            <h4 className="font-medium text-gray-700">Sample Tasks (Right-click to see context menu)</h4>
            {mockProject.tasks.slice(0, 3).map(task => (
              <ContextMenu key={task.id} items={contextMenuItems.task(task)}>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 cursor-pointer hover:bg-gray-100 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <h5 className="font-medium text-gray-900">{task.title}</h5>
                      <p className="text-sm text-gray-600">{task.description}</p>
                    </div>
                    <div className="flex items-center space-x-2 text-xs text-gray-500">
                      <span className={`px-2 py-1 rounded ${
                        task.status === 'done' ? 'bg-green-100 text-green-800' :
                        task.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {task.status}
                      </span>
                      <span className={`px-2 py-1 rounded ${
                        task.priority === 'high' ? 'bg-red-100 text-red-800' :
                        task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {task.priority}
                      </span>
                    </div>
                  </div>
                </div>
              </ContextMenu>
            ))}
          </div>
        </div>
      </div>

      {/* Main dashboard */}
      <div className="mt-8">
        <CleanDashboard 
          project={mockProject}
          onTaskUpdate={handleTaskUpdate}
          onTaskCreate={handleTaskCreate}
        />
      </div>
    </div>
  )
}
