import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const { sessionId, projectData } = await request.json()

    if (!sessionId || !projectData) {
      return NextResponse.json({ 
        error: 'Session ID and project data required' 
      }, { status: 400 })
    }

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
    const conversationText = session.messages
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
      ownerId = 'dev-user-1'
    } = projectData

    // Create the project
    const project = await prisma.project.create({
      data: {
        workspaceId: session.workspaceId,
        name,
        description,
        status: 'ACTIVE',
        priority: priority as any,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        department,
        team,
        ownerId,
        createdById: 'dev-user-1'
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        owner: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        _count: {
          select: {
            tasks: true
          }
        }
      }
    })

    // Add the creator as a project member with OWNER role
    await prisma.projectMember.create({
      data: {
        projectId: project.id,
        userId: 'dev-user-1',
        role: 'OWNER'
      }
    })

    // Update session with project information
    await prisma.chatSession.update({
      where: { id: sessionId },
      data: {
        phase: 'project_created',
        projectUrl: `/projects/${project.id}`,
        requirementNotes: {
          ...session.requirementNotes,
          projectId: project.id,
          projectName: project.name
        }
      }
    })

    return NextResponse.json({
      success: true,
      project,
      projectUrl: `/projects/${project.id}`,
      message: `Project "${project.name}" has been successfully created!`
    })

  } catch (error) {
    console.error('Error creating project:', error)
    return NextResponse.json({ 
      error: 'Failed to create project',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
