import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/server/authOptions'
import { createUserWorkspace } from '@/lib/simple-auth'
import { handleApiError } from '@/lib/api-errors'
import { CreateWorkspaceSchema } from '@/lib/validations/workspace'

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || !session?.user?.email) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const body = CreateWorkspaceSchema.parse(await request.json())
    const { name, slug, description, teamSize, industry } = body

    // Check if user already has a workspace
    // Use direct workspaceMember query to avoid nested relation issues with customRoleId
    const { prisma } = await import('@/lib/db')
    let existingWorkspace = null
    try {
      // Use workspaceMember directly to avoid nested relation that might access customRoleId
      const member = await prisma.workspaceMember.findFirst({
        where: { userId: session.user.id },
        select: {
          id: true,
          workspaceId: true,
          userId: true,
          role: true,
          joinedAt: true,
          // Exclude customRoleId and customRole relation
        }
      })
      if (member) {
        // If member exists, fetch the workspace separately
        existingWorkspace = await prisma.workspace.findUnique({
          where: { id: member.workspaceId },
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            ownerId: true,
            createdAt: true,
            updatedAt: true,
          }
        })
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.warn('[workspace/create] Could not check existing workspace:', message)
    }

    if (existingWorkspace) {
      return NextResponse.json({
        success: false,
        error: 'You already have a workspace',
        existingWorkspaceId: existingWorkspace.id,
        existingWorkspaceName: existingWorkspace.name
      }, { status: 400 })
    }

    // Create workspace for the user with session data
    let authUser
    try {
      authUser = await createUserWorkspace({
        id: session.user.id,
        email: session.user.email,
        name: session.user.name || '',
        image: session.user.image
      }, {
        name,
        slug,
        description: description || '',
        teamSize,
        industry
      })
    } catch (createError: unknown) {
      const createMsg = createError instanceof Error ? createError.message : String(createError);
      const createCode = createError && typeof createError === 'object' && 'code' in createError ? (createError as { code: string }).code : undefined;
      const enhancedError = new Error(`Workspace creation failed: ${createMsg}`)
      ;(enhancedError as { originalError?: string; code?: string }).originalError = createMsg
      ;(enhancedError as { originalError?: string; code?: string }).code = createCode
      throw enhancedError
    }

    if (!authUser) {
      throw new Error('Workspace creation returned no user data')
    }

    if (!authUser.workspaceId) {
      throw new Error('Workspace creation returned user without workspace ID')
    }

    return NextResponse.json({
      success: true,
      user: authUser,
      message: 'Workspace created successfully'
    })

  } catch (error: unknown) {
    return handleApiError(error, request)
  }
}
