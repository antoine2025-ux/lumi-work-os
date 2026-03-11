import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { handleApiError } from '@/lib/api-errors'
import { getAutoSuggestedPoints } from '@/lib/one-on-ones/data.server'

// ============================================================================
// GET /api/one-on-ones/suggestions — Auto-suggested talking points
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

    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get('employeeId')
    const managerId = searchParams.get('managerId')
    const seriesId = searchParams.get('seriesId') ?? undefined

    if (!employeeId || !managerId) {
      return NextResponse.json(
        { error: 'employeeId and managerId are required' },
        { status: 400 }
      )
    }

    const suggestions = await getAutoSuggestedPoints(
      employeeId,
      managerId,
      auth.workspaceId,
      seriesId
    )

    return NextResponse.json(suggestions)
  } catch (error: unknown) {
    return handleApiError(error, request)
  }
}
