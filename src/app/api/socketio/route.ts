import { NextRequest } from 'next/server'
import { Server as SocketIOServer } from 'socket.io'

const io: SocketIOServer | null = null

export async function GET(_req: NextRequest) {
  if (!io) {
    // This is a workaround for Next.js App Router
    // In a real implementation, you'd need to set up the Socket.io server
    // at the application level, not in an API route
    return new Response('Socket.io server not initialized', { status: 500 })
  }
  
  return new Response('Socket.io server is running', { status: 200 })
}

export async function POST(_req: NextRequest) {
  if (!io) {
    return new Response('Socket.io server not initialized', { status: 500 })
  }
  
  return new Response('Socket.io server is running', { status: 200 })
}
