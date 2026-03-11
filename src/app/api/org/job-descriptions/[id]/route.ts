/**
 * GET    /api/org/job-descriptions/[id] — Fetch a single job description
 * PUT    /api/org/job-descriptions/[id] — Update job description (ADMIN)
 * DELETE /api/org/job-descriptions/[id] — Delete job description (ADMIN)
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

const JobDescriptionUpdateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  summary: z.string().max(2000).optional(),
  level: z.string().max(50).optional(),
  jobFamily: z.string().max(100).optional(),
  responsibilities: z.array(z.string()).optional(),
  requiredSkills: z.array(z.string()).optional(),
  preferredSkills: z.array(z.string()).optional(),
  keyMetrics: z.array(z.string()).optional(),
})

export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params
    const auth = await getUnifiedAuth(request)
    const userId = auth?.user?.userId
    const workspaceId = auth?.workspaceId

    if (!userId || !workspaceId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await assertAccess({ userId, workspaceId, scope: 'workspace', requireRole: ['VIEWER'] })
    setWorkspaceContext(workspaceId)

    const jobDescription = await prisma.jobDescription.findFirst({
      where: { id, workspaceId },
      include: {
        positions: {
          select: {
            id: true,
            title: true,
            userId: true,
            user: { select: { id: true, name: true } },
          },
        },
      },
    })

    if (!jobDescription) {
      return NextResponse.json({ error: 'Job description not found' }, { status: 404 })
    }

    return NextResponse.json({ ok: true, jobDescription })
  } catch (error: unknown) {
    return handleApiError(error, request)
  }
}

export async function PUT(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params
    const auth = await getUnifiedAuth(request)
    const userId = auth?.user?.userId
    const workspaceId = auth?.workspaceId

    if (!userId || !workspaceId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await assertAccess({ userId, workspaceId, scope: 'workspace', requireRole: ['ADMIN'] })
    setWorkspaceContext(workspaceId)

    const existing = await prisma.jobDescription.findFirst({
      where: { id, workspaceId },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Job description not found' }, { status: 404 })
    }

    const body = JobDescriptionUpdateSchema.parse(await request.json())

    const updated = await prisma.jobDescription.update({
      where: { id },
      data: {
        ...(body.title !== undefined && { title: body.title }),
        ...(body.summary !== undefined && { summary: body.summary }),
        ...(body.level !== undefined && { level: body.level }),
        ...(body.jobFamily !== undefined && { jobFamily: body.jobFamily }),
        ...(body.responsibilities !== undefined && { responsibilities: body.responsibilities }),
        ...(body.requiredSkills !== undefined && { requiredSkills: body.requiredSkills }),
        ...(body.preferredSkills !== undefined && { preferredSkills: body.preferredSkills }),
        ...(body.keyMetrics !== undefined && { keyMetrics: body.keyMetrics }),
      },
    })

    return NextResponse.json({ ok: true, jobDescription: updated })
  } catch (error: unknown) {
    return handleApiError(error, request)
  }
}

export async function DELETE(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params
    const auth = await getUnifiedAuth(request)
    const userId = auth?.user?.userId
    const workspaceId = auth?.workspaceId

    if (!userId || !workspaceId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await assertAccess({ userId, workspaceId, scope: 'workspace', requireRole: ['ADMIN'] })
    setWorkspaceContext(workspaceId)

    const existing = await prisma.jobDescription.findFirst({
      where: { id, workspaceId },
      include: { _count: { select: { positions: true } } },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Job description not found' }, { status: 404 })
    }

    if (existing._count.positions > 0) {
      return NextResponse.json(
        { error: `Cannot delete — ${existing._count.positions} position(s) still linked. Unlink them first.` },
        { status: 400 }
      )
    }

    await prisma.jobDescription.delete({ where: { id } })

    return NextResponse.json({ ok: true })
  } catch (error: unknown) {
    return handleApiError(error, request)
  }
}
