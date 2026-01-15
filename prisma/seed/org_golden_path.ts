import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * Golden Path Seed Script for Org v1.1
 * 
 * Creates a complete scenario to validate end-to-end Org functionality:
 * - Org with roles
 * - People (users)
 * - Project with accountability
 * - Availability windows
 * - Project allocations
 * 
 * Run: npm run seed (or ts-node prisma/seed/org_golden_path.ts)
 */
async function seedGoldenPath() {
  console.log('🌱 Starting Org Golden Path seed...')

  // Get or create a workspace (using existing seed pattern)
  // For this seed, we'll use the workspace from the main seed or create one
  let workspace = await prisma.workspace.findFirst({
    where: { slug: 'lumi-dev' },
  })

  if (!workspace) {
    // Find any user to use as owner
    const anyUser = await prisma.user.findFirst()
    if (!anyUser) {
      throw new Error('No users found. Please run main seed first or create a user.')
    }

    workspace = await prisma.workspace.create({
      data: {
        name: 'Loopwell Demo Org',
        slug: 'loopwell-demo',
        description: 'Demo organization for Org v1.1 golden path',
        ownerId: anyUser.id,
      },
    })
    console.log('✅ Created workspace: Loopwell Demo Org')
  } else {
    console.log('✅ Using existing workspace:', workspace.name)
  }

  const orgId = workspace.id // Use workspaceId as orgId for v1

  // 1. Create Org (if using separate Org model)
  let org = await prisma.org.findFirst({
    where: { name: 'Loopwell Demo Org' },
  })

  if (!org) {
    org = await prisma.org.create({
      data: {
        name: 'Loopwell Demo Org',
      },
    })
    console.log('✅ Created Org:', org.name)
  } else {
    console.log('✅ Using existing Org:', org.name)
  }

  // 2. Create Roles
  const productManagerRole = await prisma.role.upsert({
    where: {
      id: 'golden-path-pm-role',
    },
    update: {},
    create: {
      id: 'golden-path-pm-role',
      orgId: org.id,
      name: 'Product Manager',
      description: 'Owns product roadmap and feature prioritization',
    },
  })

  const engineeringManagerRole = await prisma.role.upsert({
    where: {
      id: 'golden-path-em-role',
    },
    update: {},
    create: {
      id: 'golden-path-em-role',
      orgId: org.id,
      name: 'Engineering Manager',
      description: 'Owns technical decisions and engineering execution',
    },
  })

  // Add role responsibilities
  await prisma.roleResponsibility.upsert({
    where: {
      id: 'golden-path-pm-ownership',
    },
    update: {},
    create: {
      id: 'golden-path-pm-ownership',
      roleId: productManagerRole.id,
      scope: 'OWNERSHIP',
      target: 'Product roadmap and feature prioritization',
    },
  })

  await prisma.roleResponsibility.upsert({
    where: {
      id: 'golden-path-em-decision',
    },
    update: {},
    create: {
      id: 'golden-path-em-decision',
      roleId: engineeringManagerRole.id,
      scope: 'DECISION',
      target: 'Technical architecture and engineering tradeoffs',
    },
  })

  console.log('✅ Created roles: Product Manager, Engineering Manager')

  // 3. Create People (Users)
  const alex = await prisma.user.upsert({
    where: { email: 'alex.pm@loopwell.demo' },
    update: {},
    create: {
      email: 'alex.pm@loopwell.demo',
      name: 'Alex',
      emailVerified: new Date(),
    },
  })

  const sam = await prisma.user.upsert({
    where: { email: 'sam.em@loopwell.demo' },
    update: {},
    create: {
      email: 'sam.em@loopwell.demo',
      name: 'Sam',
      emailVerified: new Date(),
    },
  })

  const dana = await prisma.user.upsert({
    where: { email: 'dana.ic@loopwell.demo' },
    update: {},
    create: {
      email: 'dana.ic@loopwell.demo',
      name: 'Dana',
      emailVerified: new Date(),
    },
  })

  // Add workspace memberships
  await prisma.workspaceMember.upsert({
    where: {
      workspaceId_userId: {
        workspaceId: workspace.id,
        userId: alex.id,
      },
    },
    update: {},
    create: {
      workspaceId: workspace.id,
      userId: alex.id,
      role: 'MEMBER',
      joinedAt: new Date(),
    },
  })

  await prisma.workspaceMember.upsert({
    where: {
      workspaceId_userId: {
        workspaceId: workspace.id,
        userId: sam.id,
      },
    },
    update: {},
    create: {
      workspaceId: workspace.id,
      userId: sam.id,
      role: 'MEMBER',
      joinedAt: new Date(),
    },
  })

  await prisma.workspaceMember.upsert({
    where: {
      workspaceId_userId: {
        workspaceId: workspace.id,
        userId: dana.id,
      },
    },
    update: {},
    create: {
      workspaceId: workspace.id,
      userId: dana.id,
      role: 'MEMBER',
      joinedAt: new Date(),
    },
  })

  console.log('✅ Created people: Alex (PM), Sam (EM), Dana (IC)')

  // 4. Create Project
  const project = await prisma.project.upsert({
    where: { id: 'golden-path-payments-migration' },
    update: {},
    create: {
      id: 'golden-path-payments-migration',
      workspaceId: workspace.id,
      orgId: orgId,
      name: 'Payments Migration',
      description: 'Migrate payment processing to new infrastructure',
      status: 'ACTIVE',
      createdById: alex.id,
    },
  })

  console.log('✅ Created project: Payments Migration')

  // 5. Set Project Accountability
  await prisma.projectAccountability.upsert({
    where: { projectId: project.id },
    update: {
      ownerRole: 'Product Manager',
      decisionRole: 'Engineering Manager',
      escalationPersonId: sam.id,
      backupOwnerPersonId: alex.id, // v1.1 coverage
    },
    create: {
      projectId: project.id,
      ownerRole: 'Product Manager',
      decisionRole: 'Engineering Manager',
      escalationPersonId: sam.id,
      backupOwnerPersonId: alex.id, // v1.1 coverage
    },
  })

  console.log('✅ Set project accountability (Owner: PM role, Decision: EM role, Escalation: Sam, Backup: Alex)')

  // 6. Add Availability (Dana unavailable for 7 days)
  const unavailableUntil = new Date()
  unavailableUntil.setDate(unavailableUntil.getDate() + 7)

  await prisma.personAvailability.create({
    data: {
      personId: dana.id,
      type: 'UNAVAILABLE',
      startDate: new Date(),
      endDate: unavailableUntil,
      note: 'Vacation',
    },
  })

  console.log('✅ Added availability: Dana unavailable until', unavailableUntil.toISOString().split('T')[0])

  // 7. Add Allocations
  await prisma.projectAllocation.create({
    data: {
      orgId: orgId,
      projectId: project.id,
      personId: alex.id,
      fraction: 0.6,
      startDate: new Date(),
      note: 'Primary PM on Payments Migration',
    },
  })

  await prisma.projectAllocation.create({
    data: {
      orgId: orgId,
      projectId: project.id,
      personId: sam.id,
      fraction: 0.4,
      startDate: new Date(),
      note: 'Engineering oversight',
    },
  })

  console.log('✅ Added allocations: Alex 60%, Sam 40%')

  console.log('')
  console.log('🎉 Golden Path seed completed successfully!')
  console.log('')
  console.log('📋 Summary:')
  console.log(`   Org: ${org.name} (${org.id})`)
  console.log(`   Workspace: ${workspace.name} (${workspace.id})`)
  console.log(`   Roles: Product Manager, Engineering Manager`)
  console.log(`   People: Alex, Sam, Dana`)
  console.log(`   Project: Payments Migration`)
  console.log(`   Accountability: Owner=PM role, Decision=EM role, Escalation=Sam, Backup=Alex`)
  console.log(`   Availability: Dana unavailable for 7 days`)
  console.log(`   Allocations: Alex 60%, Sam 40%`)
  console.log('')
  console.log('✅ Ready for end-to-end validation!')
}

async function main() {
  try {
    await seedGoldenPath()
  } catch (error) {
    console.error('❌ Error during golden path seeding:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  main()
}

export { seedGoldenPath }

