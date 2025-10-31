import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'


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
    const resolvedParams = await params
    const template = await prisma.onboardingTemplate.findUnique({
      where: { id: resolvedParams.id },
      include: {
        tasks: {
          orderBy: { order: 'asc' },
        },
        createdBy: {
          select: { name: true, email: true },
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
  } catch (error) {
    console.error('Error fetching template:', error)
    return NextResponse.json(
      { error: { code: 'FETCH_ERROR', message: 'Failed to fetch template' } },
      { status: 500 }
    )
  }
}

// PATCH /api/onboarding/templates/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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
      ...(validatedData.durationDays && { durationDays: validatedData.durationDays }),
      ...(validatedData.description !== undefined && { description: validatedData.description }),
      ...(validatedData.visibility && { visibility: validatedData.visibility }),
    }

    // Handle tasks update if provided
    if (validatedData.tasks) {
      // Delete existing tasks
      await prisma.templateTask.deleteMany({
        where: { templateId: resolvedParams.id },
      })

      // Create new tasks
      updateData.tasks = {
        create: validatedData.tasks.map(task => ({
          title: task.title,
          description: task.description,
          order: task.order,
          dueDay: task.dueDay,
        })),
      }
    }

    const template = await prisma.onboardingTemplate.update({
      where: { id: resolvedParams.id },
      data: updateData,
      include: {
        tasks: {
          orderBy: { order: 'asc' },
        },
        createdBy: {
          select: { name: true, email: true },
        },
      },
    })

    return NextResponse.json(template)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid input data', details: error.errors } },
        { status: 400 }
      )
    }

    console.error('Error updating template:', error)
    return NextResponse.json(
      { error: { code: 'UPDATE_ERROR', message: 'Failed to update template' } },
      { status: 500 }
    )
  }
}

// DELETE /api/onboarding/templates/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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
  } catch (error) {
    console.error('Error deleting template:', error)
    return NextResponse.json(
      { error: { code: 'DELETE_ERROR', message: 'Failed to delete template' } },
      { status: 500 }
    )
  }
}










