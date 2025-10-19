// Central type exports
export * from './wiki'
export * from './ai'
export * from './projects'
export * from './permissions'
export * from './theme'
export * from './embeds'

// Common utility types
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T = unknown> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface BaseEntity {
  id: string
  createdAt: string
  updatedAt: string
}

export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

export interface TableColumn<T = unknown> {
  key: keyof T
  label: string
  sortable?: boolean
  render?: (value: unknown, item: T) => React.ReactNode
}

export interface SortConfig {
  key: string
  direction: 'asc' | 'desc'
}

export interface FilterConfig {
  key: string
  value: unknown
  operator: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'gt' | 'lt' | 'gte' | 'lte'
}

// Form types
export interface FormField {
  name: string
  label: string
  type: 'text' | 'email' | 'password' | 'number' | 'select' | 'textarea' | 'checkbox' | 'radio' | 'date'
  required?: boolean
  placeholder?: string
  options?: SelectOption[]
  validation?: {
    min?: number
    max?: number
    pattern?: string
    message?: string
  }
}

export interface FormState<T = Record<string, unknown>> {
  values: T
  errors: Partial<Record<keyof T, string>>
  touched: Partial<Record<keyof T, boolean>>
  isSubmitting: boolean
  isValid: boolean
}

// Error types
export interface AppError {
  code: string
  message: string
  details?: Record<string, unknown>
  timestamp: string
}

export interface ValidationError {
  field: string
  message: string
  value?: unknown
}

// Loading states
export interface LoadingState {
  isLoading: boolean
  error: string | null
  lastUpdated?: string
}

// Search and navigation
export interface SearchResult<T = unknown> {
  item: T
  score: number
  highlights: string[]
}

export interface NavigationItem {
  id: string
  label: string
  href: string
  icon?: string
  children?: NavigationItem[]
  badge?: string | number
  disabled?: boolean
}


