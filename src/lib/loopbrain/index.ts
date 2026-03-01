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

// Org Context Builder
export {
  buildOrgContextBundleForCurrentWorkspace,
  type OrgContextBundle
} from './orgContextBuilder'

// Org Context Mapper
export {
  mapDepartmentToContextObject,
  mapTeamToContextObject,
  mapPositionToContextObject,
  mapPersonToContextObject,
  type OrgDepartmentSource,
  type OrgTeamSource,
  type OrgPositionSource,
  type OrgPersonSource
} from './orgContextMapper'

// Org IDs
export {
  orgId, // orgId() helper function from orgIds.ts
  departmentId,
  teamId,
  roleId,
  personId
} from './orgIds'

// Legacy Context Types (now from canonical context-types.ts)
export type {
  ContextObject as LegacyContextObject,
  ContextRelation,
} from '@/lib/context/context-types'

export type {
  ContextStatus,
  ContextType as LegacyContextType,
  ContextRelationType
} from './contextTypes'

// Org Loopbrain Context Bundle
export {
  type OrgLoopbrainEntityType,
  type OrgLoopbrainStatus,
  type OrgLoopbrainRelation,
  type OrgLoopbrainContextObject,
  type OrgLoopbrainContextBundle
} from './org/types'
export {
  buildOrgLoopbrainContextBundleForCurrentWorkspace,
  buildOrgLoopbrainContextBundleForWorkspace,
  buildOrgLoopbrainContextBundleFromStore
} from './org/buildOrgLoopbrainContextBundle'

// Org Context for Loopbrain (from ContextStore)
export {
  getOrgContextForLoopbrain,
  getOrgAndPeopleContextForLoopbrain,
  type LoopbrainOrgContextBundle,
  type LoopbrainOrgPeopleContext
} from './orgContextForLoopbrain'

// Org Prompt Context Builder
export {
  buildOrgPromptContext,
  buildOrgContextText,
  type OrgPromptContext
} from './orgPromptContextBuilder'

// Org Sub-Contexts (targeted fetchers)
export {
  getOrgHeadcountContextForLoopbrain,
  getOrgReportingContextForLoopbrain,
  getOrgRiskContextForLoopbrain,
  type OrgHeadcountContext,
  type OrgReportingContext,
  type OrgRiskContext
} from './orgSubContexts'

// Org Guardrails
export {
  ORG_GUARDRAILS,
  ORG_OUTPUT_FORMAT_RULES
} from './promptBlocks/orgGuardrails'

// Org Response Validator
export {
  validateOrgResponse
} from './postProcessors/orgValidator'

// Org Referenced Context
export {
  buildReferencedContextSummary,
  formatReferencedContextFooter,
  type ReferencedContextSummary
} from './postProcessors/orgReferencedContext'

// Org Question Type Detection
export {
  detectOrgQuestionType
} from './orgQuestionType'

// Org QA Service
export {
  runOrgQa,
  type OrgQaResult
} from './orgQaService'
