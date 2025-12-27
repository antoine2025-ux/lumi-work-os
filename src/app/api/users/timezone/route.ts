import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedAuth } from '@/lib/unified-auth'
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
 */
export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const auth = await getUnifiedAuth(request)
    
    if (!auth?.user?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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

    // Check if user already has a timezone set
    const existingUser = await prisma.user.findUnique({
      where: { id: auth.user.userId },
      select: { timezone: true }
    })

    if (existingUser?.timezone) {
      // Don't overwrite existing timezone
      return NextResponse.json({ 
        success: true, 
        message: 'Timezone already set',
        timezone: existingUser.timezone,
        updated: false
      })
    }

    // Set the timezone
    const updatedUser = await prisma.user.update({
      where: { id: auth.user.userId },
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
    
    if (error instanceof Error) {
      if (error.message.includes('Unauthorized')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }
    
    return NextResponse.json({ error: 'Failed to set timezone' }, { status: 500 })
  }
}

/**
 * GET /api/users/timezone
 * Get current user's timezone
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await getUnifiedAuth(request)
    
    if (!auth?.user?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: auth.user.userId },
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

