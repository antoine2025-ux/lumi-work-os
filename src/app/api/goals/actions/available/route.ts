import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { handleApiError } from '@/lib/api-errors'

// ============================================================================
// GET /api/goals/actions/available - Agent action discovery
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const auth = await getUnifiedAuth(request)

    await assertAccess({
      userId: auth.user.userId,
      workspaceId: auth.workspaceId,
      scope: 'workspace',
      requireRole: ['MEMBER', 'ADMIN', 'OWNER'],
    })

    setWorkspaceContext(auth.workspaceId)

    const actions = [
      {
        action: 'update_progress',
        description: 'Update a goal\'s progress with source attribution',
        endpoint: '/api/goals/{goalId}/actions/update-progress',
        method: 'POST',
        requiredParams: {
          newProgress: { type: 'number', min: 0, max: 100, description: 'New progress percentage' },
          triggeredBy: { type: 'string', enum: ['manual_update', 'key_result_change', 'agent_action'], description: 'Source of the update' },
        },
        optionalParams: {
          sourceId: { type: 'string', description: 'ID of the source entity' },
          confidence: { type: 'number', min: 0, max: 1, description: 'Confidence in this update' },
        },
        confidenceThreshold: 0.6,
        requiresApproval: false,
      },
      {
        action: 'reallocate_resources',
        description: 'Move resources between projects linked to a goal',
        endpoint: '/api/goals/{goalId}/actions/reallocate-resources',
        method: 'POST',
        requiredParams: {
          fromProjectId: { type: 'string', description: 'Project to move resources from' },
          toProjectId: { type: 'string', description: 'Project to move resources to' },
          resourceCount: { type: 'number', min: 1, description: 'Number of resources to move' },
        },
        confidenceThreshold: 0.8,
        requiresApproval: false,
      },
      {
        action: 'escalate_to_stakeholder',
        description: 'Escalate a goal for review by adding a reviewer and notifying stakeholders',
        endpoint: '/api/goals/{goalId}/actions/escalate-to-stakeholder',
        method: 'POST',
        requiredParams: {
          escalateTo: { type: 'string', description: 'User ID to escalate to' },
          reason: { type: 'string', description: 'Reason for escalation' },
        },
        confidenceThreshold: 0.7,
        requiresApproval: false,
      },
      {
        action: 'adjust_timeline',
        description: 'Adjust a goal\'s deadline and cascade changes to child goals',
        endpoint: '/api/goals/{goalId}/actions/adjust-timeline',
        method: 'POST',
        requiredParams: {
          newEndDate: { type: 'string', format: 'date-time', description: 'New deadline' },
        },
        optionalParams: {
          reason: { type: 'string', description: 'Reason for timeline adjustment' },
        },
        confidenceThreshold: 0.75,
        requiresApproval: false,
      },
    ]

    return NextResponse.json({
      version: 'v0',
      totalActions: actions.length,
      actions,
    })
  } catch (error: unknown) {
    return handleApiError(error, request)
  }
}
