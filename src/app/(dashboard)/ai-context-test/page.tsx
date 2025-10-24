"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { UserProfileCard } from "@/components/org/user-profile-card"
import { RoleCard } from "@/components/org/role-card"
import { 
  Bot, 
  Users, 
  Building, 
  Target, 
  Sparkles,
  MessageSquare,
  Lightbulb,
  TrendingUp
} from "lucide-react"

interface UserProfile {
  id: string
  name: string | null
  email: string | null
  image: string | null
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

interface RoleData {
  id: string
  title: string
  department: string | null
  level: number
  isActive: boolean
  roleDescription?: string | null
  responsibilities?: string[]
  requiredSkills?: string[]
  preferredSkills?: string[]
  keyMetrics?: string[]
  teamSize?: number | null
  budget?: string | null
  reportingStructure?: string | null
  user?: UserProfile | null
}

export default function AIContextualTestPage() {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [roles, setRoles] = useState<RoleData[]>([])
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null)
  const [selectedRole, setSelectedRole] = useState<RoleData | null>(null)
  const [aiInsights, setAiInsights] = useState<string>("")
  const [loading, setLoading] = useState(false)

  // Mock data for demonstration
  useEffect(() => {
    const mockUsers: UserProfile[] = [
      {
        id: "1",
        name: "Sarah Chen",
        email: "sarah.chen@company.com",
        image: null,
        bio: "Senior Software Engineer with 8 years of experience in full-stack development. Passionate about building scalable applications and mentoring junior developers.",
        skills: ["React", "Node.js", "TypeScript", "AWS", "Docker", "PostgreSQL"],
        currentGoals: ["Lead the migration to microservices architecture", "Improve team's code review process", "Complete AWS Solutions Architect certification"],
        interests: ["Cloud Architecture", "DevOps", "Machine Learning", "Open Source"],
        timezone: "UTC-8",
        location: "San Francisco, CA",
        phone: "+1 (555) 123-4567",
        linkedinUrl: "https://linkedin.com/in/sarahchen",
        githubUrl: "https://github.com/sarahchen",
        personalWebsite: "https://sarahchen.dev"
      },
      {
        id: "2",
        name: "Marcus Johnson",
        email: "marcus.johnson@company.com",
        image: null,
        bio: "Product Manager with a background in engineering. Focused on user experience and data-driven decision making.",
        skills: ["Product Strategy", "User Research", "Data Analysis", "Agile", "Figma", "SQL"],
        currentGoals: ["Launch new mobile app feature", "Increase user engagement by 25%", "Build cross-functional team collaboration"],
        interests: ["User Experience", "Data Science", "Mobile Apps", "Team Leadership"],
        timezone: "UTC-5",
        location: "New York, NY",
        phone: "+1 (555) 987-6543",
        linkedinUrl: "https://linkedin.com/in/marcusjohnson"
      }
    ]

    const mockRoles: RoleData[] = [
      {
        id: "1",
        title: "Senior Software Engineer",
        department: "Engineering",
        level: 4,
        isActive: true,
        roleDescription: "Lead development of core platform features and mentor junior engineers. Responsible for architectural decisions and code quality standards.",
        responsibilities: [
          "Design and implement scalable backend services",
          "Mentor junior developers and conduct code reviews",
          "Collaborate with product team on feature specifications",
          "Maintain and improve CI/CD pipelines",
          "Participate in technical architecture decisions"
        ],
        requiredSkills: ["JavaScript", "Node.js", "React", "PostgreSQL", "AWS"],
        preferredSkills: ["TypeScript", "Docker", "Kubernetes", "GraphQL"],
        keyMetrics: [
          "Code review coverage > 90%",
          "Feature delivery on time",
          "Bug rate < 2%",
          "Team velocity improvement"
        ],
        teamSize: 3,
        budget: "$200K annual",
        reportingStructure: "Reports to Engineering Manager",
        user: mockUsers[0]
      },
      {
        id: "2",
        title: "Product Manager",
        department: "Product",
        level: 3,
        isActive: true,
        roleDescription: "Drive product strategy and roadmap execution. Work closely with engineering and design teams to deliver user-focused solutions.",
        responsibilities: [
          "Define product requirements and user stories",
          "Coordinate with engineering and design teams",
          "Analyze user data and market trends",
          "Manage product backlog and sprint planning",
          "Present product updates to stakeholders"
        ],
        requiredSkills: ["Product Strategy", "User Research", "Data Analysis", "Agile"],
        preferredSkills: ["Figma", "SQL", "A/B Testing", "Customer Success"],
        keyMetrics: [
          "User engagement increase",
          "Feature adoption rate",
          "Customer satisfaction score",
          "Time to market"
        ],
        teamSize: 5,
        budget: "$150K annual",
        reportingStructure: "Reports to VP of Product",
        user: mockUsers[1]
      }
    ]

    setUsers(mockUsers)
    setRoles(mockRoles)
  }, [])

  const generateAIInsights = async (user: UserProfile | null, role: RoleData | null) => {
    setLoading(true)
    
    // Simulate AI processing time
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    let insights = ""
    
    if (user && role) {
      insights = `## AI Analysis for ${user.name} in ${role.title} Role

### Profile Match Analysis
Based on the contextual data provided, here's how ${user.name} aligns with the ${role.title} position:

**Skills Alignment:** ${user.skills?.filter(skill => role.requiredSkills?.includes(skill)).length || 0}/${role.requiredSkills?.length || 0} required skills match. ${user.skills?.filter(skill => role.preferredSkills?.includes(skill)).length || 0} preferred skills also align.

**Goal Alignment:** ${user.currentGoals?.some(goal => goal.toLowerCase().includes('team') || goal.toLowerCase().includes('leadership')) ? 'Strong' : 'Moderate'} alignment with role responsibilities. ${user.name}'s current goals show ${user.currentGoals?.some(goal => goal.toLowerCase().includes('architecture') || goal.toLowerCase().includes('system')) ? 'technical leadership' : 'product focus'} orientation.

**Growth Opportunities:** 
- ${user.skills?.includes('TypeScript') ? 'Already proficient in TypeScript' : 'Consider TypeScript training for better role fit'}
- ${user.interests?.includes('Cloud Architecture') ? 'Cloud architecture interest aligns well with role' : 'Cloud architecture skills could enhance role performance'}
- ${user.currentGoals?.some(goal => goal.toLowerCase().includes('certification')) ? 'Certification goals show commitment to professional development' : 'Consider setting professional development goals'}

### Recommendations
1. **Immediate Actions:** ${user.skills?.includes('Docker') ? 'Docker expertise can be leveraged for CI/CD improvements' : 'Docker training recommended for infrastructure responsibilities'}
2. **Team Dynamics:** ${user.location === role.user?.location ? 'Same timezone facilitates collaboration' : 'Timezone difference may require coordination'}
3. **Career Development:** ${user.currentGoals?.some(goal => goal.toLowerCase().includes('mentor')) ? 'Mentoring goals align with senior role expectations' : 'Consider adding mentoring responsibilities to goals'}

### AI Context Utilization
This analysis used ${Object.keys(user).filter(key => user[key as keyof UserProfile] !== null && user[key as keyof UserProfile] !== undefined).length} contextual data points from the user profile and ${Object.keys(role).filter(key => role[key as keyof RoleData] !== null && role[key as keyof RoleData] !== undefined).length} role-specific data points to provide personalized insights.`
    } else if (user) {
      insights = `## AI Analysis for ${user.name}

### Professional Profile Summary
${user.name} is a ${user.skills?.includes('React') ? 'frontend-focused' : user.skills?.includes('Node.js') ? 'full-stack' : 'specialized'} developer with expertise in ${user.skills?.slice(0, 3).join(', ')}.

### Current Focus Areas
- **Primary Goals:** ${user.currentGoals?.slice(0, 2).join('; ')}
- **Professional Interests:** ${user.interests?.slice(0, 3).join(', ')}
- **Location:** ${user.location} (${user.timezone})

### AI-Generated Insights
Based on the contextual data provided:

1. **Skill Development:** ${user.skills?.length || 0} skills identified. Consider focusing on ${user.interests?.includes('Machine Learning') ? 'ML implementation' : 'cloud technologies'} for career growth.

2. **Goal Achievement:** ${user.currentGoals?.some(goal => goal.toLowerCase().includes('certification')) ? 'Certification goals show commitment to learning' : 'Consider adding certification goals for structured learning'}

3. **Network Opportunities:** ${user.linkedinUrl ? 'LinkedIn profile available for professional networking' : 'Consider adding LinkedIn profile for networking'}

4. **Team Collaboration:** ${user.timezone ? `Timezone: ${user.timezone} - consider this for team coordination` : 'Timezone not specified - important for remote collaboration'}

### Recommendations for AI Context Enhancement
- Add more specific project experiences
- Include recent achievements or milestones
- Specify preferred communication methods
- Add learning preferences and styles`
    } else if (role) {
      insights = `## AI Analysis for ${role.title} Role

### Role Overview
The ${role.title} position in ${role.department} requires a ${role.level === 1 ? 'executive-level' : role.level === 2 ? 'senior leadership' : role.level === 3 ? 'director-level' : role.level === 4 ? 'manager-level' : 'individual contributor'} professional.

### Key Requirements Analysis
- **Required Skills:** ${role.requiredSkills?.join(', ')}
- **Preferred Skills:** ${role.preferredSkills?.join(', ')}
- **Team Size:** ${role.teamSize ? `${role.teamSize} direct reports` : 'Individual contributor role'}
- **Budget Responsibility:** ${role.budget || 'Not specified'}

### AI-Generated Role Insights

1. **Skill Requirements:** ${role.requiredSkills?.length || 0} core skills needed. Focus on ${role.requiredSkills?.includes('JavaScript') ? 'JavaScript ecosystem' : 'technical fundamentals'}.

2. **Success Metrics:** ${role.keyMetrics?.length || 0} key performance indicators defined:
   ${role.keyMetrics?.map(metric => `- ${metric}`).join('\n   ')}

3. **Team Dynamics:** ${role.teamSize ? `Manages team of ${role.teamSize}` : 'Individual contributor'} with ${role.reportingStructure || 'reporting structure not defined'}.

4. **Growth Opportunities:** Role offers ${role.responsibilities?.some(resp => resp.toLowerCase().includes('mentor')) ? 'mentoring and leadership' : 'technical'} development opportunities.

### AI Context Utilization
This analysis used ${Object.keys(role).filter(key => role[key as keyof RoleData] !== null && role[key as keyof RoleData] !== undefined).length} contextual data points to provide comprehensive role insights. The AI can use this information to:
- Match candidates with appropriate skill sets
- Suggest training and development opportunities
- Identify potential collaboration opportunities
- Provide personalized career guidance`
    }
    
    setAiInsights(insights)
    setLoading(false)
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center space-x-2">
            <Bot className="h-8 w-8 text-primary" />
            <span>AI Contextual Analysis</span>
          </h1>
          <p className="text-muted-foreground">
            Test how AI reads and uses contextual information from user profiles and role cards
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Sparkles className="h-5 w-5 text-yellow-500" />
          <span className="text-sm font-medium">AI Enhanced</span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* User Profiles */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="h-5 w-5 mr-2" />
              User Profiles
            </CardTitle>
            <CardDescription>
              Select a user to analyze their contextual data
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {users.map((user) => (
              <div key={user.id} className="cursor-pointer" onClick={() => setSelectedUser(user)}>
                <UserProfileCard
                  user={user}
                  onEdit={() => {}}
                  showActions={false}
                  compact={true}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Role Cards */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Building className="h-5 w-5 mr-2" />
              Role Cards
            </CardTitle>
            <CardDescription>
              Select a role to analyze its contextual requirements
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {roles.map((role) => (
              <div key={role.id} className="cursor-pointer" onClick={() => setSelectedRole(role)}>
                <RoleCard
                  role={role}
                  onEdit={() => {}}
                  showActions={false}
                  compact={true}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* AI Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <MessageSquare className="h-5 w-5 mr-2" />
            AI Contextual Analysis
          </CardTitle>
          <CardDescription>
            Generate AI insights based on selected user profile and/or role
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex space-x-2">
            <Button 
              onClick={() => generateAIInsights(selectedUser, selectedRole)}
              disabled={loading || (!selectedUser && !selectedRole)}
              className="flex items-center"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Analyzing...
                </>
              ) : (
                <>
                  <Lightbulb className="h-4 w-4 mr-2" />
                  Generate AI Insights
                </>
              )}
            </Button>
            <Button 
              variant="outline" 
              onClick={() => {
                setSelectedUser(null)
                setSelectedRole(null)
                setAiInsights("")
              }}
            >
              Clear Selection
            </Button>
          </div>

          {selectedUser && (
            <div className="flex items-center space-x-2 text-sm">
              <Users className="h-4 w-4" />
              <span>Selected: <strong>{selectedUser.name}</strong></span>
            </div>
          )}

          {selectedRole && (
            <div className="flex items-center space-x-2 text-sm">
              <Building className="h-4 w-4" />
              <span>Selected: <strong>{selectedRole.title}</strong></span>
            </div>
          )}

          {aiInsights && (
            <div className="mt-4">
              <div className="bg-muted p-4 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <span className="font-medium">AI Analysis Results</span>
                </div>
                <div className="prose prose-sm max-w-none">
                  <pre className="whitespace-pre-wrap text-sm">{aiInsights}</pre>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Contextual Data Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Target className="h-5 w-5 mr-2" />
            Contextual Data Summary
          </CardTitle>
          <CardDescription>
            Overview of contextual information available for AI analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="font-medium mb-2">User Profile Context</h4>
              <div className="space-y-1 text-sm text-muted-foreground">
                <div>• Personal bio and background</div>
                <div>• Skills and expertise areas</div>
                <div>• Current professional goals</div>
                <div>• Professional interests</div>
                <div>• Contact information and location</div>
                <div>• Social profiles and links</div>
              </div>
            </div>
            <div>
              <h4 className="font-medium mb-2">Role Card Context</h4>
              <div className="space-y-1 text-sm text-muted-foreground">
                <div>• Detailed role description</div>
                <div>• Key responsibilities and duties</div>
                <div>• Required and preferred skills</div>
                <div>• Performance metrics and KPIs</div>
                <div>• Team size and budget responsibility</div>
                <div>• Reporting structure</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

