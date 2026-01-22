import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/server/authOptions'
import { createUserWorkspace } from '@/lib/simple-auth'

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
    console.error('[workspace/create] ========== ERROR CAUGHT ==========')
    console.error('[workspace/create] Error type:', typeof error)
    console.error('[workspace/create] Error constructor:', error?.constructor?.name)
    console.error('[workspace/create] Error instanceof Error:', error instanceof Error)
    console.error('[workspace/create] Error object:', error)
    console.error('[workspace/create] Error message:', error instanceof Error ? error.message : 'N/A')
    console.error('[workspace/create] Error stack:', error instanceof Error ? error.stack : 'No stack')
    
    // Helper to strip ANSI escape codes from strings
    const stripAnsi = (str: string): string => {
      return str.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '').replace(/\x1B\]/g, '')
    }
    
    // Extract serializable error details with fallbacks
    let errorMessage = 'Unknown error occurred'
    let errorName = 'Unknown'
    let errorCode: string | undefined = undefined
    
    try {
      if (error instanceof Error) {
        errorMessage = stripAnsi(error.message || 'Error object has no message')
        errorName = error.name || 'Error'
        errorCode = (error as any)?.code
      } else if (typeof error === 'string') {
        errorMessage = stripAnsi(error)
      } else if (error && typeof error === 'object') {
        const rawMessage = (error as any)?.message || JSON.stringify(error)
        errorMessage = stripAnsi(typeof rawMessage === 'string' ? rawMessage : String(rawMessage))
        errorCode = (error as any)?.code
      } else {
        errorMessage = stripAnsi(String(error))
      }
    } catch (extractError) {
      console.error('[workspace/create] Failed to extract error details:', extractError)
      errorMessage = 'Failed to extract error details'
    }
    
    const prismaError = error as any
    console.error('[workspace/create] Extracted error details:', {
      message: errorMessage,
      name: errorName,
      code: errorCode,
      prismaCode: prismaError?.code,
      prismaMeta: prismaError?.meta ? JSON.stringify(prismaError.meta) : undefined
    })
    
    // Return serializable error response - ensure it's always a valid object
    const errorResponse = { 
      error: 'Failed to create workspace',
      details: errorMessage || 'Unknown error',
      code: errorCode || undefined
    }
    
    // Only include stack in development
    if (process.env.NODE_ENV === 'development' && error instanceof Error && error.stack) {
      (errorResponse as any).stack = error.stack
    }
    
    console.error('[workspace/create] Returning error response:', errorResponse)
    return NextResponse.json(errorResponse, { status: 500 })
  }
}
