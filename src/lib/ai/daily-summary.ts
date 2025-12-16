import { PrismaClient } from '@prisma/client'
import { generateAIResponse } from '@/lib/ai/providers'

const prisma = new PrismaClient()

export interface DailySummaryData {
  projectId: string
  date: string
  tasksChanged: Array<{
    id: string
    title: string
    status: string
    priority: string
    assignee?: string
    changes: Array<{
      field: string
      from: any
      to: any
      timestamp: string
    }>
  }>
  newTasks: Array<{
    id: string
    title: string
    status: string
    priority: string
    assignee?: string
  }>
  completedTasks: Array<{
    id: string
    title: string
    completedAt: string
  }>
  comments: Array<{
    id: string
    content: string
    author: string
    taskTitle: string
    timestamp: string
  }>
}

export async function generateDailySummary(projectId: string, date: string): Promise<string> {
  try {
    // Get project info
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { name: true, description: true }
    })

    if (!project) {
      throw new Error('Project not found')
    }

    // Get tasks changed yesterday
    const yesterday = new Date(date)
    yesterday.setDate(yesterday.getDate() - 1)
    const startOfYesterday = new Date(yesterday)
    startOfYesterday.setHours(0, 0, 0, 0)
    const endOfYesterday = new Date(yesterday)
    endOfYesterday.setHours(23, 59, 59, 999)

    // Get task history for yesterday
    const taskHistory = await prisma.taskHistory.findMany({
      where: {
        task: {
          projectId: projectId
        },
        at: {
          gte: startOfYesterday,
          lte: endOfYesterday
        }
      },
      include: {
        task: {
          include: {
            assignee: {
              select: { name: true }
            }
          }
        },
        actor: {
          select: { name: true }
        }
      },
      orderBy: { at: 'asc' }
    })

    // Get new tasks created yesterday
    const newTasks = await prisma.task.findMany({
      where: {
        projectId: projectId,
        createdAt: {
          gte: startOfYesterday,
          lte: endOfYesterday
        }
      },
      include: {
        assignee: {
          select: { name: true }
        }
      }
    })

    // Get completed tasks from yesterday
    const completedTasks = await prisma.task.findMany({
      where: {
        projectId: projectId,
        completedAt: {
          gte: startOfYesterday,
          lte: endOfYesterday
        }
      }
    })

    // Get comments from yesterday
    const comments = await prisma.taskComment.findMany({
      where: {
        task: {
          projectId: projectId
        },
        createdAt: {
          gte: startOfYesterday,
          lte: endOfYesterday
        }
      },
      include: {
        user: {
          select: { name: true }
        },
        task: {
          select: { title: true }
        }
      },
      orderBy: { createdAt: 'asc' }
    })

    // Group task history by task
    const taskChangesMap = new Map<string, Array<{
      field: string
      from: any
      to: any
      timestamp: string
      actor: string
    }>>()

    taskHistory.forEach(history => {
      if (!taskChangesMap.has(history.taskId)) {
        taskChangesMap.set(history.taskId, [])
      }
      taskChangesMap.get(history.taskId)!.push({
        field: history.field,
        from: history.from,
        to: history.to,
        timestamp: history.at.toISOString(),
        actor: history.actor.name
      })
    })

    // Build summary data
    const summaryData: DailySummaryData = {
      projectId,
      date,
      tasksChanged: Array.from(taskChangesMap.entries()).map(([taskId, changes]) => {
        const task = taskHistory.find(h => h.taskId === taskId)?.task
        return {
          id: taskId,
          title: task?.title || 'Unknown Task',
          status: task?.status || 'UNKNOWN',
          priority: task?.priority || 'MEDIUM',
          assignee: task?.assignee?.name,
          changes: changes.map(c => ({
            field: c.field,
            from: c.from,
            to: c.to,
            timestamp: c.timestamp
          }))
        }
      }),
      newTasks: newTasks.map(task => ({
        id: task.id,
        title: task.title,
        status: task.status,
        priority: task.priority,
        assignee: task.assignee?.name
      })),
      completedTasks: completedTasks.map(task => ({
        id: task.id,
        title: task.title,
        completedAt: task.completedAt!.toISOString()
      })),
      comments: comments.map(comment => ({
        id: comment.id,
        content: comment.content,
        author: comment.user.name,
        taskTitle: comment.task.title,
        timestamp: comment.createdAt.toISOString()
      }))
    }

    // Generate AI summary
    const prompt = buildSummaryPrompt(project, summaryData)
    const aiResponse = await generateAIResponse(
      prompt,
      'gpt-4o-mini', // Use efficient model for summaries
      {
        systemPrompt: 'You are a project management assistant that creates concise daily summaries. Focus on key changes, progress, and important updates. Keep summaries professional and actionable.',
        temperature: 0.3,
        maxTokens: 1000
      }
    )

    return aiResponse.content
  } catch (error) {
    console.error('Error generating daily summary:', error)
    throw error
  }
}

function buildSummaryPrompt(project: { name: string; description: string | null }, data: DailySummaryData): string {
  const date = new Date(data.date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  let prompt = `Create a daily summary for the project "${project.name}" for ${date}.\n\n`

  if (project.description) {
    prompt += `Project Description: ${project.description}\n\n`
  }

  prompt += `Here's what happened yesterday:\n\n`

  // New tasks
  if (data.newTasks.length > 0) {
    prompt += `NEW TASKS (${data.newTasks.length}):\n`
    data.newTasks.forEach(task => {
      prompt += `- ${task.title} (${task.status}, ${task.priority} priority`
      if (task.assignee) {
        prompt += `, assigned to ${task.assignee}`
      }
      prompt += `)\n`
    })
    prompt += '\n'
  }

  // Completed tasks
  if (data.completedTasks.length > 0) {
    prompt += `COMPLETED TASKS (${data.completedTasks.length}):\n`
    data.completedTasks.forEach(task => {
      prompt += `- ${task.title}\n`
    })
    prompt += '\n'
  }

  // Task changes
  if (data.tasksChanged.length > 0) {
    prompt += `TASK UPDATES (${data.tasksChanged.length}):\n`
    data.tasksChanged.forEach(task => {
      prompt += `- ${task.title}:\n`
      task.changes.forEach(change => {
        prompt += `  * ${change.field}: ${change.from} → ${change.to}\n`
      })
    })
    prompt += '\n'
  }

  // Comments
  if (data.comments.length > 0) {
    prompt += `NEW COMMENTS (${data.comments.length}):\n`
    data.comments.forEach(comment => {
      prompt += `- ${comment.author} commented on "${comment.taskTitle}": "${comment.content.substring(0, 100)}${comment.content.length > 100 ? '...' : ''}"\n`
    })
    prompt += '\n'
  }

  prompt += `Please create a concise, professional summary highlighting:\n`
  prompt += `1. Key accomplishments and progress made\n`
  prompt += `2. Important changes or updates\n`
  prompt += `3. Any blockers or issues that need attention\n`
  prompt += `4. Next steps or recommendations\n\n`
  prompt += `Keep the summary under 300 words and make it actionable for the team.`

  return prompt
}

export async function saveDailySummary(projectId: string, date: string, summary: string): Promise<void> {
  try {
    await prisma.projectDailySummary.upsert({
      where: {
        projectId_date: {
          projectId,
          date: new Date(date)
        }
      },
      update: {
        text: summary
      },
      create: {
        projectId,
        date: new Date(date),
        text: summary
      }
    })
  } catch (error) {
    console.error('Error saving daily summary:', error)
    throw error
  }
}

export async function getDailySummaries(projectId: string, limit: number = 30): Promise<Array<{
  id: string
  date: string
  text: string
  createdAt: string
}>> {
  try {
    const summaries = await prisma.projectDailySummary.findMany({
      where: { projectId },
      orderBy: { date: 'desc' },
      take: limit,
      select: {
        id: true,
        date: true,
        text: true,
        createdAt: true
      }
    })

    return summaries.map(summary => ({
      id: summary.id,
      date: summary.date.toISOString().split('T')[0],
      text: summary.text,
      createdAt: summary.createdAt.toISOString()
    }))
  } catch (error) {
    console.error('Error fetching daily summaries:', error)
    throw error
  }
}
