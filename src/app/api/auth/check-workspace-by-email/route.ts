import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

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

    // Use direct SQL to check for workspace (bypasses Prisma)
    const { execSync } = await import('child_process')
    
    try {
      // Escape email for SQL
      const escapedEmail = checkEmail.replace(/'/g, "''")
      
      // Get user ID - use proper quoting with -A flag to avoid pipe delimiter issues
      const userQuery = `SELECT id FROM users WHERE email = '${escapedEmail}';`
      const userResult = execSync(
        `docker compose exec -T postgres psql -U lumi_user -d lumi_work_os -t -A -c ${JSON.stringify(userQuery)}`,
        { encoding: 'utf-8', cwd: process.cwd(), maxBuffer: 1024 * 1024 }
      ).trim()
      
      if (!userResult || userResult.includes('ERROR')) {
        console.log('[check-workspace-by-email] No user found or error:', userResult)
        return NextResponse.json({ workspaceId: null, hasWorkspace: false })
      }
      
      // With -A flag, result is just the value, no pipe delimiter
      const userId = userResult.trim()
      if (!userId) {
        return NextResponse.json({ workspaceId: null, hasWorkspace: false })
      }
      
      // Check for workspace membership - escape userId and use proper SQL quoting
      const escapedUserId = userId.replace(/'/g, "''")
      // Use a here-document style approach to avoid shell quoting issues
      const membershipQuery = `SELECT "workspaceId" FROM workspace_members WHERE "userId" = '${escapedUserId}' LIMIT 1;`
      const membershipResult = execSync(
        `docker compose exec -T postgres psql -U lumi_user -d lumi_work_os -t -A -c ${JSON.stringify(membershipQuery)}`,
        { encoding: 'utf-8', cwd: process.cwd(), maxBuffer: 1024 * 1024 }
      ).trim()
      
      if (membershipResult && !membershipResult.includes('ERROR')) {
        const workspaceId = membershipResult.trim()
        if (workspaceId) {
          return NextResponse.json({ 
            workspaceId,
            hasWorkspace: true,
            userId 
          })
        }
      }
      
      return NextResponse.json({ workspaceId: null, hasWorkspace: false, userId })
    } catch (sqlError: any) {
      console.error('[check-workspace-by-email] SQL error:', sqlError.message)
      console.error('[check-workspace-by-email] Error stack:', sqlError.stack)
      return NextResponse.json({ 
        error: 'Database query failed',
        details: sqlError.message 
      }, { status: 500 })
    }
  } catch (error) {
    console.error('[check-workspace-by-email] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

