import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/server/authOptions'
import { createUserWorkspace } from '@/lib/simple-auth'
import { handleApiError } from '@/lib/api-errors'

export async function POST(request: NextRequest) {
  try {
    console.log('[workspace/create] Starting workspace creation...')
    // Get authenticated user
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || !session?.user?.email) {
      console.log('[workspace/create] No session found')
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    console.log('[workspace/create] User authenticated:', {
      email: session.user.email,
      id: session.user.id,
      name: session.user.name
    })
    const body = await request.json()
    const { name, slug, description, teamSize, industry } = body

    console.log('[workspace/create] Workspace data:', { name, slug })

    // Validate required fields
    if (!name || !slug) {
      return NextResponse.json({ error: 'Name and slug are required' }, { status: 400 })
    }

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
    } catch (error: any) {
      // If Prisma connection fails, log but continue (might be a connection issue)
      console.warn('[workspace/create] Could not check existing workspace:', error.message)
      // Continue anyway - worst case we create a duplicate workspace
    }

    if (existingWorkspace) {
      console.log('[workspace/create] User already has workspace:', existingWorkspace.id)
      return NextResponse.json({
        success: false,
        error: 'You already have a workspace',
        existingWorkspaceId: existingWorkspace.id,
        existingWorkspaceName: existingWorkspace.name
      }, { status: 400 })
    }

    // Create workspace for the user with session data
    console.log('[workspace/create] Creating workspace...')
    console.log('[workspace/create] Calling createUserWorkspace with:', {
      userId: session.user.id,
      email: session.user.email,
      workspaceName: name,
      workspaceSlug: slug
    })
    
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
      console.log('[workspace/create] createUserWorkspace returned successfully')
    } catch (createError: any) {
      console.error('[workspace/create] createUserWorkspace threw error:', createError)
      console.error('[workspace/create] createUserWorkspace error type:', typeof createError)
      console.error('[workspace/create] createUserWorkspace error message:', createError?.message)
      console.error('[workspace/create] createUserWorkspace error stack:', createError?.stack)
      // Re-throw with more context
      const enhancedError = new Error(`Workspace creation failed: ${createError?.message || String(createError)}`)
      ;(enhancedError as any).originalError = createError?.message
      ;(enhancedError as any).code = createError?.code
      throw enhancedError
    }

    if (!authUser) {
      console.error('[workspace/create] createUserWorkspace returned null/undefined')
      throw new Error('Workspace creation returned no user data')
    }

    if (!authUser.workspaceId) {
      console.error('[workspace/create] createUserWorkspace returned user without workspaceId')
      throw new Error('Workspace creation returned user without workspace ID')
    }

    console.log('[workspace/create] Workspace created successfully!', {
      userId: authUser.id,
      workspaceId: authUser.workspaceId
    })
    return NextResponse.json({
      success: true,
      user: authUser,
      message: 'Workspace created successfully'
    })

  } catch (error) {
    return handleApiError(error, request)
  }
}
