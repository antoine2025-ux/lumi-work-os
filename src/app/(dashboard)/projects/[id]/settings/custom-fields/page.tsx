"use client"

import React, { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Plus, Edit, Trash2, Settings } from 'lucide-react'

interface CustomFieldDef {
  id: string
  projectId: string
  key: string
  label: string
  type: 'text' | 'number' | 'select' | 'date' | 'boolean'
  options?: any
  uniqueKey: string
  createdAt: string
}

export default function CustomFieldsSettingsPage() {
  const params = useParams()
  const projectId = params.id as string
  
  const [customFields, setCustomFields] = useState<CustomFieldDef[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingField, setEditingField] = useState<CustomFieldDef | null>(null)
  
  // Form state
  const [formData, setFormData] = useState({
    key: '',
    label: '',
    type: 'text' as const,
    options: ''
  })

  useEffect(() => {
    loadCustomFields()
  }, [projectId])

  const loadCustomFields = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/projects/${projectId}/custom-fields`)
      if (response.ok) {
        const data = await response.json()
        setCustomFields(data)
      } else {
        console.error('Failed to load custom fields:', response.status, response.statusText)
      }
    } catch (error) {
      console.error('Error loading custom fields:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const createCustomField = async () => {
    try {
      const options = formData.type === 'select' && formData.options 
        ? formData.options.split(',').map(opt => opt.trim())
        : undefined

      const response = await fetch(`/api/projects/${projectId}/custom-fields`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          key: formData.key,
          label: formData.label,
          type: formData.type,
          options: options
        }),
      })

      if (response.ok) {
        const newField = await response.json()
        setCustomFields(prev => [...prev, newField])
        resetForm()
        setIsCreateOpen(false)
      } else {
        console.error('Failed to create custom field:', response.status, response.statusText)
      }
    } catch (error) {
      console.error('Error creating custom field:', error)
    }
  }

  const updateCustomField = async () => {
    if (!editingField) return

    try {
      const options = formData.type === 'select' && formData.options 
        ? formData.options.split(',').map(opt => opt.trim())
        : undefined

      const response = await fetch(`/api/projects/${projectId}/custom-fields/${editingField.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          key: formData.key,
          label: formData.label,
          type: formData.type,
          options: options
        }),
      })

      if (response.ok) {
        const updatedField = await response.json()
        setCustomFields(prev => prev.map(field => 
          field.id === editingField.id ? updatedField : field
        ))
        resetForm()
        setEditingField(null)
      } else {
        console.error('Failed to update custom field:', response.status, response.statusText)
      }
    } catch (error) {
      console.error('Error updating custom field:', error)
    }
  }

  const deleteCustomField = async (fieldId: string) => {
    if (!confirm('Are you sure you want to delete this custom field? This will also delete all values for this field.')) {
      return
    }

    try {
      const response = await fetch(`/api/projects/${projectId}/custom-fields/${fieldId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setCustomFields(prev => prev.filter(field => field.id !== fieldId))
      } else {
        console.error('Failed to delete custom field:', response.status, response.statusText)
      }
    } catch (error) {
      console.error('Error deleting custom field:', error)
    }
  }

  const resetForm = () => {
    setFormData({
      key: '',
      label: '',
      type: 'text',
      options: ''
    })
  }

  const handleEdit = (field: CustomFieldDef) => {
    setEditingField(field)
    setFormData({
      key: field.key,
      label: field.label,
      type: field.type,
      options: field.options ? (Array.isArray(field.options) ? field.options.join(', ') : '') : ''
    })
  }

  const handleSubmit = () => {
    if (editingField) {
      updateCustomField()
    } else {
      createCustomField()
    }
  }

  const getTypeLabel = (type: string) => {
    const labels = {
      text: 'Text',
      number: 'Number',
      select: 'Select',
      date: 'Date',
      boolean: 'Boolean'
    }
    return labels[type as keyof typeof labels] || type
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Settings className="h-6 w-6 text-gray-600" />
          <h1 className="text-2xl font-semibold text-gray-900">Custom Fields</h1>
        </div>
        
        <Dialog open={isCreateOpen || !!editingField} onOpenChange={(open) => {
          if (!open) {
            setIsCreateOpen(false)
            setEditingField(null)
            resetForm()
          }
        }}>
          <DialogTrigger asChild>
            <Button onClick={() => setIsCreateOpen(true)} className="flex items-center space-x-2">
              <Plus className="h-4 w-4" />
              <span>Add Custom Field</span>
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingField ? 'Edit Custom Field' : 'Create Custom Field'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="key">Key</Label>
                <Input
                  id="key"
                  value={formData.key}
                  onChange={(e) => setFormData(prev => ({ ...prev, key: e.target.value }))}
                  placeholder="e.g., priority_level"
                  disabled={!!editingField}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Unique identifier for this field (cannot be changed after creation)
                </p>
              </div>
              
              <div>
                <Label htmlFor="label">Label</Label>
                <Input
                  id="label"
                  value={formData.label}
                  onChange={(e) => setFormData(prev => ({ ...prev, label: e.target.value }))}
                  placeholder="e.g., Priority Level"
                />
              </div>
              
              <div>
                <Label htmlFor="type">Type</Label>
                <Select value={formData.type} onValueChange={(value: any) => setFormData(prev => ({ ...prev, type: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Text</SelectItem>
                    <SelectItem value="number">Number</SelectItem>
                    <SelectItem value="select">Select</SelectItem>
                    <SelectItem value="date">Date</SelectItem>
                    <SelectItem value="boolean">Boolean</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {formData.type === 'select' && (
                <div>
                  <Label htmlFor="options">Options</Label>
                  <Input
                    id="options"
                    value={formData.options}
                    onChange={(e) => setFormData(prev => ({ ...prev, options: e.target.value }))}
                    placeholder="e.g., Low, Medium, High"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Comma-separated list of options
                  </p>
                </div>
              )}
              
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => {
                  setIsCreateOpen(false)
                  setEditingField(null)
                  resetForm()
                }}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={!formData.key.trim() || !formData.label.trim()}>
                  {editingField ? 'Update' : 'Create'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {customFields.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Custom Fields</h3>
            <p className="text-gray-500 mb-4">
              Create custom fields to capture additional information for your tasks.
            </p>
            <Button onClick={() => setIsCreateOpen(true)} className="flex items-center space-x-2">
              <Plus className="h-4 w-4" />
              <span>Add Your First Custom Field</span>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {customFields.map((field) => (
            <Card key={field.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div>
                      <h3 className="font-medium text-gray-900">{field.label}</h3>
                      <p className="text-sm text-gray-500">Key: {field.key}</p>
                    </div>
                    <Badge variant="outline">{getTypeLabel(field.type)}</Badge>
                    {field.options && Array.isArray(field.options) && (
                      <div className="text-xs text-gray-500">
                        Options: {field.options.join(', ')}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(field)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteCustomField(field.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
