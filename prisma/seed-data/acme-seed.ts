/**
 * Acme Analytics — Seed Orchestrator
 *
 * Creates the full "Acme Analytics" workspace in dependency order:
 * Workspace → Departments → Teams → Users → WorkspaceMembers →
 * OrgPositions → PersonManagerLinks → Projects → Epics → Tasks →
 * ProjectMembers → WikiPages → ProjectAllocations
 */

import { PrismaClient } from '@prisma/client'
import { ACME_PEOPLE, type AcmePerson } from './acme-people'
import { ACME_PROJECTS, type AcmeProject } from './acme-projects'
import { ACME_WIKI_PAGES } from './acme-wiki'

// ─── Department & Team definitions ───────────────────────────
interface DeptDef {
  key: string
  name: string
  description: string
  color: string
  order: number
}

interface TeamDef {
  key: string
  name: string
  description: string
  departmentKey: string
  color: string
  order: number
  leaderKey: string | null
}

const DEPARTMENTS: DeptDef[] = [
  { key: 'executive', name: 'Executive', description: 'Executive leadership and company strategy', color: '#6366F1', order: 0 },
  { key: 'engineering', name: 'Engineering', description: 'Product development, infrastructure, and technical operations', color: '#3B82F6', order: 1 },
  { key: 'product-design', name: 'Product & Design', description: 'Product management, UX research, and visual design', color: '#8B5CF6', order: 2 },
  { key: 'gtm', name: 'Go-to-Market', description: 'Sales, marketing, and revenue operations', color: '#F59E0B', order: 3 },
  { key: 'operations', name: 'Operations', description: 'Finance, people operations, and customer success', color: '#10B981', order: 4 },
]

const TEAMS: TeamDef[] = [
  { key: 'leadership', name: 'Leadership Team', description: 'C-suite and department heads', departmentKey: 'executive', color: '#6366F1', order: 0, leaderKey: 'sarah-chen' },
  { key: 'backend', name: 'Backend Engineering', description: 'APIs, data pipelines, and database infrastructure', departmentKey: 'engineering', color: '#3B82F6', order: 0, leaderKey: 'james-kim' },
  { key: 'frontend', name: 'Frontend Engineering', description: 'Dashboard UI, chart rendering, and web application', departmentKey: 'engineering', color: '#60A5FA', order: 1, leaderKey: 'lisa-zhang' },
  { key: 'devops', name: 'DevOps & Infrastructure', description: 'CI/CD, cloud infrastructure, and monitoring', departmentKey: 'engineering', color: '#2DD4BF', order: 2, leaderKey: null },
  { key: 'product', name: 'Product Management', description: 'Product strategy, roadmapping, and requirements', departmentKey: 'product-design', color: '#8B5CF6', order: 0, leaderKey: null },
  { key: 'design', name: 'Design', description: 'UX design, visual design, and design system', departmentKey: 'product-design', color: '#A78BFA', order: 1, leaderKey: null },
  { key: 'sales', name: 'Sales', description: 'Enterprise and mid-market sales', departmentKey: 'gtm', color: '#F59E0B', order: 0, leaderKey: null },
  { key: 'marketing', name: 'Marketing', description: 'Demand generation, content, and brand', departmentKey: 'gtm', color: '#FBBF24', order: 1, leaderKey: null },
  { key: 'ops-team', name: 'Operations', description: 'Finance, HR, and customer success', departmentKey: 'operations', color: '#10B981', order: 0, leaderKey: null },
]

// ─── Allocation definitions ──────────────────────────────────
interface AllocationDef {
  personKey: string
  projectKey: string
  fraction: number
  note: string
}

const ALLOCATIONS: AllocationDef[] = [
  // CEO: 10% oversight on all projects
  { personKey: 'sarah-chen', projectKey: 'enterprise-dashboard', fraction: 0.1, note: 'Executive oversight' },
  { personKey: 'sarah-chen', projectKey: 'customer-onboarding', fraction: 0.05, note: 'Executive oversight' },

  // Enterprise Dashboard team
  { personKey: 'raj-krishnamurthy', projectKey: 'enterprise-dashboard', fraction: 0.7, note: 'Product lead' },
  { personKey: 'james-kim', projectKey: 'enterprise-dashboard', fraction: 0.6, note: 'Backend lead — RBAC & permissions' },
  { personKey: 'priya-sharma', projectKey: 'enterprise-dashboard', fraction: 0.5, note: 'Permission middleware & APIs' },
  { personKey: 'noah-williams', projectKey: 'enterprise-dashboard', fraction: 0.8, note: 'SAML SSO implementation' },
  { personKey: 'fatima-al-rashid', projectKey: 'enterprise-dashboard', fraction: 0.6, note: 'Audit logging' },
  { personKey: 'tyler-okonkwo', projectKey: 'enterprise-dashboard', fraction: 0.7, note: 'Pivot table component' },
  { personKey: 'lisa-zhang', projectKey: 'enterprise-dashboard', fraction: 0.4, note: 'Geo map visualization' },
  { personKey: 'alex-patel', projectKey: 'enterprise-dashboard', fraction: 0.3, note: 'Staging env & infra' },
  { personKey: 'daniel-nakamura', projectKey: 'enterprise-dashboard', fraction: 0.3, note: 'RBAC UI design' },

  // Marketing Website
  { personKey: 'megan-obrien', projectKey: 'marketing-website', fraction: 0.6, note: 'Project lead — demand gen' },
  { personKey: 'sophie-dubois', projectKey: 'marketing-website', fraction: 0.5, note: 'Brand redesign' },
  { personKey: 'yuki-tanaka', projectKey: 'marketing-website', fraction: 0.4, note: 'Case studies & copy' },
  { personKey: 'maria-santos', projectKey: 'marketing-website', fraction: 0.3, note: 'Frontend implementation' },
  { personKey: 'daniel-nakamura', projectKey: 'marketing-website', fraction: 0.2, note: 'Homepage wireframes' },

  // Sales Enablement (reduced due to ON_HOLD)
  { personKey: 'david-wilson', projectKey: 'sales-enablement', fraction: 0.2, note: 'Project sponsor' },
  { personKey: 'chris-hernandez', projectKey: 'sales-enablement', fraction: 0.15, note: 'Requirements & testing' },
  { personKey: 'aisha-johnson', projectKey: 'sales-enablement', fraction: 0.2, note: 'Battlecard content' },
  { personKey: 'olivia-park', projectKey: 'sales-enablement', fraction: 0.15, note: 'Pipeline board design' },

  // Customer Onboarding
  { personKey: 'olivia-park', projectKey: 'customer-onboarding', fraction: 0.5, note: 'Product lead' },
  { personKey: 'jordan-mitchell', projectKey: 'customer-onboarding', fraction: 0.6, note: 'Customer research & health scoring' },
  { personKey: 'priya-sharma', projectKey: 'customer-onboarding', fraction: 0.3, note: 'Onboarding API' },
  { personKey: 'maria-santos', projectKey: 'customer-onboarding', fraction: 0.4, note: 'Wizard UI' },
  { personKey: 'hannah-foster', projectKey: 'customer-onboarding', fraction: 0.3, note: 'Email templates & onboarding process' },
]

// ─── Helper: position level from person data ─────────────────
function positionLevel(person: AcmePerson): number {
  return person.level
}

// ─── Main seed function ──────────────────────────────────────
export async function seedAcmeWorkspace(prisma: PrismaClient) {
  console.log('')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('  Seeding: Acme Analytics Workspace')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  // ── 0. Clear if requested ──────────────────────────────────
  if (process.env.SEED_CLEAR_ACME === 'true') {
    await clearAcmeData(prisma)
  }

  // ── 1. Find or create a workspace owner ────────────────────
  const ownerData = ACME_PEOPLE.find(p => p.key === 'sarah-chen')!
  const ownerUser = await prisma.user.upsert({
    where: { email: ownerData.email },
    update: {},
    create: {
      email: ownerData.email,
      name: ownerData.name,
      emailVerified: new Date(),
      bio: ownerData.bio,
      skills: ownerData.skills,
      timezone: 'America/Los_Angeles',
      location: 'San Francisco, CA',
    },
  })

  // ── 2. Create workspace ────────────────────────────────────
  const workspace = await prisma.workspace.upsert({
    where: { slug: 'acme-analytics' },
    update: {},
    create: {
      name: 'Acme Analytics',
      slug: 'acme-analytics',
      description: 'B2B SaaS company building modern data visualization tools for mid-market companies.',
      ownerId: ownerUser.id,
      mission: 'Make data visualization accessible to every team.',
      industry: 'SaaS / Analytics',
      companySize: '11-50',
      companyType: 'startup',
      timezone: 'America/Los_Angeles',
      onboardingCompletedAt: new Date(),
    },
  })
  const wId = workspace.id
  console.log(`  ✓ Workspace: ${workspace.name} (${workspace.slug})`)

  // ── 2.5. Create Company Wiki space ─────────────────────────
  const companyWikiSpace = await prisma.space.upsert({
    where: { id: 'acme-space-company-wiki' },
    update: {},
    create: {
      id: 'acme-space-company-wiki',
      workspaceId: wId,
      name: 'Company Wiki',
      slug: 'company-wiki',
      description: 'Company-wide documentation and wiki pages',
      icon: '📚',
      color: '#3b82f6',
      visibility: 'PUBLIC',
      isPersonal: false,
      type: 'WIKI',
      ownerId: ownerUser.id,
    },
  })

  // Link to workspace
  await prisma.workspace.update({
    where: { id: wId },
    data: { companyWikiSpaceId: companyWikiSpace.id },
  })
  console.log(`  ✓ Company Wiki space: ${companyWikiSpace.id}`)

  // ── 2.75. Enable Org Loopbrain feature flag ────────────────
  await prisma.featureFlag.upsert({
    where: {
      workspaceId_key: {
        workspaceId: wId,
        key: 'org_loopbrain',
      },
    },
    update: {
      enabled: true,
    },
    create: {
      workspaceId: wId,
      key: 'org_loopbrain',
      enabled: true,
    },
  })
  console.log('  ✅ Org Loopbrain feature flag enabled')

  // ── 3. Create departments ──────────────────────────────────
  const deptMap = new Map<string, string>()
  for (const dept of DEPARTMENTS) {
    const record = await prisma.orgDepartment.upsert({
      where: { workspaceId_name: { workspaceId: wId, name: dept.name } },
      update: {},
      create: {
        workspaceId: wId,
        name: dept.name,
        description: dept.description,
        color: dept.color,
        order: dept.order,
        isActive: true,
      },
    })
    deptMap.set(dept.key, record.id)
  }
  console.log(`  ✓ Departments: ${DEPARTMENTS.length}`)

  // ── 4. Create users (all 20) ───────────────────────────────
  const userMap = new Map<string, string>()
  for (const person of ACME_PEOPLE) {
    const user = await prisma.user.upsert({
      where: { email: person.email },
      update: {},
      create: {
        email: person.email,
        name: person.name,
        emailVerified: new Date(),
        bio: person.bio,
        skills: person.skills,
        timezone: 'America/Los_Angeles',
      },
    })
    userMap.set(person.key, user.id)
  }
  console.log(`  ✓ Users: ${ACME_PEOPLE.length}`)

  // ── 5. Create teams (need userMap for leaders) ─────────────
  const teamMap = new Map<string, string>()
  for (const team of TEAMS) {
    const deptId = deptMap.get(team.departmentKey)
    const leaderId = team.leaderKey ? userMap.get(team.leaderKey) : undefined
    const record = await prisma.orgTeam.upsert({
      where: { id: `acme-team-${team.key}` },
      update: {},
      create: {
        id: `acme-team-${team.key}`,
        workspaceId: wId,
        departmentId: deptId,
        name: team.name,
        description: team.description,
        color: team.color,
        order: team.order,
        isActive: true,
        leaderId: leaderId,
      },
    })
    teamMap.set(team.key, record.id)
  }
  console.log(`  ✓ Teams: ${TEAMS.length}`)

  // ── 5.5. Create spaces for teams + General space ───────────
  const spaceMap = new Map<string, string>()
  
  // Create General space first
  const generalSpace = await prisma.space.upsert({
    where: { id: `acme-space-general` },
    update: {},
    create: {
      id: `acme-space-general`,
      workspaceId: wId,
      name: 'General',
      description: 'Default space for workspace-wide projects',
      icon: '🏢',
      color: '#6B7280',
      ownerId: ownerUser.id,
    },
  })
  spaceMap.set('general', generalSpace.id)

  // Create a space for each team
  for (const team of TEAMS) {
    const teamId = teamMap.get(team.key)!
    const space = await prisma.space.upsert({
      where: { id: `acme-space-${team.key}` },
      update: {},
      create: {
        id: `acme-space-${team.key}`,
        workspaceId: wId,
        name: team.name,
        description: `Space for ${team.name}`,
        icon: '📁',
        color: team.color,
        ownerId: ownerUser.id,
      },
    })
    spaceMap.set(team.key, space.id)
  }
  console.log(`  ✓ Spaces: ${TEAMS.length + 2} (General + Company Wiki + team spaces)`)

  // ── 6. Create workspace members ────────────────────────────
  for (const person of ACME_PEOPLE) {
    const userId = userMap.get(person.key)!
    await prisma.workspaceMember.upsert({
      where: { workspaceId_userId: { workspaceId: wId, userId } },
      update: {},
      create: {
        workspaceId: wId,
        userId,
        role: person.workspaceRole,
        joinedAt: person.startDate,
        employmentStatus: 'ACTIVE',
        employmentStartDate: person.startDate,
      },
    })
  }
  console.log(`  ✓ Workspace members: ${ACME_PEOPLE.length}`)

  // ── 7. Create OrgPositions with hierarchy ──────────────────
  // First pass: create all positions without parentId
  const positionMap = new Map<string, string>()
  for (const person of ACME_PEOPLE) {
    const teamId = teamMap.get(person.teamKey)
    const userId = userMap.get(person.key)!
    const posId = `acme-pos-${person.key}`

    await prisma.orgPosition.upsert({
      where: { id: posId },
      update: {},
      create: {
        id: posId,
        workspaceId: wId,
        userId,
        title: person.title,
        level: positionLevel(person),
        teamId,
        order: 0,
        isActive: true,
        startDate: person.startDate,
        employmentType: 'full-time',
        timezone: 'America/Los_Angeles',
      },
    })
    positionMap.set(person.key, posId)
  }

  // Second pass: wire up parentId references
  for (const person of ACME_PEOPLE) {
    if (!person.managerKey) continue
    const posId = positionMap.get(person.key)!
    const parentPosId = positionMap.get(person.managerKey)!
    await prisma.orgPosition.update({
      where: { id: posId },
      data: { parentId: parentPosId },
    })
  }
  console.log(`  ✓ Org positions: ${ACME_PEOPLE.length} (with hierarchy)`)

  // ── 8. Create PersonManagerLinks ───────────────────────────
  let linkCount = 0
  for (const person of ACME_PEOPLE) {
    if (!person.managerKey) continue
    const personUserId = userMap.get(person.key)!
    const managerUserId = userMap.get(person.managerKey)!

    await prisma.personManagerLink.upsert({
      where: {
        workspaceId_personId_managerId: {
          workspaceId: wId,
          personId: personUserId,
          managerId: managerUserId,
        },
      },
      update: {},
      create: {
        workspaceId: wId,
        personId: personUserId,
        managerId: managerUserId,
        startsAt: person.startDate,
      },
    })
    linkCount++
  }
  console.log(`  ✓ Manager links: ${linkCount}`)

  // ── 9. Create projects ─────────────────────────────────────
  const now = new Date()
  const projectMap = new Map<string, string>()
  const epicMap = new Map<string, string>()

  for (const proj of ACME_PROJECTS) {
    const ownerId = userMap.get(proj.ownerKey)!
    const createdById = userMap.get(proj.createdByKey)!
    const teamId = proj.teamKey ? teamMap.get(proj.teamKey) : undefined
    const startDate = daysAgo(now, proj.startDaysAgo)
    const endDate = proj.endDaysAgo !== null ? daysAgo(now, proj.endDaysAgo) : undefined

    // Assign space based on team (use team space if available, otherwise General)
    const spaceId = proj.teamKey 
      ? spaceMap.get(proj.teamKey) ?? spaceMap.get('general')!
      : spaceMap.get('general')!

    const projId = `acme-proj-${proj.key}`
    const project = await prisma.project.upsert({
      where: { id: projId },
      update: {},
      create: {
        id: projId,
        workspaceId: wId,
        name: proj.name,
        description: proj.description,
        status: proj.status,
        priority: proj.priority,
        ownerId,
        createdById,
        teamId,
        spaceId,
        startDate,
        endDate,
        createdAt: startDate,
      },
    })
    projectMap.set(proj.key, project.id)

    // Create epics for this project
    for (let i = 0; i < proj.epics.length; i++) {
      const epicDef = proj.epics[i]
      const epicId = `acme-epic-${epicDef.key}`
      const epic = await prisma.epic.upsert({
        where: { id: epicId },
        update: {},
        create: {
          id: epicId,
          workspaceId: wId,
          projectId: project.id,
          title: epicDef.title,
          description: epicDef.description,
          color: epicDef.color,
          order: i,
        },
      })
      epicMap.set(epicDef.key, epic.id)
    }

    // Create project members
    const memberKeys = new Set(proj.memberKeys)
    memberKeys.add(proj.ownerKey)
    for (const memberKey of memberKeys) {
      const userId = userMap.get(memberKey)!
      const role = memberKey === proj.ownerKey ? 'OWNER' as const : 'MEMBER' as const
      await prisma.projectMember.upsert({
        where: { projectId_userId: { projectId: project.id, userId } },
        update: {},
        create: {
          projectId: project.id,
          workspaceId: wId,
          userId,
          role,
          joinedAt: startDate,
        },
      })
    }
  }
  console.log(`  ✓ Projects: ${ACME_PROJECTS.length}`)
  console.log(`  ✓ Epics: ${epicMap.size}`)

  // ── 10. Create tasks ───────────────────────────────────────
  let taskCount = 0
  for (const proj of ACME_PROJECTS) {
    const projectId = projectMap.get(proj.key)!
    const createdById = userMap.get(proj.createdByKey)!

    for (let i = 0; i < proj.tasks.length; i++) {
      const task = proj.tasks[i]
      const assigneeId = task.assigneeKey ? userMap.get(task.assigneeKey) : undefined
      const epicId = task.epicKey ? epicMap.get(task.epicKey) : undefined
      const createdAt = daysAgo(now, task.daysAgo)
      const dueDate = task.dueInDays !== null
        ? new Date(now.getTime() + task.dueInDays * 86_400_000)
        : undefined
      const completedAt = task.status === 'DONE' ? daysAgo(now, Math.max(task.daysAgo - 5, 1)) : undefined

      await prisma.task.create({
        data: {
          workspaceId: wId,
          projectId,
          title: task.title,
          description: task.description,
          status: task.status,
          priority: task.priority,
          assigneeId,
          createdById,
          epicId,
          order: i,
          points: task.points,
          tags: task.tags,
          createdAt,
          dueDate,
          completedAt,
        },
      })
      taskCount++
    }
  }
  console.log(`  ✓ Tasks: ${taskCount}`)

  // ── 11. Create wiki pages ──────────────────────────────────
  const wikiKeyToId = new Map<string, string>()

  // First pass: create all pages without parent references
  for (const page of ACME_WIKI_PAGES) {
    const createdById = userMap.get(page.createdByKey)!
    const createdAt = daysAgo(now, page.daysAgo)
    const updatedAt = daysAgo(now, page.updatedDaysAgo)
    const wikiId = `acme-wiki-${page.key}`

    await prisma.wikiPage.upsert({
      where: { id: wikiId },
      update: {},
      create: {
        id: wikiId,
        workspaceId: wId,
        title: page.title,
        slug: page.slug,
        content: page.content,
        contentFormat: 'HTML',
        category: page.category,
        tags: page.tags,
        type: page.type,
        isSection: page.isSection,
        isPublished: true,
        createdById,
        createdAt,
        updatedAt,
        permissionLevel: 'team',
        workspace_type: 'team',
        spaceId: companyWikiSpace.id,
      },
    })
    wikiKeyToId.set(page.key, wikiId)
  }

  // Second pass: wire up parent references
  for (const page of ACME_WIKI_PAGES) {
    if (!page.parentKey) continue
    const pageId = wikiKeyToId.get(page.key)!
    const parentId = wikiKeyToId.get(page.parentKey)!
    await prisma.wikiPage.update({
      where: { id: pageId },
      data: { parentId },
    })
  }
  console.log(`  ✓ Wiki pages: ${ACME_WIKI_PAGES.length}`)

  // ── 12. Create project allocations ─────────────────────────
  const quarterStart = daysAgo(now, 60)
  for (const alloc of ALLOCATIONS) {
    const personId = userMap.get(alloc.personKey)!
    const projectId = projectMap.get(alloc.projectKey)!

    await prisma.projectAllocation.create({
      data: {
        workspaceId: wId,
        projectId,
        personId,
        fraction: alloc.fraction,
        startDate: quarterStart,
        note: alloc.note,
      },
    })
  }
  console.log(`  ✓ Allocations: ${ALLOCATIONS.length}`)

  // ── Summary ────────────────────────────────────────────────
  console.log('')
  console.log('  ┌──────────────────────────────────────────┐')
  console.log('  │  Acme Analytics Seed Complete             │')
  console.log('  ├──────────────────────────────────────────┤')
  console.log(`  │  Workspace:   ${workspace.name}`)
  console.log(`  │  Slug:        ${workspace.slug}`)
  console.log(`  │  Departments: ${DEPARTMENTS.length}`)
  console.log(`  │  Teams:       ${TEAMS.length}`)
  console.log(`  │  Spaces:      ${TEAMS.length + 2}`)
  console.log(`  │  People:      ${ACME_PEOPLE.length}`)
  console.log(`  │  Positions:   ${ACME_PEOPLE.length}`)
  console.log(`  │  Mgr links:   ${linkCount}`)
  console.log(`  │  Projects:    ${ACME_PROJECTS.length}`)
  console.log(`  │  Epics:       ${epicMap.size}`)
  console.log(`  │  Tasks:       ${taskCount}`)
  console.log(`  │  Wiki pages:  ${ACME_WIKI_PAGES.length}`)
  console.log(`  │  Allocations: ${ALLOCATIONS.length}`)
  console.log('  └──────────────────────────────────────────┘')
  console.log('')

  return workspace
}

// ─── Clear Acme data (safe: only deletes by workspace slug) ──
export async function clearAcmeData(prisma: PrismaClient) {
  const acmeWorkspace = await prisma.workspace.findUnique({
    where: { slug: 'acme-analytics' },
  })

  if (!acmeWorkspace) {
    console.log('  ⓘ No Acme Analytics workspace found — nothing to clear')
    return
  }

  // Cascade delete: deleting the workspace removes all related
  // entities via onDelete: Cascade defined in the Prisma schema.
  // We also clean up the Users created specifically for Acme.
  await prisma.workspace.delete({
    where: { id: acmeWorkspace.id },
  })

  // Clean up Acme users (only those with @acme-analytics.com emails)
  await prisma.user.deleteMany({
    where: { email: { endsWith: '@acme-analytics.com' } },
  })

  console.log('  ✓ Cleared Acme Analytics workspace and users')
}

// ─── Date helper ─────────────────────────────────────────────
function daysAgo(from: Date, days: number): Date {
  return new Date(from.getTime() - days * 86_400_000)
}
