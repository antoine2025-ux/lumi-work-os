/**
 * Test Fixtures
 * 
 * Factory functions for creating mock data objects with deterministic IDs.
 */

export interface MockWorkspace {
  id: string
  name: string
  slug: string
  createdAt: Date
  updatedAt: Date
  ownerId: string
}

export function createMockWorkspace(overrides: Partial<MockWorkspace> = {}): MockWorkspace {
  return {
    id: 'workspace-1',
    name: 'Test Workspace',
    slug: 'test-workspace',
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
    ownerId: 'user-1',
    ...overrides,
  }
}

export interface MockUser {
  id: string
  email: string
  name: string
  createdAt: Date
  updatedAt: Date
}

export function createMockUser(overrides: Partial<MockUser> = {}): MockUser {
  return {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
    ...overrides,
  }
}

export interface MockGoal {
  id: string
  workspaceId: string
  title: string
  description: string | null
  level: string
  ownerId: string | null
  parentId: string | null
  period: string
  startDate: Date
  endDate: Date
  quarter: string | null
  status: string
  progress: number
  alignmentScore: number
  performanceWeight: number
  reviewCycle: string | null
  createdAt: Date
  updatedAt: Date
  createdById: string
}

export function createMockGoal(overrides: Partial<MockGoal> = {}): MockGoal {
  return {
    id: 'goal-1',
    workspaceId: 'workspace-1',
    title: 'Test Goal',
    description: 'A test goal description',
    level: 'COMPANY',
    ownerId: 'user-1',
    parentId: null,
    period: 'QUARTERLY',
    startDate: new Date('2024-01-01T00:00:00Z'),
    endDate: new Date('2024-03-31T23:59:59Z'),
    quarter: '2024-Q1',
    status: 'ACTIVE',
    progress: 0,
    alignmentScore: 100,
    performanceWeight: 1.0,
    reviewCycle: '2024-Q1',
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
    createdById: 'user-1',
    ...overrides,
  }
}

export interface MockObjective {
  id: string
  goalId: string
  workspaceId: string
  title: string
  description: string | null
  weight: number
  progress: number
  status: string
}

export function createMockObjective(overrides: Partial<MockObjective> = {}): MockObjective {
  return {
    id: 'objective-1',
    goalId: 'goal-1',
    workspaceId: 'workspace-1',
    title: 'Test Objective',
    description: 'A test objective',
    weight: 5,
    progress: 0,
    status: 'NOT_STARTED',
    ...overrides,
  }
}

export interface MockKeyResult {
  id: string
  objectiveId: string
  workspaceId: string
  title: string
  description: string | null
  metricType: string
  targetValue: number
  currentValue: number
  unit: string | null
  progress: number
  status: string
  dueDate: Date | null
}

export function createMockKeyResult(overrides: Partial<MockKeyResult> = {}): MockKeyResult {
  return {
    id: 'keyresult-1',
    objectiveId: 'objective-1',
    workspaceId: 'workspace-1',
    title: 'Test Key Result',
    description: 'A test key result',
    metricType: 'PERCENT',
    targetValue: 100,
    currentValue: 0,
    unit: '%',
    progress: 0,
    status: 'NOT_STARTED',
    dueDate: new Date('2024-03-31T23:59:59Z'),
    ...overrides,
  }
}

export interface MockWikiPage {
  id: string
  workspaceId: string
  title: string
  slug: string
  content: string
  contentJson: Record<string, unknown> | null
  contentFormat: string
  textContent: string | null
  excerpt: string | null
  parentId: string | null
  order: number
  isPublished: boolean
  tags: string[]
  createdAt: Date
  updatedAt: Date
  createdById: string
  permissionLevel: string
  category: string
  view_count: number
  is_featured: boolean
  workspace_type: string | null
  last_viewed_at: Date | null
}

export function createMockWikiPage(overrides: Partial<MockWikiPage> = {}): MockWikiPage {
  return {
    id: 'wiki-1',
    workspaceId: 'workspace-1',
    title: 'Test Wiki Page',
    slug: 'test-wiki-page',
    content: '<p>Test content</p>',
    contentJson: null,
    contentFormat: 'HTML',
    textContent: 'Test content',
    excerpt: 'Test content excerpt',
    parentId: null,
    order: 0,
    isPublished: true,
    tags: ['test'],
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
    createdById: 'user-1',
    permissionLevel: 'team',
    category: 'general',
    view_count: 0,
    is_featured: false,
    workspace_type: 'team',
    last_viewed_at: null,
    ...overrides,
  }
}

export interface MockProject {
  id: string
  workspaceId: string
  name: string
  description: string | null
  status: string
  createdAt: Date
  updatedAt: Date
  createdById: string
  ownerId: string | null
}

export function createMockProject(overrides: Partial<MockProject> = {}): MockProject {
  return {
    id: 'project-1',
    workspaceId: 'workspace-1',
    name: 'Test Project',
    description: 'A test project',
    status: 'ACTIVE',
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
    createdById: 'user-1',
    ownerId: 'user-1',
    ...overrides,
  }
}

export interface MockTask {
  id: string
  workspaceId: string
  projectId: string
  title: string
  description: string | null
  status: string
  priority: string
  createdAt: Date
  updatedAt: Date
  createdById: string
  assigneeId: string | null
}

export function createMockTask(overrides: Partial<MockTask> = {}): MockTask {
  return {
    id: 'task-1',
    workspaceId: 'workspace-1',
    projectId: 'project-1',
    title: 'Test Task',
    description: 'A test task',
    status: 'TODO',
    priority: 'MEDIUM',
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
    createdById: 'user-1',
    assigneeId: 'user-1',
    ...overrides,
  }
}

export interface MockOrgPerson {
  id: string
  workspaceId: string
  userId: string | null
  firstName: string
  lastName: string
  email: string
  status: string
  createdAt: Date
  updatedAt: Date
}

export function createMockOrgPerson(overrides: Partial<MockOrgPerson> = {}): MockOrgPerson {
  return {
    id: 'person-1',
    workspaceId: 'workspace-1',
    userId: 'user-1',
    firstName: 'Test',
    lastName: 'Person',
    email: 'test@example.com',
    status: 'ACTIVE',
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
    ...overrides,
  }
}

export interface MockProjectGoalLink {
  id: string
  goalId: string
  projectId: string
  workspaceId: string
  contributionType: string
  expectedImpact: number
  actualImpact: number | null
  autoUpdate: boolean
  syncRules: Record<string, unknown> | null
}

export function createMockProjectGoalLink(
  overrides: Partial<MockProjectGoalLink> = {}
): MockProjectGoalLink {
  return {
    id: 'link-1',
    goalId: 'goal-1',
    projectId: 'project-1',
    workspaceId: 'workspace-1',
    contributionType: 'REQUIRED',
    expectedImpact: 50,
    actualImpact: null,
    autoUpdate: true,
    syncRules: null,
    ...overrides,
  }
}
