"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Loader2, Users, Zap, Calendar, Shield, FileText, Layers } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface WorkspaceTemplate {
  id: string
  name: string
  description: string
  features: string[]
  settings: {
    allowGuestAccess: boolean
    defaultPermissionLevel: 'PUBLIC' | 'PRIVATE'
    enableAI: boolean
    enableCalendar: boolean
  }
}

interface OnboardingFormData {
  templateId: string
  customName: string
  customDescription: string
  enableFeatures: {
    ai: boolean
    calendar: boolean
    guestAccess: boolean
  }
}

export function WorkspaceOnboardingModal({ 
  isOpen, 
  onClose 
}: { 
  isOpen: boolean
  onClose: () => void 
}) {
  const router = useRouter()
  const [templates, setTemplates] = useState<WorkspaceTemplate[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<WorkspaceTemplate | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [formData, setFormData] = useState<OnboardingFormData>({
    templateId: 'personal',
    customName: '',
    customDescription: '',
    enableFeatures: {
      ai: true,
      calendar: true,
      guestAccess: false
    }
  })

  // Load templates on mount
  useState(() => {
    if (isOpen) {
      loadTemplates()
    }
  })

  const loadTemplates = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/workspace-onboarding/templates')
      const data = await response.json()
      
      if (data.success) {
        setTemplates(data.templates)
        const defaultTemplate = data.templates.find((t: WorkspaceTemplate) => t.id === 'personal')
        if (defaultTemplate) {
          setSelectedTemplate(defaultTemplate)
          setFormData(prev => ({
            ...prev,
            templateId: defaultTemplate.id,
            customName: defaultTemplate.name,
            customDescription: defaultTemplate.description,
            enableFeatures: {
              ai: defaultTemplate.settings.enableAI,
              calendar: defaultTemplate.settings.enableCalendar,
              guestAccess: defaultTemplate.settings.allowGuestAccess
            }
          }))
        }
      }
    } catch (error) {
      console.error('Error loading templates:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find(t => t.id === templateId)
    if (template) {
      setSelectedTemplate(template)
      setFormData(prev => ({
        ...prev,
        templateId: template.id,
        customName: template.name,
        customDescription: template.description,
        enableFeatures: {
          ai: template.settings.enableAI,
          calendar: template.settings.enableCalendar,
          guestAccess: template.settings.allowGuestAccess
        }
      }))
    }
  }

  const handleCreateWorkspace = async () => {
    try {
      setIsCreating(true)
      
      const response = await fetch('/api/workspace-onboarding/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          templateId: formData.templateId,
          customName: formData.customName,
          customDescription: formData.customDescription,
          enableFeatures: formData.enableFeatures
        })
      })

      const data = await response.json()

      if (data.success) {
        console.log('Workspace created successfully:', data)
        // Set flags to prevent redirect loops
        sessionStorage.setItem('__workspace_just_created__', 'true')
        sessionStorage.setItem('__skip_loader__', 'true')
        // Redirect to dashboard
        router.push('/home')
        onClose()
      } else {
        console.error('Error creating workspace:', data.error)
        alert(`Error creating workspace: ${data.error}`)
      }
    } catch (error) {
      console.error('Error creating workspace:', error)
      alert('Failed to create workspace. Please try again.')
    } finally {
      setIsCreating(false)
    }
  }

  const getFeatureIcon = (feature: string) => {
    switch (feature.toLowerCase()) {
      case 'ai assistant':
      case 'ai':
        return <Zap className="w-4 h-4" />
      case 'calendar':
      case 'calendar integration':
        return <Calendar className="w-4 h-4" />
      case 'team collaboration':
      case 'collaboration':
        return <Users className="w-4 h-4" />
      case 'personal notes':
      case 'notes':
        return <FileText className="w-4 h-4" />
      case 'shared knowledge base':
      case 'knowledge base':
        return <Layers className="w-4 h-4" />
      default:
        return <Shield className="w-4 h-4" />
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle className="text-2xl">Welcome to Loopwell Work OS</CardTitle>
          <CardDescription>
            Let's set up your workspace. Choose a template that best fits your needs.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Template Selection */}
          <div className="space-y-4">
            <Label className="text-lg font-semibold">Choose a Workspace Template</Label>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
                <span className="ml-2">Loading templates...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {templates.map((template) => (
                  <Card 
                    key={template.id}
                    className={`cursor-pointer transition-all ${
                      selectedTemplate?.id === template.id 
                        ? 'ring-2 ring-primary bg-primary/5' 
                        : 'hover:shadow-md'
                    }`}
                    onClick={() => handleTemplateSelect(template.id)}
                  >
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      <CardDescription className="text-sm">
                        {template.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-2">
                        <div className="text-sm font-medium text-muted-foreground">Features:</div>
                        <div className="flex flex-wrap gap-1">
                          {template.features.map((feature) => (
                            <Badge key={feature} variant="secondary" className="text-xs">
                              {getFeatureIcon(feature)}
                              <span className="ml-1">{feature}</span>
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Customization */}
          {selectedTemplate && (
            <div className="space-y-4">
              <Label className="text-lg font-semibold">Customize Your Workspace</Label>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="workspace-name">Workspace Name</Label>
                  <Input
                    id="workspace-name"
                    value={formData.customName}
                    onChange={(e) => setFormData(prev => ({ ...prev, customName: e.target.value }))}
                    placeholder="Enter workspace name"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="workspace-description">Description</Label>
                  <Textarea
                    id="workspace-description"
                    value={formData.customDescription}
                    onChange={(e) => setFormData(prev => ({ ...prev, customDescription: e.target.value }))}
                    placeholder="Enter workspace description"
                    rows={3}
                  />
                </div>
              </div>

              {/* Feature Toggles */}
              <div className="space-y-4">
                <Label className="text-base font-semibold">Enable Features</Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="enable-ai"
                      checked={formData.enableFeatures.ai}
                      onCheckedChange={(checked) => 
                        setFormData(prev => ({
                          ...prev,
                          enableFeatures: { ...prev.enableFeatures, ai: !!checked }
                        }))
                      }
                    />
                    <Label htmlFor="enable-ai" className="flex items-center space-x-2">
                      <Zap className="w-4 h-4" />
                      <span>AI Assistant</span>
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="enable-calendar"
                      checked={formData.enableFeatures.calendar}
                      onCheckedChange={(checked) => 
                        setFormData(prev => ({
                          ...prev,
                          enableFeatures: { ...prev.enableFeatures, calendar: !!checked }
                        }))
                      }
                    />
                    <Label htmlFor="enable-calendar" className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4" />
                      <span>Calendar Integration</span>
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="enable-guest"
                      checked={formData.enableFeatures.guestAccess}
                      onCheckedChange={(checked) => 
                        setFormData(prev => ({
                          ...prev,
                          enableFeatures: { ...prev.enableFeatures, guestAccess: !!checked }
                        }))
                      }
                    />
                    <Label htmlFor="enable-guest" className="flex items-center space-x-2">
                      <Users className="w-4 h-4" />
                      <span>Guest Access</span>
                    </Label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose} disabled={isCreating}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateWorkspace} 
              disabled={isCreating || !selectedTemplate}
              className="min-w-[120px]"
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                'Create Workspace'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

