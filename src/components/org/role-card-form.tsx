"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Plus, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface RoleTemplate {
  id: string
  roleName: string
  jobFamily: string
  level: string
  roleDescription: string
  responsibilities: string[]
  keyMetrics: string[]
  positionId?: string | null
}

interface RoleCardFormProps {
  mode: 'create' | 'edit'
  initialData?: RoleTemplate
  workspaceId: string
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function RoleCardForm({ 
  mode,
  initialData,
  isOpen, 
  onClose, 
  onSuccess,
}: RoleCardFormProps) {
  const [roleName, setRoleName] = useState("")
  const [jobFamily, setJobFamily] = useState("")
  const [level, setLevel] = useState("")
  const [roleDescription, setRoleDescription] = useState("")
  const [responsibility, setResponsibility] = useState("")
  const [responsibilities, setResponsibilities] = useState<string[]>([])
  const [keyMetric, setKeyMetric] = useState("")
  const [keyMetrics, setKeyMetrics] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Job Family options
  const jobFamilyOptions = [
    'Product',
    'Engineering',
    'Design',
    'Ops',
    'Finance',
    'Marketing',
    'HR',
    'Compliance',
    'Sales',
    'Support'
  ]

  // Initialize form with data when opening (create or edit)
  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && initialData) {
        // Populate form with existing data
        setRoleName(initialData.roleName)
        setJobFamily(initialData.jobFamily)
        setLevel(initialData.level)
        setRoleDescription(initialData.roleDescription)
        setResponsibilities(initialData.responsibilities || [])
        setKeyMetrics(initialData.keyMetrics || [])
      } else {
        // Reset form for create mode
        setRoleName("")
        setJobFamily("")
        setLevel("")
        setRoleDescription("")
        setResponsibilities([])
        setKeyMetrics([])
      }
      setResponsibility("")
      setKeyMetric("")
      setError(null)
    }
  }, [isOpen, mode, initialData])

  const addResponsibility = () => {
    if (responsibility.trim()) {
      setResponsibilities([...responsibilities, responsibility.trim()])
      setResponsibility("")
    }
  }

  const removeResponsibility = (index: number) => {
    setResponsibilities(responsibilities.filter((_, i) => i !== index))
  }

  const addKeyMetric = () => {
    if (keyMetric.trim()) {
      setKeyMetrics([...keyMetrics, keyMetric.trim()])
      setKeyMetric("")
    }
  }

  const removeKeyMetric = (index: number) => {
    setKeyMetrics(keyMetrics.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      if (!roleName.trim()) {
        throw new Error('Please enter a role name')
      }
      if (!jobFamily.trim()) {
        throw new Error('Please select or enter a job family')
      }
      if (!level.trim()) {
        throw new Error('Please enter a level (e.g., L3, Senior, Staff)')
      }
      if (!roleDescription.trim()) {
        throw new Error('Please enter a role description')
      }

      const url = mode === 'create' 
        ? '/api/org/role-templates'
        : `/api/org/role-templates/${initialData?.id}`
      
      const method = mode === 'create' ? 'POST' : 'PUT'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roleName: roleName.trim(),
          jobFamily: jobFamily.trim(),
          level: level.trim(),
          roleDescription: roleDescription.trim(),
          responsibilities,
          requiredSkills: [], // Legacy field, empty
          preferredSkills: [], // Legacy field, empty
          keyMetrics,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Failed to ${mode} role template`)
      }

      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Create Role Template' : 'Edit Role Template'}</DialogTitle>
          <DialogDescription>
            {mode === 'create' 
              ? 'Define a reusable role template that can be assigned to positions'
              : 'Update the role template details'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          {/* Role Template Section */}
          <div className="space-y-4">
            
            <div className="space-y-2">
              <Label htmlFor="roleName">Role Name *</Label>
              <Input
                id="roleName"
                value={roleName}
                onChange={(e) => setRoleName(e.target.value)}
                placeholder="e.g., Senior Software Engineer, Product Manager, Design Lead"
                required
                disabled={isLoading}
              />
              <p className="text-xs text-gray-500">
                The title of this role template
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="jobFamily">Job Family *</Label>
              <Select value={jobFamily} onValueChange={setJobFamily} disabled={isLoading}>
                <SelectTrigger>
                  <SelectValue placeholder="Select job family" />
                </SelectTrigger>
                <SelectContent>
                  {jobFamilyOptions.map((family) => (
                    <SelectItem key={family} value={family}>
                      {family}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                Categorizes roles for organizational analysis
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="level">Level *</Label>
              <Input
                id="level"
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                placeholder="e.g., L3, Senior, Staff, IC4"
                required
                disabled={isLoading}
              />
              <p className="text-xs text-gray-500">
                Seniority or career level (e.g., L3, Senior, Staff)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="roleDescription">Role Description *</Label>
              <Textarea
                id="roleDescription"
                value={roleDescription}
                onChange={(e) => setRoleDescription(e.target.value)}
                placeholder="Describe what this role is responsible for and how it contributes to the organization"
                rows={4}
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label>Key Responsibilities</Label>
              <div className="flex space-x-2">
                <Input
                  value={responsibility}
                  onChange={(e) => setResponsibility(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addResponsibility()
                    }
                  }}
                  placeholder="Add a responsibility"
                  disabled={isLoading}
                />
                <Button type="button" onClick={addResponsibility} disabled={isLoading || !responsibility.trim()}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {responsibilities.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {responsibilities.map((resp, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="flex items-center gap-1 px-2 py-1 text-xs"
                    >
                      {resp}
                      <button
                        type="button"
                        onClick={() => removeResponsibility(index)}
                        disabled={isLoading}
                        className="ml-1 hover:opacity-70 focus:outline-none"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Key Metrics (Optional)</Label>
              <div className="flex space-x-2">
                <Input
                  value={keyMetric}
                  onChange={(e) => setKeyMetric(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addKeyMetric()
                    }
                  }}
                  placeholder="Add a key metric or success indicator"
                  disabled={isLoading}
                />
                <Button type="button" onClick={addKeyMetric} disabled={isLoading || !keyMetric.trim()}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {keyMetrics.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {keyMetrics.map((metric, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="flex items-center gap-1 px-2 py-1 text-xs"
                    >
                      {metric}
                      <button
                        type="button"
                        onClick={() => removeKeyMetric(index)}
                        disabled={isLoading}
                        className="ml-1 hover:opacity-70 focus:outline-none"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              <p className="text-xs text-gray-500">
                Success metrics that define performance in this role
              </p>
            </div>
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
            <Button 
              type="submit" 
              disabled={isLoading || !roleName.trim() || !jobFamily.trim() || !level.trim() || !roleDescription.trim()}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {mode === 'create' ? 'Creating...' : 'Saving...'}
                </>
              ) : (
                mode === 'create' ? 'Create Role Template' : 'Save Changes'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

