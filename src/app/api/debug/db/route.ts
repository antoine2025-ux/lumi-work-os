import { NextRequest, NextResponse } from 'next/server'
import { prismaUnscoped } from '@/lib/db'

/**
 * GET /api/debug/db
 * 
 * Debug endpoint to show which database the running app is connected to.
 * DEV ONLY - gated by NODE_ENV check.
 */
export async function GET(request: NextRequest) {
  // Phase A: Gate by NODE_ENV (DEV ONLY)
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }

  try {
    // Parse DATABASE_URL (mask password)
    const databaseUrl = process.env.DATABASE_URL || ''
    const directUrl = process.env.DIRECT_URL || ''
    
    let dbUrlInfo: any = null
    let directUrlInfo: any = null
    
    try {
      if (databaseUrl) {
        const url = new URL(databaseUrl)
        dbUrlInfo = {
          host: url.hostname,
          port: url.port || '5432',
          database: url.pathname?.replace('/', '') || 'unknown',
          username: url.username,
          hasPassword: !!url.password,
          url: `postgresql://${url.username}:***@${url.hostname}:${url.port || '5432'}/${url.pathname?.replace('/', '')}`
        }
      }
    } catch (e) {
      dbUrlInfo = { error: 'Could not parse DATABASE_URL', raw: databaseUrl ? 'set (invalid)' : 'NOT SET' }
    }

    try {
      if (directUrl) {
        const url = new URL(directUrl)
        directUrlInfo = {
          host: url.hostname,
          port: url.port || '5432',
          database: url.pathname?.replace('/', '') || 'unknown',
          username: url.username,
          hasPassword: !!url.password,
          url: `postgresql://${url.username}:***@${url.hostname}:${url.port || '5432'}/${url.pathname?.replace('/', '')}`
        }
      }
    } catch (e) {
      directUrlInfo = { error: 'Could not parse DIRECT_URL', raw: directUrl ? 'set (invalid)' : 'NOT SET' }
    }

    // Query actual database connection info
    const dbInfo = await prismaUnscoped.$queryRaw<Array<{
      current_database: string
      inet_server_addr: string | null
      current_schema: string
    }>>`
      SELECT current_database(), inet_server_addr(), current_schema()
    `

    const actualDb = dbInfo[0]

    // Safe count helper: checks if Prisma model exists before calling count()
    // This prevents crashes when Prisma client is stale or model doesn't exist
    // Helps diagnose schema/client mismatches (e.g. Space model added but client not regenerated)
    const safeCount = async (modelName: string): Promise<{ ok: boolean; value?: number; reason?: string }> => {
      const p = prismaUnscoped as any
      const model = p[modelName]
      
      if (!model) {
        return { 
          ok: false, 
          reason: `prisma.${modelName} is missing on Prisma Client. Run: npx prisma generate` 
        }
      }
      
      if (typeof model.count !== 'function') {
        return { 
          ok: false, 
          reason: `prisma.${modelName}.count is not a function. Prisma Client may be stale.` 
        }
      }
      
      try {
        const count = await model.count()
        return { ok: true, value: count }
      } catch (error: any) {
        return { 
          ok: false, 
          reason: `Error counting ${modelName}: ${error.message}` 
        }
      }
    }

    // Get table counts to verify data exists (with safe guards)
    const [projects, wikiPages, spaces] = await Promise.all([
      safeCount('project'),
      safeCount('wikiPage'),
      safeCount('space') // This is likely the one failing if Prisma client wasn't regenerated
    ])

    return NextResponse.json({
      environment: {
        nodeEnv: process.env.NODE_ENV,
        hasDatabaseUrl: !!process.env.DATABASE_URL,
        hasDirectUrl: !!process.env.DIRECT_URL
      },
      envVars: {
        DATABASE_URL: dbUrlInfo,
        DIRECT_URL: directUrlInfo
      },
      actualConnection: {
        database: actualDb.current_database,
        serverAddress: actualDb.inet_server_addr || 'localhost',
        schema: actualDb.current_schema
      },
      dataVerification: {
        projects: projects.ok ? projects.value : { error: projects.reason },
        wikiPages: wikiPages.ok ? wikiPages.value : { error: wikiPages.reason },
        spaces: spaces.ok ? spaces.value : { error: spaces.reason }
      },
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    return NextResponse.json({
      error: 'Failed to query database',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 })
  }
}
