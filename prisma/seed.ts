import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seeding...')

  // Environment flag checks
  const ALLOW_DEV_LOGIN = process.env.ALLOW_DEV_LOGIN === 'true'
  const PROD_LOCK = process.env.PROD_LOCK === 'true'
  const NODE_ENV = process.env.NODE_ENV || 'development'

  // Production safety check
  if (PROD_LOCK && NODE_ENV === 'production') {
    console.log('🚫 Production lock enabled - skipping seed data creation')
    console.log('ℹ️  Seed data should only be created in development environments')
    return
  }

  // Dev login check
  if (!ALLOW_DEV_LOGIN && NODE_ENV === 'production') {
    console.log('🚫 Dev login disabled in production - skipping seed data creation')
    console.log('ℹ️  Use proper user registration flow in production')
    return
  }

  // Create sample users with contextual data
  const sarahChen = await prisma.user.upsert({
    where: { email: 'sarah.chen@company.com' },
    update: {},
    create: {
      email: 'sarah.chen@company.com',
      name: 'Sarah Chen',
      emailVerified: new Date(),
      bio: 'Senior Software Engineer with 8 years of experience in full-stack development. Passionate about building scalable applications and mentoring junior developers.',
      skills: ['React', 'Node.js', 'TypeScript', 'AWS', 'Docker', 'PostgreSQL'],
      currentGoals: ['Lead the migration to microservices architecture', 'Improve team\'s code review process', 'Complete AWS Solutions Architect certification'],
      interests: ['Cloud Architecture', 'DevOps', 'Machine Learning', 'Open Source'],
      timezone: 'UTC-8',
      location: 'San Francisco, CA',
      phone: '+1 (555) 123-4567',
      linkedinUrl: 'https://linkedin.com/in/sarahchen',
      githubUrl: 'https://github.com/sarahchen',
      personalWebsite: 'https://sarahchen.dev'
    },
  })

  const marcusJohnson = await prisma.user.upsert({
    where: { email: 'marcus.johnson@company.com' },
    update: {},
    create: {
      email: 'marcus.johnson@company.com',
      name: 'Marcus Johnson',
      emailVerified: new Date(),
      bio: 'Product Manager with a background in engineering. Focused on user experience and data-driven decision making.',
      skills: ['Product Strategy', 'User Research', 'Data Analysis', 'Agile', 'Figma', 'SQL'],
      currentGoals: ['Launch new mobile app feature', 'Increase user engagement by 25%', 'Build cross-functional team collaboration'],
      interests: ['User Experience', 'Data Science', 'Mobile Apps', 'Team Leadership'],
      timezone: 'UTC-5',
      location: 'New York, NY',
      phone: '+1 (555) 987-6543',
      linkedinUrl: 'https://linkedin.com/in/marcusjohnson'
    },
  })

  const alexKim = await prisma.user.upsert({
    where: { email: 'alex.kim@company.com' },
    update: {},
    create: {
      email: 'alex.kim@company.com',
      name: 'Alex Kim',
      emailVerified: new Date(),
      bio: 'Frontend Developer specializing in React and modern web technologies. Enthusiastic about creating beautiful user interfaces.',
      skills: ['React', 'JavaScript', 'CSS', 'HTML', 'Figma', 'Webpack'],
      currentGoals: ['Master advanced React patterns', 'Learn TypeScript', 'Contribute to open source projects'],
      interests: ['UI/UX Design', 'Web Performance', 'Accessibility', 'Animation'],
      timezone: 'UTC-8',
      location: 'Seattle, WA',
      phone: '+1 (555) 456-7890',
      githubUrl: 'https://github.com/alexkim'
    },
  })

  // Create workspace
  const workspace = await prisma.workspace.upsert({
    where: { id: 'cmgl0f0wa00038otlodbw5jhn' },
    update: {},
    create: {
      id: 'cmgl0f0wa00038otlodbw5jhn',
      name: 'Lumi Dev Workspace',
      slug: 'lumi-dev',
      description: 'Development workspace for Lumi',
      ownerId: devUser.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  })

  // Create workspace member (sample users only)
  await prisma.workspaceMember.upsert({
    where: { 
      workspaceId_userId: { 
        workspaceId: workspace.id,
        userId: sarahChen.id
      } 
    },
    update: {},
    create: {
      userId: sarahChen.id,
      workspaceId: workspace.id,
      role: 'MEMBER',
      joinedAt: new Date(),
    },
  })

  await prisma.workspaceMember.upsert({
    where: { 
      workspaceId_userId: { 
        workspaceId: workspace.id,
        userId: marcusJohnson.id
      } 
    },
    update: {},
    create: {
      userId: marcusJohnson.id,
      workspaceId: workspace.id,
      role: 'MEMBER',
      joinedAt: new Date(),
    },
  })

  await prisma.workspaceMember.upsert({
    where: { 
      workspaceId_userId: { 
        workspaceId: workspace.id,
        userId: alexKim.id
      } 
    },
    update: {},
    create: {
      userId: alexKim.id,
      workspaceId: workspace.id,
      role: 'MEMBER',
      joinedAt: new Date(),
    },
  })

  // Create sample roles with contextual data
  const seniorEngineerRole = await prisma.orgPosition.upsert({
    where: { id: 'senior-engineer-role' },
    update: {},
    create: {
      id: 'senior-engineer-role',
      workspaceId: workspace.id,
      title: 'Senior Software Engineer',
      department: 'Engineering',
      level: 4,
      order: 1,
      isActive: true,
      roleDescription: 'Lead development of core platform features and mentor junior engineers. Responsible for architectural decisions and code quality standards.',
      responsibilities: [
        'Design and implement scalable backend services',
        'Mentor junior developers and conduct code reviews',
        'Collaborate with product team on feature specifications',
        'Maintain and improve CI/CD pipelines',
        'Participate in technical architecture decisions'
      ],
      requiredSkills: ['JavaScript', 'Node.js', 'React', 'PostgreSQL', 'AWS'],
      preferredSkills: ['TypeScript', 'Docker', 'Kubernetes', 'GraphQL'],
      keyMetrics: [
        'Code review coverage > 90%',
        'Feature delivery on time',
        'Bug rate < 2%',
        'Team velocity improvement'
      ],
      teamSize: 3,
      budget: '$200K annual',
      reportingStructure: 'Reports to Engineering Manager',
      userId: sarahChen.id
    },
  })

  const productManagerRole = await prisma.orgPosition.upsert({
    where: { id: 'product-manager-role' },
    update: {},
    create: {
      id: 'product-manager-role',
      workspaceId: workspace.id,
      title: 'Product Manager',
      department: 'Product',
      level: 3,
      order: 2,
      isActive: true,
      roleDescription: 'Drive product strategy and roadmap execution. Work closely with engineering and design teams to deliver user-focused solutions.',
      responsibilities: [
        'Define product requirements and user stories',
        'Coordinate with engineering and design teams',
        'Analyze user data and market trends',
        'Manage product backlog and sprint planning',
        'Present product updates to stakeholders'
      ],
      requiredSkills: ['Product Strategy', 'User Research', 'Data Analysis', 'Agile'],
      preferredSkills: ['Figma', 'SQL', 'A/B Testing', 'Customer Success'],
      keyMetrics: [
        'User engagement increase',
        'Feature adoption rate',
        'Customer satisfaction score',
        'Time to market'
      ],
      teamSize: 5,
      budget: '$150K annual',
      reportingStructure: 'Reports to VP of Product',
      userId: marcusJohnson.id
    },
  })

  // Create an open position (no user assigned)
  await prisma.orgPosition.upsert({
    where: { id: 'frontend-developer-role' },
    update: {},
    create: {
      id: 'frontend-developer-role',
      workspaceId: workspace.id,
      title: 'Frontend Developer',
      department: 'Engineering',
      level: 5,
      order: 3,
      isActive: true,
      roleDescription: 'Create beautiful and responsive user interfaces using modern web technologies. Focus on user experience and performance optimization.',
      responsibilities: [
        'Develop responsive web applications using React',
        'Implement UI/UX designs with pixel-perfect accuracy',
        'Optimize application performance and loading times',
        'Write clean, maintainable, and well-tested code',
        'Collaborate with designers and backend developers'
      ],
      requiredSkills: ['React', 'JavaScript', 'CSS', 'HTML'],
      preferredSkills: ['TypeScript', 'Figma', 'Webpack', 'Jest'],
      keyMetrics: [
        'Page load time < 2 seconds',
        'Accessibility score > 95%',
        'Cross-browser compatibility',
        'Code coverage > 80%'
      ],
      teamSize: null,
      budget: '$120K annual',
      reportingStructure: 'Reports to Senior Software Engineer'
    },
  })

  // Create sample project
  const project = await prisma.project.upsert({
    where: { id: 'sample-project-1' },
    update: {},
    create: {
      id: 'sample-project-1',
      workspaceId: workspace.id,
      name: 'Sample Project',
      description: 'A sample project for development',
      status: 'ACTIVE',
      ownerId: devUser.id,
      createdById: devUser.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  })

  // Create project member
  await prisma.projectMember.upsert({
    where: { 
      projectId_userId: { 
        projectId: project.id,
        userId: devUser.id
      } 
    },
    update: {},
    create: {
      projectId: project.id,
      userId: devUser.id,
      role: 'OWNER',
    },
  })

  console.log('✅ Database seeding completed successfully!')
  console.log(`📊 Created workspace: ${workspace.name}`)
  console.log(`👤 Created user: ${devUser.email}`)
  console.log(`📁 Created project: ${project.name}`)
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })