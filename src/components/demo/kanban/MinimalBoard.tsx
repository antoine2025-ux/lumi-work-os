"use client"

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Plus, Calendar, User } from 'lucide-react'

// Mock data for demonstration
const mockTasks = {
  todo: [
    {
      id: '1',
      title: 'Design new landing page',
      description: 'Create wireframes and mockups for the new landing page design',
      assignee: { name: 'Sarah Chen', avatar: '', initials: 'SC' },
      dueDate: '2024-01-15',
      points: 5,
      priority: 'high'
    },
    {
      id: '2',
      title: 'Update user documentation',
      description: 'Revise the user guide with new features and improvements',
      assignee: { name: 'Mike Johnson', avatar: '', initials: 'MJ' },
      dueDate: '2024-01-18',
      points: 3,
      priority: 'medium'
    },
    {
      id: '3',
      title: 'Research competitor analysis',
      description: 'Analyze competitor features and market positioning',
      assignee: { name: 'Alex Rivera', avatar: '', initials: 'AR' },
      dueDate: '2024-01-20',
      points: 8,
      priority: 'low'
    }
  ],
  inProgress: [
    {
      id: '4',
      title: 'Implement authentication system',
      description: 'Build secure login and registration functionality',
      assignee: { name: 'David Kim', avatar: '', initials: 'DK' },
      dueDate: '2024-01-12',
      points: 13,
      priority: 'high'
    },
    {
      id: '5',
      title: 'Optimize database queries',
      description: 'Improve performance of frequently used database operations',
      assignee: { name: 'Emma Wilson', avatar: '', initials: 'EW' },
      dueDate: '2024-01-16',
      points: 8,
      priority: 'medium'
    }
  ],
  inReview: [
    {
      id: '6',
      title: 'Mobile app UI components',
      description: 'Create reusable components for mobile application',
      assignee: { name: 'Lisa Zhang', avatar: '', initials: 'LZ' },
      dueDate: '2024-01-14',
      points: 5,
      priority: 'high'
    }
  ],
  done: [
    {
      id: '7',
      title: 'Setup project infrastructure',
      description: 'Configure CI/CD pipeline and deployment environment',
      assignee: { name: 'Tom Brown', avatar: '', initials: 'TB' },
      dueDate: '2024-01-10',
      points: 8,
      priority: 'high'
    },
    {
      id: '8',
      title: 'Create API documentation',
      description: 'Write comprehensive API documentation with examples',
      assignee: { name: 'Rachel Green', avatar: '', initials: 'RG' },
      dueDate: '2024-01-08',
      points: 3,
      priority: 'medium'
    }
  ],
  blocked: [
    {
      id: '9',
      title: 'Third-party integration',
      description: 'Waiting for API access from external service provider',
      assignee: { name: 'James Lee', avatar: '', initials: 'JL' },
      dueDate: '2024-01-25',
      points: 5,
      priority: 'medium'
    }
  ]
}

const statusIcons = {
  todo: "🕓",
  inProgress: "⚙️",
  inReview: "👀",
  done: "✅",
  blocked: "⛔",
}

const statusLabels = {
  todo: "To Do",
  inProgress: "In Progress",
  inReview: "In Review",
  done: "Done",
  blocked: "Blocked",
}

const priorityColors = {
  high: 'bg-red-100 text-red-800',
  medium: 'bg-yellow-100 text-yellow-800',
  low: 'bg-green-100 text-green-800',
}

interface Task {
  id: string
  title: string
  description: string
  assignee: {
    name: string
    avatar: string
    initials: string
  }
  dueDate: string
  points: number
  priority: 'high' | 'medium' | 'low'
}

interface MinimalBoardProps {
  className?: string
}

export default function MinimalBoard({ className = '' }: MinimalBoardProps) {
  const [hoveredTask, setHoveredTask] = useState<string | null>(null)

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const TaskCard = ({ task }: { task: Task }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.2 }}
      className="group cursor-pointer"
      onMouseEnter={() => setHoveredTask(task.id)}
      onMouseLeave={() => setHoveredTask(null)}
    >
      <Card className="p-4 hover:bg-neutral-100 transition-colors duration-200 border-0 shadow-sm bg-white">
        <div className="space-y-3">
          {/* Task Title */}
          <h3 className="font-medium text-neutral-800 text-sm leading-tight">
            {task.title}
          </h3>

          {/* Additional Details on Hover */}
          <AnimatePresence>
            {hoveredTask === task.id && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-2"
              >
                <p className="text-xs text-neutral-600 leading-relaxed">
                  {task.description}
                </p>
                <div className="flex items-center justify-between">
                  <Badge 
                    variant="secondary" 
                    className={`text-xs ${priorityColors[task.priority]}`}
                  >
                    {task.priority}
                  </Badge>
                  <span className="text-xs text-neutral-500">
                    {task.points} pts
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Task Footer */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Avatar className="h-6 w-6">
                <AvatarImage src={task.assignee.avatar} />
                <AvatarFallback className="text-xs bg-neutral-200 text-neutral-700">
                  {task.assignee.initials}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs text-neutral-600">
                {task.assignee.name}
              </span>
            </div>
            <div className="flex items-center space-x-1 text-neutral-500">
              <Calendar className="h-3 w-3" />
              <span className="text-xs">
                {formatDate(task.dueDate)}
              </span>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  )

  const ColumnHeader = ({ status }: { status: keyof typeof statusIcons }) => (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center space-x-2">
        <span className="text-lg">{statusIcons[status]}</span>
        <h2 className="font-medium text-neutral-700 text-sm">
          {statusLabels[status]}
        </h2>
        <Badge variant="secondary" className="text-xs bg-neutral-100 text-neutral-600">
          {mockTasks[status].length}
        </Badge>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0 hover:bg-neutral-200 rounded-full"
      >
        <Plus className="h-4 w-4 text-neutral-500" />
      </Button>
    </div>
  )

  return (
    <div className={`bg-neutral-50 min-h-screen p-6 ${className}`}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-neutral-800 mb-2">
            Project Board
          </h1>
          <p className="text-neutral-600">
            A minimalistic view of your project tasks
          </p>
        </div>

        {/* Kanban Board */}
        <div className="grid grid-cols-5 gap-6">
          {Object.keys(statusIcons).map((status) => (
            <div key={status} className="space-y-4">
              <ColumnHeader status={status as keyof typeof statusIcons} />
              <div className="space-y-3">
                <AnimatePresence>
                  {mockTasks[status as keyof typeof mockTasks].map((task) => (
                    <TaskCard key={task.id} task={task} />
                  ))}
                </AnimatePresence>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
