import { PrismaClient } from '@prisma/client'
import { config } from 'dotenv'
import { resolve } from 'path'
import fs from 'node:fs'
import path from 'node:path'

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') })

const prisma = new PrismaClient()

/**
 * Loopbrain Fixtures Seed Script
 * 
 * Creates a single org with multiple projects covering all Q1–Q9 scenarios:
 * - Healthy project (complete accountability, capacity)
 * - Constrained project (tight capacity, availability issues)
 * - Insufficient data project (missing accountability)
 * - Role misalignment project (accountability vs role responsibilities)
 * 
 * Run: SEED_LOOPBRAIN_FIXTURES=true npm run seed
 */

export async function seedLoopbrainFixtures() {
  console.log('🌱 Starting Loopbrain Fixtures seed...')
  
  // Verify Prisma client is initialized
  if (!prisma || !prisma.role) {
    throw new Error('Prisma client not properly initialized')
  }

  // Get or create workspace
  let workspace = await prisma.workspace.findFirst({
    where: { slug: 'loopbrain-fixtures' },
  })

  if (!workspace) {
    // Find any user to use as owner
    const anyUser = await prisma.user.findFirst()
    if (!anyUser) {
      throw new Error('No users found. Please run main seed first or create a user.')
    }

    workspace = await prisma.workspace.create({
      data: {
        name: 'Loopbrain Fixtures Org',
        slug: 'loopbrain-fixtures',
        description: 'Test org for Loopbrain Q1–Q9 validation',
        ownerId: anyUser.id,
      },
    })
    console.log('✅ Created workspace: Loopbrain Fixtures Org')
  } else {
    console.log('✅ Using existing workspace:', workspace.name)
  }

  const orgId = workspace.id // Use workspaceId as orgId for v1

  // Create Org (if using separate Org model)
  let org = await prisma.org.findFirst({
    where: { name: 'Loopbrain Fixtures Org' },
  })

  if (!org) {
    org = await prisma.org.create({
      data: {
        name: 'Loopbrain Fixtures Org',
      },
    })
    console.log('✅ Created Org:', org.name)
  } else {
    console.log('✅ Using existing Org:', org.name)
  }

  // Create Departments
  const productDept = await prisma.orgDepartment.upsert({
    where: {
      workspaceId_name: {
        workspaceId: workspace.id,
        name: 'Product',
      },
    },
    update: {},
    create: {
      workspaceId: workspace.id,
      name: 'Product',
      description: 'Product management and strategy',
      isActive: true,
    },
  })

  const engineeringDept = await prisma.orgDepartment.upsert({
    where: {
      workspaceId_name: {
        workspaceId: workspace.id,
        name: 'Engineering',
      },
    },
    update: {},
    create: {
      workspaceId: workspace.id,
      name: 'Engineering',
      description: 'Engineering and development',
      isActive: true,
    },
  })

  // Create Teams
  // Check if team already exists
  let productTeam = await prisma.orgTeam.findFirst({
    where: {
      workspaceId: workspace.id,
      departmentId: productDept.id,
      name: 'Product',
    },
  })
  
  if (!productTeam) {
    productTeam = await prisma.orgTeam.create({
      data: {
        workspaceId: workspace.id,
        departmentId: productDept.id,
        name: 'Product',
        description: 'Product team',
        isActive: true,
      },
    })
  }

  let engineeringTeam = await prisma.orgTeam.findFirst({
    where: {
      workspaceId: workspace.id,
      departmentId: engineeringDept.id,
      name: 'Engineering',
    },
  })
  
  if (!engineeringTeam) {
    engineeringTeam = await prisma.orgTeam.create({
      data: {
        workspaceId: workspace.id,
        departmentId: engineeringDept.id,
        name: 'Engineering',
        description: 'Engineering team',
        isActive: true,
      },
    })
  }

  console.log('✅ Created departments and teams')

  // Create Roles
  const productManagerRole = await prisma.role.upsert({
    where: {
      id: 'fixture-pm-role',
    },
    update: {},
    create: {
      orgId: org.id,
      name: 'Product Manager',
      description: 'Owns product roadmap and feature prioritization',
    },
  })

  const engineeringManagerRole = await prisma.role.upsert({
    where: {
      id: 'fixture-em-role',
    },
    update: {},
    create: {
      id: 'fixture-em-role',
      orgId: org.id,
      name: 'Engineering Manager',
      description: 'Owns technical decisions and engineering execution',
    },
  })

  const engineerRole = await prisma.role.upsert({
    where: {
      id: 'fixture-eng-role',
    },
    update: {},
    create: {
      id: 'fixture-eng-role',
      orgId: org.id,
      name: 'Engineer',
      description: 'Software engineer',
    },
  })

  // Add role responsibilities
  // Delete existing responsibilities first to avoid conflicts
  await prisma.roleResponsibility.deleteMany({
    where: {
      roleId: { in: [productManagerRole.id, engineeringManagerRole.id, engineerRole.id] },
    },
  })

  await prisma.roleResponsibility.create({
    data: {
      roleId: productManagerRole.id,
      scope: 'OWNERSHIP',
      target: 'Product',
    },
  })

  await prisma.roleResponsibility.create({
    data: {
      roleId: productManagerRole.id,
      scope: 'DECISION',
      target: 'Product',
    },
  })

  await prisma.roleResponsibility.create({
    data: {
      roleId: productManagerRole.id,
      scope: 'EXECUTION',
      target: 'Planning',
    },
  })

  await prisma.roleResponsibility.create({
    data: {
      roleId: engineeringManagerRole.id,
      scope: 'OWNERSHIP',
      target: 'Engineering',
    },
  })

  await prisma.roleResponsibility.create({
    data: {
      roleId: engineeringManagerRole.id,
      scope: 'DECISION',
      target: 'Engineering',
    },
  })

  await prisma.roleResponsibility.create({
    data: {
      roleId: engineeringManagerRole.id,
      scope: 'EXECUTION',
      target: 'Delivery',
    },
  })

  await prisma.roleResponsibility.create({
    data: {
      roleId: engineerRole.id,
      scope: 'EXECUTION',
      target: 'Delivery',
    },
  })

  console.log('✅ Created roles: Product Manager, Engineering Manager, Engineer')

  // Create People (Users)
  const alex = await prisma.user.upsert({
    where: { email: 'alex.fixture@loopbrain.test' },
    update: {},
    create: {
      email: 'alex.fixture@loopbrain.test',
      name: 'Alex',
      emailVerified: new Date(),
    },
  })

  const sam = await prisma.user.upsert({
    where: { email: 'sam.fixture@loopbrain.test' },
    update: {},
    create: {
      email: 'sam.fixture@loopbrain.test',
      name: 'Sam',
      emailVerified: new Date(),
    },
  })

  const dana = await prisma.user.upsert({
    where: { email: 'dana.fixture@loopbrain.test' },
    update: {},
    create: {
      email: 'dana.fixture@loopbrain.test',
      name: 'Dana',
      emailVerified: new Date(),
    },
  })

  const chris = await prisma.user.upsert({
    where: { email: 'chris.fixture@loopbrain.test' },
    update: {},
    create: {
      email: 'chris.fixture@loopbrain.test',
      name: 'Chris',
      emailVerified: new Date(),
    },
  })

  // Add workspace memberships
  for (const user of [alex, sam, dana, chris]) {
    await prisma.workspaceMember.upsert({
      where: {
        workspaceId_userId: {
          workspaceId: workspace.id,
          userId: user.id,
        },
      },
      update: {},
      create: {
        workspaceId: workspace.id,
        userId: user.id,
        role: 'MEMBER',
        joinedAt: new Date(),
      },
    })
  }

  // Create Positions (assign people to teams with roles)
  const alexPosition = await prisma.orgPosition.upsert({
    where: {
      id: 'fixture-alex-position',
    },
    update: {},
    create: {
      id: 'fixture-alex-position',
      workspaceId: workspace.id,
      userId: alex.id,
      title: 'Product Manager',
      teamId: productTeam.id,
      level: 3,
      isActive: true,
    },
  })

  const samPosition = await prisma.orgPosition.upsert({
    where: {
      id: 'fixture-sam-position',
    },
    update: {},
    create: {
      id: 'fixture-sam-position',
      workspaceId: workspace.id,
      userId: sam.id,
      title: 'Engineering Manager',
      teamId: engineeringTeam.id,
      level: 3,
      isActive: true,
    },
  })

  const danaPosition = await prisma.orgPosition.upsert({
    where: {
      id: 'fixture-dana-position',
    },
    update: {},
    create: {
      id: 'fixture-dana-position',
      workspaceId: workspace.id,
      userId: dana.id,
      title: 'Engineer',
      teamId: engineeringTeam.id,
      level: 5,
      isActive: true,
    },
  })

  const chrisPosition = await prisma.orgPosition.upsert({
    where: {
      id: 'fixture-chris-position',
    },
    update: {},
    create: {
      id: 'fixture-chris-position',
      workspaceId: workspace.id,
      userId: chris.id,
      title: 'Engineer',
      teamId: engineeringTeam.id,
      level: 5,
      isActive: true,
    },
  })

  console.log('✅ Created people: Alex (PM), Sam (EM), Dana (Engineer), Chris (Engineer)')

  // Add Availability
  // Delete existing availability first
  await prisma.personAvailability.deleteMany({
    where: {
      personId: { in: [dana.id, chris.id] },
    },
  })

  // Dana: UNAVAILABLE from 2025-12-20 to 2026-01-10
  await prisma.personAvailability.create({
    data: {
      workspaceId: workspace.id,
      personId: dana.id,
      type: 'UNAVAILABLE',
      startDate: new Date('2025-12-20T00:00:00.000Z'),
      endDate: new Date('2026-01-10T00:00:00.000Z'),
      note: 'Vacation',
    },
  })

  // Chris: PARTIAL 0.5 from 2025-12-16 to 2026-02-01
  await prisma.personAvailability.create({
    data: {
      workspaceId: workspace.id,
      personId: chris.id,
      type: 'PARTIAL',
      startDate: new Date('2025-12-16T00:00:00.000Z'),
      endDate: new Date('2026-02-01T00:00:00.000Z'),
      fraction: 0.5,
      note: 'Part-time',
    },
  })

  console.log('✅ Created availability windows')

  // Create Projects
  // Project A: Payments Migration (Healthy-ish)
  const projectA = await prisma.project.upsert({
    where: { id: 'fixture-payments-migration' },
    update: {},
    create: {
      id: 'fixture-payments-migration',
      workspaceId: workspace.id,
      orgId: orgId,
      name: 'Payments Migration',
      description: 'Migrate payment processing to new infrastructure',
      status: 'ACTIVE',
      createdById: alex.id,
    },
  })

  await prisma.projectAccountability.upsert({
    where: { projectId: projectA.id },
    update: {},
    create: {
      workspaceId: workspace.id,
      projectId: projectA.id,
      ownerRole: 'Product Manager',
      decisionRole: 'Engineering Manager',
      escalationPersonId: sam.id,
    },
  })

  // Project B: Incident Hardening (Constrained)
  const projectB = await prisma.project.upsert({
    where: { id: 'fixture-incident-hardening' },
    update: {},
    create: {
      id: 'fixture-incident-hardening',
      workspaceId: workspace.id,
      orgId: orgId,
      name: 'Incident Hardening',
      description: 'Improve system reliability and incident response',
      status: 'ACTIVE',
      createdById: sam.id,
    },
  })

  await prisma.projectAccountability.upsert({
    where: { projectId: projectB.id },
    update: {},
    create: {
      workspaceId: workspace.id,
      projectId: projectB.id,
      ownerPersonId: sam.id,
      decisionPersonId: sam.id,
    },
  })

  // Project C: New Market Expansion (Insufficient data)
  const projectC = await prisma.project.upsert({
    where: { id: 'fixture-market-expansion' },
    update: {},
    create: {
      id: 'fixture-market-expansion',
      workspaceId: workspace.id,
      orgId: orgId,
      name: 'New Market Expansion',
      description: 'Expand into new geographic markets',
      status: 'ACTIVE',
      createdById: alex.id,
    },
  })

  await prisma.projectAccountability.upsert({
    where: { projectId: projectC.id },
    update: {},
    create: {
      workspaceId: workspace.id,
      projectId: projectC.id,
      ownerRole: 'Product Manager',
      // No decision authority set
    },
  })

  // Project D: Legacy Cleanup (Role misalignment)
  const projectD = await prisma.project.upsert({
    where: { id: 'fixture-legacy-cleanup' },
    update: {},
    create: {
      id: 'fixture-legacy-cleanup',
      workspaceId: workspace.id,
      orgId: orgId,
      name: 'Legacy Cleanup',
      description: 'Refactor and modernize legacy codebase',
      status: 'ACTIVE',
      createdById: sam.id,
    },
  })

  await prisma.projectAccountability.upsert({
    where: { projectId: projectD.id },
    update: {},
    create: {
      workspaceId: workspace.id,
      projectId: projectD.id,
      ownerRole: 'Product Manager',
      decisionRole: 'Product Manager',
    },
  })

  console.log('✅ Created 4 projects with varying accountability states')

  // Create Allocations
  // Delete existing allocations first
  await prisma.projectAllocation.deleteMany({
    where: {
      projectId: { in: [projectA.id, projectB.id] },
    },
  })

  // Project A: Sam 0.3, Chris 0.2
  await prisma.projectAllocation.create({
    data: {
      workspaceId: orgId,
      projectId: projectA.id,
      personId: sam.id,
      fraction: 0.3,
      startDate: new Date('2025-12-01T00:00:00.000Z'),
    },
  })

  await prisma.projectAllocation.create({
    data: {
      workspaceId: orgId,
      projectId: projectA.id,
      personId: chris.id,
      fraction: 0.2,
      startDate: new Date('2025-12-01T00:00:00.000Z'),
    },
  })

  // Project B: Sam 0.8, Dana 0.6
  await prisma.projectAllocation.create({
    data: {
      workspaceId: orgId,
      projectId: projectB.id,
      personId: sam.id,
      fraction: 0.8,
      startDate: new Date('2025-12-01T00:00:00.000Z'),
    },
  })

  await prisma.projectAllocation.create({
    data: {
      workspaceId: orgId,
      projectId: projectB.id,
      personId: dana.id,
      fraction: 0.6,
      startDate: new Date('2025-12-01T00:00:00.000Z'),
    },
  })

  console.log('✅ Created project allocations')

  // Output fixture IDs as JSON
  const fixtureIds = {
    orgId: org.id,
    workspaceId: workspace.id,
    people: {
      alexId: alex.id,
      samId: sam.id,
      danaId: dana.id,
      chrisId: chris.id,
    },
    projects: {
      paymentsId: projectA.id,
      incidentId: projectB.id,
      expansionId: projectC.id,
      cleanupId: projectD.id,
    },
  }

  console.log('')
  console.log('📋 Fixture IDs (save this for test sweep):')
  console.log(JSON.stringify(fixtureIds, null, 2))
  console.log('')

  // Write to file for test sweep script
  const fixturePath = path.join(process.cwd(), 'loopbrain-fixtures.json')
  fs.writeFileSync(fixturePath, JSON.stringify(fixtureIds, null, 2))
  console.log(`💾 Saved fixture IDs to: ${fixturePath}`)

  console.log('✅ Loopbrain Fixtures seed completed!')
  return fixtureIds
}

