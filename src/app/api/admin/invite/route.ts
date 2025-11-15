import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { supabaseAdmin } from '@/lib/supabase'

// POST /api/admin/invite - Invite a user via Supabase Auth
export async function POST(request: NextRequest) {
  try {
    const auth = await getUnifiedAuth(request)
    
    // Assert workspace access (admin only)
    await assertAccess({ 
      userId: auth.user.userId, 
      workspaceId: auth.workspaceId, 
      scope: 'workspace', 
      requireRole: ['ADMIN', 'OWNER'] 
    })

    // Set workspace context for Prisma middleware
    setWorkspaceContext(auth.workspaceId)

    const body = await request.json()
    const { 
      email,
      role = 'MEMBER',
      redirectTo
    } = body

    if (!email) {
      return NextResponse.json({ 
        error: 'Email is required' 
      }, { status: 400 })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ 
        error: 'Invalid email format' 
      }, { status: 400 })
    }

    // Check if user already exists in our database
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    // Check if user is already a member of this workspace
    if (existingUser) {
      const existingMember = await prisma.workspaceMember.findFirst({
        where: {
          workspaceId: auth.workspaceId,
          userId: existingUser.id
        }
      })

      if (existingMember) {
        return NextResponse.json({ 
          error: 'User is already a member of this workspace',
          user: existingUser
        }, { status: 409 })
      }
    }

    // Get workspace details for the invite email
    const workspace = await prisma.workspace.findUnique({
      where: { id: auth.workspaceId },
      select: {
        name: true,
        slug: true
      }
    })

    if (!workspace) {
      return NextResponse.json({ 
        error: 'Workspace not found' 
      }, { status: 404 })
    }

    // Create redirect URL for the invite
    // Priority: redirectTo param > NEXT_PUBLIC_APP_URL > VERCEL_URL > NEXTAUTH_URL > localhost
    let baseUrl: string
    if (redirectTo) {
      baseUrl = new URL(redirectTo).origin
    } else if (process.env.NEXT_PUBLIC_APP_URL) {
      baseUrl = process.env.NEXT_PUBLIC_APP_URL
    } else if (process.env.VERCEL_URL) {
      baseUrl = `https://${process.env.VERCEL_URL}`
    } else {
      baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    }
    
    const inviteRedirectUrl = redirectTo || `${baseUrl}/auth/callback?workspace=${auth.workspaceId}`

    // Verify Supabase client is initialized correctly
    if (!supabaseAdmin) {
      console.error('Supabase admin client not initialized')
      return NextResponse.json({ 
        error: 'Supabase configuration error' 
      }, { status: 500 })
    }

    // Invite user via Supabase Auth
    console.log('Attempting to invite user:', email)
    console.log('Redirect URL:', inviteRedirectUrl)
    console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
    console.log('Service role key exists:', !!process.env.SUPABASE_SERVICE_ROLE_KEY)
    console.log('Service role key length:', process.env.SUPABASE_SERVICE_ROLE_KEY?.length)

    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      redirectTo: inviteRedirectUrl,
      data: {
        workspaceId: auth.workspaceId,
        workspaceName: workspace.name,
        role: role
      }
    })

    if (inviteError) {
      console.error('Supabase invite error:', inviteError)
      console.error('Error details:', {
        message: inviteError.message,
        status: inviteError.status,
        code: inviteError.code,
        name: inviteError.name
      })
      
      // If user already exists in Supabase, we can still add them to the workspace
      if (inviteError.message.includes('already registered') || inviteError.message.includes('already exists')) {
        // User exists in Supabase but not in our workspace
        // We'll create a workspace membership for them
        if (existingUser) {
          await prisma.workspaceMember.create({
            data: {
              userId: existingUser.id,
              workspaceId: auth.workspaceId,
              role: role as 'OWNER' | 'ADMIN' | 'MEMBER',
              joinedAt: new Date(),
            }
          })

          return NextResponse.json({ 
            message: 'User added to workspace successfully',
            user: existingUser,
            invited: false
          })
        } else {
          return NextResponse.json({ 
            error: 'User already exists. Please ask them to sign in and join the workspace.',
            code: 'USER_EXISTS'
          }, { status: 409 })
        }
      }

      // Return more specific error message
      const errorMessage = inviteError.message || 'Failed to send invitation'
      
      // Check for common errors
      if (inviteError.status === 401) {
        return NextResponse.json({ 
          error: 'Invalid API key. Please check your SUPABASE_SERVICE_ROLE_KEY in .env.local and restart the server.',
          details: 'The service role key may be incorrect or expired. Verify it in Supabase Dashboard → Settings → API'
        }, { status: 401 })
      }
      
      return NextResponse.json({ 
        error: errorMessage,
        details: inviteError.message
      }, { status: 500 })
    }

    // If user doesn't exist in our database, create a placeholder
    // They'll be fully created when they accept the invite and sign in
    if (!existingUser) {
      // Create a user record with the email (they'll complete profile on sign-in)
      const newUser = await prisma.user.create({
        data: {
          email,
          name: email.split('@')[0], // Temporary name
          emailVerified: null, // Will be verified when they accept invite
        }
      })

      // Add to workspace
      await prisma.workspaceMember.create({
        data: {
          userId: newUser.id,
          workspaceId: auth.workspaceId,
          role: role as 'OWNER' | 'ADMIN' | 'MEMBER',
          joinedAt: new Date(),
        }
      })

      return NextResponse.json({ 
        message: 'Invitation sent successfully',
        user: newUser,
        invited: true
      })
    } else {
      // User exists, add to workspace
      await prisma.workspaceMember.create({
        data: {
          userId: existingUser.id,
          workspaceId: auth.workspaceId,
          role: role as 'OWNER' | 'ADMIN' | 'MEMBER',
          joinedAt: new Date(),
        }
      })

      return NextResponse.json({ 
        message: 'User added to workspace successfully',
        user: existingUser,
        invited: true
      })
    }
  } catch (error: any) {
    console.error('Error inviting user:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to invite user' 
    }, { status: 500 })
  }
}

