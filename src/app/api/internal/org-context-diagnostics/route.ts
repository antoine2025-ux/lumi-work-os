/**
 * Org Context Diagnostics API
 *
 * Internal endpoint to inspect Org → ContextStore health.
 * Returns counts, samples, and health issues for the authenticated workspace.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { handleApiError } from '@/lib/api-errors'
import { getOrgContextDiagnostics } from '@/lib/org/org-context-service'

export async function GET(request: NextRequest) {
  try {
    const auth = await getUnifiedAuth(request)
    await assertAccess({ userId: auth.user.userId, workspaceId: auth.workspaceId, scope: 'workspace', requireRole: ['ADMIN'] })
    setWorkspaceContext(auth.workspaceId)

    const diagnostics = await getOrgContextDiagnostics(auth.workspaceId)

    return NextResponse.json({ ok: true, diagnostics }, { status: 200 })
  } catch (error: unknown) {
    return handleApiError(error)
  }
}
