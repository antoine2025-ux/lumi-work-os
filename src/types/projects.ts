// Project and Task Types
export interface Project {
  id: string
  name: string
  description: string | null
  status: 'planning' | 'active' | 'on-hold' | 'completed' | 'cancelled'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  startDate: string | null
  dueDate: string | null
  completedAt: string | null
  workspaceId: string
  createdById: string
  createdAt: string
  updatedAt: string
  
  // Relations
  createdBy?: User
  tasks?: Task[]
  members?: ProjectMember[]
  _count?: {
    tasks: number
    completedTasks: number
    members: number
  }
}

export interface ProjectMember {
  id: string
  projectId: string
  userId: string
  role: 'owner' | 'admin' | 'member' | 'viewer'
  joinedAt: string
  user?: User
}

export interface Task {
  id: string
  title: string
  description: string | null
  status: 'todo' | 'in-progress' | 'review' | 'done' | 'cancelled'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  dueDate: string | null
  completedAt: string | null
  projectId: string
  assignedToId: string | null
  createdById: string
  parentTaskId: string | null
  order: number
  createdAt: string
  updatedAt: string
  
  // Relations
  assignedTo?: User
  createdBy?: User
  project?: Project
  parentTask?: Task
  subtasks?: Task[]
  dependencies?: TaskDependency[]
  _count?: {
    subtasks: number
    comments: number
  }
}

export interface TaskDependency {
  id: string
  taskId: string
  dependsOnTaskId: string
  type: 'finish-to-start' | 'start-to-start' | 'finish-to-finish' | 'start-to-finish'
  createdAt: string
  
  // Relations
  task?: Task
  dependsOnTask?: Task
}

export interface TaskTemplate {
  id: string
  name: string
  description: string | null
  category: string
  content: string
  isPublic: boolean
  createdById: string
  createdAt: string
  updatedAt: string
  
  // Relations
  createdBy?: User
}

// API Response Types
export interface ProjectsResponse {
  data: Project[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface TasksResponse {
  data: Task[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// Request Types
export interface CreateProjectRequest {
  name: string
  description?: string
  status?: Project['status']
  priority?: Project['priority']
  startDate?: string
  dueDate?: string
  workspaceId: string
}

export interface UpdateProjectRequest {
  name?: string
  description?: string
  status?: Project['status']
  priority?: Project['priority']
  startDate?: string
  dueDate?: string
}

export interface CreateTaskRequest {
  title: string
  description?: string
  status?: Task['status']
  priority?: Task['priority']
  dueDate?: string
  projectId: string
  assignedToId?: string
  parentTaskId?: string
  order?: number
}

export interface UpdateTaskRequest {
  title?: string
  description?: string
  status?: Task['status']
  priority?: Task['priority']
  dueDate?: string
  assignedToId?: string
  parentTaskId?: string
  order?: number
}

// UI State Types
export interface ProjectState {
  projects: Project[]
  currentProject: Project | null
  isLoading: boolean
  error: string | null
}

export interface TaskState {
  tasks: Task[]
  currentTask: Task | null
  isLoading: boolean
  error: string | null
}

// Filter and Search Types
export interface ProjectFilters {
  status: Project['status'][]
  priority: Project['priority'][]
  assignedTo: string[]
  dateRange: {
    from: string | null
    to: string | null
  }
}

export interface TaskFilters {
  status: Task['status'][]
  priority: Task['priority'][]
  assignedTo: string[]
  project: string[]
  dateRange: {
    from: string | null
    to: string | null
  }
}

// Import User type from wiki types
import type { User } from './wiki'


