/**
 * GET /api/org/job-descriptions  — List all job descriptions for workspace
 * POST /api/org/job-descriptions — Create a new job description (ADMIN)
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

const JobDescriptionCreateSchema = z.object({
  title: z.string().min(1).max(200),
  summary: z.string().max(2000).optional(),
  level: z.string().max(50).optional(),
  jobFamily: z.string().max(100).optional(),
  responsibilities: z.array(z.string()).default([]),
  requiredSkills: z.array(z.string()).default([]),
  preferredSkills: z.array(z.string()).default([]),
  keyMetrics: z.array(z.string()).default([]),
})

export async function GET(request: NextRequest) {
  try {
    const auth = await getUnifiedAuth(request)
    const userId = auth?.user?.userId
    const workspaceId = auth?.workspaceId

    if (!userId || !workspaceId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await assertAccess({ userId, workspaceId, scope: 'workspace', requireRole: ['VIEWER'] })
    setWorkspaceContext(workspaceId)

    const jobDescriptions = await prisma.jobDescription.findMany({
      where: { workspaceId },
      include: {
        _count: { select: { positions: true } },
      },
      orderBy: { title: 'asc' },
    })

    return NextResponse.json({
      ok: true,
      jobDescriptions: jobDescriptions.map((jd) => ({
        id: jd.id,
        title: jd.title,
        summary: jd.summary,
        level: jd.level,
        jobFamily: jd.jobFamily,
        responsibilities: jd.responsibilities,
        requiredSkills: jd.requiredSkills,
        preferredSkills: jd.preferredSkills,
        keyMetrics: jd.keyMetrics,
        positionCount: jd._count.positions,
        createdAt: jd.createdAt.toISOString(),
        updatedAt: jd.updatedAt.toISOString(),
      })),
    })
  } catch (error: unknown) {
    return handleApiError(error, request)
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getUnifiedAuth(request)
    const userId = auth?.user?.userId
    const workspaceId = auth?.workspaceId

    if (!userId || !workspaceId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await assertAccess({ userId, workspaceId, scope: 'workspace', requireRole: ['ADMIN'] })
    setWorkspaceContext(workspaceId)

    const body = JobDescriptionCreateSchema.parse(await request.json())

    const jobDescription = await prisma.jobDescription.create({
      data: {
        workspaceId,
        title: body.title,
        summary: body.summary ?? null,
        level: body.level ?? null,
        jobFamily: body.jobFamily ?? null,
        responsibilities: body.responsibilities,
        requiredSkills: body.requiredSkills,
        preferredSkills: body.preferredSkills,
        keyMetrics: body.keyMetrics,
      },
    })

    return NextResponse.json({ ok: true, jobDescription }, { status: 201 })
  } catch (error: unknown) {
    return handleApiError(error, request)
  }
}
