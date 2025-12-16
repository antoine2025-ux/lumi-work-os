/**
 * Loopbrain Canonical Context Model
 * 
 * Defines the unified context types for Loopbrain's contextual AI system.
 * All context objects follow a discriminated union pattern based on ContextType.
 */

/**
 * Enumeration of all supported context types
 */
export enum ContextType {
  WORKSPACE = 'workspace',
  PAGE = 'page',
  PROJECT = 'project',
  TASK = 'task',
  EPIC = 'epic',
  ORG = 'org',
  ACTIVITY = 'activity',
  UNIFIED = 'unified'
}

/**
 * Scope of context retrieval - determines what related entities to include
 */
export enum ContextScope {
  MINIMAL = 'minimal',      // Only the entity itself
  STANDARD = 'standard',    // Entity + direct relationships
  EXTENDED = 'extended',    // Entity + relationships + related entities
  FULL = 'full'            // Everything including deep relationships
}

/**
 * Base interface for all context objects
 */
export interface BaseContext {
  type: ContextType
  id: string
  workspaceId: string
  timestamp: string
  metadata?: {
    source?: string
    version?: string
    [key: string]: unknown
  }
}

/**
 * Workspace-level context
 * Represents the active workspace (Space) and its high-level information
 */
export interface WorkspaceContext extends BaseContext {
  type: ContextType.WORKSPACE
  name: string
  description?: string
  purpose?: string
  memberCount?: number
  projectCount?: number
  pageCount?: number
  recentActivity?: ActivitySummary[]
}

/**
 * Page (Wiki) context
 * Represents a wiki page and its related content
 */
export interface PageContext extends BaseContext {
  type: ContextType.PAGE
  title: string
  slug: string
  content?: string
  excerpt?: string
  isEmpty: boolean
  selectedText?: string
  breadcrumbs?: Breadcrumb[]
  category?: string
  tags?: string[]
  relatedDocs?: RelatedDoc[]
  createdAt: string
  updatedAt: string
  viewCount?: number
  author?: {
    id: string
    name: string
    email?: string
  }
}

/**
 * Project context
 * Represents a project and its associated epics/tasks
 */
export interface ProjectContext extends BaseContext {
  type: ContextType.PROJECT
  name: string
  description?: string
  status: string
  priority?: string
  startDate?: string
  endDate?: string
  department?: string
  team?: string
  epics?: EpicSummary[]
  tasks?: TaskSummary[]
  recentActivity?: ActivitySummary[]
}

/**
 * Task context
 * Represents a single task and its relationships
 */
export interface TaskContext extends BaseContext {
  type: ContextType.TASK
  title: string
  description?: string
  status: string
  priority?: string
  dueDate?: string
  assignee?: {
    id: string
    name: string
    email?: string
  }
  project?: {
    id: string
    name: string
  }
  epic?: {
    id: string
    name: string
  }
  dependencies?: string[]
  relatedTasks?: TaskSummary[]
}

/**
 * Epic context
 * Represents an epic and its associated tasks
 */
export interface EpicContext extends BaseContext {
  type: ContextType.EPIC
  title: string
  description?: string
  projectId: string
  tasksTotal?: number
  tasksDone?: number
  color?: string
  order?: number
}

/**
 * Organization context
 * Represents org structure, teams, roles, and people
 */
export interface OrgContext extends BaseContext {
  type: ContextType.ORG
  teams?: TeamSummary[]
  roles?: RoleSummary[]
  departments?: DepartmentSummary[]
  hierarchy?: OrgHierarchyNode[]
  recentChanges?: ActivitySummary[]
}

/**
 * Activity/Recent changes context
 * Represents recent decisions, changes, and activities
 */
export interface ActivityContext extends BaseContext {
  type: ContextType.ACTIVITY
  activities: ActivitySummary[]
  timeRange?: {
    from: string
    to: string
  }
  filters?: {
    entityTypes?: string[]
    actions?: string[]
    userIds?: string[]
  }
}

/**
 * Unified context
 * Combines multiple context types for comprehensive AI understanding
 */
export interface UnifiedContext extends BaseContext {
  type: ContextType.UNIFIED
  workspace: WorkspaceContext
  activePage?: PageContext
  activeProject?: ProjectContext
  activeTask?: TaskContext
  org?: OrgContext
  recentActivity?: ActivityContext
  relatedDocs?: RelatedDoc[]
  projects?: ProjectSummary[]
  tasks?: TaskSummary[]
}

/**
 * Discriminated union of all context types
 */
export type ContextObject =
  | WorkspaceContext
  | PageContext
  | ProjectContext
  | TaskContext
  | EpicContext
  | OrgContext
  | ActivityContext
  | UnifiedContext

/**
 * Supporting types for context composition
 */

export interface Breadcrumb {
  id: string
  title: string
  slug?: string
  level: number
}

export interface RelatedDoc {
  id: string
  title: string
  slug?: string
  excerpt?: string
  snippet?: string
  relevanceScore?: number
  category?: string
  tags?: string[]
}

export interface EpicSummary {
  id: string
  name: string
  description?: string
  status?: string
  taskCount?: number
}

export interface TaskSummary {
  id: string
  title: string
  description?: string
  status: string
  priority?: string
  dueDate?: string
  assignee?: {
    id: string
    name: string
    email?: string
  }
}

export interface ProjectSummary {
  id: string
  name: string
  description?: string
  status: string
  priority?: string
  taskCount?: number
}

export interface TeamSummary {
  id: string
  name: string
  department?: string
  memberCount?: number
}

export interface RoleSummary {
  id: string
  title: string
  teamId?: string
  teamName?: string
  department?: string
  level?: number
  userId?: string
  userName?: string
  parentId?: string
}

export interface DepartmentSummary {
  id: string
  name: string
  teamCount?: number
}

export interface OrgHierarchyNode {
  id: string
  title: string
  level: number
  children?: OrgHierarchyNode[]
  userId?: string
  teamId?: string
}

export interface ActivitySummary {
  id: string
  entity: string
  entityId: string
  action: string
  userId?: string
  userName?: string
  timestamp: string
  description?: string
  metadata?: Record<string, unknown>
}

/**
 * Type guard functions for context discrimination
 */
export function isWorkspaceContext(context: ContextObject): context is WorkspaceContext {
  return context.type === ContextType.WORKSPACE
}

export function isPageContext(context: ContextObject): context is PageContext {
  return context.type === ContextType.PAGE
}

export function isProjectContext(context: ContextObject): context is ProjectContext {
  return context.type === ContextType.PROJECT
}

export function isTaskContext(context: ContextObject): context is TaskContext {
  return context.type === ContextType.TASK
}

export function isOrgContext(context: ContextObject): context is OrgContext {
  return context.type === ContextType.ORG
}

export function isActivityContext(context: ContextObject): context is ActivityContext {
  return context.type === ContextType.ACTIVITY
}

export function isUnifiedContext(context: ContextObject): context is UnifiedContext {
  return context.type === ContextType.UNIFIED
}


