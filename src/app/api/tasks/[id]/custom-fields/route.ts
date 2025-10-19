import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { assertProjectAccess } from '@/lib/pm/guards'
import { logTaskHistory } from '@/lib/pm/history'
import { emitProjectEvent } from '@/lib/pm/events'
import { z } from 'zod'

const prisma = new PrismaClient()

const updateCustomFieldsSchema = z.object({
  customFields: z.array(z.object({
    fieldId: z.string(),
    value: z.any() // Can be string, number, boolean, or null
  }))
})

// POST /api/tasks/[id]/custom-fields - Upsert custom field values for a task
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: taskId } = await params
    const body = await request.json()
    const validatedData = updateCustomFieldsSchema.parse(body)

    // Get session for history logging
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get task with project info
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { 
        project: true,
        customFields: {
          include: {
            field: true
          }
        }
      }
    })

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Check project access
    await assertProjectAccess(session.user, task.projectId)

    // Get all custom field definitions for this project
    const fieldDefs = await prisma.customFieldDef.findMany({
      where: { projectId: task.projectId }
    })

    const fieldDefMap = new Map(fieldDefs.map(def => [def.id, def]))

    // Validate that all fieldIds belong to this project
    for (const { fieldId } of validatedData.customFields) {
      if (!fieldDefMap.has(fieldId)) {
        return NextResponse.json({ 
          error: `Custom field ${fieldId} does not belong to this project` 
        }, { status: 400 })
      }
    }

    // Process each custom field value
    const results = []
    for (const { fieldId, value } of validatedData.customFields) {
      const fieldDef = fieldDefMap.get(fieldId)!
      
      // Validate value based on field type
      let validatedValue = value
      if (value !== null && value !== undefined) {
        switch (fieldDef.type) {
          case 'text':
            validatedValue = String(value)
            break
          case 'number':
            validatedValue = Number(value)
            if (isNaN(validatedValue)) {
              return NextResponse.json({ 
                error: `Invalid number value for field ${fieldDef.label}` 
              }, { status: 400 })
            }
            break
          case 'boolean':
            validatedValue = Boolean(value)
            break
          case 'date':
            if (typeof value === 'string') {
              validatedValue = new Date(value).toISOString()
            } else {
              validatedValue = value
            }
            break
          case 'select':
            if (fieldDef.options) {
              const options = JSON.parse(fieldDef.options)
              if (!options.includes(value)) {
                return NextResponse.json({ 
                  error: `Invalid option "${value}" for field ${fieldDef.label}. Valid options: ${options.join(', ')}` 
                }, { status: 400 })
              }
            }
            validatedValue = String(value)
            break
        }
      }

      // Upsert the custom field value
      const customFieldValue = await prisma.customFieldVal.upsert({
        where: {
          taskId_fieldId: {
            taskId,
            fieldId
          }
        },
        update: {
          value: JSON.stringify(validatedValue)
        },
        create: {
          taskId,
          fieldId,
          value: JSON.stringify(validatedValue)
        }
      })

      // Log history for the change
      const oldValue = task.customFields.find(cf => cf.fieldId === fieldId)?.value
      if (oldValue !== JSON.stringify(validatedValue)) {
        await logTaskHistory(taskId, session.user.id, `customField.${fieldDef.key}`, oldValue, JSON.stringify(validatedValue))
      }

      results.push(customFieldValue)
    }

    // Emit Socket.IO event
    emitProjectEvent(task.projectId, 'taskUpdated', {
      taskId,
      updates: { customFields: validatedData.customFields },
      userId: session.user.id
    })

    return NextResponse.json({ 
      message: 'Custom fields updated successfully',
      customFields: results 
    })
  } catch (error) {
    if (error.name === 'ZodError') {
      return NextResponse.json({ 
        error: 'Validation error',
        details: error.errors 
      }, { status: 400 })
    }

    console.error('Error updating task custom fields:', error)
    return NextResponse.json({ 
      error: 'Failed to update custom fields',
      details: error.message 
    }, { status: 500 })
  }
}
