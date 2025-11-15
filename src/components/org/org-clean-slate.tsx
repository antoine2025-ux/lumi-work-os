"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  Building, 
  Users, 
  Briefcase, 
  FileText,
  Plus,
  ArrowRight,
  CheckCircle2
} from "lucide-react"
import { DepartmentForm } from "./department-form"
import { TeamForm } from "./team-form"
import { PositionForm as PositionFormSimple } from "./position-form-simple"
import { RoleCardForm } from "./role-card-form"

interface OrgCleanSlateProps {
  workspaceId: string
  onStructureCreated: () => void
  colors: {
    background: string
    surface: string
    text: string
    textSecondary: string
    primary: string
    success: string
  }
}

interface SetupStep {
  id: string
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  completed: boolean
}

export function OrgCleanSlate({ workspaceId, onStructureCreated, colors }: OrgCleanSlateProps) {
  const [steps, setSteps] = useState<SetupStep[]>([
    {
      id: 'departments',
      title: 'Departments',
      description: 'Define your top-level organizational structure',
      icon: Building,
      completed: false
    },
    {
      id: 'teams',
      title: 'Teams',
      description: 'Create teams within each department',
      icon: Users,
      completed: false
    },
    {
      id: 'positions',
      title: 'Positions',
      description: 'Define roles and positions within teams',
      icon: Briefcase,
      completed: false
    },
    {
      id: 'role-cards',
      title: 'Role Cards',
      description: 'Add responsibilities and expectations (optional)',
      icon: FileText,
      completed: false
    }
  ])

  const [activeStep, setActiveStep] = useState<string | null>(null)
  const [departments, setDepartments] = useState<any[]>([])
  const [teams, setTeams] = useState<any[]>([])
  const [positions, setPositions] = useState<any[]>([])

  const handleStepComplete = (stepId: string) => {
    setSteps(prev => prev.map(step => 
      step.id === stepId ? { ...step, completed: true } : step
    ))
    setActiveStep(null)
    
    // Refresh data
    if (stepId === 'departments') {
      loadDepartments()
    } else if (stepId === 'teams') {
      loadTeams()
    } else if (stepId === 'positions') {
      loadPositions()
    } else if (stepId === 'role-cards') {
      // Role cards are optional, but if completed, proceed to dashboard
      loadPositions() // Refresh positions to get role cards
      // Auto-redirect after role cards since it's the final step
      setTimeout(() => {
        onStructureCreated()
      }, 500) // Small delay to show completion
    }
    
    // Don't auto-redirect after positions - let user choose
  }

  const handleContinueToDashboard = () => {
    onStructureCreated()
  }

  const loadDepartments = async () => {
    try {
      const response = await fetch(`/api/org/departments`, {
        credentials: 'include'
      })
      if (response.ok) {
        const data = await response.json()
        setDepartments(data)
        if (data.length > 0) {
          setSteps(prev => prev.map(s => 
            s.id === 'departments' ? { ...s, completed: true } : s
          ))
        }
      }
    } catch (error) {
      console.error('Error loading departments:', error)
    }
  }

  const loadTeams = async () => {
    try {
      const response = await fetch(`/api/org/teams`, {
        credentials: 'include'
      })
      if (response.ok) {
        const data = await response.json()
        setTeams(data)
        if (data.length > 0) {
          setSteps(prev => prev.map(s => 
            s.id === 'teams' ? { ...s, completed: true } : s
          ))
        }
      }
    } catch (error) {
      console.error('Error loading teams:', error)
    }
  }

  const loadPositions = async () => {
    try {
      const response = await fetch(`/api/org/positions`, {
        credentials: 'include'
      })
      if (response.ok) {
        const data = await response.json()
        setPositions(data)
        if (data.length > 0) {
          setSteps(prev => prev.map(s => 
            s.id === 'positions' ? { ...s, completed: true } : s
          ))
        }
      }
    } catch (error) {
      console.error('Error loading positions:', error)
    }
  }

  // Load initial data
  useEffect(() => {
    loadDepartments()
    loadTeams()
    loadPositions()
  }, [workspaceId])

  const canAccessStep = (stepId: string) => {
    if (stepId === 'departments') return true
    if (stepId === 'teams') return steps.find(s => s.id === 'departments')?.completed || departments.length > 0
    if (stepId === 'positions') return steps.find(s => s.id === 'teams')?.completed || teams.length > 0
    if (stepId === 'role-cards') return steps.find(s => s.id === 'positions')?.completed || positions.length > 0
    return false
  }

  const getStepCount = (stepId: string) => {
    if (stepId === 'departments') return departments.length
    if (stepId === 'teams') return teams.length
    if (stepId === 'positions') return positions.length
    return 0
  }

  return (
    <div className="px-16 py-12 space-y-8">
      {/* Welcome Header */}
      <div className="text-center space-y-4 max-w-2xl mx-auto">
        <h2 className="text-3xl font-light" style={{ color: colors.text }}>
          Teach Loopwell how your company works
        </h2>
        <p className="text-lg" style={{ color: colors.textSecondary }}>
          Define your departments, teams, and roles so LoopBrain can understand your structure and assist your team effectively.
        </p>
      </div>

      {/* Setup Steps Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 max-w-7xl mx-auto">
        {steps.map((step, index) => {
          const Icon = step.icon
          const isAccessible = canAccessStep(step.id)
          const count = getStepCount(step.id)
          const isOptional = step.id === 'role-cards'

          return (
            <Card 
              key={step.id}
              className={`border-0 rounded-xl transition-all duration-200 ${
                isAccessible 
                  ? 'cursor-pointer hover:shadow-lg' 
                  : 'opacity-50 cursor-not-allowed'
              }`}
              style={{ backgroundColor: colors.surface }}
              onClick={() => isAccessible && setActiveStep(step.id)}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                    step.completed 
                      ? 'bg-green-100' 
                      : isAccessible 
                        ? 'bg-gray-100' 
                        : 'bg-gray-50'
                  }`}>
                    {step.completed ? (
                      <CheckCircle2 className="h-6 w-6 text-green-600" />
                    ) : (
                      <Icon className={`h-6 w-6 ${
                        isAccessible ? 'text-gray-600' : 'text-gray-400'
                      }`} />
                    )}
                  </div>
                  {count > 0 && (
                    <span className="text-sm font-medium px-2 py-1 rounded-full bg-gray-100 text-gray-600">
                      {count} {count === 1 ? (step.id === 'departments' ? 'department' : step.id === 'teams' ? 'team' : step.id === 'positions' ? 'position' : 'card') : (step.id === 'departments' ? 'departments' : step.id === 'teams' ? 'teams' : step.id === 'positions' ? 'positions' : 'cards')}
                    </span>
                  )}
                </div>

                <h3 className={`text-lg font-medium mb-2 ${
                  isAccessible ? '' : 'text-gray-400'
                }`} style={{ color: isAccessible ? colors.text : colors.textSecondary }}>
                  {index + 1}. {step.title}
                  {isOptional && (
                    <span className="text-xs font-normal ml-2 text-gray-400">(Optional)</span>
                  )}
                </h3>
                <p className="text-sm mb-4" style={{ color: colors.textSecondary }}>
                  {step.description}
                </p>

                {!isAccessible && (
                  <p className="text-xs text-gray-400 italic">
                    Complete previous steps first
                  </p>
                )}

                {isAccessible && !step.completed && (
                  <Button 
                    className="w-full rounded-lg"
                    onClick={(e) => {
                      e.stopPropagation()
                      setActiveStep(step.id)
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Get Started
                  </Button>
                )}

                {step.completed && (
                  <div className="space-y-2">
                    <div className="flex items-center text-sm text-green-600">
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Completed
                    </div>
                    {step.id === 'departments' && departments.length > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-xs"
                        onClick={(e) => {
                          e.stopPropagation()
                          setActiveStep(step.id)
                        }}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add Another
                      </Button>
                    )}
                    {step.id === 'teams' && teams.length > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-xs"
                        onClick={(e) => {
                          e.stopPropagation()
                          setActiveStep(step.id)
                        }}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add Another
                      </Button>
                    )}
                    {step.id === 'positions' && positions.length > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-xs"
                        onClick={(e) => {
                          e.stopPropagation()
                          setActiveStep(step.id)
                        }}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add Another
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Progress Indicator */}
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm" style={{ color: colors.textSecondary }}>
            Setup Progress
          </span>
          <span className="text-sm font-medium" style={{ color: colors.text }}>
            {steps.filter(s => s.completed && s.id !== 'role-cards').length} of {steps.filter(s => s.id !== 'role-cards').length} required steps
          </span>
        </div>
        <div className="w-full h-2 rounded-full bg-gray-200">
          <div 
            className="h-2 rounded-full transition-all duration-300"
            style={{ 
              width: `${(steps.filter(s => s.completed && s.id !== 'role-cards').length / steps.filter(s => s.id !== 'role-cards').length) * 100}%`,
              backgroundColor: colors.success
            }}
          />
        </div>
      </div>

      {/* Continue to Dashboard Button - Show after positions are completed */}
      {steps.find(s => s.id === 'positions')?.completed && !steps.find(s => s.id === 'role-cards')?.completed && (
        <div className="max-w-2xl mx-auto pt-6 border-t">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium mb-1" style={{ color: colors.text }}>
                Ready to continue?
              </h3>
              <p className="text-sm" style={{ color: colors.textSecondary }}>
                You can add role cards now or continue to your organization dashboard
              </p>
            </div>
            <Button
              onClick={handleContinueToDashboard}
              className="ml-4"
              size="lg"
            >
              Continue to Dashboard
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* Forms */}
      {activeStep === 'departments' && (
        <DepartmentForm
          workspaceId={workspaceId}
          isOpen={true}
          onClose={() => setActiveStep(null)}
          onSuccess={() => handleStepComplete('departments')}
          colors={colors}
        />
      )}

      {activeStep === 'teams' && (
        <TeamForm
          workspaceId={workspaceId}
          isOpen={true}
          onClose={() => setActiveStep(null)}
          onSuccess={() => handleStepComplete('teams')}
          departments={departments}
        />
      )}

      {activeStep === 'positions' && (
        <PositionFormSimple
          workspaceId={workspaceId}
          isOpen={true}
          onClose={() => setActiveStep(null)}
          onSuccess={() => handleStepComplete('positions')}
          teams={teams}
        />
      )}

      {activeStep === 'role-cards' && (
        <RoleCardForm
          workspaceId={workspaceId}
          isOpen={true}
          onClose={() => setActiveStep(null)}
          onSuccess={() => handleStepComplete('role-cards')}
          positions={positions}
        />
      )}
    </div>
  )
}

