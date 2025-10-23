import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const startTime = Date.now()
    
    // Check database connection
    let databaseStatus = 'healthy'
    let databaseResponseTime = 0
    
    try {
      const dbStartTime = Date.now()
      await prisma.$queryRaw`SELECT 1`
      databaseResponseTime = Date.now() - dbStartTime
    } catch (error) {
      databaseStatus = 'unhealthy'
      console.error('Database health check failed:', error)
    }
    
    // Check environment variables
    const requiredEnvVars = [
      'DATABASE_URL',
      'NEXTAUTH_SECRET',
      'NEXTAUTH_URL',
      'GOOGLE_CLIENT_ID',
      'GOOGLE_CLIENT_SECRET',
      'OPENAI_API_KEY'
    ]
    
    const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar])
    
    const overallStatus = databaseStatus === 'healthy' && missingEnvVars.length === 0 ? 'healthy' : 'unhealthy'
    
    const responseTime = Date.now() - startTime
    
    const healthData = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`,
      services: {
        database: {
          status: databaseStatus,
          responseTime: `${databaseResponseTime}ms`
        },
        environment: {
          status: missingEnvVars.length === 0 ? 'healthy' : 'unhealthy',
          missingVariables: missingEnvVars
        }
      },
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      // Phase 2: Add environment flags for staging hardening
      flags: {
        mode: process.env.NODE_ENV || 'development',
        prodLock: !!process.env.PROD_LOCK,
        enableAssistant: !!process.env.ENABLE_ASSISTANT,
        allowDevLogin: !!process.env.ALLOW_DEV_LOGIN
      }
    }
    
    const statusCode = overallStatus === 'healthy' ? 200 : 503
    
    return NextResponse.json(healthData, { status: statusCode })
    
  } catch (error) {
    console.error('Health check failed:', error)
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 503 })
  }
}



