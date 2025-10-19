import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const templates = [
  {
    name: 'Software Development - Basic',
    description: 'Standard software development workflow with planning, development, testing, and deployment phases',
    category: 'SOFTWARE_DEVELOPMENT',
    isPublic: true,
    metadata: {
      estimatedDuration: 40, // hours
      teamSize: 3,
      complexity: 'MEDIUM'
    },
    tasks: [
      {
        title: 'Project Planning & Requirements',
        description: 'Define project scope, gather requirements, and create technical specifications',
        status: 'TODO',
        priority: 'HIGH',
        estimatedDuration: 8,
        assigneeRole: 'Project Manager',
        tags: ['planning', 'requirements'],
        dependencies: [],
        order: 0
      },
      {
        title: 'System Design & Architecture',
        description: 'Design system architecture, database schema, and API specifications',
        status: 'TODO',
        priority: 'HIGH',
        estimatedDuration: 6,
        assigneeRole: 'Senior Developer',
        tags: ['design', 'architecture'],
        dependencies: ['0'], // Depends on planning
        order: 1
      },
      {
        title: 'Development Setup',
        description: 'Set up development environment, repositories, and CI/CD pipeline',
        status: 'TODO',
        priority: 'MEDIUM',
        estimatedDuration: 4,
        assigneeRole: 'DevOps Engineer',
        tags: ['setup', 'devops'],
        dependencies: ['1'], // Depends on architecture
        order: 2
      },
      {
        title: 'Core Feature Development',
        description: 'Implement core application features and business logic',
        status: 'TODO',
        priority: 'HIGH',
        estimatedDuration: 16,
        assigneeRole: 'Developer',
        tags: ['development', 'features'],
        dependencies: ['2'], // Depends on setup
        order: 3
      },
      {
        title: 'Testing & Quality Assurance',
        description: 'Write unit tests, integration tests, and perform manual testing',
        status: 'TODO',
        priority: 'MEDIUM',
        estimatedDuration: 8,
        assigneeRole: 'QA Engineer',
        tags: ['testing', 'qa'],
        dependencies: ['3'], // Depends on development
        order: 4
      },
      {
        title: 'Deployment & Launch',
        description: 'Deploy to production environment and monitor initial launch',
        status: 'TODO',
        priority: 'HIGH',
        estimatedDuration: 4,
        assigneeRole: 'DevOps Engineer',
        tags: ['deployment', 'launch'],
        dependencies: ['4'], // Depends on testing
        order: 5
      }
    ]
  },
  {
    name: 'Marketing Campaign - Product Launch',
    description: 'Complete marketing campaign workflow for product launches',
    category: 'MARKETING_CAMPAIGN',
    isPublic: true,
    metadata: {
      estimatedDuration: 60, // hours
      teamSize: 4,
      complexity: 'HIGH'
    },
    tasks: [
      {
        title: 'Market Research & Analysis',
        description: 'Conduct market research, competitor analysis, and identify target audience',
        status: 'TODO',
        priority: 'HIGH',
        estimatedDuration: 12,
        assigneeRole: 'Marketing Analyst',
        tags: ['research', 'analysis'],
        dependencies: [],
        order: 0
      },
      {
        title: 'Campaign Strategy Development',
        description: 'Develop marketing strategy, messaging, and campaign timeline',
        status: 'TODO',
        priority: 'HIGH',
        estimatedDuration: 8,
        assigneeRole: 'Marketing Manager',
        tags: ['strategy', 'planning'],
        dependencies: ['0'], // Depends on research
        order: 1
      },
      {
        title: 'Content Creation',
        description: 'Create marketing materials, copy, and visual assets',
        status: 'TODO',
        priority: 'MEDIUM',
        estimatedDuration: 16,
        assigneeRole: 'Content Creator',
        tags: ['content', 'creative'],
        dependencies: ['1'], // Depends on strategy
        order: 2
      },
      {
        title: 'Channel Setup & Configuration',
        description: 'Set up marketing channels, social media accounts, and advertising platforms',
        status: 'TODO',
        priority: 'MEDIUM',
        estimatedDuration: 6,
        assigneeRole: 'Digital Marketing Specialist',
        tags: ['setup', 'channels'],
        dependencies: ['2'], // Depends on content
        order: 3
      },
      {
        title: 'Campaign Launch',
        description: 'Execute campaign launch across all channels and monitor initial performance',
        status: 'TODO',
        priority: 'HIGH',
        estimatedDuration: 8,
        assigneeRole: 'Campaign Manager',
        tags: ['launch', 'execution'],
        dependencies: ['3'], // Depends on setup
        order: 4
      },
      {
        title: 'Performance Analysis & Optimization',
        description: 'Analyze campaign performance and optimize based on results',
        status: 'TODO',
        priority: 'MEDIUM',
        estimatedDuration: 10,
        assigneeRole: 'Marketing Analyst',
        tags: ['analysis', 'optimization'],
        dependencies: ['4'], // Depends on launch
        order: 5
      }
    ]
  },
  {
    name: 'Event Planning - Corporate Event',
    description: 'Complete event planning workflow for corporate events',
    category: 'EVENT_PLANNING',
    isPublic: true,
    metadata: {
      estimatedDuration: 80, // hours
      teamSize: 5,
      complexity: 'HIGH'
    },
    tasks: [
      {
        title: 'Event Concept & Planning',
        description: 'Define event objectives, format, and initial planning',
        status: 'TODO',
        priority: 'HIGH',
        estimatedDuration: 10,
        assigneeRole: 'Event Manager',
        tags: ['planning', 'concept'],
        dependencies: [],
        order: 0
      },
      {
        title: 'Venue Selection & Booking',
        description: 'Research and book appropriate venue for the event',
        status: 'TODO',
        priority: 'HIGH',
        estimatedDuration: 8,
        assigneeRole: 'Event Coordinator',
        tags: ['venue', 'booking'],
        dependencies: ['0'], // Depends on planning
        order: 1
      },
      {
        title: 'Vendor Management',
        description: 'Identify and contract with vendors (catering, AV, decorations)',
        status: 'TODO',
        priority: 'MEDIUM',
        estimatedDuration: 12,
        assigneeRole: 'Procurement Manager',
        tags: ['vendors', 'contracts'],
        dependencies: ['1'], // Depends on venue
        order: 2
      },
      {
        title: 'Marketing & Promotion',
        description: 'Create marketing materials and promote the event',
        status: 'TODO',
        priority: 'MEDIUM',
        estimatedDuration: 10,
        assigneeRole: 'Marketing Specialist',
        tags: ['marketing', 'promotion'],
        dependencies: ['0'], // Depends on planning
        order: 3
      },
      {
        title: 'Registration & Attendee Management',
        description: 'Set up registration system and manage attendee communications',
        status: 'TODO',
        priority: 'MEDIUM',
        estimatedDuration: 8,
        assigneeRole: 'Registration Coordinator',
        tags: ['registration', 'attendees'],
        dependencies: ['3'], // Depends on marketing
        order: 4
      },
      {
        title: 'Event Execution',
        description: 'Execute the event and manage day-of operations',
        status: 'TODO',
        priority: 'HIGH',
        estimatedDuration: 16,
        assigneeRole: 'Event Manager',
        tags: ['execution', 'operations'],
        dependencies: ['2', '4'], // Depends on vendors and registration
        order: 5
      },
      {
        title: 'Post-Event Follow-up',
        description: 'Send thank you communications and gather feedback',
        status: 'TODO',
        priority: 'LOW',
        estimatedDuration: 6,
        assigneeRole: 'Event Coordinator',
        tags: ['follow-up', 'feedback'],
        dependencies: ['5'], // Depends on execution
        order: 6
      }
    ]
  },
  {
    name: 'Product Launch - New Feature',
    description: 'Workflow for launching new product features',
    category: 'PRODUCT_LAUNCH',
    isPublic: true,
    metadata: {
      estimatedDuration: 50, // hours
      teamSize: 6,
      complexity: 'HIGH'
    },
    tasks: [
      {
        title: 'Feature Planning & Requirements',
        description: 'Define feature requirements, user stories, and acceptance criteria',
        status: 'TODO',
        priority: 'HIGH',
        estimatedDuration: 8,
        assigneeRole: 'Product Manager',
        tags: ['planning', 'requirements'],
        dependencies: [],
        order: 0
      },
      {
        title: 'UI/UX Design',
        description: 'Create user interface designs and user experience flows',
        status: 'TODO',
        priority: 'HIGH',
        estimatedDuration: 10,
        assigneeRole: 'UX Designer',
        tags: ['design', 'ux'],
        dependencies: ['0'], // Depends on planning
        order: 1
      },
      {
        title: 'Backend Development',
        description: 'Implement backend services and APIs for the feature',
        status: 'TODO',
        priority: 'HIGH',
        estimatedDuration: 12,
        assigneeRole: 'Backend Developer',
        tags: ['backend', 'api'],
        dependencies: ['0'], // Depends on planning
        order: 2
      },
      {
        title: 'Frontend Development',
        description: 'Implement user interface and integrate with backend APIs',
        status: 'TODO',
        priority: 'HIGH',
        estimatedDuration: 10,
        assigneeRole: 'Frontend Developer',
        tags: ['frontend', 'ui'],
        dependencies: ['1', '2'], // Depends on design and backend
        order: 3
      },
      {
        title: 'Testing & Quality Assurance',
        description: 'Test the feature thoroughly and ensure quality standards',
        status: 'TODO',
        priority: 'MEDIUM',
        estimatedDuration: 8,
        assigneeRole: 'QA Engineer',
        tags: ['testing', 'qa'],
        dependencies: ['3'], // Depends on frontend
        order: 4
      },
      {
        title: 'Documentation & Training',
        description: 'Create user documentation and train support team',
        status: 'TODO',
        priority: 'MEDIUM',
        estimatedDuration: 4,
        assigneeRole: 'Technical Writer',
        tags: ['documentation', 'training'],
        dependencies: ['4'], // Depends on testing
        order: 5
      },
      {
        title: 'Feature Launch & Monitoring',
        description: 'Deploy feature to production and monitor performance',
        status: 'TODO',
        priority: 'HIGH',
        estimatedDuration: 6,
        assigneeRole: 'DevOps Engineer',
        tags: ['launch', 'monitoring'],
        dependencies: ['5'], // Depends on documentation
        order: 6
      }
    ]
  }
]

async function seedTemplates() {
  try {
    console.log('🌱 Seeding task templates...')

    // Ensure workspace exists
    const workspaceId = 'workspace-1'
    const createdById = 'dev-user-1'
    
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
          ownerId: createdById
        }
      })
    }

    // Ensure user exists
    let user = await prisma.user.findUnique({
      where: { id: createdById }
    })
    
    if (!user) {
      user = await prisma.user.create({
        data: {
          id: createdById,
          email: 'dev@lumi.com',
          name: 'Development User'
        }
      })
    }

    // Create templates
    for (const templateData of templates) {
      const template = await prisma.taskTemplate.create({
        data: {
          workspaceId,
          name: templateData.name,
          description: templateData.description,
          category: templateData.category as any,
          isPublic: templateData.isPublic,
          metadata: templateData.metadata,
          createdById,
          tasks: {
            create: templateData.tasks.map((task, index) => ({
              title: task.title,
              description: task.description,
              status: task.status as any,
              priority: task.priority as any,
              estimatedDuration: task.estimatedDuration,
              assigneeRole: task.assigneeRole,
              tags: task.tags,
              dependencies: task.dependencies,
              order: index
            }))
          }
        }
      })

      console.log(`✅ Created template: ${template.name}`)
    }

    console.log('🎉 Task templates seeded successfully!')
  } catch (error) {
    console.error('❌ Error seeding templates:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the seed function
seedTemplates()

