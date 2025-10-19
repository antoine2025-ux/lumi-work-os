"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Clock, 
  Users, 
  Star, 
  ArrowRight,
  Loader2,
  CheckCircle,
  FileText,
  Calendar,
  Zap,
  Package
} from "lucide-react"

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
  tasks: Array<{
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
  }>
  createdAt: string
  createdBy: {
    id: string
    name: string
    email: string
  }
}

interface TaskTemplateSelectorProps {
  onTemplateSelect: (template: TaskTemplate) => void
  onSkip: () => void
  projectId?: string
}

const categoryIcons = {
  SOFTWARE_DEVELOPMENT: <FileText className="h-4 w-4" />,
  MARKETING_CAMPAIGN: <Zap className="h-4 w-4" />,
  EVENT_PLANNING: <Calendar className="h-4 w-4" />,
  PRODUCT_LAUNCH: <Package className="h-4 w-4" />,
  GENERAL: <Star className="h-4 w-4" />
}

const categoryColors = {
  SOFTWARE_DEVELOPMENT: 'bg-blue-100 text-blue-800',
  MARKETING_CAMPAIGN: 'bg-purple-100 text-purple-800',
  EVENT_PLANNING: 'bg-green-100 text-green-800',
  PRODUCT_LAUNCH: 'bg-orange-100 text-orange-800',
  GENERAL: 'bg-gray-100 text-gray-800'
}

const complexityColors = {
  LOW: 'bg-green-100 text-green-800',
  MEDIUM: 'bg-yellow-100 text-yellow-800',
  HIGH: 'bg-red-100 text-red-800'
}

export function TaskTemplateSelector({ onTemplateSelect, onSkip, projectId }: TaskTemplateSelectorProps) {
  const [templates, setTemplates] = useState<TaskTemplate[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedTemplate, setSelectedTemplate] = useState<TaskTemplate | null>(null)
  const [isApplying, setIsApplying] = useState(false)

  useEffect(() => {
    loadTemplates()
  }, [])

  const loadTemplates = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/task-templates?workspaceId=workspace-1&isPublic=true')
      if (response.ok) {
        const data = await response.json()
        setTemplates(data)
      }
    } catch (error) {
      console.error('Error loading templates:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleApplyTemplate = async () => {
    if (!selectedTemplate || !projectId) return

    try {
      setIsApplying(true)
      const response = await fetch(`/api/task-templates/${selectedTemplate.id}/apply`, {
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
        onTemplateSelect(selectedTemplate)
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="ml-2">Loading templates...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Choose a Task Template</h2>
        <p className="text-gray-600">
          Start your project with a pre-defined workflow, or create tasks from scratch
        </p>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {templates.map((template) => (
          <Card 
            key={template.id}
            className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
              selectedTemplate?.id === template.id 
                ? 'ring-2 ring-blue-500 shadow-lg' 
                : 'hover:border-blue-300'
            }`}
            onClick={() => setSelectedTemplate(template)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-2">
                  {categoryIcons[template.category]}
                  <CardTitle className="text-lg">{template.name}</CardTitle>
                </div>
                <Badge className={categoryColors[template.category]}>
                  {formatCategory(template.category)}
                </Badge>
              </div>
              <CardDescription className="text-sm text-gray-600">
                {template.description}
              </CardDescription>
            </CardHeader>
            
            <CardContent className="pt-0">
              {/* Template Stats */}
              <div className="flex items-center space-x-4 mb-4 text-sm text-gray-500">
                <div className="flex items-center space-x-1">
                  <Clock className="h-4 w-4" />
                  <span>{template.metadata.estimatedDuration}h</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Users className="h-4 w-4" />
                  <span>{template.metadata.teamSize} people</span>
                </div>
                <Badge className={complexityColors[template.metadata.complexity]}>
                  {template.metadata.complexity}
                </Badge>
              </div>

              {/* Task Count */}
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  {template.tasks.length} tasks included
                </div>
                {selectedTemplate?.id === template.id && (
                  <CheckCircle className="h-5 w-5 text-blue-500" />
                )}
              </div>

              {/* Task Preview */}
              <div className="mt-3 space-y-1">
                {template.tasks.slice(0, 3).map((task, index) => (
                  <div key={task.id} className="flex items-center space-x-2 text-xs text-gray-500">
                    <div className="w-1 h-1 bg-gray-400 rounded-full" />
                    <span className="truncate">{task.title}</span>
                  </div>
                ))}
                {template.tasks.length > 3 && (
                  <div className="text-xs text-gray-400">
                    +{template.tasks.length - 3} more tasks
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-6 border-t">
        <Button variant="outline" onClick={onSkip}>
          Start from Scratch
        </Button>
        
        <div className="flex items-center space-x-3">
          {selectedTemplate && (
            <div className="text-sm text-gray-600">
              Selected: <span className="font-medium">{selectedTemplate.name}</span>
            </div>
          )}
          <Button 
            onClick={handleApplyTemplate}
            disabled={!selectedTemplate || isApplying}
            className="min-w-[120px]"
          >
            {isApplying ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Applying...
              </>
            ) : (
              <>
                Apply Template
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

