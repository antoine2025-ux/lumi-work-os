import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { prisma } from '@/lib/db'
import { handleApiError } from '@/lib/api-errors'
import { getDefaultSpaceForUser } from '@/lib/spaces/get-default-space'
import { AssistantCreateProjectSchema } from '@/lib/validations/assistant'
import { Priority, ProjectTaskStatus, type Prisma } from '@prisma/client'

export async function POST(request: NextRequest) {
  try {
    const auth = await getUnifiedAuth(request)
    
    // Assert workspace access
    await assertAccess({ 
      userId: auth.user.userId, 
      workspaceId: auth.workspaceId, 
      scope: 'workspace', 
      requireRole: ['MEMBER'] 
    })

    // Set workspace context for Prisma middleware
    setWorkspaceContext(auth.workspaceId)

    const body = AssistantCreateProjectSchema.parse(await request.json())
    const { sessionId, projectData, templateId } = body

    // Get the session to extract project information from conversation
    const session = await prisma.chatSession.findUnique({
      where: { id: sessionId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' }
        }
      }
    })

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Extract project information from conversation history
    const _conversationText = session.messages
      .map(msg => `${msg.type}: ${msg.content}`)
      .join('\n')

    // Parse project data from the conversation
    const {
      name = 'New Project',
      description = '',
      department = '',
      team = '',
      priority = 'MEDIUM',
      startDate = null,
      endDate = null,
      ownerId = auth.user.userId
    } = projectData

    // Get default space for the user
    const defaultSpaceId = await getDefaultSpaceForUser(auth.user.userId, auth.workspaceId)
    if (!defaultSpaceId) {
      return NextResponse.json({
        error: 'No default space found. Please create a space first.'
      }, { status: 400 })
    }

    // Create the project
    const project = await prisma.project.create({
      data: {
        workspaceId: auth.workspaceId,
        name,
        description,
        status: 'ACTIVE',
        priority: priority as Priority,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        department,
        team,
        ownerId,
        createdById: auth.user.userId,
        spaceId: defaultSpaceId
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    // Add the creator as a project member
    await prisma.projectMember.create({
      data: {
        projectId: project.id,
        userId: auth.user.userId,
        role: 'OWNER',
        workspaceId: auth.workspaceId
      }
    })

    // If templateId is provided, create tasks from template
    if (templateId) {
      const template = await prisma.projectTemplate.findUnique({
        where: { id: templateId },
        select: {
          id: true,
          templateData: true
        }
      })

      if (template && template.templateData) {
        const templateData = template.templateData as { tasks?: Array<{ title: string; description?: string; status?: string; priority?: string; tags?: string[] }> }
        
        if (templateData.tasks && Array.isArray(templateData.tasks)) {
          for (const taskTemplate of templateData.tasks) {
            try {
              const task = await prisma.task.create({
                data: {
                  projectId: project.id,
                  workspaceId: auth.workspaceId, // Always use authenticated workspace
                  title: taskTemplate.title || 'Untitled Task',
                  description: taskTemplate.description || '',
                  status: (taskTemplate.status as ProjectTaskStatus | undefined) || 'TODO',
                  priority: (taskTemplate.priority as Priority | undefined) || 'MEDIUM',
                  tags: taskTemplate.tags || [],
                  createdById: auth.user.userId,
                  assigneeId: auth.user.userId
                }
              })
            } catch (_error: unknown) {
              // non-blocking task creation failure
            }
          }
        }
      }
    }

    // Generate initial tasks based on conversation
    const initialTasks = [
      {
        title: 'Project Setup',
        description: 'Initial project setup and configuration',
        status: 'TODO',
        priority: 'HIGH',
        tags: ['setup', 'initial']
      },
      {
        title: 'Requirements Gathering',
        description: 'Gather and document project requirements',
        status: 'TODO',
        priority: 'HIGH',
        tags: ['requirements', 'planning']
      },
      {
        title: 'Project Planning',
        description: 'Create detailed project plan and timeline',
        status: 'TODO',
        priority: 'MEDIUM',
        tags: ['planning', 'timeline']
      }
    ]

    for (const taskTemplate of initialTasks) {
      try {
              const task = await prisma.task.create({
                data: {
                  projectId: project.id,
                  workspaceId: auth.workspaceId, // Always use authenticated workspace
                  title: taskTemplate.title,
                  description: taskTemplate.description,
                  status: (taskTemplate.status as ProjectTaskStatus) || 'TODO',
                  priority: (taskTemplate.priority as Priority) || 'MEDIUM',
                  tags: taskTemplate.tags || [],
                  createdById: auth.user.userId,
                  assigneeId: auth.user.userId
                }
              })
      } catch (_error: unknown) {
        // non-blocking task creation failure
      }
    }

    // Update the session with project URL
    await prisma.chatSession.update({
      where: { id: sessionId },
      data: {
        projectUrl: `/projects/${project.id}`,
        updatedAt: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      project: {
        id: project.id,
        name: project.name,
        description: project.description,
        status: project.status,
        priority: project.priority,
        createdBy: project.createdBy,
        createdAt: project.createdAt
      }
    })

  } catch (error: unknown) {
    return handleApiError(error, request)
  }
}