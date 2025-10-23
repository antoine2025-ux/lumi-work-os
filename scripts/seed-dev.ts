import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Environment flag checks
const ALLOW_DEV_LOGIN = process.env.ALLOW_DEV_LOGIN === 'true'
const PROD_LOCK = process.env.PROD_LOCK === 'true'
const NODE_ENV = process.env.NODE_ENV || 'development'

async function seedDevData() {
  // Production safety check
  if (PROD_LOCK && NODE_ENV === 'production') {
    console.log('🚫 Production lock enabled - dev seed data creation blocked')
    console.log('ℹ️  Dev seed should only run in development environments')
    process.exit(1)
  }

  // Dev login check
  if (!ALLOW_DEV_LOGIN && NODE_ENV === 'production') {
    console.log('🚫 Dev login disabled in production - dev seed data creation blocked')
    console.log('ℹ️  Use proper user registration flow in production')
    process.exit(1)
  }

  console.log('🌱 Seeding development data...')
  console.log(`📊 Environment: ${NODE_ENV}`)
  console.log(`🔓 Dev login allowed: ${ALLOW_DEV_LOGIN}`)
  console.log(`🔒 Production lock: ${PROD_LOCK}`)

  try {
    // 1. Upsert dev user
    const devUser = await prisma.user.upsert({
      where: { email: 'dev@lumi.com' },
      update: {},
      create: {
        email: 'dev@lumi.com',
        name: 'Dev User',
      }
    })
    console.log('✅ Dev user created/found:', devUser.email)

    // 2. Create default workspace "Lumi Dev"
    const workspace = await prisma.workspace.upsert({
      where: { slug: 'lumi-dev' },
      update: {},
      create: {
        name: 'Lumi Dev',
        slug: 'lumi-dev',
        description: 'Development workspace for Lumi Work OS',
        ownerId: devUser.id
      }
    })
    console.log('✅ Workspace created/found:', workspace.name)

    // 3. Add dev user as workspace owner
    await prisma.workspaceMember.upsert({
      where: {
        workspaceId_userId: {
          workspaceId: workspace.id,
          userId: devUser.id
        }
      },
      update: { role: 'OWNER' },
      create: {
        userId: devUser.id,
        workspaceId: workspace.id,
        role: 'OWNER'
      }
    })
    console.log('✅ Dev user added as workspace owner')

    // 4. Create demo projects
    // 4. Create demo projects
    const project1 = await prisma.project.upsert({
      where: { id: 'demo-project-alpha' },
      update: {},
      create: {
        id: 'demo-project-alpha',
        workspaceId: workspace.id,
        name: 'Demo Project Alpha',
        description: 'A sample project for development and testing',
        status: 'ACTIVE',
        priority: 'HIGH',
        color: '#3b82f6',
        department: 'Engineering',
        team: 'Frontend',
        ownerId: devUser.id,
        createdById: devUser.id
      }
    })

    const project2 = await prisma.project.upsert({
      where: { id: 'demo-project-beta' },
      update: {},
      create: {
        id: 'demo-project-beta',
        workspaceId: workspace.id,
        name: 'Demo Project Beta',
        description: 'Another sample project for testing different scenarios',
        status: 'ACTIVE',
        priority: 'MEDIUM',
        color: '#10b981',
        department: 'Product',
        team: 'Backend',
        ownerId: devUser.id,
        createdById: devUser.id
      }
    })
    console.log('✅ Demo projects created')

    // 5. Add dev user as project members
    await prisma.projectMember.upsert({
      where: {
        projectId_userId: {
          projectId: project1.id,
          userId: devUser.id
        }
      },
      update: { role: 'OWNER' },
      create: {
        projectId: project1.id,
        userId: devUser.id,
        role: 'OWNER'
      }
    })

    await prisma.projectMember.upsert({
      where: {
        projectId_userId: {
          projectId: project2.id,
          userId: devUser.id
        }
      },
      update: { role: 'OWNER' },
      create: {
        projectId: project2.id,
        userId: devUser.id,
        role: 'OWNER'
      }
    })
    console.log('✅ Dev user added as project owner')

    // 6. Create epics
    const epic1 = await prisma.epic.upsert({
      where: { id: 'demo-epic-auth' },
      update: {},
      create: {
        id: 'demo-epic-auth',
        workspaceId: workspace.id,
        projectId: project1.id,
        title: 'User Authentication Epic',
        description: 'Implement comprehensive user authentication system',
        color: '#ef4444',
        order: 0
      }
    })

    const epic2 = await prisma.epic.upsert({
      where: { id: 'demo-epic-dashboard' },
      update: {},
      create: {
        id: 'demo-epic-dashboard',
        workspaceId: workspace.id,
        projectId: project1.id,
        title: 'Dashboard Features Epic',
        description: 'Build out dashboard functionality and widgets',
        color: '#8b5cf6',
        order: 1
      }
    })
    console.log('✅ Epics created')

    // 7. Create tasks
    const tasks = [
      {
        title: 'Implement OAuth integration',
        description: 'Add Google OAuth provider for user authentication',
        status: 'IN_PROGRESS' as const,
        priority: 'HIGH' as const,
        epicId: epic1.id,
        tags: ['auth', 'oauth', 'security']
      },
      {
        title: 'Create user registration flow',
        description: 'Build user registration and onboarding process',
        status: 'TODO' as const,
        priority: 'MEDIUM' as const,
        epicId: epic1.id,
        tags: ['auth', 'onboarding', 'forms']
      },
      {
        title: 'Design dashboard layout',
        description: 'Create responsive dashboard layout with sidebar navigation',
        status: 'DONE' as const,
        priority: 'HIGH' as const,
        epicId: epic2.id,
        tags: ['ui', 'design', 'layout']
      },
      {
        title: 'Implement project cards',
        description: 'Create interactive project cards with status indicators',
        status: 'IN_REVIEW' as const,
        priority: 'MEDIUM' as const,
        epicId: epic2.id,
        tags: ['ui', 'components', 'projects']
      },
      {
        title: 'Add task management',
        description: 'Build task creation, editing, and assignment features',
        status: 'TODO' as const,
        priority: 'HIGH' as const,
        epicId: epic2.id,
        tags: ['tasks', 'management', 'crud']
      }
    ]

    for (const taskData of tasks) {
      await prisma.task.create({
        data: {
          workspaceId: workspace.id,
          projectId: project1.id,
          title: taskData.title,
          description: taskData.description,
          status: taskData.status,
          priority: taskData.priority,
          assigneeId: devUser.id,
          epicId: taskData.epicId,
          tags: taskData.tags,
          createdById: devUser.id
        }
      })
    }
    console.log('✅ Tasks created')

    // 8. Create a sample wiki page
    const wikiPage = await prisma.wikiPage.upsert({
      where: {
        workspaceId_slug: {
          workspaceId: workspace.id,
          slug: 'getting-started'
        }
      },
      update: {},
      create: {
        workspaceId: workspace.id,
        title: 'Getting Started',
        slug: 'getting-started',
        content: `# Getting Started with Lumi Work OS

Welcome to Lumi Work OS! This is a sample wiki page to help you get started.

## Features

- **Project Management**: Create and manage projects with tasks, epics, and milestones
- **Wiki System**: Document your work with rich text wiki pages
- **Team Collaboration**: Work together with your team members
- **AI Assistant**: Get help from our AI-powered assistant

## Quick Start

1. Create your first project
2. Add team members
3. Create tasks and organize them into epics
4. Document your process in the wiki

Happy working! 🚀`,
        excerpt: 'A guide to getting started with Lumi Work OS',
        createdById: devUser.id,
        permissionLevel: 'team',
        category: 'documentation'
      }
    })
    console.log('✅ Wiki page created')

    console.log('\n🎉 Development data seeded successfully!')
    console.log(`\n📊 Summary:`)
    console.log(`- User: ${devUser.email}`)
    console.log(`- Workspace: ${workspace.name} (${workspace.slug})`)
    console.log(`- Projects: 2`)
    console.log(`- Epics: 2`)
    console.log(`- Tasks: ${tasks.length}`)
    console.log(`- Wiki Pages: 1`)
    console.log(`\n🔗 Workspace ID: ${workspace.id}`)

  } catch (error) {
    console.error('❌ Error seeding development data:', error)
    throw error
  }
}

async function main() {
  await seedDevData()
  await prisma.$disconnect()
}

if (require.main === module) {
  main()
    .catch((e) => {
      console.error(e)
      process.exit(1)
    })
}

export { seedDevData }
