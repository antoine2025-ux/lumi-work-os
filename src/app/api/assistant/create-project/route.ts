import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const { sessionId, projectData, templateId } = await request.json()

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

    // Apply template if provided
    if (templateId) {
      try {
        console.log('Applying template:', templateId)
        const template = await prisma.projectTemplate.findUnique({
          where: { id: templateId },
          include: {
            templateData: true
          }
        })

        if (template && template.templateData) {
          const templateData = template.templateData as any
          console.log('Template data:', templateData)
          
          // Create tasks from template
          if (templateData.tasks && Array.isArray(templateData.tasks)) {
            console.log('Creating', templateData.tasks.length, 'tasks from template')
            for (const taskTemplate of templateData.tasks) {
              const task = await prisma.task.create({
                data: {
                  projectId: project.id,
                  title: taskTemplate.title,
                  description: taskTemplate.description || '',
                  status: taskTemplate.status || 'TODO',
                  priority: taskTemplate.priority || 'MEDIUM',
                  tags: taskTemplate.tags || [],
                  createdById: 'dev-user-1',
                  assigneeId: 'dev-user-1'
                }
              })
              console.log('Created task:', task.title)
            }
          } else {
            console.log('No tasks found in template data')
          }
        } else {
          console.log('Template not found or no template data')
        }
      } catch (templateError) {
        console.error('Error applying template:', templateError)
        // Don't fail the entire project creation if template application fails
      }
    } else {
      console.log('No template ID provided')
    }

    // Create default requirements gathering tasks if no template was applied
    if (!templateId) {
      try {
        console.log('Creating default requirements tasks')
        
        // Extract requirements from conversation to create more specific tasks
        const conversationText = session.messages
          .map(msg => `${msg.type}: ${msg.content}`)
          .join('\n')
        
        const requirementsTasks = []
        
        // Check for specific requirements mentioned in conversation
        if (conversationText.toLowerCase().includes('requirements') || conversationText.toLowerCase().includes('specifications')) {
          requirementsTasks.push({
            title: 'Define Project Requirements',
            description: 'Gather and document all project requirements and specifications',
            status: 'TODO',
            priority: 'HIGH',
            tags: ['requirements', 'planning']
          })
        }
        
        if (conversationText.toLowerCase().includes('timeline') || conversationText.toLowerCase().includes('deadline') || conversationText.toLowerCase().includes('schedule')) {
          requirementsTasks.push({
            title: 'Create Project Timeline',
            description: 'Develop a detailed project timeline with milestones and deadlines',
            status: 'TODO',
            priority: 'HIGH',
            tags: ['timeline', 'planning']
          })
        }
        
        if (conversationText.toLowerCase().includes('team') || conversationText.toLowerCase().includes('member') || conversationText.toLowerCase().includes('stakeholder')) {
          requirementsTasks.push({
            title: 'Identify Team Members',
            description: 'Identify and assign team members and stakeholders',
            status: 'TODO',
            priority: 'MEDIUM',
            tags: ['team', 'stakeholders']
          })
        }
        
        if (conversationText.toLowerCase().includes('budget') || conversationText.toLowerCase().includes('cost') || conversationText.toLowerCase().includes('resource')) {
          requirementsTasks.push({
            title: 'Define Budget and Resources',
            description: 'Establish project budget and resource requirements',
            status: 'TODO',
            priority: 'HIGH',
            tags: ['budget', 'resources']
          })
        }
        
        // Always add these core tasks
        const defaultTasks = [
          {
            title: 'Project Kickoff',
            description: 'Conduct project kickoff meeting and establish communication channels',
            status: 'TODO',
            priority: 'HIGH',
            tags: ['kickoff', 'communication']
          },
          {
            title: 'Create Project Plan',
            description: 'Develop a detailed project plan with milestones and timelines',
            status: 'TODO',
            priority: 'HIGH',
            tags: ['planning', 'milestones']
          }
        ]
        
        // Combine requirements tasks with default tasks
        const allTasks = [...requirementsTasks, ...defaultTasks]
        
        // Remove duplicates based on title
        const uniqueTasks = allTasks.filter((task, index, self) => 
          index === self.findIndex(t => t.title === task.title)
        )

        for (const taskTemplate of uniqueTasks) {
          const task = await prisma.task.create({
            data: {
              projectId: project.id,
              title: taskTemplate.title,
              description: taskTemplate.description,
              status: taskTemplate.status as any,
              priority: taskTemplate.priority as any,
              tags: taskTemplate.tags,
              createdById: 'dev-user-1',
              assigneeId: 'dev-user-1'
            }
          })
          console.log('Created task:', task.title)
        }
      } catch (error) {
        console.error('Error creating default tasks:', error)
      }
    }

    // Update session with project information
    await prisma.chatSession.update({
      where: { id: sessionId },
      data: {
        phase: 'project_created',
        projectUrl: `/projects/${project.id}`,
        requirementNotes: {
          ...session.requirementNotes,
          projectId: project.id,
          projectName: project.name,
          templateId: templateId || null
        }
      }
    })

    return NextResponse.json({
      success: true,
      project,
      projectUrl: `/projects/${project.id}`,
      message: `Project "${project.name}" has been successfully created!${templateId ? ' Template applied successfully.' : ''}`
    })

  } catch (error) {
    console.error('Error creating project:', error)
    return NextResponse.json({ 
      error: 'Failed to create project',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
