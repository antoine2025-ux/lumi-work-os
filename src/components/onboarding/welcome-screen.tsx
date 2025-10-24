'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Building2, Users, Zap, ArrowRight } from 'lucide-react'

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
}

export function WelcomeScreen({ user, onCreateWorkspace, isLoading = false }: WelcomeScreenProps) {
  const [workspaceData, setWorkspaceData] = useState<WorkspaceData>({
    name: `${user.name}'s Workspace`,
    slug: user.email.split('@')[0].toLowerCase(),
    description: '',
    teamSize: '',
    industry: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onCreateWorkspace(workspaceData)
  }

  const handleSlugChange = (name: string) => {
    const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
    setWorkspaceData(prev => ({
      ...prev,
      name,
      slug
    }))
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
              <Building2 className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Welcome to Lumi, {user.name}! 🎉
          </h1>
          <p className="text-xl text-gray-600">
            Let's set up your workspace to get started
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="text-center">
            <CardContent className="pt-6">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Building2 className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-semibold mb-2">Organize Your Team</h3>
              <p className="text-sm text-gray-600">
                Create role cards, manage positions, and build your org chart
              </p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardContent className="pt-6">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="font-semibold mb-2">Collaborate Seamlessly</h3>
              <p className="text-sm text-gray-600">
                Manage projects, track progress, and keep everyone aligned
              </p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardContent className="pt-6">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="font-semibold mb-2">AI-Powered Insights</h3>
              <p className="text-sm text-gray-600">
                Get intelligent recommendations and contextual assistance
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Workspace Setup Form */}
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="text-2xl text-center">Set Up Your Workspace</CardTitle>
            <CardDescription className="text-center">
              This will be your team's central hub. You can always change these settings later.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
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
                  <span className="text-sm text-gray-500">lumi.app/</span>
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
                <Label htmlFor="workspace-description">Description (Optional)</Label>
                <Textarea
                  id="workspace-description"
                  value={workspaceData.description}
                  onChange={(e) => setWorkspaceData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Tell us about your team or company..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="team-size">Team Size</Label>
                  <Select value={workspaceData.teamSize} onValueChange={(value) => setWorkspaceData(prev => ({ ...prev, teamSize: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select size" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1-10">1-10 people</SelectItem>
                      <SelectItem value="11-50">11-50 people</SelectItem>
                      <SelectItem value="51-200">51-200 people</SelectItem>
                      <SelectItem value="200+">200+ people</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="industry">Industry</Label>
                  <Select value={workspaceData.industry} onValueChange={(value) => setWorkspaceData(prev => ({ ...prev, industry: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select industry" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="technology">Technology</SelectItem>
                      <SelectItem value="finance">Finance</SelectItem>
                      <SelectItem value="healthcare">Healthcare</SelectItem>
                      <SelectItem value="education">Education</SelectItem>
                      <SelectItem value="retail">Retail</SelectItem>
                      <SelectItem value="manufacturing">Manufacturing</SelectItem>
                      <SelectItem value="consulting">Consulting</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-white text-xs font-bold">!</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-blue-900 mb-1">You'll be the Admin</h4>
                    <p className="text-sm text-blue-800">
                      As the workspace creator, you'll have full administrative access to manage users, 
                      roles, and settings. You can invite team members later.
                    </p>
                  </div>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                size="lg"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Creating Workspace...
                  </>
                ) : (
                  <>
                    Create Workspace
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

