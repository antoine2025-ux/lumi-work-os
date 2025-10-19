// Comprehensive Wiki Types
export interface User {
  id: string
  name: string
  email: string
  image?: string
  createdAt: string
  updatedAt: string
}

export interface Workspace {
  id: string
  name: string
  slug: string
  type: 'personal' | 'team' | 'project'
  color: string
  icon: string
  pageCount: number
  createdAt: string
  updatedAt: string
}

export interface WikiPage {
  id: string
  title: string
  slug: string
  content: string
  excerpt: string | null
  category: string
  tags: string[]
  isPublished: boolean
  order: number
  viewCount: number
  workspaceId: string
  parentId: string | null
  createdById: string
  createdAt: string
  updatedAt: string
  
  // Relations
  createdBy?: User
  parent?: WikiPageReference
  children?: WikiPageReference[]
  workspace?: Workspace
  
  // Counts
  _count?: {
    comments: number
    versions: number
  }
}

export interface WikiPageReference {
  id: string
  title: string
  slug: string
  order?: number
}

export interface WikiVersion {
  id: string
  pageId: string
  content: string
  version: number
  createdById: string
  createdAt: string
  createdBy?: User
}

export interface WikiComment {
  id: string
  pageId: string
  content: string
  createdById: string
  createdAt: string
  updatedAt: string
  createdBy?: User
}

export interface FavoritePage {
  id: string
  pageId: string
  userId: string
  createdAt: string
  page: WikiPage
}

// API Response Types
export interface WikiPagesResponse {
  data: WikiPage[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface WikiPageResponse {
  data: WikiPage
}

export interface CreateWikiPageRequest {
  workspaceId: string
  title: string
  content: string
  parentId?: string
  tags?: string[]
  category?: string
}

export interface UpdateWikiPageRequest {
  title?: string
  content?: string
  excerpt?: string
  tags?: string[]
  category?: string
  isPublished?: boolean
}

// UI State Types
export interface WikiPageState {
  pageData: WikiPage | null
  isLoading: boolean
  isSaving: boolean
  error: string | null
  isEditing: boolean
}

export interface RecentPage {
  id: string
  title: string
  slug: string
  updatedAt: string
  author: string
}

// Search and Filter Types
export interface WikiSearchParams {
  query?: string
  category?: string
  tags?: string[]
  author?: string
  dateFrom?: string
  dateTo?: string
  sortBy?: 'title' | 'createdAt' | 'updatedAt' | 'viewCount'
  sortOrder?: 'asc' | 'desc'
}

export interface WikiPageFilters {
  category: string[]
  tags: string[]
  authors: string[]
  dateRange: {
    from: string | null
    to: string | null
  }
}


