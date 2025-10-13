'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Sparkles } from 'lucide-react'
import { format } from 'date-fns'

interface NewPlanDialogProps {
  employees: Array<{
    id: string
    name: string | null
    email: string
  }>
  templates: Array<{
    id: string
    name: string
    durationDays: number
    description?: string | null
  }>
  onCreateFromTemplate?: (data: {
    employeeId: string
    templateId: string
    name: string
    startDate: string
  }) => Promise<void>
  onCreateWithAI?: (data: {
    role: string
    seniority: string
    department: string
    durationDays: number
    employeeId: string
    startDate: string
  }) => Promise<void>
}

export function NewPlanDialog({ 
  employees, 
  templates, 
  onCreateFromTemplate, 
  onCreateWithAI 
}: NewPlanDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  // Template form state
  const [templateForm, setTemplateForm] = useState({
    employeeId: '',
    templateId: '',
    name: '',
    startDate: format(new Date(), 'yyyy-MM-dd'),
  })

  // AI form state
  const [aiForm, setAiForm] = useState({
    role: '',
    seniority: '',
    department: '',
    durationDays: 30,
    employeeId: '',
    startDate: format(new Date(), 'yyyy-MM-dd'),
  })

  const handleTemplateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!onCreateFromTemplate) return

    setLoading(true)
    try {
      await onCreateFromTemplate({
        ...templateForm,
        startDate: new Date(templateForm.startDate).toISOString(),
      })
      setOpen(false)
      setTemplateForm({
        employeeId: '',
        templateId: '',
        name: '',
        startDate: format(new Date(), 'yyyy-MM-dd'),
      })
    } catch (error) {
      console.error('Error creating plan from template:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAISubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!onCreateWithAI) return

    setLoading(true)
    try {
      const response = await fetch('/api/onboarding/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...aiForm,
          startDate: new Date(aiForm.startDate).toISOString(),
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error?.message || 'Failed to generate plan')
      }

      // Show success message
      alert(`✅ ${result.message || 'Plan generated successfully!'}`)
      
      // Call the callback with the generated plan
      await onCreateWithAI({
        ...aiForm,
        startDate: new Date(aiForm.startDate).toISOString(),
      })
      
      setOpen(false)
      setAiForm({
        role: '',
        seniority: '',
        department: '',
        durationDays: 30,
        employeeId: '',
        startDate: format(new Date(), 'yyyy-MM-dd'),
      })
    } catch (error) {
      console.error('Error creating plan with AI:', error)
      alert(`❌ Error: ${error instanceof Error ? error.message : 'Failed to generate plan'}`)
    } finally {
      setLoading(false)
    }
  }

  const selectedTemplate = templates.find(t => t.id === templateForm.templateId)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Plan
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create New Onboarding Plan</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="template" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="template">From Template</TabsTrigger>
            <TabsTrigger value="ai">
              <Sparkles className="h-4 w-4 mr-2" />
              AI Generate
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="template" className="space-y-4">
            <form onSubmit={handleTemplateSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="template-employee">Employee</Label>
                  <Select
                    value={templateForm.employeeId}
                    onValueChange={(value) => setTemplateForm(prev => ({ ...prev, employeeId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select employee" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((employee) => (
                        <SelectItem key={employee.id} value={employee.id}>
                          {employee.name || employee.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="template-template">Template</Label>
                  <Select
                    value={templateForm.templateId}
                    onValueChange={(value) => {
                      const template = templates.find(t => t.id === value)
                      setTemplateForm(prev => ({ 
                        ...prev, 
                        templateId: value,
                        name: template ? `${template.name} - ${employees.find(e => e.id === prev.employeeId)?.name || 'Employee'}` : ''
                      }))
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select template" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name} ({template.durationDays} days)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="template-name">Plan Name</Label>
                <Input
                  id="template-name"
                  value={templateForm.name}
                  onChange={(e) => setTemplateForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter plan name"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="template-start">Start Date</Label>
                <Input
                  id="template-start"
                  type="date"
                  value={templateForm.startDate}
                  onChange={(e) => setTemplateForm(prev => ({ ...prev, startDate: e.target.value }))}
                  required
                />
              </div>
              
              {selectedTemplate && (
                <div className="p-3 bg-muted rounded-lg">
                  <h4 className="font-medium">{selectedTemplate.name}</h4>
                  <p className="text-sm text-muted-foreground">
                    {selectedTemplate.description}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Duration: {selectedTemplate.durationDays} days
                  </p>
                </div>
              )}
              
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading || !templateForm.employeeId || !templateForm.templateId}>
                  {loading ? 'Creating...' : 'Create Plan'}
                </Button>
              </div>
            </form>
          </TabsContent>
          
          <TabsContent value="ai" className="space-y-4">
            <form onSubmit={handleAISubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ai-employee">Employee</Label>
                  <Select
                    value={aiForm.employeeId}
                    onValueChange={(value) => setAiForm(prev => ({ ...prev, employeeId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select employee" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((employee) => (
                        <SelectItem key={employee.id} value={employee.id}>
                          {employee.name || employee.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="ai-duration">Duration</Label>
                  <Select
                    value={aiForm.durationDays.toString()}
                    onValueChange={(value) => setAiForm(prev => ({ ...prev, durationDays: parseInt(value) }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 days</SelectItem>
                      <SelectItem value="60">60 days</SelectItem>
                      <SelectItem value="90">90 days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ai-role">Role</Label>
                  <Input
                    id="ai-role"
                    value={aiForm.role}
                    onChange={(e) => setAiForm(prev => ({ ...prev, role: e.target.value }))}
                    placeholder="e.g., Software Engineer"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="ai-seniority">Seniority</Label>
                  <Select
                    value={aiForm.seniority}
                    onValueChange={(value) => setAiForm(prev => ({ ...prev, seniority: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Junior">Junior</SelectItem>
                      <SelectItem value="Mid-level">Mid-level</SelectItem>
                      <SelectItem value="Senior">Senior</SelectItem>
                      <SelectItem value="Lead">Lead</SelectItem>
                      <SelectItem value="Manager">Manager</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="ai-department">Department</Label>
                  <Input
                    id="ai-department"
                    value={aiForm.department}
                    onChange={(e) => setAiForm(prev => ({ ...prev, department: e.target.value }))}
                    placeholder="e.g., Engineering"
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="ai-start">Start Date</Label>
                <Input
                  id="ai-start"
                  type="date"
                  value={aiForm.startDate}
                  onChange={(e) => setAiForm(prev => ({ ...prev, startDate: e.target.value }))}
                  required
                />
              </div>
              
              <div className="p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-2 text-blue-800">
                  <Sparkles className="h-4 w-4" />
                  <span className="font-medium">AI Generation</span>
                </div>
                <p className="text-sm text-blue-700 mt-1">
                  Our AI will create a personalized onboarding plan based on the role, seniority, and department information you provide.
                </p>
              </div>
              
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading || !aiForm.employeeId || !aiForm.role || !aiForm.department}>
                  {loading ? 'Generating...' : 'Generate Plan'}
                </Button>
              </div>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
