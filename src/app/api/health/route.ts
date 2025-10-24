import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    return NextResponse.json({
      success: true,
      message: 'API is working',
      timestamp: new Date().toISOString(),
      env: {
        NODE_ENV: process.env.NODE_ENV,
        NEXTAUTH_URL: process.env.NEXTAUTH_URL ? 'set' : 'not set',
        DATABASE_URL: process.env.DATABASE_URL ? 'set' : 'not set'
      }
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}