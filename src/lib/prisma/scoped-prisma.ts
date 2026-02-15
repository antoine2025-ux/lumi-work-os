/**
 * Scoped Prisma Client using $extends (Prisma v5+ pattern)
 * This provides automatic workspace isolation by wrapping queries
 */

import { PrismaClient } from '@prisma/client'
import { getWorkspaceContext, WORKSPACE_SCOPED_MODELS } from './scopingMiddleware'

/**
 * Models that use snake_case `workspace_id` instead of camelCase `workspaceId`.
 * These are legacy snake_case Prisma models that use @@map but keep snake_case field names.
 */
const SNAKE_CASE_WORKSPACE_FIELD_MODELS = new Set([
  'wiki_ai_interactions',
  'wiki_page_views',
])

/**
 * Get the correct workspace field name for a given model.
 */
function getWorkspaceField(model: string): string {
  return SNAKE_CASE_WORKSPACE_FIELD_MODELS.has(model) ? 'workspace_id' : 'workspaceId'
}

/**
 * Create a scoped Prisma client that automatically adds workspaceId to queries
 * Uses Prisma v5+ $extends pattern
 */
export function createScopedPrisma(baseClient: PrismaClient) {
  return baseClient.$extends({
    query: {
      $allOperations({ operation, model, args, query }) {
        // Skip non-workspace-scoped models
        if (!model || !WORKSPACE_SCOPED_MODELS.includes(model as any)) {
          return query(args)
        }

        // Get current workspace context
        const workspaceId = getWorkspaceContext()
        const wsField = getWorkspaceField(model)

        // Skip if finding by ID (for lookups)
        if (operation === 'findFirst' && args?.where?.id) {
          return query(args)
        }

        // STRICT: Enforce workspace context in both dev and prod
        // Missing workspace context must not silently execute - fail fast to catch bugs
        if (!workspaceId) {
          const errorMessage = `Workspace scoping enabled but no workspace context set for ${operation} on ${model}. ` +
            `Call setWorkspaceContext(workspaceId) before querying workspace-scoped models. ` +
            `This is a safety check to prevent cross-workspace data leaks.`
          throw new Error(errorMessage)
        }

        // Add workspaceId filter to read queries
        // All models in WORKSPACE_SCOPED_MODELS have a direct workspaceId column
        if (operation === 'findMany' || operation === 'findFirst' || operation === 'count') {
          if (!args.where) {
            args.where = {}
          }
          if (!args.where[wsField] && workspaceId) {
            args.where[wsField] = workspaceId
          }
        }

        // For create operations, ensure workspaceId is set
        if (operation === 'create' || operation === 'createMany') {
          if (operation === 'createMany' && Array.isArray(args.data)) {
            args.data = args.data.map((item: Record<string, unknown>) => {
              if (!item[wsField] && workspaceId) {
                item[wsField] = workspaceId
              }
              return item
            })
          } else if (args.data && !args.data[wsField] && workspaceId) {
            args.data[wsField] = workspaceId
          }
        }

        // For update/delete operations, ensure workspaceId is in where clause
        if (operation === 'update' || operation === 'updateMany' || operation === 'delete' || operation === 'deleteMany') {
          if (!args.where) {
            throw new Error(
              `Workspace scoping enabled: No where clause provided for ${operation} on ${model}. ` +
              `Update/delete operations must include a where clause for safety.`
            )
          }
          if (!args.where[wsField] && workspaceId) {
            args.where[wsField] = workspaceId
          }
        }

        return query(args)
      },
    },
  })
}

