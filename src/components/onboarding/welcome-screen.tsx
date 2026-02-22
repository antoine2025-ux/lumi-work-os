'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { Building2, Users, Zap, User, CheckCircle2, Rocket } from 'lucide-react'

interface WelcomeScreenProps {
  user: {
    name: string
    email: string
    image?: string | null
  }
  onCreateWorkspace: (data: WorkspaceData) => Promise<void>
  isLoading?: boolean
}

interface WorkspaceData {
  name: string
  slug: string
  description: string
  teamSize: string
  industry: string
  mission?: string
  timezone?: string
  adminName?: string
  adminRole?: string
  adminDepartment?: string
}

const INDUSTRIES = [
  'Technology',
  'Healthcare',
  'Finance',
  'Education',
  'Retail',
  'Manufacturing',
  'Consulting',
  'Other',
]

const TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Phoenix',
  'America/Anchorage',
  'Pacific/Honolulu',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Dubai',
  'Australia/Sydney',
]

export function WelcomeScreen({ user, onCreateWorkspace, isLoading = false }: WelcomeScreenProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [workspaceData, setWorkspaceData] = useState<WorkspaceData>({
    name: `${user.name}'s Workspace`,
    slug: user.email.split('@')[0].toLowerCase(),
    description: '',
    teamSize: '1-10',
    industry: '',
    mission: '',
    timezone: 'America/New_York',
    adminName: user.name || '',
    adminRole: '',
    adminDepartment: '',
  })

  // Load persisted form data from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('loopwell-onboarding-form-data')
    if (saved) {
      try {
        const data = JSON.parse(saved)
        setWorkspaceData(prev => ({ ...prev, ...data }))
      } catch (e) {
        console.error('Failed to parse saved form data', e)
      }
    }
  }, [])

  // Persist form data to localStorage on change
  useEffect(() => {
    localStorage.setItem('loopwell-onboarding-form-data', JSON.stringify(workspaceData))
  }, [workspaceData])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onCreateWorkspace(workspaceData)
    // Clear localStorage after successful submission
    localStorage.removeItem('loopwell-onboarding-form-data')
  }

  const handleSlugChange = (name: string) => {
    const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
    setWorkspaceData(prev => ({
      ...prev,
      name,
      slug
    }))
  }

  const nextStep = () => {
    if (currentStep < 3) setCurrentStep(currentStep + 1)
  }

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1)
  }

  const progress = (currentStep / 3) * 100

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center">
              <Building2 className="w-8 h-8 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Welcome to Loopwell, {user.name}! 🎉
          </h1>
          <p className="text-xl text-muted-foreground">
            Let&apos;s set up your workspace to get started
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="text-center">
            <CardContent className="pt-6">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Building2 className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2 text-foreground">Organize Your Team</h3>
              <p className="text-sm text-muted-foreground">
                Create role cards, manage positions, and build your org chart
              </p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardContent className="pt-6">
              <div className="w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-6 h-6 text-green-500" />
              </div>
              <h3 className="font-semibold mb-2 text-foreground">Collaborate Seamlessly</h3>
              <p className="text-sm text-muted-foreground">
                Manage projects, track progress, and keep everyone aligned
              </p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardContent className="pt-6">
              <div className="w-12 h-12 bg-purple-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="w-6 h-6 text-purple-500" />
              </div>
              <h3 className="font-semibold mb-2 text-foreground">AI-Powered Insights</h3>
              <p className="text-sm text-muted-foreground">
                Get intelligent recommendations and contextual assistance
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Workspace Setup Form */}
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Rocket className="h-6 w-6 text-primary" />
                <CardTitle className="text-2xl">Welcome to Loopwell!</CardTitle>
              </div>
              <span className="text-sm text-muted-foreground">Step {currentStep} of 3</span>
            </div>
            <Progress value={progress} className="h-2" />
            <CardDescription className="mt-4">
              Let&apos;s set up your workspace in just a few steps
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Step 1: Workspace Info */}
              {currentStep === 1 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Building2 className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold">Tell us about your company</h3>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="workspace-name">Workspace Name</Label>
                    <Input
                      id="workspace-name"
                      value={workspaceData.name}
                      onChange={(e) => handleSlugChange(e.target.value)}
                      placeholder="e.g., Acme Inc."
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="workspace-slug">Workspace URL</Label>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-muted-foreground">loopwell.app/</span>
                      <Input
                        id="workspace-slug"
                        value={workspaceData.slug}
                        onChange={(e) => setWorkspaceData(prev => ({ ...prev, slug: e.target.value }))}
                        placeholder="acme-inc"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="mission">Company Mission</Label>
                    <Textarea
                      id="mission"
                      placeholder="What does your company do? What's your mission?"
                      className="min-h-[100px]"
                      value={workspaceData.mission}
                      onChange={(e) => setWorkspaceData(prev => ({ ...prev, mission: e.target.value }))}
                      required
                      minLength={10}
                      maxLength={500}
                    />
                    <p className="text-xs text-muted-foreground">
                      This helps Loopbrain understand your organization&apos;s purpose
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="industry">Industry</Label>
                    <Select value={workspaceData.industry} onValueChange={(value) => setWorkspaceData(prev => ({ ...prev, industry: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your industry" />
                      </SelectTrigger>
                      <SelectContent>
                        {INDUSTRIES.map((industry) => (
                          <SelectItem key={industry} value={industry}>
                            {industry}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="team-size">Company Size</Label>
                      <Select value={workspaceData.teamSize} onValueChange={(value) => setWorkspaceData(prev => ({ ...prev, teamSize: value }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1-10">1-10 employees</SelectItem>
                          <SelectItem value="11-50">11-50 employees</SelectItem>
                          <SelectItem value="51-200">51-200 employees</SelectItem>
                          <SelectItem value="201-500">201-500 employees</SelectItem>
                          <SelectItem value="501+">501+ employees</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="timezone">Timezone</Label>
                      <Select value={workspaceData.timezone} onValueChange={(value) => setWorkspaceData(prev => ({ ...prev, timezone: value }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TIMEZONES.map((tz) => (
                            <SelectItem key={tz} value={tz}>
                              {tz.replace('_', ' ')}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Admin Profile */}
              {currentStep === 2 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <User className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold">Set up your profile</h3>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="admin-name">Your Full Name</Label>
                    <Input
                      id="admin-name"
                      placeholder="Jane Doe"
                      value={workspaceData.adminName}
                      onChange={(e) => setWorkspaceData(prev => ({ ...prev, adminName: e.target.value }))}
                      required
                      minLength={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="admin-role">Your Role</Label>
                    <Input
                      id="admin-role"
                      placeholder="CEO, Founder, Engineering Manager, etc."
                      value={workspaceData.adminRole}
                      onChange={(e) => setWorkspaceData(prev => ({ ...prev, adminRole: e.target.value }))}
                      required
                      minLength={2}
                    />
                    <p className="text-xs text-muted-foreground">Your primary role in the organization</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="admin-department">Your Department</Label>
                    <Input
                      id="admin-department"
                      placeholder="Engineering, Operations, Sales, etc."
                      value={workspaceData.adminDepartment}
                      onChange={(e) => setWorkspaceData(prev => ({ ...prev, adminDepartment: e.target.value }))}
                      required
                      minLength={2}
                    />
                    <p className="text-xs text-muted-foreground">
                      This will be your initial department (you can refine structure later)
                    </p>
                  </div>
                </div>
              )}

              {/* Step 3: Confirmation */}
              {currentStep === 3 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold">Review & Complete</h3>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4 space-y-3">
                    <div>
                      <p className="text-sm text-muted-foreground">Workspace</p>
                      <p className="text-sm font-medium">{workspaceData.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Company Mission</p>
                      <p className="text-sm">{workspaceData.mission}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Industry</p>
                        <p className="text-sm">{workspaceData.industry}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Company Size</p>
                        <p className="text-sm">{workspaceData.teamSize} employees</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Your Profile</p>
                      <p className="text-sm">
                        {workspaceData.adminName} - {workspaceData.adminRole} ({workspaceData.adminDepartment})
                      </p>
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground">
                    Ready to start? Click &quot;Complete Setup&quot; to finish onboarding and access your workspace.
                  </p>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex justify-between pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={prevStep}
                  disabled={currentStep === 1 || isLoading}
                >
                  Back
                </Button>

                {currentStep < 3 ? (
                  <Button type="button" onClick={nextStep}>
                    Next
                  </Button>
                ) : (
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        Completing...
                      </>
                    ) : (
                      'Complete Setup'
                    )}
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

