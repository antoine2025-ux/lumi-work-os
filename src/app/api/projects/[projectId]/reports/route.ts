import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { assertProjectAccess } from '@/lib/pm/guards'

const prisma = new PrismaClient()

// GET /api/projects/[projectId]/reports - Get project reports data
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { projectId } = await params
    const { searchParams } = new URL(request.url)
    const reportType = searchParams.get('type') || 'all'

    // Get authenticated user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email! }
    })
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 })
    }

    // Check project access
    await assertProjectAccess(user, projectId)

    const reports: any = {}

    // Velocity Report - Tasks completed per week
    if (reportType === 'all' || reportType === 'velocity') {
      const velocityData = await getVelocityReport(projectId)
      reports.velocity = velocityData
    }

    // Work in Review Report - Tasks in review > 3 days
    if (reportType === 'all' || reportType === 'review') {
      const reviewData = await getWorkInReviewReport(projectId)
      reports.workInReview = reviewData
    }

    // Burn-down Report - Active milestone progress
    if (reportType === 'all' || reportType === 'burndown') {
      const burndownData = await getBurndownReport(projectId)
      reports.burndown = burndownData
    }

    return NextResponse.json(reports)
  } catch (error) {
    console.error('Error fetching project reports:', error)
    
    // Handle RBAC errors
    if (error.message === 'Unauthorized: User not authenticated.' || 
        error.message === 'User not found.') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    if (error.message === 'Project not found.') {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }
    
    if (error.message === 'Forbidden: Insufficient project permissions.') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    return NextResponse.json({
      error: 'Failed to fetch project reports',
      details: error.message
    }, { status: 500 })
  }
}

// Get velocity report - tasks completed per week
async function getVelocityReport(projectId: string) {
  const twelveWeeksAgo = new Date()
  twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 84) // 12 weeks

  // Get completed tasks grouped by week
  const completedTasks = await prisma.task.findMany({
    where: {
      projectId,
      status: 'DONE',
      completedAt: {
        gte: twelveWeeksAgo
      }
    },
    select: {
      completedAt: true,
      points: true
    },
    orderBy: {
      completedAt: 'asc'
    }
  })

  // Group by week and calculate totals
  const weeklyData = new Map<string, { week: string; tasks: number; points: number }>()
  
  completedTasks.forEach(task => {
    if (task.completedAt) {
      const weekStart = getWeekStart(task.completedAt)
      const weekKey = weekStart.toISOString().split('T')[0]
      
      if (!weeklyData.has(weekKey)) {
        weeklyData.set(weekKey, {
          week: formatWeekLabel(weekStart),
          tasks: 0,
          points: 0
        })
      }
      
      const weekData = weeklyData.get(weekKey)!
      weekData.tasks += 1
      weekData.points += task.points || 0
    }
  })

  // Fill in missing weeks with zero values
  const result = []
  for (let i = 11; i >= 0; i--) {
    const weekStart = new Date()
    weekStart.setDate(weekStart.getDate() - (i * 7))
    const weekKey = weekStart.toISOString().split('T')[0]
    
    result.push(weeklyData.get(weekKey) || {
      week: formatWeekLabel(weekStart),
      tasks: 0,
      points: 0
    })
  }

  return {
    data: result,
    totalTasks: completedTasks.length,
    totalPoints: completedTasks.reduce((sum, task) => sum + (task.points || 0), 0),
    averageTasksPerWeek: result.reduce((sum, week) => sum + week.tasks, 0) / result.length,
    averagePointsPerWeek: result.reduce((sum, week) => sum + week.points, 0) / result.length
  }
}

// Get work in review report - tasks in review > 3 days
async function getWorkInReviewReport(projectId: string) {
  const threeDaysAgo = new Date()
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)

  const tasksInReview = await prisma.task.findMany({
    where: {
      projectId,
      status: 'IN_REVIEW',
      updatedAt: {
        lte: threeDaysAgo
      }
    },
    include: {
      assignee: {
        select: {
          id: true,
          name: true,
          email: true
        }
      },
      epic: {
        select: {
          id: true,
          title: true,
          color: true
        }
      },
      milestone: {
        select: {
          id: true,
          title: true,
          endDate: true
        }
      }
    },
    orderBy: {
      updatedAt: 'asc'
    }
  })

  return {
    tasks: tasksInReview.map(task => ({
      id: task.id,
      title: task.title,
      assignee: task.assignee,
      epic: task.epic,
      milestone: task.milestone,
      points: task.points,
      daysInReview: Math.floor((new Date().getTime() - task.updatedAt.getTime()) / (1000 * 60 * 60 * 24)),
      updatedAt: task.updatedAt.toISOString()
    })),
    totalTasks: tasksInReview.length,
    averageDaysInReview: tasksInReview.length > 0 
      ? tasksInReview.reduce((sum, task) => sum + Math.floor((new Date().getTime() - task.updatedAt.getTime()) / (1000 * 60 * 60 * 24)), 0) / tasksInReview.length
      : 0
  }
}

// Get burn-down report - active milestone progress
async function getBurndownReport(projectId: string) {
  // Get active milestones
  const activeMilestones = await prisma.milestone.findMany({
    where: {
      projectId,
      OR: [
        { endDate: { gte: new Date() } },
        { endDate: null }
      ]
    },
    include: {
      tasks: {
        select: {
          id: true,
          status: true,
          points: true,
          completedAt: true,
          createdAt: true
        }
      }
    },
    orderBy: {
      endDate: 'asc'
    }
  })

  if (activeMilestones.length === 0) {
    return {
      milestones: [],
      totalRemainingPoints: 0,
      totalCompletedPoints: 0
    }
  }

  const milestoneData = activeMilestones.map(milestone => {
    const totalPoints = milestone.tasks.reduce((sum, task) => sum + (task.points || 0), 0)
    const completedPoints = milestone.tasks
      .filter(task => task.status === 'DONE')
      .reduce((sum, task) => sum + (task.points || 0), 0)
    
    const remainingPoints = totalPoints - completedPoints
    const completionPercentage = totalPoints > 0 ? (completedPoints / totalPoints) * 100 : 0

    // Calculate daily burn-down data
    const burnDownData = calculateBurnDownData(milestone.tasks, milestone.startDate, milestone.endDate)

    return {
      id: milestone.id,
      title: milestone.title,
      description: milestone.description,
      startDate: milestone.startDate?.toISOString(),
      endDate: milestone.endDate?.toISOString(),
      totalPoints,
      completedPoints,
      remainingPoints,
      completionPercentage,
      totalTasks: milestone.tasks.length,
      completedTasks: milestone.tasks.filter(task => task.status === 'DONE').length,
      burnDownData
    }
  })

  const totalRemainingPoints = milestoneData.reduce((sum, milestone) => sum + milestone.remainingPoints, 0)
  const totalCompletedPoints = milestoneData.reduce((sum, milestone) => sum + milestone.completedPoints, 0)

  return {
    milestones: milestoneData,
    totalRemainingPoints,
    totalCompletedPoints,
    overallCompletionPercentage: totalRemainingPoints + totalCompletedPoints > 0 
      ? (totalCompletedPoints / (totalRemainingPoints + totalCompletedPoints)) * 100 
      : 0
  }
}

// Helper functions
function getWeekStart(date: Date): Date {
  const weekStart = new Date(date)
  const day = weekStart.getDay()
  const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1) // Monday as start of week
  weekStart.setDate(diff)
  weekStart.setHours(0, 0, 0, 0)
  return weekStart
}

function formatWeekLabel(date: Date): string {
  const month = date.toLocaleDateString('en-US', { month: 'short' })
  const day = date.getDate()
  return `${month} ${day}`
}

function calculateBurnDownData(tasks: any[], startDate: Date | null, endDate: Date | null) {
  if (!startDate || !endDate) {
    return []
  }

  const totalPoints = tasks.reduce((sum, task) => sum + (task.points || 0), 0)
  const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
  
  // Create ideal burn-down line (linear decrease)
  const idealBurnDown = []
  for (let i = 0; i <= daysDiff; i++) {
    const idealRemaining = totalPoints - (totalPoints * i / daysDiff)
    idealBurnDown.push({
      day: i,
      ideal: Math.max(0, idealRemaining),
      actual: totalPoints // Will be updated with actual data
    })
  }

  // Calculate actual burn-down based on completed tasks
  const completedTasks = tasks.filter(task => task.status === 'DONE' && task.completedAt)
  completedTasks.forEach(task => {
    if (task.completedAt) {
      const taskDay = Math.floor((task.completedAt.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
      if (taskDay >= 0 && taskDay <= daysDiff) {
        // Update all days after this task was completed
        for (let i = taskDay; i <= daysDiff; i++) {
          idealBurnDown[i].actual -= (task.points || 0)
        }
      }
    }
  })

  return idealBurnDown.map(day => ({
    day: day.day,
    ideal: Math.max(0, day.ideal),
    actual: Math.max(0, day.actual),
    date: new Date(startDate.getTime() + day.day * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  }))
}
