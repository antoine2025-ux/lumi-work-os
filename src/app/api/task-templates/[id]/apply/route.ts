import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// POST /api/task-templates/[id]/apply - Apply a template to a project
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const templateId = resolvedParams.id
    const body = await request.json()
    
    const { 
      projectId,
      workspaceId = 'workspace-1',
      customizations = {} // Allow customization of tasks during application
    } = body

    if (!templateId) {
      return NextResponse.json({ error: 'Template ID is required' }, { status: 400 })
    }

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 })
    }

    // Ensure user and workspace exist for development
    const createdById = 'dev-user-1'
    
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

    // Get the template with its tasks
    const template = await prisma.taskTemplate.findUnique({
      where: { id: templateId },
      include: {
        tasks: {
          orderBy: {
            order: 'asc'
          }
        }
      }
    })

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    // Check if project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId }
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Create tasks from template
    const createdTasks = []
    const taskIdMap = new Map() // Map template task IDs to actual task IDs for dependencies

    // First pass: Create all tasks without dependencies
    for (const templateTask of template.tasks) {
      const customization = customizations[templateTask.id] || {}
      
      const task = await prisma.task.create({
        data: {
          projectId,
          workspaceId,
          title: customization.title || templateTask.title,
          description: customization.description || templateTask.description,
          status: templateTask.status,
          priority: templateTask.priority,
          assigneeId: customization.assigneeId || null,
          dueDate: customization.dueDate ? new Date(customization.dueDate) : null,
          tags: customization.tags || templateTask.tags,
          dependsOn: [], // Will be updated in second pass
          blocks: [],
          order: templateTask.order,
          createdById
        }
      })

      createdTasks.push(task)
      taskIdMap.set(templateTask.id, task.id)
    }

    // Second pass: Update dependencies
    for (let i = 0; i < template.tasks.length; i++) {
      const templateTask = template.tasks[i]
      const actualTask = createdTasks[i]
      
      if (templateTask.dependencies.length > 0) {
        const actualDependencies = templateTask.dependencies
          .map(depIndex => {
            const depTemplateTask = template.tasks.find(t => t.order === parseInt(depIndex))
            return depTemplateTask ? taskIdMap.get(depTemplateTask.id) : null
          })
          .filter(Boolean)

        await prisma.task.update({
          where: { id: actualTask.id },
          data: {
            dependsOn: actualDependencies
          }
        })
      }
    }

    // Return the created tasks with their dependencies resolved
    const finalTasks = await prisma.task.findMany({
      where: {
        id: {
          in: createdTasks.map(t => t.id)
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
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        order: 'asc'
      }
    })

    return NextResponse.json({
      message: 'Template applied successfully',
      tasks: finalTasks,
      template: {
        id: template.id,
        name: template.name,
        category: template.category
      }
    })
  } catch (error) {
    console.error('Error applying task template:', error)
    return NextResponse.json({ error: 'Failed to apply task template' }, { status: 500 })
  }
}
