"use client"

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { Calendar, User, Clock, Target } from 'lucide-react'

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
      priority: 'high',
      progress: 0
    },
    {
      id: '2',
      title: 'Update user documentation',
      description: 'Revise the user guide with new features and improvements',
      assignee: { name: 'Mike Johnson', avatar: '', initials: 'MJ' },
      dueDate: '2024-01-18',
      points: 3,
      priority: 'medium',
      progress: 0
    },
    {
      id: '3',
      title: 'Research competitor analysis',
      description: 'Analyze competitor features and market positioning',
      assignee: { name: 'Alex Rivera', avatar: '', initials: 'AR' },
      dueDate: '2024-01-20',
      points: 8,
      priority: 'low',
      progress: 0
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
      priority: 'high',
      progress: 65
    },
    {
      id: '5',
      title: 'Optimize database queries',
      description: 'Improve performance of frequently used database operations',
      assignee: { name: 'Emma Wilson', avatar: '', initials: 'EW' },
      dueDate: '2024-01-16',
      points: 8,
      priority: 'medium',
      progress: 30
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
      priority: 'high',
      progress: 90
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
      priority: 'high',
      progress: 100
    },
    {
      id: '8',
      title: 'Create API documentation',
      description: 'Write comprehensive API documentation with examples',
      assignee: { name: 'Rachel Green', avatar: '', initials: 'RG' },
      dueDate: '2024-01-08',
      points: 3,
      priority: 'medium',
      progress: 100
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
      priority: 'medium',
      progress: 0
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
  progress: number
}

interface FocusBoardProps {
  className?: string
}

export default function FocusBoard({ className = '' }: FocusBoardProps) {
  const [selectedStatus, setSelectedStatus] = useState<keyof typeof statusIcons>('inProgress')

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const getDaysUntilDue = (dateString: string) => {
    const dueDate = new Date(dateString)
    const today = new Date()
    const diffTime = dueDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const TaskCard = ({ task }: { task: Task }) => {
    const daysUntilDue = getDaysUntilDue(task.dueDate)
    const isOverdue = daysUntilDue < 0
    const isDueSoon = daysUntilDue <= 2 && daysUntilDue >= 0

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        className="group"
      >
        <Card className="p-6 hover:shadow-lg transition-all duration-300 border-0 shadow-md bg-white/90 backdrop-blur-sm">
          <div className="space-y-4">
            {/* Task Header */}
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-semibold text-neutral-800 text-lg leading-tight mb-2">
                  {task.title}
                </h3>
                <p className="text-sm text-neutral-600 leading-relaxed">
                  {task.description}
                </p>
              </div>
              <Badge 
                variant="secondary" 
                className={`text-xs ${priorityColors[task.priority]}`}
              >
                {task.priority}
              </Badge>
            </div>

            {/* Progress Ring */}
            <div className="flex items-center space-x-4">
              <div className="relative w-16 h-16">
                <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-neutral-200"
                    stroke="currentColor"
                    strokeWidth="3"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="text-blue-500"
                    stroke="currentColor"
                    strokeWidth="3"
                    fill="none"
                    strokeDasharray={`${task.progress}, 100`}
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-semibold text-neutral-700">
                    {task.progress}%
                  </span>
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-neutral-700">Progress</span>
                  <span className="text-sm text-neutral-500">{task.points} pts</span>
                </div>
                <Progress value={task.progress} className="h-2" />
              </div>
            </div>

            {/* Task Footer */}
            <div className="flex items-center justify-between pt-2 border-t border-neutral-100">
              <div className="flex items-center space-x-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={task.assignee.avatar} />
                  <AvatarFallback className="text-sm bg-neutral-200 text-neutral-700">
                    {task.assignee.initials}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium text-neutral-800">
                    {task.assignee.name}
                  </p>
                  <p className="text-xs text-neutral-500">Assignee</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-neutral-400" />
                <div className="text-right">
                  <p className={`text-sm font-medium ${
                    isOverdue ? 'text-red-600' : 
                    isDueSoon ? 'text-yellow-600' : 
                    'text-neutral-700'
                  }`}>
                    {formatDate(task.dueDate)}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {isOverdue ? 'Overdue' : 
                     isDueSoon ? 'Due soon' : 
                     `${daysUntilDue} days left`}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>
    )
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100 ${className}`}>
      {/* Backdrop blur overlay */}
      <div className="fixed inset-0 backdrop-blur-md bg-white/70 pointer-events-none" />
      
      <div className="relative z-10 max-w-3xl mx-auto px-6 py-8">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-semibold text-neutral-800 mb-2">
                Focus Board
              </h1>
              <p className="text-neutral-600">
                Concentrate on one stage at a time
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Target className="h-5 w-5 text-neutral-400" />
              <Select value={selectedStatus} onValueChange={(value) => setSelectedStatus(value as keyof typeof statusIcons)}>
                <SelectTrigger className="w-48 bg-white/80 backdrop-blur-sm border-neutral-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(statusIcons).map((status) => (
                    <SelectItem key={status} value={status}>
                      <div className="flex items-center space-x-2">
                        <span>{statusIcons[status as keyof typeof statusIcons]}</span>
                        <span>{statusLabels[status as keyof typeof statusLabels]}</span>
                        <Badge variant="secondary" className="text-xs bg-neutral-100 text-neutral-600">
                          {mockTasks[status as keyof typeof mockTasks].length}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </motion.div>

        {/* Status Header */}
        <motion.div 
          key={selectedStatus}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-6"
        >
          <div className="flex items-center space-x-3 mb-2">
            <span className="text-2xl">{statusIcons[selectedStatus]}</span>
            <h2 className="text-xl font-semibold text-neutral-800">
              {statusLabels[selectedStatus]}
            </h2>
            <Badge variant="secondary" className="bg-neutral-100 text-neutral-600">
              {mockTasks[selectedStatus].length} tasks
            </Badge>
          </div>
          <div className="h-px bg-gradient-to-r from-neutral-200 to-transparent" />
        </motion.div>

        {/* Tasks List */}
        <div className="space-y-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedStatus}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              {mockTasks[selectedStatus].map((task) => (
                <TaskCard key={task.id} task={task} />
              ))}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Empty State */}
        {mockTasks[selectedStatus].length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="text-center py-12"
          >
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-neutral-100 flex items-center justify-center">
              <span className="text-2xl">{statusIcons[selectedStatus]}</span>
            </div>
            <h3 className="text-lg font-medium text-neutral-700 mb-2">
              No tasks in {statusLabels[selectedStatus].toLowerCase()}
            </h3>
            <p className="text-neutral-500">
              Tasks will appear here when they move to this stage
            </p>
          </motion.div>
        )}
      </div>
    </div>
  )
}
