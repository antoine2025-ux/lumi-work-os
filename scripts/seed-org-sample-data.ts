/**
 * Org sample data seed script.
 *
 * DEVELOPMENT ONLY – do not run against production.
 * Idempotent – safe to run multiple times.
 * Seeds a demo org with departments, teams, roles, and ~50 people.
 *
 * CRITICAL REQUIREMENTS:
 * - Every seeded person MUST have a complete assignment:
 *   - Workspace membership (WorkspaceMember)
 *   - OrgPosition with teamId, title (role), and level
 *   - The team MUST have a departmentId
 * - This ensures no "Unassigned" badges appear in Team/Department/Role columns
 *
 * Usage (development only):
 *   npm run dev:seed-org
 *
 * The script is idempotent - running it multiple times will not create duplicates.
 * It uses stable identifiers (workspace slug, department/team names, email-based position IDs) for upserts.
 */

import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables from .env.local (Next.js convention) or .env
config({ path: resolve(process.cwd(), '.env.local') })
config({ path: resolve(process.cwd(), '.env') })

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Environment safety checks
const PROD_LOCK = process.env.PROD_LOCK === 'true'
const NODE_ENV = process.env.NODE_ENV || 'development'

// Stable workspace identifier for demo data
const DEMO_WORKSPACE_SLUG = 'demo-org-sample'

// Department definitions
const DEPARTMENTS = [
  { name: 'Engineering', description: 'Software development and technical infrastructure', color: '#3b82f6', order: 0 },
  { name: 'Product', description: 'Product strategy, roadmap, and feature development', color: '#8b5cf6', order: 1 },
  { name: 'Design', description: 'User experience and visual design', color: '#ec4899', order: 2 },
  { name: 'Marketing', description: 'Brand, growth, and customer acquisition', color: '#f59e0b', order: 3 },
  { name: 'Sales', description: 'Customer acquisition and revenue', color: '#10b981', order: 4 },
  { name: 'Operations', description: 'Business operations and customer success', color: '#6366f1', order: 5 },
  { name: 'People', description: 'Human resources and people operations', color: '#14b8a6', order: 6 },
] as const

// Team definitions (mapped to departments by index)
const TEAMS = [
  // Engineering (0)
  { name: 'Platform', departmentIndex: 0, description: 'Core platform and infrastructure', order: 0 },
  { name: 'API', departmentIndex: 0, description: 'API development and integration', order: 1 },
  { name: 'Frontend', departmentIndex: 0, description: 'User-facing applications', order: 2 },
  { name: 'Infrastructure', departmentIndex: 0, description: 'DevOps and infrastructure', order: 3 },
  
  // Product (1)
  { name: 'Core Product', departmentIndex: 1, description: 'Main product features', order: 0 },
  { name: 'Experiments', departmentIndex: 1, description: 'Product experiments and innovation', order: 1 },
  
  // Design (2)
  { name: 'Product Design', departmentIndex: 2, description: 'Product UX and interaction design', order: 0 },
  { name: 'Brand', departmentIndex: 2, description: 'Brand identity and visual design', order: 1 },
  
  // Sales (4)
  { name: 'SMB Sales', departmentIndex: 4, description: 'Small and medium business sales', order: 0 },
  { name: 'Enterprise Sales', departmentIndex: 4, description: 'Enterprise customer sales', order: 1 },
  
  // Marketing (3)
  { name: 'Growth', departmentIndex: 3, description: 'Growth marketing and acquisition', order: 0 },
  { name: 'Content', departmentIndex: 3, description: 'Content marketing and communications', order: 1 },
  
  // Operations (5)
  { name: 'Operations', departmentIndex: 5, description: 'Business operations and customer success', order: 0 },
  
  // People (6)
  { name: 'People Operations', departmentIndex: 6, description: 'HR and people operations', order: 0 },
] as const

// Role definitions with levels
const ROLES = [
  // Engineering roles
  { title: 'Engineer I', level: 1, teamPattern: /Platform|API|Frontend|Infrastructure/ },
  { title: 'Engineer II', level: 2, teamPattern: /Platform|API|Frontend|Infrastructure/ },
  { title: 'Senior Engineer', level: 3, teamPattern: /Platform|API|Frontend|Infrastructure/ },
  { title: 'Staff Engineer', level: 4, teamPattern: /Platform|API|Frontend|Infrastructure/ },
  { title: 'Engineering Manager', level: 3, teamPattern: /Platform|API|Frontend|Infrastructure/ },
  
  // Product roles
  { title: 'Product Manager', level: 2, teamPattern: /Core Product|Experiments/ },
  { title: 'Senior Product Manager', level: 3, teamPattern: /Core Product|Experiments/ },
  { title: 'Product Lead', level: 4, teamPattern: /Core Product|Experiments/ },
  
  // Design roles
  { title: 'Product Designer', level: 2, teamPattern: /Product Design/ },
  { title: 'Senior Product Designer', level: 3, teamPattern: /Product Design/ },
  { title: 'Design Lead', level: 4, teamPattern: /Product Design|Brand/ },
  { title: 'Brand Designer', level: 2, teamPattern: /Brand/ },
  
  // Sales roles
  { title: 'Account Executive (SMB)', level: 2, teamPattern: /SMB Sales/ },
  { title: 'Account Executive (Enterprise)', level: 3, teamPattern: /Enterprise Sales/ },
  { title: 'Sales Manager', level: 3, teamPattern: /SMB Sales|Enterprise Sales/ },
  
  // Marketing roles
  { title: 'Growth Marketer', level: 2, teamPattern: /Growth/ },
  { title: 'Marketing Manager', level: 3, teamPattern: /Growth|Content/ },
  { title: 'Content Strategist', level: 2, teamPattern: /Content/ },
  
  // Operations roles
  { title: 'Customer Success Manager', level: 2, teamPattern: /Operations/ },
  { title: 'Operations Manager', level: 3, teamPattern: /Operations/ },
  
  // People roles
  { title: 'People Ops Specialist', level: 2, teamPattern: /People Operations/ },
  { title: 'People Ops Manager', level: 3, teamPattern: /People Operations/ },
] as const

// Sample people data (50 people)
const PEOPLE = [
  // Engineering - Platform (4 people)
  { firstName: 'Alex', lastName: 'Chen', email: 'alex.chen+demo01@loopwell.dev', teamName: 'Platform', roleTitle: 'Senior Engineer', level: 3 },
  { firstName: 'Jordan', lastName: 'Martinez', email: 'jordan.martinez+demo02@loopwell.dev', teamName: 'Platform', roleTitle: 'Engineer II', level: 2 },
  { firstName: 'Sam', lastName: 'Kim', email: 'sam.kim+demo03@loopwell.dev', teamName: 'Platform', roleTitle: 'Engineer I', level: 1 },
  { firstName: 'Taylor', lastName: 'Brown', email: 'taylor.brown+demo04@loopwell.dev', teamName: 'Platform', roleTitle: 'Engineering Manager', level: 3 },
  
  // Engineering - API (4 people)
  { firstName: 'Casey', lastName: 'Wilson', email: 'casey.wilson+demo05@loopwell.dev', teamName: 'API', roleTitle: 'Staff Engineer', level: 4 },
  { firstName: 'Morgan', lastName: 'Davis', email: 'morgan.davis+demo06@loopwell.dev', teamName: 'API', roleTitle: 'Senior Engineer', level: 3 },
  { firstName: 'Riley', lastName: 'Garcia', email: 'riley.garcia+demo07@loopwell.dev', teamName: 'API', roleTitle: 'Engineer II', level: 2 },
  { firstName: 'Avery', lastName: 'Rodriguez', email: 'avery.rodriguez+demo08@loopwell.dev', teamName: 'API', roleTitle: 'Engineer I', level: 1 },
  
  // Engineering - Frontend (5 people)
  { firstName: 'Quinn', lastName: 'Lee', email: 'quinn.lee+demo09@loopwell.dev', teamName: 'Frontend', roleTitle: 'Senior Engineer', level: 3 },
  { firstName: 'Blake', lastName: 'White', email: 'blake.white+demo10@loopwell.dev', teamName: 'Frontend', roleTitle: 'Engineer II', level: 2 },
  { firstName: 'Cameron', lastName: 'Harris', email: 'cameron.harris+demo11@loopwell.dev', teamName: 'Frontend', roleTitle: 'Engineer II', level: 2 },
  { firstName: 'Dakota', lastName: 'Clark', email: 'dakota.clark+demo12@loopwell.dev', teamName: 'Frontend', roleTitle: 'Engineer I', level: 1 },
  { firstName: 'Emery', lastName: 'Lewis', email: 'emery.lewis+demo13@loopwell.dev', teamName: 'Frontend', roleTitle: 'Engineering Manager', level: 3 },
  
  // Engineering - Infrastructure (3 people)
  { firstName: 'Finley', lastName: 'Walker', email: 'finley.walker+demo14@loopwell.dev', teamName: 'Infrastructure', roleTitle: 'Senior Engineer', level: 3 },
  { firstName: 'Hayden', lastName: 'Hall', email: 'hayden.hall+demo15@loopwell.dev', teamName: 'Infrastructure', roleTitle: 'Engineer II', level: 2 },
  { firstName: 'Jamie', lastName: 'Allen', email: 'jamie.allen+demo16@loopwell.dev', teamName: 'Infrastructure', roleTitle: 'Engineer I', level: 1 },
  
  // Product - Core Product (4 people)
  { firstName: 'Kai', lastName: 'Young', email: 'kai.young+demo17@loopwell.dev', teamName: 'Core Product', roleTitle: 'Product Lead', level: 4 },
  { firstName: 'Logan', lastName: 'King', email: 'logan.king+demo18@loopwell.dev', teamName: 'Core Product', roleTitle: 'Senior Product Manager', level: 3 },
  { firstName: 'Noah', lastName: 'Wright', email: 'noah.wright+demo19@loopwell.dev', teamName: 'Core Product', roleTitle: 'Product Manager', level: 2 },
  { firstName: 'Parker', lastName: 'Lopez', email: 'parker.lopez+demo20@loopwell.dev', teamName: 'Core Product', roleTitle: 'Product Manager', level: 2 },
  
  // Product - Experiments (2 people)
  { firstName: 'Quinn', lastName: 'Hill', email: 'quinn.hill+demo21@loopwell.dev', teamName: 'Experiments', roleTitle: 'Senior Product Manager', level: 3 },
  { firstName: 'Reese', lastName: 'Scott', email: 'reese.scott+demo22@loopwell.dev', teamName: 'Experiments', roleTitle: 'Product Manager', level: 2 },
  
  // Design - Product Design (3 people)
  { firstName: 'Sage', lastName: 'Green', email: 'sage.green+demo23@loopwell.dev', teamName: 'Product Design', roleTitle: 'Design Lead', level: 4 },
  { firstName: 'Skyler', lastName: 'Adams', email: 'skyler.adams+demo24@loopwell.dev', teamName: 'Product Design', roleTitle: 'Senior Product Designer', level: 3 },
  { firstName: 'Tatum', lastName: 'Baker', email: 'tatum.baker+demo25@loopwell.dev', teamName: 'Product Design', roleTitle: 'Product Designer', level: 2 },
  
  // Design - Brand (2 people)
  { firstName: 'River', lastName: 'Nelson', email: 'river.nelson+demo26@loopwell.dev', teamName: 'Brand', roleTitle: 'Design Lead', level: 4 },
  { firstName: 'Rowan', lastName: 'Carter', email: 'rowan.carter+demo27@loopwell.dev', teamName: 'Brand', roleTitle: 'Brand Designer', level: 2 },
  
  // Sales - SMB Sales (4 people)
  { firstName: 'Sawyer', lastName: 'Mitchell', email: 'sawyer.mitchell+demo28@loopwell.dev', teamName: 'SMB Sales', roleTitle: 'Sales Manager', level: 3 },
  { firstName: 'Sloane', lastName: 'Perez', email: 'sloane.perez+demo29@loopwell.dev', teamName: 'SMB Sales', roleTitle: 'Account Executive (SMB)', level: 2 },
  { firstName: 'Spencer', lastName: 'Roberts', email: 'spencer.roberts+demo30@loopwell.dev', teamName: 'SMB Sales', roleTitle: 'Account Executive (SMB)', level: 2 },
  { firstName: 'Stevie', lastName: 'Turner', email: 'stevie.turner+demo31@loopwell.dev', teamName: 'SMB Sales', roleTitle: 'Account Executive (SMB)', level: 2 },
  
  // Sales - Enterprise Sales (3 people)
  { firstName: 'Tanner', lastName: 'Phillips', email: 'tanner.phillips+demo32@loopwell.dev', teamName: 'Enterprise Sales', roleTitle: 'Sales Manager', level: 3 },
  { firstName: 'Tobin', lastName: 'Campbell', email: 'tobin.campbell+demo33@loopwell.dev', teamName: 'Enterprise Sales', roleTitle: 'Account Executive (Enterprise)', level: 3 },
  { firstName: 'Tristan', lastName: 'Parker', email: 'tristan.parker+demo34@loopwell.dev', teamName: 'Enterprise Sales', roleTitle: 'Account Executive (Enterprise)', level: 3 },
  
  // Marketing - Growth (3 people)
  { firstName: 'Val', lastName: 'Evans', email: 'val.evans+demo35@loopwell.dev', teamName: 'Growth', roleTitle: 'Marketing Manager', level: 3 },
  { firstName: 'Vaughn', lastName: 'Edwards', email: 'vaughn.edwards+demo36@loopwell.dev', teamName: 'Growth', roleTitle: 'Growth Marketer', level: 2 },
  { firstName: 'Wren', lastName: 'Collins', email: 'wren.collins+demo37@loopwell.dev', teamName: 'Growth', roleTitle: 'Growth Marketer', level: 2 },
  
  // Marketing - Content (2 people)
  { firstName: 'Wyatt', lastName: 'Stewart', email: 'wyatt.stewart+demo38@loopwell.dev', teamName: 'Content', roleTitle: 'Marketing Manager', level: 3 },
  { firstName: 'Zane', lastName: 'Sanchez', email: 'zane.sanchez+demo39@loopwell.dev', teamName: 'Content', roleTitle: 'Content Strategist', level: 2 },
  
  // Operations (3 people)
  { firstName: 'Zoe', lastName: 'Morris', email: 'zoe.morris+demo40@loopwell.dev', teamName: 'Operations', roleTitle: 'Operations Manager', level: 3 },
  { firstName: 'Aiden', lastName: 'Rogers', email: 'aiden.rogers+demo41@loopwell.dev', teamName: 'Operations', roleTitle: 'Customer Success Manager', level: 2 },
  { firstName: 'Avery', lastName: 'Reed', email: 'avery.reed+demo42@loopwell.dev', teamName: 'Operations', roleTitle: 'Customer Success Manager', level: 2 },
  
  // People (3 people)
  { firstName: 'Blake', lastName: 'Cook', email: 'blake.cook+demo43@loopwell.dev', teamName: 'People Operations', roleTitle: 'People Ops Manager', level: 3 },
  { firstName: 'Cameron', lastName: 'Morgan', email: 'cameron.morgan+demo44@loopwell.dev', teamName: 'People Operations', roleTitle: 'People Ops Specialist', level: 2 },
  { firstName: 'Dakota', lastName: 'Bell', email: 'dakota.bell+demo45@loopwell.dev', teamName: 'People Operations', roleTitle: 'People Ops Specialist', level: 2 },
  
  // Additional people to reach 50 (distributed across teams)
  { firstName: 'Emery', lastName: 'Murphy', email: 'emery.murphy+demo46@loopwell.dev', teamName: 'Frontend', roleTitle: 'Engineer I', level: 1 },
  { firstName: 'Finley', lastName: 'Bailey', email: 'finley.bailey+demo47@loopwell.dev', teamName: 'API', roleTitle: 'Engineer II', level: 2 },
  { firstName: 'Hayden', lastName: 'Rivera', email: 'hayden.rivera+demo48@loopwell.dev', teamName: 'Core Product', roleTitle: 'Product Manager', level: 2 },
  { firstName: 'Jamie', lastName: 'Cooper', email: 'jamie.cooper+demo49@loopwell.dev', teamName: 'SMB Sales', roleTitle: 'Account Executive (SMB)', level: 2 },
  { firstName: 'Kai', lastName: 'Richardson', email: 'kai.richardson+demo50@loopwell.dev', teamName: 'Growth', roleTitle: 'Growth Marketer', level: 2 },
] as const

async function seedOrgSampleData() {
  // Production safety check
  if (PROD_LOCK && NODE_ENV === 'production') {
    console.log('🚫 Production lock enabled - dev seed data creation blocked')
    console.log('ℹ️  Dev seed should only run in development environments')
    process.exit(1)
  }

  if (NODE_ENV === 'production') {
    console.log('🚫 This script should not be run in production')
    console.log('ℹ️  Use proper data migration tools in production')
    process.exit(1)
  }

  console.log('🌱 Seeding Org Center sample data...')
  console.log(`📊 Environment: ${NODE_ENV}`)

  try {
    // 1. Get or create dev user
    const devUser = await prisma.user.upsert({
      where: { email: 'dev@lumi.com' },
      update: {},
      create: {
        email: 'dev@lumi.com',
        name: 'Dev User',
      },
    })
    console.log('✅ Dev user created/found:', devUser.email)

    // 2. Get or create demo workspace
    let workspace = await prisma.workspace.findUnique({
      where: { slug: DEMO_WORKSPACE_SLUG },
    })

    if (!workspace) {
      workspace = await prisma.workspace.create({
        data: {
          name: 'Demo Org',
          slug: DEMO_WORKSPACE_SLUG,
          description: 'Sample organization for Org Center development and testing',
          ownerId: devUser.id,
        },
      })
    }
    console.log('✅ Workspace created/found:', workspace.name)

    // 3. Ensure dev user is workspace owner
    await prisma.workspaceMember.upsert({
      where: {
        workspaceId_userId: {
          workspaceId: workspace.id,
          userId: devUser.id,
        },
      },
      update: { role: 'OWNER' },
      create: {
        userId: devUser.id,
        workspaceId: workspace.id,
        role: 'OWNER',
      },
    })
    console.log('✅ Dev user added as workspace owner')

    // 4. Add all existing users (except dev user) to demo workspace so they can see the seeded data
    // Set joinedAt to an early date so this workspace becomes the default (first membership)
    const earlyDate = new Date('2024-01-01')
    const userEmailToAdd = process.env.USER_EMAIL
    if (userEmailToAdd) {
      const userToAdd = await prisma.user.findUnique({
        where: { email: userEmailToAdd },
      })
      if (userToAdd) {
        await prisma.workspaceMember.upsert({
          where: {
            workspaceId_userId: {
              workspaceId: workspace.id,
              userId: userToAdd.id,
            },
          },
          update: { role: 'ADMIN', joinedAt: earlyDate },
          create: {
            userId: userToAdd.id,
            workspaceId: workspace.id,
            role: 'ADMIN',
            joinedAt: earlyDate, // Set early date to make this the default workspace
          },
        })
        console.log(`✅ Added user ${userEmailToAdd} to demo workspace as ADMIN`)
      } else {
        console.log(`⚠️  User ${userEmailToAdd} not found in database`)
      }
    } else {
      // If no USER_EMAIL specified, add all existing users to demo workspace
      const allUsers = await prisma.user.findMany({
        where: {
          email: { not: 'dev@lumi.com' }, // Exclude the dev user we already added
        },
      })
      if (allUsers.length > 0) {
        console.log(`\n👥 Adding ${allUsers.length} existing user(s) to demo workspace...`)
        for (const user of allUsers) {
          await prisma.workspaceMember.upsert({
            where: {
              workspaceId_userId: {
                workspaceId: workspace.id,
                userId: user.id,
              },
            },
            update: { role: 'ADMIN', joinedAt: earlyDate },
            create: {
              userId: user.id,
              workspaceId: workspace.id,
              role: 'ADMIN',
              joinedAt: earlyDate, // Set early date to make this the default workspace
            },
          })
        }
        console.log(`✅ Added ${allUsers.length} user(s) to demo workspace as ADMIN (set as default)`)
      }
    }

    // 4. Upsert departments
    console.log('\n📁 Creating departments...')
    const departments = new Map<string, { id: string; name: string }>()
    
    for (const dept of DEPARTMENTS) {
      const department = await prisma.orgDepartment.upsert({
        where: {
          workspaceId_name: {
            workspaceId: workspace.id,
            name: dept.name,
          },
        },
        update: {
          description: dept.description,
          color: dept.color,
          order: dept.order,
          isActive: true,
        },
        create: {
          workspaceId: workspace.id,
          name: dept.name,
          description: dept.description,
          color: dept.color,
          order: dept.order,
          isActive: true,
        },
      })
      departments.set(dept.name, { id: department.id, name: department.name })
      console.log(`  ✓ ${dept.name}`)
    }

    // 5. Upsert teams
    console.log('\n👥 Creating teams...')
    const teams = new Map<string, { id: string; name: string; departmentId: string }>()
    
    for (const team of TEAMS) {
      const department = departments.get(DEPARTMENTS[team.departmentIndex].name)
      if (!department) {
        throw new Error(`Department not found for team: ${team.name}`)
      }

      const teamRecord = await prisma.orgTeam.upsert({
        where: {
          workspaceId_departmentId_name: {
            workspaceId: workspace.id,
            departmentId: department.id,
            name: team.name,
          },
        },
        update: {
          description: team.description,
          order: team.order,
          isActive: true,
        },
        create: {
          workspaceId: workspace.id,
          departmentId: department.id,
          name: team.name,
          description: team.description,
          order: team.order,
          isActive: true,
        },
      })
      teams.set(team.name, { id: teamRecord.id, name: teamRecord.name, departmentId: department.id })
      console.log(`  ✓ ${team.name} (${DEPARTMENTS[team.departmentIndex].name})`)
    }

    // 6. Create users and assign them to workspace, teams, and roles
    // CRITICAL: Every seeded person MUST have:
    //   - A workspace membership
    //   - An OrgPosition with teamId, title (role), and level
    //   - The team MUST have a departmentId
    // This ensures no "Unassigned" badges appear in the UI
    console.log('\n👤 Creating people and assignments...')
    let createdCount = 0
    let skippedCount = 0
    const errors: string[] = []

    for (const person of PEOPLE) {
      // Validate team exists
      const team = teams.get(person.teamName)
      if (!team) {
        const error = `Team not found: ${person.teamName} for ${person.email}`
        console.warn(`⚠️  ${error}`)
        errors.push(error)
        skippedCount++
        continue
      }

      // Validate department exists for this team
      const department = Array.from(departments.values()).find(d => d.id === team.departmentId)
      if (!department) {
        const error = `Department not found for team ${person.teamName} (teamId: ${team.id}) for ${person.email}`
        console.warn(`⚠️  ${error}`)
        errors.push(error)
        skippedCount++
        continue
      }

      // Validate role title is provided
      if (!person.roleTitle || !person.roleTitle.trim()) {
        const error = `Role title missing for ${person.email}`
        console.warn(`⚠️  ${error}`)
        errors.push(error)
        skippedCount++
        continue
      }

      try {
        // Upsert user
        const user = await prisma.user.upsert({
          where: { email: person.email },
          update: {
            name: `${person.firstName} ${person.lastName}`,
          },
          create: {
            email: person.email,
            name: `${person.firstName} ${person.lastName}`,
            emailVerified: new Date(),
          },
        })

        // Upsert workspace membership (required for person to appear in org)
        await prisma.workspaceMember.upsert({
          where: {
            workspaceId_userId: {
              workspaceId: workspace.id,
              userId: user.id,
            },
          },
          update: {
            // Keep existing role if updating
          },
          create: {
            workspaceId: workspace.id,
            userId: user.id,
            role: 'MEMBER',
            joinedAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000), // Random join date within last year
          },
        })

        // Upsert position (role) for this user
        // This is CRITICAL: The OrgPosition with teamId is what drives Team/Department/Role columns in /org/people
        const positionId = `demo-pos-${person.email}` // Stable ID based on email for idempotency
        await prisma.orgPosition.upsert({
          where: {
            id: positionId,
          },
          update: {
            // Update all fields to ensure assignments are current
            title: person.roleTitle,
            level: person.level,
            teamId: team.id, // CRITICAL: This links to team, which links to department
            workspaceId: workspace.id,
            userId: user.id,
            isActive: true,
          },
          create: {
            id: positionId,
            workspaceId: workspace.id,
            userId: user.id,
            title: person.roleTitle, // CRITICAL: This is what shows in the Role column
            level: person.level,
            teamId: team.id, // CRITICAL: This is what shows in the Team column (via team.name)
            // Department is derived from team.departmentId, so no need to set it directly
            isActive: true,
            order: 0,
          },
        })

        createdCount++
        if (createdCount % 10 === 0) {
          console.log(`  ✓ Created/updated ${createdCount} people...`)
        }
      } catch (error: any) {
        const errorMsg = `Failed to create/update ${person.email}: ${error?.message || 'Unknown error'}`
        console.error(`❌ ${errorMsg}`)
        errors.push(errorMsg)
        skippedCount++
      }
    }

    console.log(`\n✅ Created/updated ${createdCount} people`)
    if (skippedCount > 0) {
      console.log(`⚠️  Skipped ${skippedCount} people due to errors`)
      if (errors.length > 0) {
        console.log('\nErrors encountered:')
        errors.slice(0, 5).forEach(err => console.log(`  - ${err}`))
        if (errors.length > 5) {
          console.log(`  ... and ${errors.length - 5} more errors`)
        }
      }
    }

    // 7. Verification and Summary
    console.log('\n📊 Verifying assignments...')
    
    // Verify all seeded people have complete assignments
    const allPositions = await prisma.orgPosition.findMany({
      where: {
        workspaceId: workspace.id,
        isActive: true,
        userId: { not: null },
        id: { startsWith: 'demo-pos-' }, // Only check seeded positions
      },
      include: {
        team: {
          include: {
            department: true,
          },
        },
        user: {
          select: {
            email: true,
            name: true,
          },
        },
      },
    })

    const incompleteAssignments: string[] = []
    for (const pos of allPositions) {
      if (!pos.teamId) {
        incompleteAssignments.push(`${pos.user?.email || 'Unknown'}: Missing teamId`)
      } else if (!pos.team) {
        incompleteAssignments.push(`${pos.user?.email || 'Unknown'}: Team not found (teamId: ${pos.teamId})`)
      } else if (!pos.team.departmentId) {
        incompleteAssignments.push(`${pos.user?.email || 'Unknown'}: Team "${pos.team.name}" missing departmentId`)
      } else if (!pos.team.department) {
        incompleteAssignments.push(`${pos.user?.email || 'Unknown'}: Department not found for team "${pos.team.name}"`)
      } else if (!pos.title || !pos.title.trim()) {
        incompleteAssignments.push(`${pos.user?.email || 'Unknown'}: Missing role title`)
      }
    }

    if (incompleteAssignments.length > 0) {
      console.log(`\n⚠️  WARNING: Found ${incompleteAssignments.length} incomplete assignments:`)
      incompleteAssignments.slice(0, 10).forEach(msg => console.log(`  - ${msg}`))
      if (incompleteAssignments.length > 10) {
        console.log(`  ... and ${incompleteAssignments.length - 10} more`)
      }
    } else {
      console.log('  ✓ All seeded people have complete assignments (team, department, role)')
    }

    const stats = {
      departments: await prisma.orgDepartment.count({ where: { workspaceId: workspace.id, isActive: true } }),
      teams: await prisma.orgTeam.count({ where: { workspaceId: workspace.id, isActive: true } }),
      positions: await prisma.orgPosition.count({ where: { workspaceId: workspace.id, isActive: true, userId: { not: null } } }),
      members: await prisma.workspaceMember.count({ where: { workspaceId: workspace.id } }),
      seededPositions: allPositions.length,
    }

    console.log('\n📊 Summary:')
    console.log(`  • Departments: ${stats.departments}`)
    console.log(`  • Teams: ${stats.teams}`)
    console.log(`  • People with roles: ${stats.positions}`)
    console.log(`  • Seeded people: ${stats.seededPositions}`)
    console.log(`  • Workspace members: ${stats.members}`)
    console.log('\n🎉 Org Center sample data seeding completed!')
    console.log(`\n📍 Workspace: ${workspace.name} (slug: ${workspace.slug})`)
    console.log('   You can now test Org Center features with this sample data.')
    console.log('\n✅ Verification: All seeded people should have Team, Department, and Role assigned (no "Unassigned" badges)')

  } catch (error) {
    console.error('❌ Error seeding Org Center sample data:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the seed function
seedOrgSampleData()
  .catch((error) => {
    console.error('❌ Seeding failed:', error)
    process.exit(1)
  })

/**
 * ===================================================
 * VERIFICATION CHECKLIST
 * ===================================================
 * 
 * After running this script, verify the following:
 * 
 * A. /org (Overview)
 *    - Shows non-zero People / Teams / Departments / Roles counts
 *    - Org insights cards show meaningful values instead of placeholder dashes
 * 
 * B. /org/people
 *    - Around 50 people are visible in the table
 *    - Filters for Team / Department / Role actually narrow the list
 *    - Sorting by Name works as expected
 *    - Search functionality works correctly
 * 
 * C. /org/structure
 *    - Departments tab: shows all 7 seeded departments and counts
 *    - Teams tab: shows all 14 teams grouped by department, with member counts
 *    - Roles tab: all seeded roles, with counts of people per role if supported
 * 
 * D. /org/chart
 *    - Org chart renders using the seeded structure (not "no data")
 *    - At least a couple of layers are visible (departments → teams → people/leads)
 * 
 * E. /org/insights
 *    - Summary cards show people/teams/departments/roles counts
 *    - Any charts (e.g., headcount over time, by department) display real-looking data
 * 
 * F. /org/settings
 *    - Members tab shows the 50 demo members assigned to the org
 *    - Invites / other tabs behave normally with this demo data
 * 
 * ===================================================
 */

