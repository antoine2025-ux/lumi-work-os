import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { assertProjectAccess } from '@/lib/pm/guards'
import { z } from 'zod'

const prisma = new PrismaClient()

const toggleDailySummarySchema = z.object({
  dailySummaryEnabled: z.boolean()
})

// PATCH /api/projects/[projectId]/daily-summary-settings - Toggle daily summary setting
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params
    const body = await request.json()
    const validatedData = toggleDailySummarySchema.parse(body)

    // Get session and verify access
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check project access (require admin/owner to change settings)
    const accessResult = await assertProjectAccess(session.user, projectId, 'ADMIN')
    if (!accessResult) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Update the project setting
    const updatedProject = await prisma.project.update({
      where: { id: projectId },
      data: {
        dailySummaryEnabled: validatedData.dailySummaryEnabled
      },
      select: {
        id: true,
        name: true,
        dailySummaryEnabled: true
      }
    })

    return NextResponse.json({
      message: `Daily summaries ${validatedData.dailySummaryEnabled ? 'enabled' : 'disabled'} for project`,
      project: updatedProject
    })
  } catch (error) {
    if (error.name === 'ZodError') {
      return NextResponse.json({
        error: 'Validation error',
        details: error.errors
      }, { status: 400 })
    }

    console.error('Error updating daily summary setting:', error)
    return NextResponse.json({
      error: 'Failed to update daily summary setting',
      details: error.message
    }, { status: 500 })
  }
}
