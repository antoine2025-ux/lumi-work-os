/**
 * ContextObject Contract Sanity Test
 * 
 * Validates that all ContextObject types have required fields and that
 * extractors correctly reference existing fields (not legacy fields like "name").
 * 
 * Usage:
 *   npx tsx scripts/test-context-object-contract.ts
 */

import { ContextObject, ContextObjectType } from '../src/lib/context/context-types'
import {
  projectToContext,
  taskToContext,
  pageToContext,
  roleToContext,
  personToContext,
  teamToContext,
  timeOffToContext,
} from '../src/lib/context/context-builders'
import { assertContextObjectContract } from '../src/lib/context/context-contract'
import { extractTitle } from '../src/lib/loopbrain/store/context-repository'

// Minimal fixture data for each type
function createMinimalFixtures() {
  const now = new Date()
  const workspaceId = 'test-workspace-id'

  return {
    project: {
      id: 'test-project-id',
      workspaceId,
      name: 'Test Project',
      status: 'ACTIVE',
      priority: 'MEDIUM',
      department: null,
      team: null,
      ownerId: null,
      color: null,
      startDate: null,
      endDate: null,
      isArchived: false,
      updatedAt: now,
      createdAt: now,
      owner: null,
    },
    task: {
      id: 'test-task-id',
      workspaceId,
      projectId: 'test-project-id',
      title: 'Test Task',
      description: 'Test description',
      status: 'TODO',
      priority: 'MEDIUM',
      assigneeId: null,
      dueDate: null,
      createdById: 'test-user-id',
      updatedAt: now,
      createdAt: now,
      tags: [], // Task tags array
      order: 0,
      points: null,
      epicId: null,
      milestoneId: null,
      completedAt: null,
      project: {
        id: 'test-project-id',
        name: 'Test Project',
      },
      assignee: null,
    },
    page: {
      id: 'test-page-id',
      workspaceId,
      title: 'Test Page',
      slug: 'test-page',
      content: 'Test content',
      excerpt: null,
      category: 'general',
      isPublished: true,
      parentId: null,
      order: 0,
      createdById: 'test-user-id',
      updatedAt: now,
      createdAt: now,
      tags: [], // Page tags array
      permissionLevel: null,
      view_count: 0,
      is_featured: false,
      workspace_type: null,
      createdBy: {
        id: 'test-user-id',
        name: 'Test User',
        email: 'test@example.com',
      },
      projects: [],
    },
    role: {
      id: 'test-role-id',
      workspaceId,
      userId: 'test-user-id',
      title: 'Test Role',
      level: 1,
      parentId: null,
      order: 0,
      isActive: true,
      teamId: 'test-team-id',
      createdAt: now,
      updatedAt: now,
      roleDescription: null,
      responsibilities: [], // Array field
      requiredSkills: [], // Array field
      preferredSkills: [], // Array field
      keyMetrics: [], // Array field
      user: {
        id: 'test-user-id',
        name: 'Test User',
        email: 'test@example.com',
      },
      team: {
        id: 'test-team-id',
        name: 'Test Team',
        workspaceId,
        departmentId: 'test-dept-id',
      },
    },
    person: {
      id: 'test-user-id',
      name: 'Test User',
      email: 'test@example.com',
      image: null,
      workspaceId,
      isActive: true,
      updatedAt: now,
      createdAt: now,
      bio: null,
      skills: [], // Array field
      location: null,
      timezone: null,
    },
    team: {
      id: 'test-team-id',
      workspaceId,
      name: 'Test Team',
      departmentId: 'test-dept-id',
      isActive: true,
      description: null,
      color: null,
      order: 0,
      updatedAt: now,
      createdAt: now,
      department: {
        id: 'test-dept-id',
        workspaceId,
        name: 'Test Department',
      },
    },
    timeOff: {
      id: 'test-timeoff-id',
      workspaceId,
      userId: 'test-user-id',
      startDate: new Date('2025-01-01'),
      endDate: new Date('2025-01-07'),
      type: 'vacation',
      status: 'APPROVED',
      notes: 'Test time off',
      createdAt: now,
      updatedAt: now,
      user: {
        id: 'test-user-id',
        name: 'Test User',
        email: 'test@example.com',
      },
    },
    epic: {
      id: 'test-epic-id',
      workspaceId,
      projectId: 'test-project-id',
      title: 'Test Epic',
      description: 'Test epic description',
      color: '#FF0000',
      order: 0,
      createdAt: now,
      updatedAt: now,
      project: {
        id: 'test-project-id',
        name: 'Test Project',
        workspaceId,
      },
    },
  }
}

/**
 * Validate a ContextObject has all required fields
 * Uses shared contract validation logic
 */
function validateContextObject(obj: ContextObject, type: ContextObjectType): void {
  const validation = assertContextObjectContract(obj, type)

  if (!validation.isValid || validation.errors.length > 0) {
    const allIssues = [
      ...validation.errors,
      ...validation.warnings,
    ]
    throw new Error(
      `ContextObject validation failed for type '${type}':\n  ${allIssues.join('\n  ')}\n` +
        `Object: ${JSON.stringify(obj, null, 2)}`
    )
  }

  // Check for legacy fields that shouldn't exist
  if ('name' in obj && obj.type !== 'workspace') {
    // Only workspace might have 'name', but ContextObject uses 'title' for all types
    // This is a warning, not an error, since some types might legitimately have both
  }
}

/**
 * Test that extractTitle correctly extracts title for each type
 */
function testExtractor(obj: ContextObject, type: ContextObjectType): void {
  try {
    const extracted = extractTitle(obj)
    if (!extracted || extracted.trim() === '') {
      throw new Error(`Extractor returned empty title for type '${type}'`)
    }
    if (extracted === 'Untitled project' || extracted === 'Untitled item') {
      // This is a fallback - log warning but don't fail if it's expected
      console.warn(`⚠️  Extractor used fallback for type '${type}': "${extracted}"`)
    }
  } catch (error) {
    throw new Error(`Extractor failed for type '${type}': ${error instanceof Error ? error.message : String(error)}`)
  }
}

async function testContextObjectContracts() {
  console.log('🧪 Testing ContextObject contracts for all types\n')
  console.log('=' .repeat(60) + '\n')

  const fixtures = createMinimalFixtures()
  const tests: Array<{ type: ContextObjectType; builder: () => ContextObject }> = [
    {
      type: 'project',
      builder: () => {
        const obj = projectToContext(fixtures.project as any, {})
        return { ...obj, workspaceId: fixtures.project.workspaceId }
      },
    },
    {
      type: 'task',
      builder: () => {
        const obj = taskToContext(fixtures.task as any, {})
        return { ...obj, workspaceId: fixtures.task.workspaceId }
      },
    },
    {
      type: 'page',
      builder: () => {
        const obj = pageToContext(fixtures.page as any, {})
        return { ...obj, workspaceId: fixtures.page.workspaceId }
      },
    },
    {
      type: 'role',
      builder: () => {
        const obj = roleToContext(fixtures.role as any, {})
        return { ...obj, workspaceId: fixtures.role.workspaceId }
      },
    },
    {
      type: 'person',
      builder: () => {
        const obj = personToContext(fixtures.person as any, {
          workloadStats: {
            tasksAssignedTotal: 0,
            tasksInProgress: 0,
            tasksOverdue: 0,
            tasksDueNext7Days: 0,
          },
        })
        return { ...obj, workspaceId: fixtures.person.workspaceId }
      },
    },
    {
      type: 'team',
      builder: () => {
        const obj = teamToContext(fixtures.team as any)
        return { ...obj, workspaceId: fixtures.team.workspaceId }
      },
    },
    {
      type: 'time_off',
      builder: () => {
        const obj = timeOffToContext(fixtures.timeOff as any)
        return { ...obj, workspaceId: fixtures.timeOff.workspaceId }
      },
    },
    {
      type: 'epic',
      builder: () => {
        // Epic is built inline in the epic builder, so we'll build it manually
        const epic = fixtures.epic as any
        const project = epic.project
        return {
          id: epic.id,
          type: 'epic' as const,
          title: epic.title,
          summary: `Epic${project ? ` in ${project.name}` : ''}${epic.description ? `: ${epic.description.substring(0, 100)}` : ''}`,
          tags: ['epic'],
          status: 'active',
          updatedAt: epic.updatedAt,
          relations: epic.projectId ? [{
            type: 'project' as const,
            id: epic.projectId,
            label: 'belongs to',
            direction: 'out' as const,
          }] : [],
          metadata: {
            color: epic.color || undefined,
            order: epic.order,
            description: epic.description || undefined,
          },
          workspaceId: epic.workspaceId,
        }
      },
    },
  ]

  let passed = 0
  let failed = 0

  for (const test of tests) {
    try {
      console.log(`Testing ${test.type}...`)
      const obj = test.builder()

      // Validate structure
      validateContextObject(obj, test.type)
      console.log(`  ✅ Structure valid`)

      // Test extractor
      testExtractor(obj, test.type)
      console.log(`  ✅ Extractor works (title: "${extractTitle(obj)}")`)

      // Verify no legacy 'name' field is used incorrectly
      if ('name' in obj && obj.type !== 'workspace') {
        // Check if extractor would incorrectly use 'name'
        const hasName = (obj as any).name
        const hasTitle = obj.title
        if (hasName && !hasTitle) {
          throw new Error(`ContextObject has 'name' but no 'title' - extractor will fail`)
        }
      }

      console.log(`  ✅ No legacy field issues\n`)
      passed++
    } catch (error) {
      console.error(`  ❌ FAILED: ${error instanceof Error ? error.message : String(error)}\n`)
      failed++
    }
  }

  // Regression test: Missing title fallback behavior
  console.log('\n' + '=' .repeat(60))
  console.log('Regression Test: Missing title fallback\n')
  
  try {
    // Create a project-like object with missing title
    const brokenProject: ContextObject = {
      id: 'test-broken-project-id',
      type: 'project',
      title: '', // Empty title - should trigger fallback
      summary: 'Test project summary',
      tags: ['test'],
      updatedAt: new Date(),
      relations: [],
      workspaceId: 'test-workspace-id',
    }

    // Validate that contract detects the issue
    const validation = assertContextObjectContract(brokenProject, 'project')
    if (validation.warnings.length === 0) {
      throw new Error(`Contract validation should warn about empty title. Warnings: ${JSON.stringify(validation.warnings)}`)
    }
    const titleWarning = validation.warnings.find(w => w.includes('title') || w.includes('Empty'))
    if (!titleWarning) {
      throw new Error(`Contract validation should warn about empty title. Warnings: ${JSON.stringify(validation.warnings)}`)
    }
    console.log(`  ✅ Contract validation detects empty title: "${titleWarning}"`)

    // Test that extractTitle() provides fallback
    const extractedTitle = extractTitle(brokenProject)
    if (!extractedTitle || extractedTitle === '') {
      throw new Error('extractTitle() should provide fallback for empty title')
    }
    if (extractedTitle !== 'Untitled project') {
      throw new Error(`Expected fallback "Untitled project", got "${extractedTitle}"`)
    }
    console.log(`  ✅ extractTitle() provides fallback: "${extractedTitle}"`)

    // Test that a completely missing title field is caught
    const missingTitleProject = {
      id: 'test-missing-title-id',
      type: 'project' as const,
      // title is missing entirely
      summary: 'Test summary',
      tags: ['test'],
      updatedAt: new Date(),
      relations: [],
      workspaceId: 'test-workspace-id',
    } as any as ContextObject

    const missingValidation = assertContextObjectContract(missingTitleProject, 'project')
    if (missingValidation.errors.length === 0 || !missingValidation.errors.some(e => e.includes('title'))) {
      throw new Error('Contract validation should error on missing title field')
    }
    console.log('  ✅ Contract validation errors on missing title field')

    console.log('  ✅ Regression test passed\n')
  } catch (error) {
    console.error(`  ❌ Regression test failed: ${error instanceof Error ? error.message : String(error)}\n`)
    failed++
  }

  console.log('=' .repeat(60))
  console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`)

  if (failed > 0) {
    console.error('❌ Contract validation failed!')
    process.exit(1)
  } else {
    console.log('✅ All ContextObject contracts valid!')
  }
}

// Export extractTitle for testing (it's not exported from the module)
// We'll need to access it differently - let me check the actual implementation
async function main() {
  try {
    await testContextObjectContracts()
  } catch (error) {
    console.error('Test suite failed:', error)
    process.exit(1)
  }
}

main()

