"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useWorkspace } from "@/lib/workspace-context"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Building2 } from "lucide-react"

interface WorkspaceCreationModalProps {
  children?: React.ReactNode
}

export function WorkspaceCreationModal({ children }: WorkspaceCreationModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: ""
  })
  const router = useRouter()
  const { switchWorkspace } = useWorkspace()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log("Form submitted with data:", formData)
    
    // Validate form data
    if (!formData.name || !formData.slug) {
      alert("Please fill in workspace name and slug")
      return
    }
    
    if (formData.slug.length < 3) {
      alert("Slug must be at least 3 characters long")
      return
    }
    
    setIsLoading(true)

    try {
      // Create AbortController for timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

      console.log("Making POST request to /api/workspaces")
      const response = await fetch('/api/workspaces', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
        signal: controller.signal
      })

      clearTimeout(timeoutId)
      console.log("Response received:", response.status, response.statusText)

      if (response.ok) {
        const data = await response.json()
        console.log("Success response:", data)
        setIsOpen(false)
        setFormData({ name: "", slug: "", description: "" })
        // Switch to the new workspace
        if (data.workspace?.id) {
          switchWorkspace(data.workspace.id)
        }
        // Refresh the page to update workspace context
        router.refresh()
      } else {
        console.error('Response not ok:', response.status, response.statusText)
        let errorData
        try {
          errorData = await response.json()
        } catch (jsonError) {
          console.error('Failed to parse error response as JSON:', jsonError)
          errorData = { error: `Server error: ${response.status} ${response.statusText}` }
        }
        console.error('Failed to create workspace:', errorData)
        alert(`Failed to create workspace: ${errorData.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error creating workspace:', error)
      if (error instanceof Error && error.name === 'AbortError') {
        alert('Request timed out. Please try again.')
      } else {
        alert(`Error creating workspace: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => {
      const newData = {
        ...prev,
        [field]: value
      }
      
      // Auto-generate slug from name
      if (field === 'name' && value) {
        const slug = value
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '')
        newData.slug = slug
      }
      
      return newData
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-2" />
            Create Workspace
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Building2 className="h-5 w-5" />
            <span>Create New Workspace</span>
          </DialogTitle>
          <DialogDescription>
            Create a new workspace to organize your projects and team members.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Workspace Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="My Company"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="slug">URL Slug</Label>
              <Input
                id="slug"
                value={formData.slug}
                onChange={(e) => handleInputChange('slug', e.target.value)}
                placeholder="my-company"
                required
              />
              <p className="text-xs text-gray-500">
                This will be used in your workspace URL: lumi.app/{formData.slug || 'workspace-slug'}
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="A brief description of your workspace..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !formData.name || !formData.slug}>
              {isLoading ? "Creating..." : "Create Workspace"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
