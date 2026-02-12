import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * Org Seed Script
 * 
 * Creates a realistic small company org structure for development:
 * - Executive, Engineering, and Product departments
 * - Teams within each department
 * - Positions with proper reporting hierarchy
 * - PersonManagerLink records for reporting relationships
 * 
 * Run: npm run db:seed:org
 */
async function seedOrgData() {
  console.log('🌱 Starting Org Data seed...')

  // 1. Find or use existing workspace
  let workspace = await prisma.workspace.findFirst({
    where: { slug: 'lumi-dev' },
  })

  if (!workspace) {
    // Try to find any workspace
    workspace = await prisma.workspace.findFirst()
    
    if (!workspace) {
      throw new Error('No workspace found. Please run seed:dev first or create a workspace.')
    }
  }

  console.log('✅ Using workspace:', workspace.name)
  const workspaceId = workspace.id

  // 2. Find or create users
  const ceoUser = await prisma.user.upsert({
    where: { email: 'antoine@lumi.com' },
    update: {},
    create: {
      email: 'antoine@lumi.com',
      name: 'Antoine Morlet',
    },
  })

  const headEngUser = await prisma.user.upsert({
    where: { email: 'head.eng@lumi.com' },
    update: {},
    create: {
      email: 'head.eng@lumi.com',
      name: 'Sarah Chen',
    },
  })

  const seniorDevUser = await prisma.user.upsert({
    where: { email: 'senior.dev@lumi.com' },
    update: {},
    create: {
      email: 'senior.dev@lumi.com',
      name: 'Marcus Rodriguez',
    },
  })

  const devUser = await prisma.user.upsert({
    where: { email: 'dev@lumi.com' },
    update: {},
    create: {
      email: 'dev@lumi.com',
      name: 'Emma Wilson',
    },
  })

  const headProductUser = await prisma.user.upsert({
    where: { email: 'head.product@lumi.com' },
    update: {},
    create: {
      email: 'head.product@lumi.com',
      name: 'Alex Park',
    },
  })

  const designerUser = await prisma.user.upsert({
    where: { email: 'designer@lumi.com' },
    update: {},
    create: {
      email: 'designer@lumi.com',
      name: 'Jordan Kim',
    },
  })

  console.log('✅ Created/found users')

  // 3. Ensure all users are workspace members
  await prisma.workspaceMember.upsert({
    where: {
      workspaceId_userId: { workspaceId, userId: ceoUser.id },
    },
    update: { role: 'OWNER' },
    create: {
      workspaceId,
      userId: ceoUser.id,
      role: 'OWNER',
    },
  })

  for (const user of [headEngUser, seniorDevUser, devUser, headProductUser, designerUser]) {
    await prisma.workspaceMember.upsert({
      where: {
        workspaceId_userId: { workspaceId, userId: user.id },
      },
      update: {},
      create: {
        workspaceId,
        userId: user.id,
        role: 'MEMBER',
      },
    })
  }

  console.log('✅ Added users to workspace')

  // 4. Create departments
  const executiveDept = await prisma.orgDepartment.upsert({
    where: {
      workspaceId_name: { workspaceId, name: 'Executive' },
    },
    update: {},
    create: {
      workspaceId,
      name: 'Executive',
      description: 'Executive leadership and strategy',
      order: 0,
      isActive: true,
    },
  })

  const engineeringDept = await prisma.orgDepartment.upsert({
    where: {
      workspaceId_name: { workspaceId, name: 'Engineering' },
    },
    update: {},
    create: {
      workspaceId,
      name: 'Engineering',
      description: 'Product development and technology',
      order: 1,
      isActive: true,
    },
  })

  const productDept = await prisma.orgDepartment.upsert({
    where: {
      workspaceId_name: { workspaceId, name: 'Product' },
    },
    update: {},
    create: {
      workspaceId,
      name: 'Product',
      description: 'Product strategy and design',
      order: 2,
      isActive: true,
    },
  })

  console.log('✅ Created departments')

  // 5. Create teams
  const executiveTeam = await prisma.orgTeam.upsert({
    where: {
      id: 'exec-team-seed',
    },
    update: {},
    create: {
      id: 'exec-team-seed',
      workspaceId,
      departmentId: executiveDept.id,
      name: 'Executive Team',
      description: 'Company leadership',
      order: 0,
      isActive: true,
      leaderId: ceoUser.id,
    },
  })

  const engineeringTeam = await prisma.orgTeam.upsert({
    where: {
      id: 'eng-team-seed',
    },
    update: {},
    create: {
      id: 'eng-team-seed',
      workspaceId,
      departmentId: engineeringDept.id,
      name: 'Engineering Team',
      description: 'Software development team',
      order: 0,
      isActive: true,
      leaderId: headEngUser.id,
    },
  })

  const productTeam = await prisma.orgTeam.upsert({
    where: {
      id: 'product-team-seed',
    },
    update: {},
    create: {
      id: 'product-team-seed',
      workspaceId,
      departmentId: productDept.id,
      name: 'Product Team',
      description: 'Product strategy and design team',
      order: 0,
      isActive: true,
      leaderId: headProductUser.id,
    },
  })

  console.log('✅ Created teams')

  // 6. Create positions with hierarchy
  // CEO (no parent)
  const ceoPosition = await prisma.orgPosition.upsert({
    where: { id: 'ceo-position-seed' },
    update: {},
    create: {
      id: 'ceo-position-seed',
      workspaceId,
      userId: ceoUser.id,
      title: 'Chief Executive Officer',
      level: 5,
      teamId: executiveTeam.id,
      parentId: null, // Top of hierarchy
      isActive: true,
      order: 0,
    },
  })

  // Head of Engineering (reports to CEO)
  const headEngPosition = await prisma.orgPosition.upsert({
    where: { id: 'head-eng-position-seed' },
    update: {},
    create: {
      id: 'head-eng-position-seed',
      workspaceId,
      userId: headEngUser.id,
      title: 'Head of Engineering',
      level: 4,
      teamId: engineeringTeam.id,
      parentId: ceoPosition.id,
      isActive: true,
      order: 0,
    },
  })

  // Senior Developer (reports to Head of Engineering)
  await prisma.orgPosition.upsert({
    where: { id: 'senior-dev-position-seed' },
    update: {},
    create: {
      id: 'senior-dev-position-seed',
      workspaceId,
      userId: seniorDevUser.id,
      title: 'Senior Software Engineer',
      level: 3,
      teamId: engineeringTeam.id,
      parentId: headEngPosition.id,
      isActive: true,
      order: 0,
    },
  })

  // Developer (reports to Head of Engineering)
  await prisma.orgPosition.upsert({
    where: { id: 'dev-position-seed' },
    update: {},
    create: {
      id: 'dev-position-seed',
      workspaceId,
      userId: devUser.id,
      title: 'Software Engineer',
      level: 2,
      teamId: engineeringTeam.id,
      parentId: headEngPosition.id,
      isActive: true,
      order: 1,
    },
  })

  // Head of Product (reports to CEO)
  const headProductPosition = await prisma.orgPosition.upsert({
    where: { id: 'head-product-position-seed' },
    update: {},
    create: {
      id: 'head-product-position-seed',
      workspaceId,
      userId: headProductUser.id,
      title: 'Head of Product',
      level: 4,
      teamId: productTeam.id,
      parentId: ceoPosition.id,
      isActive: true,
      order: 0,
    },
  })

  // Product Designer (reports to Head of Product)
  await prisma.orgPosition.upsert({
    where: { id: 'designer-position-seed' },
    update: {},
    create: {
      id: 'designer-position-seed',
      workspaceId,
      userId: designerUser.id,
      title: 'Product Designer',
      level: 3,
      teamId: productTeam.id,
      parentId: headProductPosition.id,
      isActive: true,
      order: 0,
    },
  })

  console.log('✅ Created positions with hierarchy')

  // 7. Create PersonManagerLink records
  const managerLinks = [
    { personId: headEngUser.id, managerId: ceoUser.id },
    { personId: seniorDevUser.id, managerId: headEngUser.id },
    { personId: devUser.id, managerId: headEngUser.id },
    { personId: headProductUser.id, managerId: ceoUser.id },
    { personId: designerUser.id, managerId: headProductUser.id },
  ]

  for (const link of managerLinks) {
    await prisma.personManagerLink.upsert({
      where: {
        workspaceId_personId_managerId: {
          workspaceId,
          personId: link.personId,
          managerId: link.managerId,
        },
      },
      update: {},
      create: {
        workspaceId,
        personId: link.personId,
        managerId: link.managerId,
      },
    })
  }

  console.log('✅ Created PersonManagerLink records')

  // Summary
  console.log('\n📊 Org Structure Created:')
  console.log('  👥 6 people')
  console.log('  🏢 3 departments (Executive, Engineering, Product)')
  console.log('  🔷 3 teams')
  console.log('  📋 6 positions with reporting hierarchy')
  console.log('  🔗 5 manager-report relationships')
  console.log('\n✅ Org seed completed!')
  console.log('\nHierarchy:')
  console.log('  Antoine Morlet (CEO)')
  console.log('  ├── Sarah Chen (Head of Engineering)')
  console.log('  │   ├── Marcus Rodriguez (Senior Software Engineer)')
  console.log('  │   └── Emma Wilson (Software Engineer)')
  console.log('  └── Alex Park (Head of Product)')
  console.log('      └── Jordan Kim (Product Designer)')
}

seedOrgData()
  .catch((e) => {
    console.error('❌ Error seeding org data:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
