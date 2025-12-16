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

interface Position {
  id: string
  title: string
  team?: {
    id: string
    name: string
    department?: {
      id: string
      name: string
    }
  }
}

interface Department {
  id: string
  name: string
}

interface Team {
  id: string
  name: string
  departmentId: string
}

interface RoleCardFormProps {
  workspaceId: string
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  positions: Position[]
}

export function RoleCardForm({ 
  workspaceId, 
  isOpen, 
  onClose, 
  onSuccess,
  positions 
}: RoleCardFormProps) {
  const [positionId, setPositionId] = useState("")
  const [departmentId, setDepartmentId] = useState("")
  const [teamId, setTeamId] = useState("")
  const [departments, setDepartments] = useState<Department[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [roleName, setRoleName] = useState("")
  const [jobFamily, setJobFamily] = useState("")
  const [roleDescription, setRoleDescription] = useState("")
  const [responsibility, setResponsibility] = useState("")
  const [responsibilities, setResponsibilities] = useState<string[]>([])
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

  // Load departments when modal opens
  useEffect(() => {
    if (isOpen) {
      loadDepartments()
      // Reset form when opening
      setPositionId("")
      setDepartmentId("")
      setTeamId("")
      setRoleName("")
      setJobFamily("")
      setRoleDescription("")
      setResponsibilities([])
      setResponsibility("")
      setError(null)
    }
  }, [isOpen, workspaceId])

  // Load teams when department changes
  useEffect(() => {
    if (departmentId) {
      loadTeams(departmentId)
      setTeamId("") // Reset team when department changes
      setPositionId("") // Reset position when department changes
    } else {
      setTeams([])
      setTeamId("")
    }
  }, [departmentId])

  // Filter positions by selected team
  const filteredPositions = teamId
    ? positions.filter(pos => pos.team?.id === teamId)
    : []

  const loadDepartments = async () => {
    try {
      const response = await fetch('/api/org/departments', {
        credentials: 'include'
      })
      if (response.ok) {
        const data = await response.json()
        setDepartments(data || [])
      }
    } catch (error) {
      console.error('Error loading departments:', error)
    }
  }

  const loadTeams = async (deptId: string) => {
    try {
      const response = await fetch(`/api/org/teams?departmentId=${deptId}`, {
        credentials: 'include'
      })
      if (response.ok) {
        const data = await response.json()
        setTeams(data || [])
      }
    } catch (error) {
      console.error('Error loading teams:', error)
    }
  }

  // Get selected position details
  const selectedPosition = positions.find(p => p.id === positionId)

  const addResponsibility = () => {
    if (responsibility.trim()) {
      setResponsibilities([...responsibilities, responsibility.trim()])
      setResponsibility("")
    }
  }

  const removeResponsibility = (index: number) => {
    setResponsibilities(responsibilities.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      if (!departmentId) {
        throw new Error('Please select a department')
      }
      if (!teamId) {
        throw new Error('Please select a team')
      }
      if (!positionId) {
        throw new Error('Please select a position')
      }
      if (!roleName.trim()) {
        throw new Error('Please enter a role name')
      }
      if (!roleDescription.trim()) {
        throw new Error('Please enter a role description')
      }

      const response = await fetch('/api/role-cards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          positionId,
          roleName: roleName.trim(),
          jobFamily: jobFamily || null, // Optional
          roleDescription: roleDescription.trim(),
          responsibilities,
          workspaceId
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create role card')
      }

      onSuccess()
      setRoleName("")
      setJobFamily("")
      setRoleDescription("")
      setResponsibilities([])
      setResponsibility("")
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
          <DialogTitle>Create Role Card</DialogTitle>
          <DialogDescription>
            Define what role this person actually performs in the team
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          {/* Position Metadata Section */}
          <div className="space-y-4 pb-4 border-b">
            <h3 className="text-sm font-medium text-gray-500">Position Metadata</h3>
            
            <div className="space-y-2">
              <Label htmlFor="department">Department *</Label>
              <Select 
                value={departmentId} 
                onValueChange={(value) => {
                  setDepartmentId(value)
                  setTeamId("")
                  setPositionId("")
                }} 
                disabled={isLoading || departments.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {departments.length === 0 && (
                <p className="text-xs text-gray-500">
                  Please create a department first
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="team">Team *</Label>
              <Select 
                value={teamId} 
                onValueChange={(value) => {
                  setTeamId(value)
                  setPositionId("")
                }} 
                disabled={isLoading || teams.length === 0 || !departmentId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a team" />
                </SelectTrigger>
                <SelectContent>
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!departmentId && (
                <p className="text-xs text-gray-500">
                  Please select a department first
                </p>
              )}
              {departmentId && teams.length === 0 && (
                <p className="text-xs text-gray-500">
                  No teams found for this department. Please create a team first.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="position">Job Title *</Label>
              <Select 
                value={positionId} 
                onValueChange={setPositionId} 
                disabled={isLoading || filteredPositions.length === 0 || !teamId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a position" />
                </SelectTrigger>
                <SelectContent>
                  {filteredPositions.map((pos) => (
                    <SelectItem key={pos.id} value={pos.id}>
                      {pos.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!teamId && (
                <p className="text-xs text-gray-500">
                  Please select a team first
                </p>
              )}
              {teamId && filteredPositions.length === 0 && (
                <p className="text-xs text-gray-500">
                  No positions found for this team. Please create a position first.
                </p>
              )}
              {selectedPosition && (
                <p className="text-xs text-gray-500 italic">
                  Job Title: {selectedPosition.title}
                </p>
              )}
            </div>
          </div>

          {/* Actual Role Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-500">Actual Role (What They Do)</h3>
            
            <div className="space-y-2">
              <Label htmlFor="roleName">Role Name *</Label>
              <Input
                id="roleName"
                value={roleName}
                onChange={(e) => setRoleName(e.target.value)}
                placeholder="e.g., Epic Owner, Product Manager, Engineering Lead"
                required
                disabled={isLoading}
              />
              <p className="text-xs text-gray-500">
                The functional identity of this person - what they actually do, not their job title
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="roleDescription">Role Description *</Label>
              <Textarea
                id="roleDescription"
                value={roleDescription}
                onChange={(e) => setRoleDescription(e.target.value)}
                placeholder="Describe what this role is responsible for and how it contributes to the team"
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
              <Label htmlFor="jobFamily">Job Family (Optional)</Label>
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
                Helps LoopBrain generalize behaviors and patterns
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
              Skip (Optional)
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading || !departmentId || !teamId || !positionId || !roleName.trim() || !roleDescription.trim()}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Role Card'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

