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

    console.log('[workspace/create] User authenticated:', session.user.email)
    const body = await request.json()
    const { name, slug, description, teamSize, industry } = body

    console.log('[workspace/create] Workspace data:', { name, slug })

    // Validate required fields
    if (!name || !slug) {
      return NextResponse.json({ error: 'Name and slug are required' }, { status: 400 })
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
    return NextResponse.json({ 
      error: 'Failed to create workspace',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
