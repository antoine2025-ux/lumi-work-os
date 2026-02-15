import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { handleApiError } from '@/lib/api-errors'

// ============================================================================
// Schemas
// ============================================================================

const CreateTemplateSchema = z.object({
  name: z.string().min(1).max(200),
  sections: z.array(z.object({
    title: z.string(),
    type: z.enum(['goal_progress', 'blockers', 'feedback', 'development', 'custom']),
    description: z.string().optional(),
    required: z.boolean().optional().default(false),
  })),
})

// ============================================================================
// GET /api/performance/templates
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const auth = await getUnifiedAuth(request)

    await assertAccess({
      userId: auth.user.userId,
      workspaceId: auth.workspaceId,
      scope: 'workspace',
      requireRole: ['VIEWER', 'MEMBER', 'ADMIN', 'OWNER'],
    })

    setWorkspaceContext(auth.workspaceId)

    const templates = await prisma.oneOnOneTemplate.findMany({
      where: { workspaceId: auth.workspaceId },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(templates)
  } catch (error) {
    return handleApiError(error, request)
  }
}

// ============================================================================
// POST /api/performance/templates
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const auth = await getUnifiedAuth(request)

    await assertAccess({
      userId: auth.user.userId,
      workspaceId: auth.workspaceId,
      scope: 'workspace',
      requireRole: ['ADMIN', 'OWNER'],
    })

    setWorkspaceContext(auth.workspaceId)

    const body = await request.json()
    const data = CreateTemplateSchema.parse(body)

    const template = await prisma.oneOnOneTemplate.create({
      data: {
        workspaceId: auth.workspaceId,
        name: data.name,
        sections: data.sections,
      },
    })

    return NextResponse.json(template, { status: 201 })
  } catch (error) {
    return handleApiError(error, request)
  }
}
