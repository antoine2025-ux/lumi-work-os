import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/server/authOptions'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    // Verify user is authenticated (just check for email in session)
    const session = await getServerSession(authOptions)
    const email = request.nextUrl.searchParams.get('email')
    
    // If no email param, try to get from session
    const checkEmail = email || session?.user?.email
    
    if (!checkEmail) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    
    // If email param provided, verify it matches session (if session exists)
    if (email && session?.user?.email && email !== session.user.email) {
      return NextResponse.json({ error: 'Email mismatch' }, { status: 403 })
    }

    try {
      // Find user by email
      const user = await prisma.user.findUnique({
        where: { email: checkEmail },
        select: { id: true }
      })
      
      if (!user) {
        console.log('[check-workspace-by-email] No user found for email:', checkEmail)
        return NextResponse.json({ workspaceId: null, hasWorkspace: false })
      }
      
      // Check for workspace membership
      const membership = await prisma.workspaceMember.findFirst({
        where: { userId: user.id },
        select: { workspaceId: true }
      })
      
      if (membership?.workspaceId) {
        return NextResponse.json({ 
          workspaceId: membership.workspaceId,
          hasWorkspace: true,
          userId: user.id 
        })
      }
      
      return NextResponse.json({ workspaceId: null, hasWorkspace: false, userId: user.id })
    } catch (dbError: any) {
      console.error('[check-workspace-by-email] Database error:', dbError.message)
      console.error('[check-workspace-by-email] Error stack:', dbError.stack)
      return NextResponse.json({ 
        error: 'Database query failed',
        details: dbError.message 
      }, { status: 500 })
    }
  } catch (error) {
    console.error('[check-workspace-by-email] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

