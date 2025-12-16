/**
 * Loopbrain Module
 * 
 * Central export point for Loopbrain's context system.
 * Provides clean imports for context types and engine.
 */

// Context Types
export {
  ContextType,
  ContextScope,
  type BaseContext,
  type WorkspaceContext,
  type PageContext,
  type ProjectContext,
  type TaskContext,
  type OrgContext,
  type ActivityContext,
  type UnifiedContext,
  type ContextObject,
  type Breadcrumb,
  type RelatedDoc,
  type EpicSummary,
  type TaskSummary,
  type ProjectSummary,
  type TeamSummary,
  type RoleSummary,
  type DepartmentSummary,
  type OrgHierarchyNode,
  type ActivitySummary,
  isWorkspaceContext,
  isPageContext,
  isProjectContext,
  isTaskContext,
  isOrgContext,
  isActivityContext,
  isUnifiedContext
} from './context-types'

// Context Engine
export {
  type ContextEngine,
  type ContextOptions,
  PrismaContextEngine,
  contextEngine
} from './context-engine'

// Embedding Service
export {
  embedText,
  buildEmbeddingTextFromContext,
  embedContextItem,
  searchSimilarContextItems,
  type EmbedContextParams,
  type SemanticSearchParams,
  type SearchResult
} from './embedding-service'

// Embedding Backfill (server-only)
export {
  backfillWorkspaceEmbeddings,
  type BackfillParams
} from './embedding-backfill'

// Orchestrator Types
export {
  type LoopbrainMode,
  type LoopbrainRequest,
  type LoopbrainResponse,
  type LoopbrainContextSummary,
  type LoopbrainSuggestion,
  type RetrievedItem
} from './orchestrator-types'

// Orchestrator
export {
  runLoopbrainQuery
} from './orchestrator'

// Client (frontend)
export {
  callLoopbrainAssistant,
  callSpacesLoopbrainAssistant,
  type LoopbrainAssistantParams,
  type SpacesAssistantParams
} from './client'

