import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
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
    const { prisma } = await import('@/lib/db')
    let existingWorkspace = null
    try {
      existingWorkspace = await prisma.workspace.findFirst({
        where: {
          members: {
            some: { userId: session.user.id }
          }
        }
      })
    } catch (error: any) {
      // If Prisma connection fails, log but continue (might be a connection issue)
      console.warn('[workspace/create] Could not check existing workspace:', error.message)
      // Try alternative check using workspaceMember directly (simpler query without nested relations)
      try {
        const member = await prisma.workspaceMember.findFirst({
          where: { userId: session.user.id }
        })
        if (member) {
          // If member exists, fetch the workspace separately
          const workspace = await prisma.workspace.findUnique({
            where: { id: member.workspaceId }
          })
          if (workspace) {
            existingWorkspace = workspace
          }
        }
      } catch (e: any) {
        console.warn('[workspace/create] Alternative check also failed:', e?.message || e)
        // Continue anyway - worst case we create a duplicate workspace
      }
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
    const authUser = await createUserWorkspace({
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

    console.log('[workspace/create] Workspace created successfully!')
    return NextResponse.json({
      success: true,
      user: authUser,
      message: 'Workspace created successfully'
    })

  } catch (error) {
    console.error('[workspace/create] Error creating workspace:', error)
    console.error('[workspace/create] Error stack:', error instanceof Error ? error.stack : 'No stack')
    console.error('[workspace/create] Error details:', {
      message: error instanceof Error ? error.message : String(error),
      name: error instanceof Error ? error.name : 'Unknown',
      cause: error instanceof Error ? error.cause : undefined
    })
    return NextResponse.json({ 
      error: 'Failed to create workspace',
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}
