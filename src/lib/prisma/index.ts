/**
 * Central Prisma client re-export.
 * 
 * This file exists as a compatibility layer so that imports from "@/lib/prisma"
 * resolve to the same scoped Prisma client as "@/lib/db".
 * 
 * When PRISMA_WORKSPACE_SCOPING_ENABLED=true, the `prisma` export is workspace-scoped
 * and requires setWorkspaceContext(workspaceId) before querying workspace-scoped models.
 * 
 * For scripts/background jobs that need unscoped access, use prismaUnscoped.
 */
export { prisma, prismaUnscoped } from '@/lib/db'
