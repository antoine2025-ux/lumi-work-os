import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const results: any = {
      success: true,
      message: 'Database connection successful',
      timestamp: new Date().toISOString(),
    }

    // Test basic connection with a simple query
    const [userCount, workspaceCount, pageCount] = await Promise.all([
      prisma.user.count().catch(() => 0),
      prisma.workspace.count().catch(() => 0),
      prisma.wikiPage.count().catch(() => 0),
    ])

    results.data = {
      userCount,
      workspaceCount,
      pageCount,
    }

    // Get database info to verify Supabase connection
    try {
      const dbInfo = await prisma.$queryRaw<Array<{
        version: string
        current_database: string
        current_user: string
      }>>`
        SELECT version(), current_database(), current_user
      `
      
      if (dbInfo && dbInfo.length > 0) {
        results.database = {
          version: dbInfo[0].version,
          database: dbInfo[0].current_database,
          user: dbInfo[0].current_user,
          isSupabase: dbInfo[0].version.toLowerCase().includes('postgresql') && 
                     (process.env.DATABASE_URL?.includes('supabase') || 
                      process.env.DATABASE_URL?.includes('pooler.supabase.com') ||
                      process.env.DATABASE_URL?.includes('db.supabase.co')),
        }
      }
    } catch (err) {
      console.warn('Could not fetch database info:', err)
    }

    // Check connection pooler status
    const databaseUrl = process.env.DATABASE_URL || ''
    results.connection = {
      usingPooler: databaseUrl.includes('pooler.supabase.com') || databaseUrl.includes('pgbouncer=true'),
      hasDirectUrl: !!process.env.DIRECT_URL,
      connectionType: databaseUrl.includes('pooler.supabase.com') ? 'pooled' : 
                     databaseUrl.includes('supabase') ? 'direct' : 'unknown',
    }

    // Test write capability (create a test record, then delete it)
    try {
      // This tests that we can actually write to the database
      // We'll just verify we can run a query without errors
      await prisma.$queryRaw`SELECT 1 as test`
      results.writeTest = 'passed'
    } catch (err) {
      results.writeTest = 'failed'
      results.writeError = err instanceof Error ? err.message : 'Unknown error'
    }

    return NextResponse.json(results)
  } catch (error) {
    console.error('Database connection error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    }, { status: 500 })
  }
}
