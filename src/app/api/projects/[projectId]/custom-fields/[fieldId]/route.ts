import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { assertProjectAccess } from '@/lib/pm/guards'
import { z } from 'zod'

const prisma = new PrismaClient()

const updateCustomFieldSchema = z.object({
  key: z.string().min(1, 'Key is required').regex(/^[a-zA-Z0-9_]+$/, 'Key must contain only letters, numbers, and underscores').optional(),
  label: z.string().min(1, 'Label is required').optional(),
  type: z.enum(['text', 'number', 'select', 'date', 'boolean']).optional(),
  options: z.array(z.string()).optional(),
}).refine(data => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for update',
  path: ['body'],
})

// GET /api/projects/[projectId]/custom-fields/[fieldId] - Get custom field
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; fieldId: string }> }
) {
  try {
    const { projectId, fieldId } = await params

    // Get session and verify project access
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await assertProjectAccess(session.user, projectId)

    const customField = await prisma.customFieldDef.findFirst({
      where: { 
        id: fieldId,
        projectId 
      }
    })

    if (!customField) {
      return NextResponse.json({ error: 'Custom field not found' }, { status: 404 })
    }

    return NextResponse.json(customField)
  } catch (error) {
    console.error('Error fetching custom field:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch custom field',
      details: error.message 
    }, { status: 500 })
  }
}

// PATCH /api/projects/[projectId]/custom-fields/[fieldId] - Update custom field
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; fieldId: string }> }
) {
  try {
    const { projectId, fieldId } = await params
    const body = await request.json()
    const validatedData = updateCustomFieldSchema.parse(body)

    // Get session and verify project access
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await assertProjectAccess(session.user, projectId)

    // Check if custom field exists
    const existingField = await prisma.customFieldDef.findFirst({
      where: { 
        id: fieldId,
        projectId 
      }
    })

    if (!existingField) {
      return NextResponse.json({ error: 'Custom field not found' }, { status: 404 })
    }

    // If updating key, check if new key already exists
    if (validatedData.key && validatedData.key !== existingField.key) {
      const keyExists = await prisma.customFieldDef.findFirst({
        where: {
          projectId,
          key: validatedData.key,
          id: { not: fieldId }
        }
      })

      if (keyExists) {
        return NextResponse.json({ 
          error: 'A custom field with this key already exists in this project' 
        }, { status: 400 })
      }
    }

    const updateData: any = {}
    if (validatedData.label) updateData.label = validatedData.label
    if (validatedData.type) updateData.type = validatedData.type
    if (validatedData.options) updateData.options = JSON.stringify(validatedData.options)
    if (validatedData.key) {
      updateData.key = validatedData.key
      updateData.uniqueKey = `${projectId}:${validatedData.key}`
    }

    const customField = await prisma.customFieldDef.update({
      where: { id: fieldId },
      data: updateData
    })

    return NextResponse.json(customField)
  } catch (error) {
    if (error.name === 'ZodError') {
      return NextResponse.json({ 
        error: 'Validation error',
        details: error.errors 
      }, { status: 400 })
    }

    console.error('Error updating custom field:', error)
    return NextResponse.json({ 
      error: 'Failed to update custom field',
      details: error.message 
    }, { status: 500 })
  }
}

// DELETE /api/projects/[projectId]/custom-fields/[fieldId] - Delete custom field
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; fieldId: string }> }
) {
  try {
    const { projectId, fieldId } = await params

    // Get session and verify project access
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await assertProjectAccess(session.user, projectId)

    // Check if custom field exists
    const existingField = await prisma.customFieldDef.findFirst({
      where: { 
        id: fieldId,
        projectId 
      }
    })

    if (!existingField) {
      return NextResponse.json({ error: 'Custom field not found' }, { status: 404 })
    }

    // Delete the custom field (cascade will handle custom field values)
    await prisma.customFieldDef.delete({
      where: { id: fieldId }
    })

    return NextResponse.json({ message: 'Custom field deleted successfully' })
  } catch (error) {
    console.error('Error deleting custom field:', error)
    return NextResponse.json({ 
      error: 'Failed to delete custom field',
      details: error.message 
    }, { status: 500 })
  }
}
