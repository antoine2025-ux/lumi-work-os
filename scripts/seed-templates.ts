import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const defaultTemplates = [
  {
    name: "Software Development Project",
    description: "Complete software development lifecycle with planning, development, testing, and deployment phases",
    category: "Software Development",
    isDefault: true,
    isPublic: true,
    templateData: {
      project: {
        status: "ACTIVE",
        priority: "HIGH",
        department: "Engineering",
        color: "#3B82F6"
      },
      tasks: [
        {
          title: "Project Planning & Requirements",
          description: "Define project scope, gather requirements, and create technical specifications",
          status: "TODO",
          priority: "HIGH",
          tags: ["planning", "requirements"],
          dependsOn: [],
          blocks: []
        },
        {
          title: "Database Design",
          description: "Design database schema, relationships, and data models",
          status: "TODO",
          priority: "HIGH",
          tags: ["database", "design"],
          dependsOn: ["planning"], // Depends on planning task
          blocks: []
        },
        {
          title: "API Development",
          description: "Develop REST APIs and backend services",
          status: "TODO",
          priority: "HIGH",
          tags: ["api", "backend"],
          dependsOn: ["database"], // Depends on database design
          blocks: []
        },
        {
          title: "Frontend Development",
          description: "Build user interface and frontend components",
          status: "TODO",
          priority: "MEDIUM",
          tags: ["frontend", "ui"],
          dependsOn: ["api"], // Depends on API development
          blocks: []
        },
        {
          title: "Testing & QA",
          description: "Write tests, perform quality assurance, and bug fixes",
          status: "TODO",
          priority: "MEDIUM",
          tags: ["testing", "qa"],
          dependsOn: ["frontend"], // Depends on frontend development
          blocks: []
        },
        {
          title: "Deployment",
          description: "Deploy application to production environment",
          status: "TODO",
          priority: "HIGH",
          tags: ["deployment", "production"],
          dependsOn: ["testing"], // Depends on testing completion
          blocks: []
        }
      ]
    }
  },
  {
    name: "Marketing Campaign",
    description: "End-to-end marketing campaign from strategy to execution and analysis",
    category: "Marketing",
    isDefault: false,
    isPublic: true,
    templateData: {
      project: {
        status: "ACTIVE",
        priority: "MEDIUM",
        department: "Marketing",
        color: "#10B981"
      },
      tasks: [
        {
          title: "Campaign Strategy",
          description: "Define campaign objectives, target audience, and key messages",
          status: "TODO",
          priority: "HIGH",
          tags: ["strategy", "planning"]
        },
        {
          title: "Content Creation",
          description: "Create marketing materials, copy, and visual assets",
          status: "TODO",
          priority: "HIGH",
          tags: ["content", "creative"]
        },
        {
          title: "Channel Setup",
          description: "Set up marketing channels and platforms",
          status: "TODO",
          priority: "MEDIUM",
          tags: ["channels", "setup"]
        },
        {
          title: "Campaign Launch",
          description: "Execute campaign across all channels",
          status: "TODO",
          priority: "HIGH",
          tags: ["launch", "execution"]
        },
        {
          title: "Performance Analysis",
          description: "Monitor metrics, analyze results, and optimize",
          status: "TODO",
          priority: "MEDIUM",
          tags: ["analytics", "optimization"]
        }
      ]
    }
  },
  {
    name: "Product Launch",
    description: "Complete product launch process from planning to post-launch support",
    category: "Product",
    isDefault: false,
    isPublic: true,
    templateData: {
      project: {
        status: "ACTIVE",
        priority: "HIGH",
        department: "Product",
        color: "#F59E0B"
      },
      tasks: [
        {
          title: "Product Planning",
          description: "Define product roadmap, features, and launch timeline",
          status: "TODO",
          priority: "HIGH",
          tags: ["planning", "roadmap"]
        },
        {
          title: "Development Sprint",
          description: "Build core product features and functionality",
          status: "TODO",
          priority: "HIGH",
          tags: ["development", "features"]
        },
        {
          title: "Beta Testing",
          description: "Conduct beta testing with select users",
          status: "TODO",
          priority: "MEDIUM",
          tags: ["testing", "beta"]
        },
        {
          title: "Marketing Preparation",
          description: "Prepare marketing materials and launch strategy",
          status: "TODO",
          priority: "MEDIUM",
          tags: ["marketing", "preparation"]
        },
        {
          title: "Launch Execution",
          description: "Execute product launch and go-to-market strategy",
          status: "TODO",
          priority: "HIGH",
          tags: ["launch", "execution"]
        },
        {
          title: "Post-Launch Support",
          description: "Monitor launch metrics and provide user support",
          status: "TODO",
          priority: "MEDIUM",
          tags: ["support", "monitoring"]
        }
      ]
    }
  },
  {
    name: "Team Onboarding",
    description: "Structured onboarding process for new team members",
    category: "HR",
    isDefault: false,
    isPublic: true,
    templateData: {
      project: {
        status: "ACTIVE",
        priority: "MEDIUM",
        department: "HR",
        color: "#8B5CF6"
      },
      tasks: [
        {
          title: "Welcome & Introduction",
          description: "Welcome new team member and introduce to the team",
          status: "TODO",
          priority: "HIGH",
          tags: ["welcome", "introduction"]
        },
        {
          title: "System Access Setup",
          description: "Set up accounts, access permissions, and tools",
          status: "TODO",
          priority: "HIGH",
          tags: ["access", "setup"]
        },
        {
          title: "Training & Documentation",
          description: "Provide training materials and company documentation",
          status: "TODO",
          priority: "MEDIUM",
          tags: ["training", "documentation"]
        },
        {
          title: "First Week Check-in",
          description: "Check in with new team member after first week",
          status: "TODO",
          priority: "MEDIUM",
          tags: ["check-in", "feedback"]
        },
        {
          title: "30-Day Review",
          description: "Conduct 30-day performance and satisfaction review",
          status: "TODO",
          priority: "LOW",
          tags: ["review", "performance"]
        }
      ]
    }
  },
  {
    name: "Event Planning",
    description: "Complete event planning process from concept to execution",
    category: "Events",
    isDefault: false,
    isPublic: true,
    templateData: {
      project: {
        status: "ACTIVE",
        priority: "MEDIUM",
        department: "Events",
        color: "#EF4444"
      },
      tasks: [
        {
          title: "Event Concept & Planning",
          description: "Define event concept, objectives, and basic planning",
          status: "TODO",
          priority: "HIGH",
          tags: ["concept", "planning"]
        },
        {
          title: "Venue & Logistics",
          description: "Secure venue, arrange logistics, and coordinate vendors",
          status: "TODO",
          priority: "HIGH",
          tags: ["venue", "logistics"]
        },
        {
          title: "Marketing & Promotion",
          description: "Create marketing materials and promote the event",
          status: "TODO",
          priority: "MEDIUM",
          tags: ["marketing", "promotion"]
        },
        {
          title: "Registration & Ticketing",
          description: "Set up registration system and ticket sales",
          status: "TODO",
          priority: "MEDIUM",
          tags: ["registration", "tickets"]
        },
        {
          title: "Event Execution",
          description: "Execute the event and manage day-of operations",
          status: "TODO",
          priority: "HIGH",
          tags: ["execution", "operations"]
        },
        {
          title: "Post-Event Analysis",
          description: "Analyze event success and gather feedback",
          status: "TODO",
          priority: "LOW",
          tags: ["analysis", "feedback"]
        }
      ]
    }
  }
]

async function seedTemplates() {
  try {
    console.log('🌱 Seeding project templates...')
    
    // Ensure workspace exists
    const workspaceId = 'workspace-1'
    const ownerId = 'dev-user-1'
    
    let workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId }
    })
    
    if (!workspace) {
      workspace = await prisma.workspace.create({
        data: {
          id: workspaceId,
          name: 'Development Workspace',
          slug: 'dev-workspace',
          description: 'Development workspace',
          ownerId: ownerId
        }
      })
    }

    // Ensure user exists
    let user = await prisma.user.findUnique({
      where: { id: ownerId }
    })
    
    if (!user) {
      user = await prisma.user.create({
        data: {
          id: ownerId,
          email: 'dev@lumi.com',
          name: 'Development User'
        }
      })
    }

    // Clear existing templates
    await prisma.projectTemplate.deleteMany({
      where: { workspaceId }
    })

    // Create templates
    for (const templateData of defaultTemplates) {
      const template = await prisma.projectTemplate.create({
        data: {
          workspaceId,
          name: templateData.name,
          description: templateData.description,
          category: templateData.category,
          isDefault: templateData.isDefault,
          isPublic: templateData.isPublic,
          templateData: templateData.templateData,
          createdById: ownerId
        }
      })
      console.log(`✅ Created template: ${template.name}`)
    }

    console.log('🎉 Successfully seeded project templates!')
  } catch (error) {
    console.error('❌ Error seeding templates:', error)
  } finally {
    await prisma.$disconnect()
  }
}

seedTemplates()
