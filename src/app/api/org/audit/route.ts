import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext, hasPermission } from '@/lib/unified-auth'
import { getAuditHistory, getUserRoleHistory } from '@/lib/audit'

// GET /api/org/audit - Get audit trail
export async function GET(request: NextRequest) {
  try {
    const authContext = await getAuthContext(request)
    
    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspaceId') || authContext.user.workspaceId
    const entityType = searchParams.get('entityType')
    const entityId = searchParams.get('entityId')
    const userId = searchParams.get('userId')
    const action = searchParams.get('action')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Check if user has read permission for this workspace
    const canRead = await hasPermission(authContext.user.id, workspaceId, 'READ')
    if (!canRead) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const auditLogs = await getAuditHistory(workspaceId, {
      entityType: entityType as any,
      entityId: entityId || undefined,
      userId: userId || undefined,
      action: action as any,
      limit,
      offset,
    })

    return NextResponse.json({
      logs: auditLogs,
      pagination: {
        limit,
        offset,
        hasMore: auditLogs.length === limit,
      },
    })
  } catch (error) {
    console.error('❌ Error fetching audit logs:', error)
    return NextResponse.json({ error: 'Failed to fetch audit logs' }, { status: 500 })
  }
}

// GET /api/org/audit/user-history - Get user's role history
export async function POST(request: NextRequest) {
  try {
    const authContext = await getAuthContext(request)
    
    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { userId, limit = 20 } = await request.json()

    // Check if user has read permission for this workspace
    const canRead = await hasPermission(authContext.user.id, authContext.user.workspaceId, 'READ')
    if (!canRead) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Users can only view their own history, admins can view anyone's
    const canViewAuditLog = await hasPermission(authContext.user.id, authContext.user.workspaceId, 'ADMIN')
    const targetUserId = canViewAuditLog ? userId : authContext.user.id

    const roleHistory = await getUserRoleHistory(
      authContext.user.workspaceId,
      targetUserId,
      limit
    )

    return NextResponse.json({
      userId: targetUserId,
      history: roleHistory,
    })
  } catch (error) {
    console.error('Error fetching user role history:', error)
    return NextResponse.json({ error: 'Failed to fetch role history' }, { status: 500 })
  }
}
