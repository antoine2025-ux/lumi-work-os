import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { handleApiError } from '@/lib/api-errors'
import { syncGoalProjects } from '@/lib/goals/project-sync'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ goalId: string }> }
) {
  try {
    const { goalId } = await params
    const auth = await getUnifiedAuth(request)
    
    await assertAccess({
      userId: auth.user.userId,
      workspaceId: auth.workspaceId,
      scope: 'workspace',
    })
    
    setWorkspaceContext(auth.workspaceId)

    // Sync all projects for this goal
    const result = await syncGoalProjects(goalId, auth.user.userId)

    return NextResponse.json({
      success: true,
      goalId,
      previousProgress: result.previousProgress,
      newProgress: result.newProgress,
      updated: result.updated,
      syncedAt: new Date().toISOString(),
    })
  } catch (error) {
    return handleApiError(error)
  }
}
