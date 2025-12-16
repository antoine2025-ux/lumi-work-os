import { NextRequest, NextResponse } from 'next/server'

// GET /api/socket - Socket endpoint for WebSocket connections
export async function GET(request: NextRequest) {
  return NextResponse.json({ 
    error: 'WebSocket endpoint not available in API routes',
    message: 'Use the custom server for WebSocket connections'
  }, { status: 400 })
}
