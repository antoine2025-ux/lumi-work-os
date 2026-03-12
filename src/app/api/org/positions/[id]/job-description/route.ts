/**
 * PUT /api/org/positions/[id]/job-description
 * Link or unlink a JobDescription from an OrgPosition.
 * Pass { jobDescriptionId: string } to link, { jobDescriptionId: null } to unlink.
 *
 * Auth pattern: getUnifiedAuth → assertAccess → setWorkspaceContext → Zod → Prisma
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { handleApiError } from '@/lib/api-errors'

const LinkJobDescriptionSchema = z.object({
  jobDescriptionId: z.string().nullable(),
})

export async function PUT(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id: positionId } = await ctx.params
    const auth = await getUnifiedAuth(request)
    const userId = auth?.user?.userId
    const workspaceId = auth?.workspaceId

    if (!userId || !workspaceId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await assertAccess({ userId, workspaceId, scope: 'workspace', requireRole: ['ADMIN'] })
    setWorkspaceContext(workspaceId)

    const position = await prisma.orgPosition.findFirst({
      where: { id: positionId, workspaceId },
    })
    if (!position) {
      return NextResponse.json({ error: 'Position not found' }, { status: 404 })
    }

    const { jobDescriptionId } = LinkJobDescriptionSchema.parse(await request.json())

    if (jobDescriptionId !== null) {
      const jd = await prisma.jobDescription.findFirst({
        where: { id: jobDescriptionId, workspaceId },
      })
      if (!jd) {
        return NextResponse.json({ error: 'Job description not found' }, { status: 404 })
      }
    }

    await prisma.orgPosition.update({
      where: { id: positionId },
      data: { jobDescriptionId },
    })

    return NextResponse.json({ ok: true, positionId, jobDescriptionId })
  } catch (error: unknown) {
    return handleApiError(error, request)
  }
}
