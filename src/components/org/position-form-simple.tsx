"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2 } from "lucide-react"

interface Team {
  id: string
  name: string
  departmentId?: string
  department?: {
    id: string
    name: string
  }
}

interface Department {
  id: string
  name: string
}

interface PositionFormSimpleProps {
  workspaceId: string
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  teams: Team[]
  position?: {
    id: string
    title: string
    teamId?: string
    level: number
  }
}

export function PositionForm({ 
  workspaceId, 
  isOpen, 
  onClose, 
  onSuccess,
  teams,
  position 
}: PositionFormSimpleProps) {
  const [title, setTitle] = useState(position?.title || "")
  const [departmentId, setDepartmentId] = useState("")
  const [teamId, setTeamId] = useState(position?.teamId || "")
  const [level, setLevel] = useState(position?.level || 1)
  const [departments, setDepartments] = useState<Department[]>([])
  const [filteredTeams, setFilteredTeams] = useState<Team[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load departments when modal opens
  useEffect(() => {
    if (isOpen) {
      loadDepartments()
      // Reset form when opening (unless editing)
      if (!position) {
        setTitle("")
        setDepartmentId("")
        setTeamId("")
        setLevel(1)
      } else {
        // If editing, find the department from the team
        const team = teams.find(t => t.id === position.teamId)
        if (team) {
          setDepartmentId(team.departmentId || team.department?.id || "")
        }
      }
    }
  }, [isOpen, workspaceId, position, teams])

  // Load teams when department changes
  useEffect(() => {
    if (departmentId) {
      const teamsForDept = teams.filter(t => 
        (t.departmentId === departmentId) || (t.department?.id === departmentId)
      )
      setFilteredTeams(teamsForDept)
      // Reset team if current selection is not in filtered list
      if (teamId && !teamsForDept.find(t => t.id === teamId)) {
        setTeamId("")
      }
    } else {
      setFilteredTeams([])
      setTeamId("")
    }
  }, [departmentId, teams, teamId])

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

      const url = position 
        ? `/api/org/positions/${position.id}`
        : '/api/org/positions'
      
      const method = position ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title.trim(),
          teamId,
          level,
          workspaceId
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save position')
      }

      onSuccess()
      if (!position) {
        setTitle("")
        setLevel(1)
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
          <DialogTitle>{position ? 'Edit Position' : 'Create Position'}</DialogTitle>
          <DialogDescription>
            {position 
              ? 'Update position information'
              : 'Define a role within a team'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="department">Department *</Label>
            <Select 
              value={departmentId} 
              onValueChange={(value) => {
                setDepartmentId(value)
                setTeamId("") // Reset team when department changes
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
              onValueChange={setTeamId} 
              disabled={isLoading || filteredTeams.length === 0 || !departmentId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a team" />
              </SelectTrigger>
              <SelectContent>
                {filteredTeams.map((team) => (
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
            {departmentId && filteredTeams.length === 0 && (
              <p className="text-xs text-gray-500">
                No teams found for this department. Please create a team first.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Position Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Frontend Developer, Product Manager"
              required
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="level">Level</Label>
            <Select value={level.toString()} onValueChange={(v) => setLevel(parseInt(v))} disabled={isLoading}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Level 1 - Executive</SelectItem>
                <SelectItem value="2">Level 2 - Senior Leadership</SelectItem>
                <SelectItem value="3">Level 3 - Directors</SelectItem>
                <SelectItem value="4">Level 4 - Managers</SelectItem>
                <SelectItem value="5">Level 5 - Individual Contributors</SelectItem>
              </SelectContent>
            </Select>
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
              disabled={isLoading || !title.trim() || !departmentId || !teamId || filteredTeams.length === 0}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                position ? 'Update' : 'Create Position'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

