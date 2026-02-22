import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/server/authOptions'
import { prisma } from '@/lib/db'
import { isValidTimezone } from '@/lib/datetime'
import { z } from 'zod'

const TimezoneSchema = z.object({
  timezone: z.string().min(1, 'Timezone is required').max(100)
})

/**
 * POST /api/users/timezone
 * Auto-capture user's timezone from browser
 * Only sets if user.timezone is null/empty (doesn't overwrite)
 * 
 * NOTE: This is a user-level operation that doesn't require a workspace.
 * We use getServerSession directly instead of getUnifiedAuth.
 */
export async function POST(request: NextRequest) {
  try {
    // Get authenticated user - use getServerSession for user-level operations
    // This works even if user has no workspace yet (first-time users)
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user ID from database
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, timezone: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const body = await request.json()
    
    // Validate request body
    const parsed = TimezoneSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ 
        error: 'Invalid timezone format',
        details: parsed.error.issues
      }, { status: 400 })
    }

    const { timezone } = parsed.data

    // Validate that it's a valid IANA timezone
    if (!isValidTimezone(timezone)) {
      return NextResponse.json({ 
        error: 'Invalid IANA timezone. Expected format: Europe/Tallinn, America/New_York, etc.' 
      }, { status: 400 })
    }

    if (user.timezone) {
      // Don't overwrite existing timezone
      return NextResponse.json({ 
        success: true, 
        message: 'Timezone already set',
        timezone: user.timezone,
        updated: false
      })
    }

    // Set the timezone
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { timezone },
      select: { id: true, timezone: true }
    })

    return NextResponse.json({ 
      success: true, 
      message: 'Timezone captured',
      timezone: updatedUser.timezone,
      updated: true
    })
  } catch (error) {
    console.error('Error setting user timezone:', error)
    return NextResponse.json({ error: 'Failed to set timezone' }, { status: 500 })
  }
}

/**
 * GET /api/users/timezone
 * Get current user's timezone
 */
export async function GET(_request: NextRequest) {
  try {
    // Get authenticated user - use getServerSession for user-level operations
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { timezone: true }
    })

    return NextResponse.json({ 
      timezone: user?.timezone || null 
    })
  } catch (error) {
    console.error('Error getting user timezone:', error)
    return NextResponse.json({ error: 'Failed to get timezone' }, { status: 500 })
  }
}

