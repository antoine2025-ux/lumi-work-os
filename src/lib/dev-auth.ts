import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { DEV_CONFIG, isDevMode, getDevUser } from '@/lib/dev-config'

export interface DevSession {
  user: {
    id: string
    email: string
    name: string
    image?: string
  }
}

export async function getDevSession(request?: NextRequest): Promise<DevSession | null> {
  if (!isDevMode()) {
    return null
  }

  // Try to get real session first
  const session = await getServerSession(authOptions)
  if (session?.user?.email) {
    return session as DevSession
  }

  // Return mock development session
  return {
    user: getDevUser()
  }
}

export async function requireDevAuth(request?: NextRequest): Promise<DevSession> {
  const session = await getDevSession(request)
  
  if (!session) {
    throw new Error('Development mode not enabled or authentication failed')
  }
  
  return session
}
