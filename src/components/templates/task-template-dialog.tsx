"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { TaskTemplateSelector } from "@/components/templates/task-template-selector"
import { TaskTemplatePreview } from "@/components/templates/task-template-preview"
import { 
  CheckCircle,
  ArrowRight,
  Loader2
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

interface TaskTemplateDialogProps {
  isOpen: boolean
  onClose: () => void
  onTemplateApplied: (template: TaskTemplate) => void
  projectId: string
  projectName: string
}

export function TaskTemplateDialog({ 
  isOpen, 
  onClose, 
  onTemplateApplied, 
  projectId, 
  projectName 
}: TaskTemplateDialogProps) {
  const [currentView, setCurrentView] = useState<'selector' | 'preview'>('selector')
  const [selectedTemplate, setSelectedTemplate] = useState<TaskTemplate | null>(null)
  const [isApplying, setIsApplying] = useState(false)

  const handleTemplateSelect = (template: TaskTemplate) => {
    setSelectedTemplate(template)
    setCurrentView('preview')
  }

  const handleTemplateApply = async (template: TaskTemplate) => {
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
        onTemplateApplied(template)
        onClose()
      } else {
        console.error('Failed to apply template')
      }
    } catch (error) {
      console.error('Error applying template:', error)
    } finally {
      setIsApplying(false)
    }
  }

  const handleBack = () => {
    setCurrentView('selector')
    setSelectedTemplate(null)
  }

  const handleSkip = () => {
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <span>Project "{projectName}" Created Successfully!</span>
          </DialogTitle>
          <DialogDescription>
            {currentView === 'selector' 
              ? "Now let's add some tasks to get started. Choose a template or start from scratch."
              : "Review the template details before applying it to your project."
            }
          </DialogDescription>
        </DialogHeader>

        <div className="mt-6">
          {currentView === 'selector' ? (
            <TaskTemplateSelector
              onTemplateSelect={handleTemplateSelect}
              onSkip={handleSkip}
              projectId={projectId}
            />
          ) : (
            selectedTemplate && (
              <TaskTemplatePreview
                template={selectedTemplate}
                onBack={handleBack}
                onApply={handleTemplateApply}
                projectId={projectId}
              />
            )
          )}
        </div>

        {isApplying && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 flex items-center space-x-3">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span>Applying template...</span>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

