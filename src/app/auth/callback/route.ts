import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { supabaseAdmin } from '@/lib/supabase'
import { cookies } from 'next/headers'

/**
 * Auth callback handler for Supabase invites
 * Handles the redirect after user accepts invitation
 * 
 * Flow:
 * 1. User clicks invite link → Supabase auth → redirects here with code & workspace param
 * 2. Exchange Supabase code for session (if using Supabase auth)
 * 3. Verify user exists in our database (create if needed)
 * 4. Verify user is a member of the workspace
 * 5. Redirect to dashboard with workspace context
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const code = url.searchParams.get('code')
    const workspaceId = url.searchParams.get('workspace')
    const error = url.searchParams.get('error')
    const errorDescription = url.searchParams.get('error_description')

    // Handle Supabase auth errors
    if (error) {
      console.error('Supabase auth error:', error, errorDescription)
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(errorDescription || error)}`, request.url)
      )
    }

    // If we have a Supabase code, exchange it for a session
    // Note: Supabase invites create a user in Supabase Auth, but we use NextAuth
    // So we need to handle both flows
    let userEmail: string | null = null

    if (code) {
      try {
        // Exchange code for Supabase session
        const cookieStore = await cookies()
        const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.exchangeCodeForSession(code)
        
        if (sessionError) {
          console.error('Error exchanging code for session:', sessionError)
          // Fall through to NextAuth check
        } else if (sessionData?.user?.email) {
          userEmail = sessionData.user.email
          console.log('✅ Supabase session created for:', userEmail)
        }
      } catch (supabaseError) {
        console.error('Error with Supabase code exchange:', supabaseError)
        // Fall through to NextAuth check
      }
    }

    // Try NextAuth session as fallback or primary method
    const session = await getServerSession(authOptions)
    if (!userEmail && session?.user?.email) {
      userEmail = session.user.email
    }

    if (!userEmail) {
      // User not authenticated - redirect to login
      console.log('No authenticated user found, redirecting to login')
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // Find or create user in database
    let user = await prisma.user.findUnique({
      where: { email: userEmail }
    })

    if (!user) {
      // Create user if they don't exist (from Supabase invite)
      console.log('Creating new user from invite:', userEmail)
      user = await prisma.user.create({
        data: {
          email: userEmail,
          name: userEmail.split('@')[0], // Temporary name
          emailVerified: new Date(),
        }
      })
    }

    // If workspaceId is provided, verify membership
    if (workspaceId) {
      const membership = await prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId,
            userId: user.id
          }
        },
        include: {
          workspace: {
            select: {
              id: true,
              name: true,
              slug: true
            }
          }
        }
      })

      if (!membership) {
        console.error('User is not a member of workspace:', {
          userId: user.id,
          workspaceId,
          email: user.email
        })
        return NextResponse.redirect(
          new URL('/login?error=not_a_member', request.url)
        )
      }

      // User is authenticated and is a member of the workspace
      // Redirect to dashboard (home page) with workspace context
      const dashboardUrl = new URL('/home', request.url)
      dashboardUrl.searchParams.set('workspaceId', workspaceId)
      
      console.log('✅ Invite accepted - redirecting to dashboard:', {
        userId: user.id,
        workspaceId,
        workspaceName: membership.workspace.name,
        email: user.email
      })

      return NextResponse.redirect(dashboardUrl)
    }

    // No workspaceId provided - check if user has any workspace
    const userMemberships = await prisma.workspaceMember.findMany({
      where: { userId: user.id },
      orderBy: { joinedAt: 'asc' },
      take: 1,
      include: {
        workspace: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    if (userMemberships.length > 0) {
      // User has a workspace - redirect to dashboard with first workspace
      const firstWorkspace = userMemberships[0]
      const dashboardUrl = new URL('/home', request.url)
      dashboardUrl.searchParams.set('workspaceId', firstWorkspace.workspaceId)
      
      console.log('✅ User has workspace - redirecting to dashboard:', {
        userId: user.id,
        workspaceId: firstWorkspace.workspaceId
      })
      
      return NextResponse.redirect(dashboardUrl)
    }

    // User has no workspace - redirect to welcome/onboarding
    console.log('User has no workspace - redirecting to welcome:', user.email)
    return NextResponse.redirect(new URL('/welcome', request.url))

  } catch (error: any) {
    console.error('Error in auth callback:', error)
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error.message || 'callback_error')}`, request.url)
    )
  }
}

