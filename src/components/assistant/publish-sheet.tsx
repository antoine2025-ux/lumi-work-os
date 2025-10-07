"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { 
  X, 
  CheckCircle, 
  AlertCircle,
  Loader2
} from "lucide-react"

interface PublishSheetProps {
  session: {
    id: string
    draftTitle: string
    draftBody: string
    draftFormat: string
  }
  onClose: () => void
  onPublish: (settings: any) => void
}

export function PublishSheet({ session, onClose, onPublish }: PublishSheetProps) {
  const [settings, setSettings] = useState({
    category: '',
    visibility: 'public',
    tags: [] as string[],
    owners: [] as string[],
    reviewRequired: false
  })
  const [tagInput, setTagInput] = useState('')
  const [isPublishing, setIsPublishing] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const categories = [
    'general',
    'policies',
    'procedures',
    'engineering',
    'sales',
    'marketing',
    'hr',
    'product'
  ]

  const visibilityOptions = [
    { value: 'public', label: 'Public (all employees)' },
    { value: 'team', label: 'Team only' },
    { value: 'private', label: 'Private' },
    { value: 'org', label: 'Organization' }
  ]

  const handleAddTag = () => {
    if (tagInput.trim() && !settings.tags.includes(tagInput.trim())) {
      setSettings(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }))
      setTagInput('')
    }
  }

  const handleRemoveTag = (tag: string) => {
    setSettings(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag)
    }))
  }

  const validateSettings = () => {
    const newErrors: Record<string, string> = {}
    
    if (!settings.category) {
      newErrors.category = 'Category is required'
    }
    
    if (!settings.visibility) {
      newErrors.visibility = 'Visibility is required'
    }
    
    if (session.draftBody.length < 300) {
      newErrors.content = 'Document must be at least 300 characters'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handlePublish = async () => {
    if (!validateSettings()) return
    
    setIsPublishing(true)
    try {
      await onPublish(settings)
    } catch (error) {
      console.error('Publish error:', error)
    } finally {
      setIsPublishing(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span>Publish to Wiki</span>
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Document Preview */}
          <div>
            <Label className="text-sm font-medium">Document Preview</Label>
            <div className="mt-2 p-3 bg-gray-50 rounded border">
              <h3 className="font-medium text-gray-900">{session.draftTitle}</h3>
              <p className="text-sm text-gray-600 mt-1">
                {session.draftBody.length} characters • {session.draftFormat.toUpperCase()}
              </p>
            </div>
          </div>

          {/* Category */}
          <div>
            <Label htmlFor="category" className="text-sm font-medium">
              Category <span className="text-red-500">*</span>
            </Label>
            <Select
              value={settings.category}
              onValueChange={(value) => setSettings(prev => ({ ...prev, category: value }))}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.category && (
              <p className="text-sm text-red-600 mt-1 flex items-center">
                <AlertCircle className="h-4 w-4 mr-1" />
                {errors.category}
              </p>
            )}
          </div>

          {/* Visibility */}
          <div>
            <Label htmlFor="visibility" className="text-sm font-medium">
              Visibility <span className="text-red-500">*</span>
            </Label>
            <Select
              value={settings.visibility}
              onValueChange={(value) => setSettings(prev => ({ ...prev, visibility: value }))}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select visibility" />
              </SelectTrigger>
              <SelectContent>
                {visibilityOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.visibility && (
              <p className="text-sm text-red-600 mt-1 flex items-center">
                <AlertCircle className="h-4 w-4 mr-1" />
                {errors.visibility}
              </p>
            )}
          </div>

          {/* Tags */}
          <div>
            <Label className="text-sm font-medium">Tags</Label>
            <div className="mt-1 space-y-2">
              <div className="flex space-x-2">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  placeholder="Add a tag"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleAddTag()
                    }
                  }}
                />
                <Button onClick={handleAddTag} variant="outline">
                  Add
                </Button>
              </div>
              {settings.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {settings.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="flex items-center space-x-1">
                      <span>{tag}</span>
                      <button
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-1 hover:text-red-600"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Review Required */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="reviewRequired"
              checked={settings.reviewRequired}
              onCheckedChange={(checked) => 
                setSettings(prev => ({ ...prev, reviewRequired: !!checked }))
              }
            />
            <Label htmlFor="reviewRequired" className="text-sm">
              Require review before publishing
            </Label>
          </div>

          {/* Content Validation */}
          {errors.content && (
            <div className="p-3 bg-red-50 border border-red-200 rounded">
              <p className="text-sm text-red-600 flex items-center">
                <AlertCircle className="h-4 w-4 mr-1" />
                {errors.content}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handlePublish}
              disabled={isPublishing || Object.keys(errors).length > 0}
              className="bg-green-600 hover:bg-green-700"
            >
              {isPublishing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Publishing...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Publish to Wiki
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
