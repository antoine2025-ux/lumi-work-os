/**
 * Scoped Prisma Client using $extends (Prisma v5+ pattern)
 * This provides automatic workspace isolation by wrapping queries
 */

import { PrismaClient } from '@prisma/client'
import { getWorkspaceContext, WORKSPACE_SCOPED_MODELS } from './scopingMiddleware'

/**
 * Create a scoped Prisma client that automatically adds workspaceId to queries
 * Uses Prisma v5+ $extends pattern
 */
export function createScopedPrisma(baseClient: PrismaClient) {
  const isProduction = process.env.NODE_ENV === 'production'
  
  return baseClient.$extends({
    query: {
      $allOperations({ operation, model, args, query }) {
        // Skip non-workspace-scoped models
        if (!model || !WORKSPACE_SCOPED_MODELS.includes(model as any)) {
          return query(args)
        }

        // Get current workspace context
        const workspaceId = getWorkspaceContext()

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

        // Add workspaceId to queries (only if model has workspaceId field)
        // Some models like WikiFavorite don't have workspaceId - they scope through relations
        if (operation === 'findMany' || operation === 'findFirst' || operation === 'count') {
          if (!args.where) {
            args.where = {}
          }
          // Skip adding workspaceId for models that don't have it (they scope through relations)
          if (model !== 'WikiFavorite' && !args.where.workspaceId && workspaceId) {
            args.where.workspaceId = workspaceId
          }
        }

        // For create operations, ensure workspaceId is set (only if model has workspaceId field)
        if (operation === 'create' || operation === 'createMany') {
          if (operation === 'createMany' && Array.isArray(args.data)) {
            args.data = args.data.map((item: any) => {
              // Skip adding workspaceId for models that don't have it
              if (model !== 'WikiFavorite' && !item.workspaceId && workspaceId) {
                item.workspaceId = workspaceId
              }
              return item
            })
          } else if (args.data && model !== 'WikiFavorite' && !args.data.workspaceId && workspaceId) {
            args.data.workspaceId = workspaceId
          }
        }

        // For update/delete operations, ensure workspaceId is in where clause (only if model has workspaceId field)
        if (operation === 'update' || operation === 'updateMany' || operation === 'delete' || operation === 'deleteMany') {
          if (!args.where) {
            // STRICT: Require where clause for update/delete operations
            throw new Error(
              `Workspace scoping enabled: No where clause provided for ${operation} on ${model}. ` +
              `Update/delete operations must include a where clause for safety.`
            )
          }
          // Skip adding workspaceId for models that don't have it
          if (model !== 'WikiFavorite' && !args.where.workspaceId && workspaceId) {
            args.where.workspaceId = workspaceId
          }
        }

        return query(args)
      },
    },
  })
}

