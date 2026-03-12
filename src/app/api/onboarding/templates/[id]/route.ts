import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { handleApiError } from '@/lib/api-errors'

const updateTemplateSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  durationDays: z.number().int().min(1).max(365).optional(),
  description: z.string().max(500).optional(),
  visibility: z.enum(['PRIVATE', 'ORG']).optional(),
  tasks: z.array(z.object({
    id: z.string().optional(),
    title: z.string().min(1).max(120),
    description: z.string().max(500).optional(),
    order: z.number().int().default(0),
    dueDay: z.number().int().min(1).optional(),
  })).min(1).max(30).optional(),
})

// GET /api/onboarding/templates/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, workspaceId, isAuthenticated } = await getUnifiedAuth(request)
    if (!isAuthenticated || !workspaceId) {
      return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 })
    }
    await assertAccess({ userId: user.userId, workspaceId, scope: 'workspace', requireRole: ['VIEWER'] })
    setWorkspaceContext(workspaceId)

    const resolvedParams = await params
    const template = await prisma.onboardingTemplate.findUnique({
      where: { id: resolvedParams.id },
      include: {
        onboarding_tasks: {
          orderBy: { order: 'asc' },
        },
      },
    })

    if (!template) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Template not found' } },
        { status: 404 }
      )
    }

    return NextResponse.json(template)
  } catch (error: unknown) {
    return handleApiError(error, request)
  }
}

// PATCH /api/onboarding/templates/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, workspaceId, isAuthenticated } = await getUnifiedAuth(request)
    if (!isAuthenticated || !workspaceId) {
      return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 })
    }
    await assertAccess({ userId: user.userId, workspaceId, scope: 'workspace', requireRole: ['VIEWER'] })
    setWorkspaceContext(workspaceId)

    const resolvedParams = await params
    const body = await request.json()
    const validatedData = updateTemplateSchema.parse(body)

    // Check if template exists
    const existingTemplate = await prisma.onboardingTemplate.findUnique({
      where: { id: resolvedParams.id },
    })

    if (!existingTemplate) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Template not found' } },
        { status: 404 }
      )
    }

    // Prepare update data
    const updateData: any = {
      ...(validatedData.name && { name: validatedData.name }),
      ...(validatedData.durationDays && { duration: validatedData.durationDays }),
      ...(validatedData.description !== undefined && { description: validatedData.description }),
    }

    // Handle tasks update if provided
    if (validatedData.tasks) {
      // Delete existing tasks
      await prisma.onboardingTask.deleteMany({
        where: { templateId: resolvedParams.id },
      })

      // Create new tasks
      updateData.onboarding_tasks = {
        create: validatedData.tasks.map(task => ({
          title: task.title,
          description: task.description,
          order: task.order,
          workspaceId: existingTemplate.workspaceId,
          updatedAt: new Date(),
        })),
      }
    }

    const template = await prisma.onboardingTemplate.update({
      where: { id: resolvedParams.id },
      data: updateData,
      include: {
        onboarding_tasks: {
          orderBy: { order: 'asc' },
        },
      },
    })

    return NextResponse.json(template)
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid input data', details: error.issues } },
        { status: 400 }
      )
    }
    return handleApiError(error, request)
  }
}

// DELETE /api/onboarding/templates/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, workspaceId, isAuthenticated } = await getUnifiedAuth(request)
    if (!isAuthenticated || !workspaceId) {
      return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 })
    }
    await assertAccess({ userId: user.userId, workspaceId, scope: 'workspace', requireRole: ['VIEWER'] })
    setWorkspaceContext(workspaceId)

    const resolvedParams = await params
    // Check if template exists
    const existingTemplate = await prisma.onboardingTemplate.findUnique({
      where: { id: resolvedParams.id },
    })

    if (!existingTemplate) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Template not found' } },
        { status: 404 }
      )
    }

    // Delete template (tasks will be cascade deleted)
    await prisma.onboardingTemplate.delete({
      where: { id: resolvedParams.id },
    })

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    return handleApiError(error, request)
  }
}
















