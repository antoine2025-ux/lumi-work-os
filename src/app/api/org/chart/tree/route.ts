import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { handleApiError } from '@/lib/api-errors'
import { buildOrgChartTree } from '@/lib/org/projections/buildOrgChartTree'

/**
 * GET /api/org/chart/tree
 * 
 * Returns the hierarchical org chart tree for the current workspace.
 * Uses OrgPosition.parentId relationships to build the tree structure.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await getUnifiedAuth(request)

    if (!auth.isAuthenticated || !auth.user || !auth.workspaceId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check workspace access
    await assertAccess({
      userId: auth.user.userId,
      workspaceId: auth.workspaceId,
      scope: 'workspace',
      requireRole: ['MEMBER'],
    })
    setWorkspaceContext(auth.workspaceId)

    // Build org chart tree
    const tree = await buildOrgChartTree(auth.workspaceId, {
      includeVacant: true,
      maxDepth: 10,
    })

    return NextResponse.json({
      success: true,
      tree,
    })
  } catch (error: unknown) {
    return handleApiError(error)
  }
}
