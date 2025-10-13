"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Clock, 
  Users, 
  ArrowLeft,
  CheckCircle,
  FileText,
  Calendar,
  Zap,
  Package,
  Star,
  LinkIcon
} from "lucide-react"

interface TaskTemplateItem {
  id: string
  title: string
  description: string
  status: string
  priority: string
  estimatedDuration: number
  assigneeRole: string
  tags: string[]
  dependencies: string[]
  order: number
}

interface TaskTemplate {
  id: string
  name: string
  description: string
  category: 'SOFTWARE_DEVELOPMENT' | 'MARKETING_CAMPAIGN' | 'EVENT_PLANNING' | 'PRODUCT_LAUNCH' | 'GENERAL'
  isPublic: boolean
  metadata: {
    estimatedDuration: number
    teamSize: number
    complexity: 'LOW' | 'MEDIUM' | 'HIGH'
  }
  tasks: TaskTemplateItem[]
  createdAt: string
  createdBy: {
    id: string
    name: string
    email: string
  }
}

interface TaskTemplatePreviewProps {
  template: TaskTemplate
  onBack: () => void
  onApply: (template: TaskTemplate) => void
  projectId?: string
}

const categoryIcons = {
  SOFTWARE_DEVELOPMENT: <FileText className="h-5 w-5" />,
  MARKETING_CAMPAIGN: <Zap className="h-5 w-5" />,
  EVENT_PLANNING: <Calendar className="h-5 w-5" />,
  PRODUCT_LAUNCH: <Package className="h-5 w-5" />,
  GENERAL: <Star className="h-5 w-5" />
}

const categoryColors = {
  SOFTWARE_DEVELOPMENT: 'bg-blue-100 text-blue-800',
  MARKETING_CAMPAIGN: 'bg-purple-100 text-purple-800',
  EVENT_PLANNING: 'bg-green-100 text-green-800',
  PRODUCT_LAUNCH: 'bg-orange-100 text-orange-800',
  GENERAL: 'bg-gray-100 text-gray-800'
}

const priorityColors = {
  LOW: 'bg-green-100 text-green-800',
  MEDIUM: 'bg-yellow-100 text-yellow-800',
  HIGH: 'bg-red-100 text-red-800',
  URGENT: 'bg-red-200 text-red-900'
}

const statusColors = {
  TODO: 'bg-gray-100 text-gray-800',
  IN_PROGRESS: 'bg-blue-100 text-blue-800',
  IN_REVIEW: 'bg-yellow-100 text-yellow-800',
  DONE: 'bg-green-100 text-green-800',
  BLOCKED: 'bg-red-100 text-red-800'
}

export function TaskTemplatePreview({ template, onBack, onApply, projectId }: TaskTemplatePreviewProps) {
  const [isApplying, setIsApplying] = useState(false)

  const handleApply = async () => {
    if (!projectId) return

    try {
      setIsApplying(true)
      const response = await fetch(`/api/task-templates/${template.id}/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId,
          workspaceId: 'workspace-1'
        })
      })

      if (response.ok) {
        const result = await response.json()
        console.log('Template applied successfully:', result)
        onApply(template)
      } else {
        console.error('Failed to apply template')
      }
    } catch (error) {
      console.error('Error applying template:', error)
    } finally {
      setIsApplying(false)
    }
  }

  const formatCategory = (category: string) => {
    return category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  const getTaskDependencies = (taskId: string) => {
    return template.tasks.filter(task => task.dependencies.includes(taskId))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div className="flex items-center space-x-2">
          {categoryIcons[template.category]}
          <h2 className="text-2xl font-bold text-gray-900">{template.name}</h2>
        </div>
      </div>

      {/* Template Info */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <span>Template Overview</span>
                <Badge className={categoryColors[template.category]}>
                  {formatCategory(template.category)}
                </Badge>
              </CardTitle>
              <CardDescription className="mt-2">
                {template.description}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {/* Template Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <Clock className="h-6 w-6 mx-auto mb-2 text-gray-600" />
              <div className="text-lg font-semibold">{template.metadata.estimatedDuration}h</div>
              <div className="text-sm text-gray-600">Estimated Duration</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <Users className="h-6 w-6 mx-auto mb-2 text-gray-600" />
              <div className="text-lg font-semibold">{template.metadata.teamSize}</div>
              <div className="text-sm text-gray-600">Team Size</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <CheckCircle className="h-6 w-6 mx-auto mb-2 text-gray-600" />
              <div className="text-lg font-semibold">{template.tasks.length}</div>
              <div className="text-sm text-gray-600">Tasks</div>
            </div>
          </div>

          {/* Complexity */}
          <div className="flex items-center space-x-2 mb-4">
            <span className="text-sm font-medium text-gray-700">Complexity:</span>
            <Badge className={
              template.metadata.complexity === 'LOW' ? 'bg-green-100 text-green-800' :
              template.metadata.complexity === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
              'bg-red-100 text-red-800'
            }>
              {template.metadata.complexity}
            </Badge>
          </div>

          {/* Created By */}
          <div className="text-sm text-gray-600">
            Created by <span className="font-medium">{template.createdBy.name}</span>
          </div>
        </CardContent>
      </Card>

      {/* Tasks List */}
      <Card>
        <CardHeader>
          <CardTitle>Tasks in this Template</CardTitle>
          <CardDescription>
            These tasks will be created when you apply this template
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-3">
            {template.tasks.map((task, index) => (
              <div key={task.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                      <h4 className="font-medium text-gray-900">{task.title}</h4>
                      <Badge className={priorityColors[task.priority as keyof typeof priorityColors]}>
                        {task.priority}
                      </Badge>
                      <Badge className={statusColors[task.status as keyof typeof statusColors]}>
                        {task.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    
                    {task.description && (
                      <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                    )}
                    
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      {task.estimatedDuration && (
                        <div className="flex items-center space-x-1">
                          <Clock className="h-3 w-3" />
                          <span>{task.estimatedDuration}h</span>
                        </div>
                      )}
                      {task.assigneeRole && (
                        <div className="flex items-center space-x-1">
                          <Users className="h-3 w-3" />
                          <span>{task.assigneeRole}</span>
                        </div>
                      )}
                      {task.dependencies.length > 0 && (
                        <div className="flex items-center space-x-1">
                          <LinkIcon className="h-3 w-3" />
                          <span>{task.dependencies.length} dependency</span>
                        </div>
                      )}
                    </div>
                    
                    {task.tags.length > 0 && (
                      <div className="flex items-center space-x-1 mt-2">
                        {task.tags.map((tag, tagIndex) => (
                          <Badge key={tagIndex} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-end space-x-3 pt-6 border-t">
        <Button variant="outline" onClick={onBack}>
          Cancel
        </Button>
        <Button 
          onClick={handleApply}
          disabled={isApplying}
          className="min-w-[120px]"
        >
          {isApplying ? (
            <>
              <Clock className="h-4 w-4 animate-spin mr-2" />
              Applying...
            </>
          ) : (
            <>
              Apply Template
              <CheckCircle className="h-4 w-4 ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

