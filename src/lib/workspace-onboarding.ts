import { prisma } from '@/lib/db'
import { WorkspaceRole } from '@prisma/client'

export interface WorkspaceTemplate {
  id: string
  name: string
  description: string
  features: string[]
  defaultPages: Array<{
    title: string
    content: string
    category: string
  }>
  defaultProjects: Array<{
    name: string
    description: string
    template?: string
  }>
  settings: {
    allowGuestAccess: boolean
    defaultPermissionLevel: 'PUBLIC' | 'PRIVATE'
    enableAI: boolean
    enableCalendar: boolean
  }
}

export const WORKSPACE_TEMPLATES: Record<string, WorkspaceTemplate> = {
  'personal': {
    id: 'personal',
    name: 'Personal Workspace',
    description: 'Your personal knowledge management and productivity space',
    features: ['Personal Notes', 'Task Management', 'AI Assistant', 'Calendar Integration'],
    defaultPages: [
      {
        title: 'Welcome to Your Personal Workspace',
        content: `# Welcome to Your Personal Workspace

This is your personal space for organizing knowledge, managing tasks, and staying productive.

## Getting Started

- **📝 Create Pages**: Start documenting your thoughts and ideas
- **✅ Manage Tasks**: Track your personal projects and goals
- **🤖 LoopBrain**: Get help with research, writing, and planning
- **📅 Calendar**: Sync your schedule and deadlines

## Quick Actions

- Create your first page
- Set up your task management system
- Connect your calendar
- Explore AI features`,
        category: 'getting-started'
      },
      {
        title: 'Personal Goals & Projects',
        content: `# Personal Goals & Projects

Track your personal development and projects here.

## Current Goals
- [ ] Goal 1
- [ ] Goal 2
- [ ] Goal 3

## Active Projects
- Project 1: Description
- Project 2: Description

## Completed
- ✅ Completed project 1
- ✅ Completed project 2`,
        category: 'goals'
      }
    ],
    defaultProjects: [
      {
        name: 'Personal Development',
        description: 'Track personal growth and learning goals'
      }
    ],
    settings: {
      allowGuestAccess: false,
      defaultPermissionLevel: 'PRIVATE',
      enableAI: true,
      enableCalendar: true
    }
  },
  'team': {
    id: 'team',
    name: 'Team Workspace',
    description: 'Collaborative workspace for your team\'s knowledge and projects',
    features: ['Team Collaboration', 'Shared Knowledge Base', 'Project Management', 'Team Calendar'],
    defaultPages: [
      {
        title: 'Team Welcome & Guidelines',
        content: `# Welcome to Our Team Workspace

This is our shared space for collaboration, knowledge sharing, and project management.

## Team Guidelines

### Communication
- Use clear, concise language
- Tag relevant team members when needed
- Keep discussions focused and productive

### Documentation
- Document important decisions and processes
- Keep information up-to-date
- Use consistent formatting

### Collaboration
- Share knowledge and insights
- Provide constructive feedback
- Support team members

## Quick Links
- [Team Directory](#)
- [Project Status](#)
- [Meeting Notes](#)
- [Resources](#)`,
        category: 'team-info'
      },
      {
        title: 'Project Status Dashboard',
        content: `# Project Status Dashboard

Track all active projects and their current status.

## Active Projects

### Project Alpha
- **Status**: In Progress
- **Team**: @team-member-1, @team-member-2
- **Deadline**: [Date]
- **Progress**: 65%

### Project Beta
- **Status**: Planning
- **Team**: @team-member-3, @team-member-4
- **Deadline**: [Date]
- **Progress**: 25%

## Upcoming Deadlines
- [Date]: Project Alpha milestone
- [Date]: Project Beta kickoff

## Blockers & Issues
- Issue 1: Description and resolution
- Issue 2: Description and resolution`,
        category: 'project-management'
      }
    ],
    defaultProjects: [
      {
        name: 'Team Collaboration',
        description: 'Central hub for team projects and initiatives'
      },
      {
        name: 'Knowledge Base',
        description: 'Shared documentation and resources'
      }
    ],
    settings: {
      allowGuestAccess: true,
      defaultPermissionLevel: 'PUBLIC',
      enableAI: true,
      enableCalendar: true
    }
  },
  'startup': {
    id: 'startup',
    name: 'Startup Workspace',
    description: 'Comprehensive workspace for startup teams with growth-focused features',
    features: ['Product Development', 'Customer Research', 'Growth Tracking', 'Team Scaling'],
    defaultPages: [
      {
        title: 'Startup Roadmap & Vision',
        content: `# Startup Roadmap & Vision

Define your startup's vision, mission, and strategic roadmap.

## Vision Statement
[Your startup's vision statement]

## Mission Statement
[Your startup's mission statement]

## Key Metrics
- **MRR**: $0 → $10K target
- **Users**: 0 → 1K target
- **Churn Rate**: <5%
- **CAC**: <$50

## Strategic Priorities
1. Product-Market Fit
2. User Acquisition
3. Revenue Growth
4. Team Building

## Quarterly Goals
### Q1
- [ ] Goal 1
- [ ] Goal 2

### Q2
- [ ] Goal 1
- [ ] Goal 2`,
        category: 'strategy'
      },
      {
        title: 'Customer Research & Insights',
        content: `# Customer Research & Insights

Track customer feedback, market research, and product insights.

## Customer Personas

### Primary Persona
- **Name**: [Persona Name]
- **Demographics**: [Age, Location, etc.]
- **Pain Points**: [Key problems]
- **Goals**: [What they want to achieve]

### Secondary Persona
- **Name**: [Persona Name]
- **Demographics**: [Age, Location, etc.]
- **Pain Points**: [Key problems]
- **Goals**: [What they want to achieve]

## Market Research
- Competitor analysis
- Market size and trends
- Customer interviews
- Survey results

## Product Feedback
- Feature requests
- Bug reports
- User testimonials
- Churn reasons`,
        category: 'research'
      }
    ],
    defaultProjects: [
      {
        name: 'Product Development',
        description: 'Track product features, roadmap, and development'
      },
      {
        name: 'Customer Research',
        description: 'Customer insights and market research'
      },
      {
        name: 'Growth & Marketing',
        description: 'Marketing campaigns and growth initiatives'
      }
    ],
    settings: {
      allowGuestAccess: false,
      defaultPermissionLevel: 'PRIVATE',
      enableAI: true,
      enableCalendar: true
    }
  }
}

export interface OnboardingOptions {
  templateId?: string
  customName?: string
  customDescription?: string
  inviteMembers?: Array<{
    email: string
    role: WorkspaceRole
  }>
  enableFeatures?: {
    ai: boolean
    calendar: boolean
    guestAccess: boolean
  }
}

/**
 * Create a new workspace with comprehensive onboarding setup
 */
export async function createWorkspaceWithOnboarding(
  userId: string,
  options: OnboardingOptions = {}
): Promise<{
  workspace: any
  wikiWorkspaces: any[]
  defaultPages: any[]
  defaultProjects: any[]
}> {
  const {
    templateId = 'personal',
    customName,
    customDescription,
    inviteMembers = [],
    enableFeatures = {}
  } = options

  const template = WORKSPACE_TEMPLATES[templateId] || WORKSPACE_TEMPLATES['personal']
  
  // Create workspace
  const workspace = await prisma.workspace.create({
    data: {
      name: customName || template.name,
      slug: generateWorkspaceSlug(customName || template.name, userId),
      description: customDescription || template.description,
      ownerId: userId,
      members: {
        create: {
          userId,
          role: 'OWNER'
        }
      }
    }
  })

  // Create wiki workspaces - ONLY Personal Space is a default workspace
  const wikiWorkspaces = await Promise.all([
    prisma.wiki_workspaces.create({
      data: {
        id: `personal-space-${workspace.id}`,
        workspace_id: workspace.id,
        name: 'Personal Space',
        type: 'personal',
        color: '#10b981',
        icon: 'file-text',
        description: 'Your personal knowledge space',
        is_private: true,
        created_by_id: userId
      }
    })
    // Team Workspace is no longer auto-created - users can create custom workspaces as needed
  ])

  // Create default pages
  const defaultPages = await Promise.all(
    template.defaultPages.map(page => 
      prisma.wikiPage.create({
        data: {
          title: page.title,
          slug: generatePageSlug(page.title),
          content: page.content,
          excerpt: generateExcerpt(page.content),
          category: page.category,
          workspaceId: workspace.id,
          createdById: userId,
          isPublished: true,
          permissionLevel: template.settings.defaultPermissionLevel
        }
      })
    )
  )

  // Create default projects
  const defaultProjects = await Promise.all(
    template.defaultProjects.map(project =>
      prisma.project.create({
        data: {
          name: project.name,
          description: project.description,
          workspaceId: workspace.id,
          createdById: userId,
          ownerId: userId,
          members: {
            create: {
              userId,
              role: 'OWNER'
            }
          }
        }
      })
    )
  )

  // Invite members if provided
  if (inviteMembers.length > 0) {
    await Promise.all(
      inviteMembers.map(async (member) => {
        // Check if user exists
        const existingUser = await prisma.user.findUnique({
          where: { email: member.email }
        })

        if (existingUser) {
          // Add existing user to workspace
          await prisma.workspaceMember.create({
            data: {
              workspaceId: workspace.id,
              userId: existingUser.id,
              role: member.role
            }
          })
        } else {
          // Create user and add to workspace
          const newUser = await prisma.user.create({
            data: {
              email: member.email,
              name: member.email.split('@')[0], // Use email prefix as name
              emailVerified: new Date()
            }
          })

          await prisma.workspaceMember.create({
            data: {
              workspaceId: workspace.id,
              userId: newUser.id,
              role: member.role
            }
          })
        }
      })
    )
  }

  return {
    workspace,
    wikiWorkspaces,
    defaultPages,
    defaultProjects
  }
}

/**
 * Enhanced workspace creation for new users
 */
export async function createDefaultWorkspaceForUser(userId: string): Promise<string> {
  try {
    const result = await createWorkspaceWithOnboarding(userId, {
      templateId: 'personal'
    })
    
    console.log(`✅ Created comprehensive workspace for user ${userId}:`, {
      workspaceId: result.workspace.id,
      pages: result.defaultPages.length,
      projects: result.defaultProjects.length,
      wikiWorkspaces: result.wikiWorkspaces.length
    })
    
    return result.workspace.id
  } catch (error) {
    console.error('Error creating default workspace:', error)
    
    // Fallback to simple workspace creation
    const workspace = await prisma.workspace.create({
      data: {
        name: 'My Workspace',
        slug: `workspace-${userId.slice(-8)}`,
        description: 'Default workspace',
        ownerId: userId,
        members: {
          create: {
            userId,
            role: 'OWNER'
          }
        }
      }
    })
    
    return workspace.id
  }
}

/**
 * Get workspace templates for onboarding UI
 */
export function getWorkspaceTemplates(): WorkspaceTemplate[] {
  return Object.values(WORKSPACE_TEMPLATES)
}

/**
 * Get specific workspace template
 */
export function getWorkspaceTemplate(templateId: string): WorkspaceTemplate | null {
  return WORKSPACE_TEMPLATES[templateId] || null
}

// Helper functions
function generateWorkspaceSlug(name: string, userId: string): string {
  const baseSlug = name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 30)
  
  return `${baseSlug}-${userId.slice(-8)}`
}

function generatePageSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 50)
}

function generateExcerpt(content: string): string {
  // Extract first paragraph or first 150 characters
  const firstParagraph = content.split('\n\n')[0]
  const excerpt = firstParagraph.replace(/^#+\s*/, '').substring(0, 150)
  return excerpt + (excerpt.length === 150 ? '...' : '')
}

