import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding onboarding data...')

  // Create users (employees) first
  const johnDoe = await prisma.user.upsert({
    where: { email: 'john.doe@company.com' },
    update: {},
    create: {
      email: 'john.doe@company.com',
      name: 'John Doe',
    },
  })

  const janeSmith = await prisma.user.upsert({
    where: { email: 'jane.smith@company.com' },
    update: {},
    create: {
      email: 'jane.smith@company.com',
      name: 'Jane Smith',
    },
  })

  // Create a workspace if it doesn't exist
  const workspace = await prisma.workspace.upsert({
    where: { slug: 'default' },
    update: {},
    create: {
      name: 'Default Workspace',
      slug: 'default',
      ownerId: johnDoe.id, // Use the actual user ID
    },
  })

  // Create workspace members
  await prisma.workspaceMember.upsert({
    where: {
      workspaceId_userId: {
        userId: johnDoe.id,
        workspaceId: workspace.id,
      },
    },
    update: {},
    create: {
      userId: johnDoe.id,
      workspaceId: workspace.id,
      role: 'OWNER',
    },
  })

  await prisma.workspaceMember.upsert({
    where: {
      workspaceId_userId: {
        userId: janeSmith.id,
        workspaceId: workspace.id,
      },
    },
    update: {},
    create: {
      userId: janeSmith.id,
      workspaceId: workspace.id,
      role: 'ADMIN',
    },
  })

  // Create onboarding templates
  const softwareEngineerTemplate = await prisma.onboardingTemplate.create({
    data: {
      workspaceId: workspace.id,
      name: 'Software Engineer - 30 Day Plan',
      duration: 30,
      description: 'Comprehensive onboarding plan for new software engineers',
      isActive: true,
      tasks: {
        create: [
          {
            title: 'Complete HR paperwork',
            description: 'Fill out all required HR forms and documentation',
            order: 1,
            dueDay: 1,
          },
          {
            title: 'Set up development environment',
            description: 'Install and configure development tools and IDE',
            order: 2,
            dueDay: 2,
          },
          {
            title: 'Review codebase architecture',
            description: 'Study the main codebase structure and architecture patterns',
            order: 3,
            dueDay: 5,
          },
          {
            title: 'Complete first code review',
            description: 'Participate in code review process and provide feedback',
            order: 4,
            dueDay: 10,
          },
          {
            title: 'Meet with team members',
            description: 'Schedule 1:1 meetings with team members',
            order: 5,
            dueDay: 7,
          },
          {
            title: 'Complete security training',
            description: 'Complete mandatory security awareness training',
            order: 6,
            dueDay: 3,
          },
          {
            title: 'Set up project access',
            description: 'Get access to all necessary project repositories and tools',
            order: 7,
            dueDay: 2,
          },
          {
            title: 'Attend team standup',
            description: 'Participate in daily team standup meetings',
            order: 8,
            dueDay: 4,
          },
        ],
      },
    },
  })

  const marketingManagerTemplate = await prisma.onboardingTemplate.create({
    data: {
      workspaceId: workspace.id,
      name: 'Marketing Manager - 60 Day Plan',
      duration: 60,
      description: 'Comprehensive onboarding plan for new marketing managers',
      isActive: true,
      createdById: janeSmith.id,
      tasks: {
        create: [
          {
            title: 'Complete HR paperwork',
            description: 'Fill out all required HR forms and documentation',
            order: 1,
            dueDay: 1,
          },
          {
            title: 'Meet with marketing team',
            description: 'Introduction meeting with the marketing team',
            order: 2,
            dueDay: 2,
          },
          {
            title: 'Review marketing strategy',
            description: 'Study current marketing strategy and campaigns',
            order: 3,
            dueDay: 5,
          },
          {
            title: 'Set up marketing tools',
            description: 'Configure marketing automation and analytics tools',
            order: 4,
            dueDay: 7,
          },
          {
            title: 'Complete brand guidelines training',
            description: 'Learn company brand guidelines and voice',
            order: 5,
            dueDay: 10,
          },
          {
            title: 'Plan first campaign',
            description: 'Develop and present first marketing campaign',
            order: 6,
            dueDay: 20,
          },
          {
            title: 'Attend product meetings',
            description: 'Participate in product planning meetings',
            order: 7,
            dueDay: 15,
          },
          {
            title: 'Complete analytics training',
            description: 'Learn marketing analytics and reporting tools',
            order: 8,
            dueDay: 12,
          },
        ],
      },
    },
  })

  // Create onboarding plans
  const johnPlan = await prisma.onboardingPlan.create({
    data: {
      workspaceId: workspace.id,
      userId: johnDoe.id,
      templateId: softwareEngineerTemplate.id,
      title: 'Software Engineer - 30 Day Plan',
      status: 'ACTIVE',
      startDate: new Date('2024-01-15'),
        create: [
          {
            title: 'Complete HR paperwork',
            description: 'Fill out all required HR forms and documentation',
            status: 'DONE',
            dueDate: new Date('2024-01-16'),
            order: 1,
            completedAt: new Date('2024-01-16'),
          },
          {
            title: 'Set up development environment',
            description: 'Install and configure development tools and IDE',
            status: 'DONE',
            dueDate: new Date('2024-01-17'),
            order: 2,
            completedAt: new Date('2024-01-17'),
          },
          {
            title: 'Review codebase architecture',
            description: 'Study the main codebase structure and architecture patterns',
            status: 'PENDING',
            dueDate: new Date('2024-01-20'),
            order: 3,
          },
          {
            title: 'Complete first code review',
            description: 'Participate in code review process and provide feedback',
            status: 'PENDING',
            dueDate: new Date('2024-01-25'),
            order: 4,
          },
          {
            title: 'Meet with team members',
            description: 'Schedule 1:1 meetings with team members',
            status: 'PENDING',
            dueDate: new Date('2024-01-22'),
            order: 5,
          },
          {
            title: 'Complete security training',
            description: 'Complete mandatory security awareness training',
            status: 'DONE',
            dueDate: new Date('2024-01-18'),
            order: 6,
            completedAt: new Date('2024-01-18'),
          },
          {
            title: 'Set up project access',
            description: 'Get access to all necessary project repositories and tools',
            status: 'DONE',
            dueDate: new Date('2024-01-17'),
            order: 7,
            completedAt: new Date('2024-01-17'),
          },
          {
            title: 'Attend team standup',
            description: 'Participate in daily team standup meetings',
            status: 'IN_PROGRESS',
            dueDate: new Date('2024-01-19'),
            order: 8,
          },
        ],
      },
    },
  })

  const janePlan = await prisma.onboardingPlan.create({
    data: {
      workspaceId: workspace.id,
      userId: janeSmith.id,
      templateId: marketingManagerTemplate.id,
      title: 'Marketing Manager - 60 Day Plan',
      status: 'COMPLETED',
      startDate: new Date('2023-12-01'),
      endDate: new Date('2024-01-30'),
      tasks: {
        create: [
          {
            title: 'Complete HR paperwork',
            description: 'Fill out all required HR forms and documentation',
            status: 'DONE',
            dueDate: new Date('2023-12-02'),
            order: 1,
            completedAt: new Date('2023-12-02'),
          },
          {
            title: 'Meet with marketing team',
            description: 'Introduction meeting with the marketing team',
            status: 'DONE',
            dueDate: new Date('2023-12-03'),
            order: 2,
            completedAt: new Date('2023-12-03'),
          },
          {
            title: 'Review marketing strategy',
            description: 'Study current marketing strategy and campaigns',
            status: 'DONE',
            dueDate: new Date('2023-12-06'),
            order: 3,
            completedAt: new Date('2023-12-06'),
          },
          {
            title: 'Set up marketing tools',
            description: 'Configure marketing automation and analytics tools',
            status: 'DONE',
            dueDate: new Date('2023-12-08'),
            order: 4,
            completedAt: new Date('2023-12-08'),
          },
          {
            title: 'Complete brand guidelines training',
            description: 'Learn company brand guidelines and voice',
            status: 'DONE',
            dueDate: new Date('2023-12-11'),
            order: 5,
            completedAt: new Date('2023-12-11'),
          },
          {
            title: 'Plan first campaign',
            description: 'Develop and present first marketing campaign',
            status: 'DONE',
            dueDate: new Date('2023-12-21'),
            order: 6,
            completedAt: new Date('2023-12-21'),
          },
          {
            title: 'Attend product meetings',
            description: 'Participate in product planning meetings',
            status: 'DONE',
            dueDate: new Date('2023-12-16'),
            order: 7,
            completedAt: new Date('2023-12-16'),
          },
          {
            title: 'Complete analytics training',
            description: 'Learn marketing analytics and reporting tools',
            status: 'DONE',
            dueDate: new Date('2023-12-13'),
            order: 8,
            completedAt: new Date('2023-12-13'),
          },
        ],
      },
    },
  })

  console.log('✅ Seeding completed!')
  console.log(`Created workspace: ${workspace.name}`)
  console.log(`Created users: ${johnDoe.name}, ${janeSmith.name}`)
  console.log(`Created templates: ${softwareEngineerTemplate.name}, ${marketingManagerTemplate.name}`)
  console.log(`Created plans: ${johnPlan.title}, ${janePlan.title}`)
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
