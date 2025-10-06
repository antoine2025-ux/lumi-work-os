// Migration system types for platform integrations

export interface MigrationSource {
  platform: string
  apiKey: string
  workspaceId?: string
  additionalConfig?: Record<string, any>
}

export interface MigrationItem {
  id: string
  title: string
  content: string
  type: 'page' | 'document' | 'task' | 'project'
  metadata: {
    originalId: string
    originalUrl?: string
    createdAt: Date
    updatedAt: Date
    author?: string
    tags?: string[]
    category?: string
    parentId?: string
    attachments?: MigrationAttachment[]
  }
}

export interface MigrationAttachment {
  id: string
  name: string
  url: string
  type: string
  size: number
}

export interface MigrationProgress {
  total: number
  completed: number
  failed: number
  currentItem?: string
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  errors: string[]
}

export interface MigrationResult {
  success: boolean
  importedCount: number
  failedCount: number
  errors: string[]
  importedItems: string[]
}

// Platform-specific interfaces
export interface SliteDocument {
  id: string
  title: string
  updatedAt: string
  type: string
  highlight: string
  parentNotes: Array<{
    id: string
    title: string
  }>
  // These will be populated when fetching individual document content
  content?: string
  created_at?: string
  author?: {
    id: string
    name: string
    email: string
  }
  tags?: string[]
  folder_id?: string
  attachments?: Array<{
    id: string
    name: string
    url: string
    type: string
    size: number
  }>
}

export interface ClickUpTask {
  id: string
  name: string
  description: string
  status: {
    status: string
    color: string
  }
  date_created: string
  date_updated: string
  assignees: Array<{
    id: string
    username: string
    email: string
  }>
  tags: Array<{
    name: string
    tag_fg: string
    tag_bg: string
  }>
  custom_fields: Array<{
    id: string
    name: string
    value: any
  }>
  attachments: Array<{
    id: string
    title: string
    url: string
    type: string
    size: number
  }>
}

export interface NotionPage {
  id: string
  title: string
  properties: Record<string, any>
  created_time: string
  last_edited_time: string
  created_by: {
    id: string
    name: string
  }
  last_edited_by: {
    id: string
    name: string
  }
  parent: {
    type: string
    page_id?: string
    database_id?: string
  }
  url: string
  archived: boolean
}

export interface ConfluencePage {
  id: string
  title: string
  body: {
    storage: {
      value: string
      representation: string
    }
  }
  version: {
    number: number
    when: string
    by: {
      type: string
      displayName: string
      email: string
    }
  }
  space: {
    key: string
    name: string
  }
  ancestors: Array<{
    id: string
    title: string
  }>
  _links: {
    webui: string
  }
}
