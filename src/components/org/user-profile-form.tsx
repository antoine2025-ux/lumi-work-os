"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Globe, 
  Linkedin, 
  Github, 
  Target, 
  Star,
  Award,
  Plus,
  X
} from "lucide-react"

interface UserProfile {
  id: string
  name: string | null
  email: string | null
  image: string | null
  // Contextual AI fields (optional for backward compatibility)
  bio?: string | null
  skills?: string[]
  currentGoals?: string[]
  interests?: string[]
  timezone?: string | null
  location?: string | null
  phone?: string | null
  linkedinUrl?: string | null
  githubUrl?: string | null
  personalWebsite?: string | null
}

interface UserProfileFormProps {
  isOpen: boolean
  onClose: () => void
  onSave: (user: Partial<UserProfile>) => void
  user?: UserProfile | null
  workspaceId: string
}

export function UserProfileForm({ 
  isOpen, 
  onClose, 
  onSave, 
  user,
  workspaceId 
}: UserProfileFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    bio: '',
    skills: [] as string[],
    currentGoals: [] as string[],
    interests: [] as string[],
    timezone: '',
    location: '',
    phone: '',
    linkedinUrl: '',
    githubUrl: '',
    personalWebsite: ''
  })
  const [loading, setLoading] = useState(false)
  const [newSkill, setNewSkill] = useState('')
  const [newGoal, setNewGoal] = useState('')
  const [newInterest, setNewInterest] = useState('')

  // Initialize form data when user changes
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        bio: user.bio || '',
        skills: user.skills || [],
        currentGoals: user.currentGoals || [],
        interests: user.interests || [],
        timezone: user.timezone || '',
        location: user.location || '',
        phone: user.phone || '',
        linkedinUrl: user.linkedinUrl || '',
        githubUrl: user.githubUrl || '',
        personalWebsite: user.personalWebsite || ''
      })
    } else {
      setFormData({
        name: '',
        email: '',
        bio: '',
        skills: [],
        currentGoals: [],
        interests: [],
        timezone: '',
        location: '',
        phone: '',
        linkedinUrl: '',
        githubUrl: '',
        personalWebsite: ''
      })
    }
  }, [user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await onSave(formData)
      onClose()
    } catch (error) {
      console.error('Error saving user profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const addSkill = () => {
    if (newSkill.trim() && !formData.skills.includes(newSkill.trim())) {
      setFormData({ ...formData, skills: [...formData.skills, newSkill.trim()] })
      setNewSkill('')
    }
  }

  const removeSkill = (skillToRemove: string) => {
    setFormData({ ...formData, skills: formData.skills.filter(skill => skill !== skillToRemove) })
  }

  const addGoal = () => {
    if (newGoal.trim() && !formData.currentGoals.includes(newGoal.trim())) {
      setFormData({ ...formData, currentGoals: [...formData.currentGoals, newGoal.trim()] })
      setNewGoal('')
    }
  }

  const removeGoal = (goalToRemove: string) => {
    setFormData({ ...formData, currentGoals: formData.currentGoals.filter(goal => goal !== goalToRemove) })
  }

  const addInterest = () => {
    if (newInterest.trim() && !formData.interests.includes(newInterest.trim())) {
      setFormData({ ...formData, interests: [...formData.interests, newInterest.trim()] })
      setNewInterest('')
    }
  }

  const removeInterest = (interestToRemove: string) => {
    setFormData({ ...formData, interests: formData.interests.filter(interest => interest !== interestToRemove) })
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {user ? 'Edit User Profile' : 'Add New User'}
          </DialogTitle>
          <DialogDescription>
            {user ? 'Update the user profile with contextual information for AI assistance' : 'Create a new user profile with contextual information'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <User className="h-5 w-5 mr-2" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., John Doe"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="e.g., john@company.com"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="e.g., +1 (555) 123-4567"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="e.g., San Francisco, CA"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select
                    value={formData.timezone}
                    onValueChange={(value) => setFormData({ ...formData, timezone: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select timezone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UTC-8">Pacific Time (UTC-8)</SelectItem>
                      <SelectItem value="UTC-7">Mountain Time (UTC-7)</SelectItem>
                      <SelectItem value="UTC-6">Central Time (UTC-6)</SelectItem>
                      <SelectItem value="UTC-5">Eastern Time (UTC-5)</SelectItem>
                      <SelectItem value="UTC+0">UTC (UTC+0)</SelectItem>
                      <SelectItem value="UTC+1">Central European Time (UTC+1)</SelectItem>
                      <SelectItem value="UTC+8">China Standard Time (UTC+8)</SelectItem>
                      <SelectItem value="UTC+9">Japan Standard Time (UTC+9)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio / About</Label>
                <Textarea
                  id="bio"
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  placeholder="Tell us about yourself, your background, and what you're passionate about..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Skills */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <Award className="h-5 w-5 mr-2" />
                Skills & Expertise
              </CardTitle>
              <CardDescription>
                Add skills that help the AI understand your capabilities and expertise
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex space-x-2">
                <Input
                  placeholder="Add a skill..."
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                />
                <Button type="button" onClick={addSkill} disabled={!newSkill.trim()}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              
              {formData.skills.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.skills.map((skill, index) => (
                    <Badge key={index} variant="secondary" className="flex items-center space-x-1">
                      <span>{skill}</span>
                      <button
                        type="button"
                        onClick={() => removeSkill(skill)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Current Goals */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <Target className="h-5 w-5 mr-2" />
                Current Goals
              </CardTitle>
              <CardDescription>
                What are you working towards? This helps the AI provide relevant suggestions and insights
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex space-x-2">
                <Input
                  placeholder="Add a current goal..."
                  value={newGoal}
                  onChange={(e) => setNewGoal(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addGoal())}
                />
                <Button type="button" onClick={addGoal} disabled={!newGoal.trim()}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              
              {formData.currentGoals.length > 0 && (
                <ul className="space-y-2">
                  {formData.currentGoals.map((goal, index) => (
                    <li key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                      <span className="text-sm">{goal}</span>
                      <button
                        type="button"
                        onClick={() => removeGoal(goal)}
                        className="hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Professional Interests */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <Star className="h-5 w-5 mr-2" />
                Professional Interests
              </CardTitle>
              <CardDescription>
                Areas of interest that help the AI understand your focus areas and preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex space-x-2">
                <Input
                  placeholder="Add an interest..."
                  value={newInterest}
                  onChange={(e) => setNewInterest(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addInterest())}
                />
                <Button type="button" onClick={addInterest} disabled={!newInterest.trim()}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              
              {formData.interests.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.interests.map((interest, index) => (
                    <Badge key={index} variant="outline" className="flex items-center space-x-1">
                      <span>{interest}</span>
                      <button
                        type="button"
                        onClick={() => removeInterest(interest)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Social Links */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <Globe className="h-5 w-5 mr-2" />
                Social Links & Profiles
              </CardTitle>
              <CardDescription>
                Connect your professional profiles for better AI context
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="linkedinUrl">LinkedIn Profile</Label>
                  <Input
                    id="linkedinUrl"
                    value={formData.linkedinUrl}
                    onChange={(e) => setFormData({ ...formData, linkedinUrl: e.target.value })}
                    placeholder="https://linkedin.com/in/username"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="githubUrl">GitHub Profile</Label>
                  <Input
                    id="githubUrl"
                    value={formData.githubUrl}
                    onChange={(e) => setFormData({ ...formData, githubUrl: e.target.value })}
                    placeholder="https://github.com/username"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="personalWebsite">Personal Website</Label>
                  <Input
                    id="personalWebsite"
                    value={formData.personalWebsite}
                    onChange={(e) => setFormData({ ...formData, personalWebsite: e.target.value })}
                    placeholder="https://yourwebsite.com"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : (user ? 'Update Profile' : 'Create User')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

