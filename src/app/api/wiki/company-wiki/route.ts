import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import {
  getCompanyWikiPages,
  getCompanyWikiFolders,
  getCompanyWikiSpace,
} from '@/lib/spaces/queries'
import { handleApiError } from '@/lib/api-errors'

/**
 * GET /api/wiki/company-wiki
 * Returns Company Wiki view data: sections (folders) and recent pages.
 * Only pages where spaceId = companyWikiSpaceId.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await getUnifiedAuth(request)
    await assertAccess({
      userId: auth.user.userId,
      workspaceId: auth.workspaceId,
      scope: 'workspace',
      requireRole: ['VIEWER'],
    })
    setWorkspaceContext(auth.workspaceId)

    const [companyWikiSpace, folders, recentPages] = await Promise.all([
      getCompanyWikiSpace(auth.workspaceId, auth.user.userId),
      getCompanyWikiFolders(auth.workspaceId),
      getCompanyWikiPages(auth.workspaceId, { limit: 20 }),
    ])

    return NextResponse.json({
      companyWikiSpaceId: companyWikiSpace.id,
      folders,
      recentPages,
    })
  } catch (error) {
    return handleApiError(error, request)
  }
}
