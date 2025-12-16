"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, CheckCircle2 } from "lucide-react"

interface DepartmentFormProps {
  workspaceId: string
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  department?: {
    id: string
    name: string
    description?: string
    color?: string
  }
  colors?: {
    text?: string
    textSecondary?: string
  }
}

export function DepartmentForm({ 
  workspaceId, 
  isOpen, 
  onClose, 
  onSuccess,
  department,
  colors
}: DepartmentFormProps) {
  const [name, setName] = useState(department?.name || "")
  const [description, setDescription] = useState(department?.description || "")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showSuccess, setShowSuccess] = useState(false)
  const [createdDepartmentName, setCreatedDepartmentName] = useState<string | null>(null)

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen && !department) {
      setName("")
      setDescription("")
      setShowSuccess(false)
      setCreatedDepartmentName(null)
      setError(null)
    } else if (isOpen && department) {
      setName(department.name)
      setDescription(department.description || "")
      setShowSuccess(false)
      setCreatedDepartmentName(null)
    }
  }, [isOpen, department])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      const url = department 
        ? `/api/org/departments/${department.id}`
        : '/api/org/departments'
      
      const method = department ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          workspaceId
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save department')
      }

      if (!department) {
        // For new departments, show success state
        const savedName = name.trim()
        const savedDescription = description.trim()
        setCreatedDepartmentName(savedName)
        // Keep description in state to show in success view
        setDescription(savedDescription)
        setShowSuccess(true)
        onSuccess() // Refresh the list
      } else {
        // For edits, close immediately
        onSuccess()
        onClose()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{department ? 'Edit Department' : 'Create Department'}</DialogTitle>
          <DialogDescription>
            {department 
              ? 'Update department information'
              : 'Define a top-level organizational division'
            }
          </DialogDescription>
        </DialogHeader>

        {showSuccess && !department ? (
          // Success State - Show what was created
          <div className="space-y-6 py-4">
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-lg font-medium mb-2">
                Department Created
              </h3>
              <p className="text-sm mb-1 text-gray-600">
                <span className="font-medium">{createdDepartmentName}</span>
              </p>
              {description && description.trim() && (
                <p className="text-sm mt-2 text-gray-500">
                  {description}
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setName("")
                  setDescription("")
                  setShowSuccess(false)
                  setCreatedDepartmentName(null)
                  setError(null)
                }}
              >
                Add Another
              </Button>
              <Button
                type="button"
                onClick={() => {
                  onClose()
                  setShowSuccess(false)
                  setCreatedDepartmentName(null)
                }}
              >
                Done
              </Button>
            </div>
          </div>
        ) : (
          // Form State - Show input fields
          <form onSubmit={handleSubmit} className="space-y-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Department Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Engineering, Marketing, Sales"
                required
                disabled={isLoading}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of this department's purpose"
                rows={3}
                disabled={isLoading}
                className="w-full"
              />
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading || !name.trim()}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  department ? 'Update' : 'Create Department'
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

