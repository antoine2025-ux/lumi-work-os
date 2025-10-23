import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createUserWorkspace } from '@/lib/simple-auth'

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || !session?.user?.email) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const body = await request.json()
    const { name, slug, description, teamSize, industry } = body

    // Validate required fields
    if (!name || !slug) {
      return NextResponse.json({ error: 'Name and slug are required' }, { status: 400 })
    }

    // Create workspace for the user with session data
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

    return NextResponse.json({
      success: true,
      user: authUser,
      message: 'Workspace created successfully'
    })

  } catch (error) {
    console.error('Error creating workspace:', error)
    return NextResponse.json({ 
      error: 'Failed to create workspace',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
