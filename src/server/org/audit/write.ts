/**
 * Org Mutation Log Service
 * 
 * Logs org changes with small, readable logs (only critical fields).
 * NOT full entity snapshots - only before/after critical field changes.
 * 
 * Critical fields logged:
 * - ownerId (before/after)
 * - managerId (before/after)
 * - departmentId (before/after)
 * 
 * Rules:
 * 1. Log only critical fields (ownerId, managerId, departmentId) - NOT full snapshots
 * 2. Keep audit logs small, readable, LoopBrain-friendly
 * 3. Instrument all mutation endpoints
 */

import { prisma } from "@/lib/db";

export type OrgAuditEventType = 
  | "OWNERSHIP_ASSIGNED"
  | "OWNERSHIP_REMOVED"
  | "MANAGER_ASSIGNED"
  | "MANAGER_REMOVED"
  | "TEAM_MOVED"
  | "DEPARTMENT_ARCHIVED"
  | "DEPARTMENT_DELETED"
  | "TEAM_ARCHIVED"
  | "TEAM_DELETED";

/**
 * Log org mutation (only critical fields, NOT full snapshots)
 * 
 * @param params - Mutation parameters with before/after critical fields only
 */
export async function logOrgMutation(params: {
  workspaceId: string;
  actorUserId: string;
  action: OrgAuditEventType;
  entityType: string; // "TEAM", "DEPARTMENT", "PERSON", "POSITION"
  entityId: string;
  before: {
    ownerId?: string | null;
    managerId?: string | null;
    departmentId?: string | null;
  };
  after: {
    ownerId?: string | null;
    managerId?: string | null;
    departmentId?: string | null;
  };
}) {
  // Only log if there's an actual change in critical fields
  const hasChange = 
    params.before.ownerId !== params.after.ownerId ||
    params.before.managerId !== params.after.managerId ||
    params.before.departmentId !== params.after.departmentId;

  if (!hasChange) {
    // No actual change in critical fields, skip logging
    return;
  }

  // Log only critical fields (NOT full snapshots)
  // Wrap in try-catch to handle cases where audit table doesn't exist or has schema issues
  try {
    // #region agent log
    if (typeof fetch !== 'undefined') {
      fetch('http://127.0.0.1:7242/ingest/34153de7-4273-472a-b15e-68740f3fbd8e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'write.ts:64',message:'Before orgAuditLog.create',data:{workspaceId:params.workspaceId,action:params.action,entityType:params.entityType,entityId:params.entityId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'M'})}).catch(()=>{});
    }
    // #endregion
    
    // Note: event field is optional and uses a different enum than action
    // The Prisma enum OrgAuditEventType doesn't include "MANAGER_ASSIGNED"/"MANAGER_REMOVED"
    // so we set event to null to avoid enum mismatch errors
    await prisma.orgAuditLog.create({
      data: {
        workspaceId: params.workspaceId,
        userId: params.actorUserId,
        actorUserId: params.actorUserId,
        action: params.action, // String field - can be any value
        event: null, // Enum field - set to null since our action values don't match the enum
        entityType: params.entityType,
        entityId: params.entityId,
        oldValues: params.before, // Only critical fields
        newValues: params.after, // Only critical fields
        createdAt: new Date(),
      },
    });
    
    // #region agent log
    if (typeof fetch !== 'undefined') {
      fetch('http://127.0.0.1:7242/ingest/34153de7-4273-472a-b15e-68740f3fbd8e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'write.ts:80',message:'After orgAuditLog.create success',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'M'})}).catch(()=>{});
    }
    // #endregion
  } catch (error: any) {
    // #region agent log
    if (typeof fetch !== 'undefined') {
      fetch('http://127.0.0.1:7242/ingest/34153de7-4273-472a-b15e-68740f3fbd8e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'write.ts:81',message:'orgAuditLog.create error',data:{error:error?.message,errorCode:error?.code,errorMeta:error?.meta},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'M'})}).catch(()=>{});
    }
    // #endregion
    
    // If audit table doesn't exist or has schema issues, log warning but don't throw
    // Audit logging should not break the main operation
    const errorMessage = error?.message || '';
    const isTableMissing = errorMessage.includes('does not exist') ||
                           errorMessage.includes('org_audit_log') ||
                           error?.code === 'P2021' || // Table does not exist
                           error?.code === '42P01';   // PostgreSQL: relation does not exist
    
    // Check for enum mismatch error (P2009)
    const isEnumMismatch = error?.code === 'P2009' || 
                           errorMessage.includes('Invalid value for enum') ||
                           errorMessage.includes('OrgAuditEventType');
    
    if (isTableMissing) {
      console.warn('[logOrgMutation] org_audit_log table does not exist. Audit logging skipped. Please run: npx prisma migrate deploy or npx prisma db push');
      return; // Skip logging if table doesn't exist
    }
    
    if (isEnumMismatch) {
      console.warn('[logOrgMutation] Enum mismatch error (event field). Audit logging skipped. This is non-fatal.');
      return; // Skip logging if enum mismatch
    }
    
    // For other errors (constraint violations, foreign key issues, etc.), log but don't throw
    console.error('[logOrgMutation] Failed to log audit event (non-fatal):', error?.message || error);
    // Don't throw - audit logging failures should not break the main operation
  }
}
