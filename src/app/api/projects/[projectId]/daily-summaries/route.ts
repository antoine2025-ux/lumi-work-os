import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { assertProjectAccess } from '@/lib/pm/guards'
import { generateDailySummary, saveDailySummary, getDailySummaries } from '@/lib/ai/daily-summary'
import { prisma } from '@/lib/db'

// GET /api/projects/[projectId]/daily-summaries - Get daily summaries for a project
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '30')

    // Get session and verify access
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Get authenticated user from database
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 })
    }
    
    // Check if project exists first
    const project = await prisma.project.findUnique({
      where: { id: projectId }
    })
    
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Verify project access
    await assertProjectAccess(user, projectId)

    // Get daily summaries
    try {
      const summaries = await getDailySummaries(projectId, limit)
      return NextResponse.json(summaries)
    } catch (error) {
      console.error('Error fetching daily summaries:', error)
      // Return empty array if there's an error
      return NextResponse.json([])
    }
  } catch (error) {
    console.error('Error fetching daily summaries:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json({
      error: 'Failed to fetch daily summaries',
      details: errorMessage
    }, { status: 500 })
  }
}

// POST /api/projects/[projectId]/daily-summaries - Generate a daily summary manually
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params
    const body = await request.json()
    const { date } = body

    // Get session and verify access
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get authenticated user from database
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 })
    }

    // Check project access (require admin/owner for manual generation)
    const accessResult = await assertProjectAccess(user, projectId, 'ADMIN')
    if (!accessResult) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Use provided date or default to today
    const targetDate = date || new Date().toISOString().split('T')[0]

    // Check if summary already exists
    const existingSummary = await prisma.projectDailySummary.findUnique({
      where: {
        projectId_date: {
          projectId,
          date: new Date(targetDate)
        }
      }
    })

    if (existingSummary) {
      return NextResponse.json({
        error: 'Summary already exists for this date',
        summary: existingSummary
      }, { status: 409 })
    }

    // Generate the summary
    let summary: string
    try {
      summary = await generateDailySummary(projectId, targetDate)
    } catch (error) {
      console.error('AI generation failed, creating manual summary:', error)
      // Fallback to manual summary if AI fails
      summary = `Daily summary for ${targetDate}: Project activities and task updates.`
    }
    
    // Save the summary
    await saveDailySummary(projectId, targetDate, summary)

    // Get the saved summary
    const savedSummary = await prisma.projectDailySummary.findUnique({
      where: {
        projectId_date: {
          projectId,
          date: new Date(targetDate)
        }
      }
    })

    return NextResponse.json({
      message: 'Daily summary generated successfully',
      summary: savedSummary
    })
  } catch (error) {
    console.error('Error generating daily summary:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json({
      error: 'Failed to generate daily summary',
      details: errorMessage
    }, { status: 500 })
  }
}
