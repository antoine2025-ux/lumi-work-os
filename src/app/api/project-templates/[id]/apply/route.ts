import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// POST /api/project-templates/[id]/apply - Apply a template to create a project
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const templateId = resolvedParams.id
    const body = await request.json()
    const { 
      workspaceId = 'workspace-1',
      projectName,
      projectDescription,
      customizations = {}
    } = body

    if (!templateId || !projectName) {
      return NextResponse.json({ 
        error: 'Missing required fields: templateId, projectName' 
      }, { status: 400 })
    }

    // Get the template
    const template = await prisma.projectTemplate.findUnique({
      where: { id: templateId }
    })

    if (!template) {
      return NextResponse.json({ 
        error: 'Template not found' 
      }, { status: 404 })
    }

    // Use hardcoded user ID for development
    const createdById = 'dev-user-1'

    // Ensure user and workspace exist for development
    let user = await prisma.user.findUnique({
      where: { id: createdById }
    })
    
    if (!user) {
      user = await prisma.user.create({
        data: {
          id: createdById,
          email: 'dev@lumi.com',
          name: 'Development User'
        }
      })
    }

    let workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId }
    })
    
    if (!workspace) {
      workspace = await prisma.workspace.create({
        data: {
          id: workspaceId,
          name: 'Development Workspace',
          slug: 'dev-workspace',
          description: 'Development workspace',
          ownerId: createdById
        }
      })
    }

    // Extract template data
    const templateData = template.templateData as any
    const projectData = templateData.project || {}
    const tasksData = templateData.tasks || []

    // Create the project
    const project = await prisma.project.create({
      data: {
        workspaceId,
        name: projectName,
        description: projectDescription || projectData.description || template.description,
        status: projectData.status || 'ACTIVE',
        priority: projectData.priority || 'MEDIUM',
        startDate: projectData.startDate ? new Date(projectData.startDate) : null,
        endDate: projectData.endDate ? new Date(projectData.endDate) : null,
        color: projectData.color,
        department: projectData.department || template.category,
        team: projectData.team,
        ownerId: projectData.ownerId || createdById,
        createdById
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
        userId: createdById,
        role: 'OWNER'
      }
    })

    // Create tasks from template
    const createdTasks = []
    const taskIdMap = new Map() // Map template task references to actual task IDs
    
    // First pass: Create all tasks without dependencies
    for (const taskTemplate of tasksData) {
      const task = await prisma.task.create({
        data: {
          projectId: project.id,
          workspaceId,
          title: taskTemplate.title,
          description: taskTemplate.description,
          status: taskTemplate.status || 'TODO',
          priority: taskTemplate.priority || 'MEDIUM',
          assigneeId: taskTemplate.assigneeId || null,
          dueDate: taskTemplate.dueDate ? new Date(taskTemplate.dueDate) : null,
          tags: taskTemplate.tags || [],
          dependsOn: [], // Will be updated in second pass
          blocks: [], // Will be updated in second pass
          createdById
        },
        include: {
          assignee: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      })
      createdTasks.push(task)
      
      // Map template task title to actual task ID for dependency resolution
      taskIdMap.set(taskTemplate.title, task.id)
    }
    
    // Second pass: Update dependencies
    for (let i = 0; i < tasksData.length; i++) {
      const taskTemplate = tasksData[i]
      const actualTask = createdTasks[i]
      
      if (taskTemplate.dependsOn && taskTemplate.dependsOn.length > 0) {
        // Resolve dependency IDs from template references
        const resolvedDependsOn = taskTemplate.dependsOn
          .map(depRef => taskIdMap.get(depRef))
          .filter(Boolean) // Remove any unresolved dependencies
        
        if (resolvedDependsOn.length > 0) {
          await prisma.task.update({
            where: { id: actualTask.id },
            data: { dependsOn: resolvedDependsOn }
          })
          
          // Update reverse dependencies
          for (const depId of resolvedDependsOn) {
            await prisma.task.update({
              where: { id: depId },
              data: {
                blocks: {
                  push: actualTask.id
                }
              }
            })
          }
        }
      }
    }

    // Create activity log
    await prisma.activity.create({
      data: {
        actorId: createdById,
        entity: 'project',
        entityId: project.id,
        action: 'created_from_template',
        meta: {
          templateId: template.id,
          templateName: template.name,
          tasksCreated: createdTasks.length
        }
      }
    })

    return NextResponse.json({
      project,
      tasks: createdTasks,
      template: {
        id: template.id,
        name: template.name
      }
    })
  } catch (error) {
    console.error('Error applying project template:', error)
    return NextResponse.json({ 
      error: 'Failed to apply project template',
      details: error.message 
    }, { status: 500 })
  }
}
