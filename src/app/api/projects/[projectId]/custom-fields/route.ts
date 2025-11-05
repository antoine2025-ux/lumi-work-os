import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { assertProjectAccess } from '@/lib/pm/guards'
import { z } from 'zod'
import { prisma } from '@/lib/db'


const createCustomFieldSchema = z.object({
  key: z.string().min(1, 'Key is required').regex(/^[a-zA-Z0-9_]+$/, 'Key must contain only letters, numbers, and underscores'),
  label: z.string().min(1, 'Label is required'),
  type: z.enum(['text', 'number', 'select', 'date', 'boolean']),
  options: z.array(z.string()).optional(),
})

const updateCustomFieldSchema = z.object({
  key: z.string().min(1, 'Key is required').regex(/^[a-zA-Z0-9_]+$/, 'Key must contain only letters, numbers, and underscores').optional(),
  label: z.string().min(1, 'Label is required').optional(),
  type: z.enum(['text', 'number', 'select', 'date', 'boolean']).optional(),
  options: z.array(z.string()).optional(),
}).refine(data => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for update',
  path: ['body'],
})

// GET /api/projects/[projectId]/custom-fields - List custom fields
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params

    // Get session and verify project access
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get authenticated user from database
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 })
    }

    // Verify project access
    await assertProjectAccess(user, projectId)

    const customFields = await prisma.customFieldDef.findMany({
      where: { projectId },
      orderBy: { createdAt: 'asc' }
    })

    return NextResponse.json(customFields)
  } catch (error) {
    console.error('Error fetching custom fields:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ 
      error: 'Failed to fetch custom fields',
      details: errorMessage
    }, { status: 500 })
  }
}

// POST /api/projects/[projectId]/custom-fields - Create custom field
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params
    const body = await request.json()
    const validatedData = createCustomFieldSchema.parse(body)

    // Get session and verify project access
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get authenticated user from database
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 })
    }

    // Verify project access
    await assertProjectAccess(user, projectId)

    // Check if key already exists for this project
    const existingField = await prisma.customFieldDef.findFirst({
      where: {
        projectId,
        key: validatedData.key
      }
    })

    if (existingField) {
      return NextResponse.json({ 
        error: 'A custom field with this key already exists in this project' 
      }, { status: 400 })
    }

    const customField = await prisma.customFieldDef.create({
      data: {
        projectId,
        key: validatedData.key,
        label: validatedData.label,
        type: validatedData.type,
        options: validatedData.options ? JSON.stringify(validatedData.options) : undefined,
        uniqueKey: `${projectId}:${validatedData.key}`
      }
    })

    return NextResponse.json(customField)
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ 
        error: 'Validation error',
        details: (error as any).errors 
      }, { status: 400 })
    }

    console.error('Error creating custom field:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ 
      error: 'Failed to create custom field',
      details: errorMessage
    }, { status: 500 })
  }
}
