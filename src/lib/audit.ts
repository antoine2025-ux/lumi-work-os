import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'

export type AuditAction = 
  | 'CREATE' 
  | 'UPDATE' 
  | 'DELETE' 
  | 'ASSIGN' 
  | 'UNASSIGN' 
  | 'MOVE' 
  | 'PROMOTE' 
  | 'DEACTIVATE' 
  | 'ACTIVATE'

export type AuditEntityType = 
  | 'USER' 
  | 'ROLE' 
  | 'POSITION' 
  | 'ASSIGNMENT' 
  | 'WORKSPACE_MEMBER'

export interface AuditLogEntry {
  workspaceId: string
  userId: string
  action: AuditAction
  entityType: AuditEntityType
  entityId: string
  oldValues?: Record<string, unknown>
  newValues?: Record<string, unknown>
  metadata?: {
    reason?: string
    effectiveDate?: Date
    department?: string
    manager?: string
    [key: string]: unknown
  }
}

export async function logAuditEvent(entry: AuditLogEntry) {
  try {
    console.log('🔍 Logging audit event:', {
      workspaceId: entry.workspaceId,
      userId: entry.userId,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
    })
    
    const auditLog = await prisma.orgAuditLog.create({
      data: {
        workspaceId: entry.workspaceId,
        userId: entry.userId,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        oldValues: (entry.oldValues ?? Prisma.JsonNull) as Prisma.InputJsonValue,
        newValues: (entry.newValues ?? Prisma.JsonNull) as Prisma.InputJsonValue,
        metadata: (entry.metadata ?? Prisma.JsonNull) as Prisma.InputJsonValue,
      },
    })
    
    console.log('✅ Audit log created:', auditLog.id)
  } catch (error) {
    console.error('❌ Failed to log audit event:', error)
    // Don't throw - audit logging should not break the main operation
  }
}

export async function getAuditHistory(
  workspaceId: string,
  options: {
    entityType?: AuditEntityType
    entityId?: string
    userId?: string
    action?: AuditAction
    limit?: number
    offset?: number
  } = {}
) {
  const {
    entityType,
    entityId,
    userId,
    action,
    limit = 50,
    offset = 0
  } = options

  const where: Prisma.OrgAuditLogWhereInput = {
    workspaceId,
  }

  if (entityType) where.entityType = entityType
  if (entityId) where.entityId = entityId
  if (userId) where.userId = userId
  if (action) where.action = action

  return await prisma.orgAuditLog.findMany({
    where,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: limit,
    skip: offset,
  })
}

export async function getUserRoleHistory(
  workspaceId: string,
  userId: string,
  limit: number = 20
) {
  return await getAuditHistory(workspaceId, {
    entityType: 'ASSIGNMENT',
    userId,
    limit,
  })
}
