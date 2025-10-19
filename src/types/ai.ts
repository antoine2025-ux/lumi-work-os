// AI and Chat Types
export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
  metadata?: {
    sources?: string[]
    confidence?: number
    model?: string
  }
}

export interface ChatSession {
  id: string
  title: string
  messages: ChatMessage[]
  userId: string
  workspaceId: string
  projectId?: string
  createdAt: string
  updatedAt: string
  isActive: boolean
}

export interface ChatHistory {
  sessions: ChatSession[]
  total: number
  page: number
  limit: number
}

export interface AIResponse {
  message: string
  sources?: string[]
  confidence?: number
  suggestions?: string[]
  metadata?: Record<string, unknown>
}

export interface ChatRequest {
  message: string
  sessionId?: string
  context?: {
    projectId?: string
    workspaceId?: string
    pageId?: string
  }
  options?: {
    includeSources?: boolean
    maxTokens?: number
    temperature?: number
  }
}

export interface ChatResponse {
  success: boolean
  message?: ChatMessage
  sessionId?: string
  error?: string
}

// AI Enhancement Types
export interface AIEnhancementRequest {
  content: string
  type: 'improve' | 'summarize' | 'expand' | 'translate' | 'fix-grammar'
  context?: string
  options?: {
    tone?: 'formal' | 'casual' | 'technical'
    length?: 'short' | 'medium' | 'long'
    language?: string
  }
}

export interface AIEnhancementResponse {
  success: boolean
  enhancedContent?: string
  suggestions?: string[]
  error?: string
}

// Knowledge Base AI Types
export interface KnowledgeSearchRequest {
  query: string
  workspaceId: string
  filters?: {
    categories?: string[]
    tags?: string[]
    dateRange?: {
      from: string
      to: string
    }
  }
  limit?: number
}

export interface KnowledgeSearchResult {
  page: {
    id: string
    title: string
    slug: string
    excerpt: string
    category: string
    tags: string[]
    relevanceScore: number
  }
  highlights: string[]
  context: string
}

export interface KnowledgeSearchResponse {
  results: KnowledgeSearchResult[]
  total: number
  query: string
  suggestions?: string[]
}


