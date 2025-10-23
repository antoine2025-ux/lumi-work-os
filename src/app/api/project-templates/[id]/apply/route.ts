import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { prisma } from '@/lib/db'


// POST /api/project-templates/[id]/apply - Apply a template to create a project
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const resolvedParams = await params
    const templateId = resolvedParams.id
    const body = await request.json()
    const { 
      projectName,
      projectDescription,
      customizations = {}
    } = body

    if (!projectName) {
      return NextResponse.json({ 
        error: 'Project name is required' 
      }, { status: 400 })
    }

    // Get the template
    const template = await prisma.projectTemplate.findUnique({
      where: { id: templateId },
      include: {
        templateData: true
      }
    })

    if (!template) {
      return NextResponse.json({ 
        error: 'Template not found' 
      }, { status: 404 })
    }

    // Check if template is accessible (public or belongs to workspace)
    if (!template.isPublic && template.workspaceId !== auth.workspaceId) {
      return NextResponse.json({ 
        error: 'Template not accessible' 
      }, { status: 403 })
    }

    // Use authenticated user ID
    const createdById = auth.user.userId

    // Create the project from template
    const project = await prisma.project.create({
      data: {
        name: projectName,
        description: projectDescription || template.description || '',
        status: 'ACTIVE',
        priority: 'MEDIUM',
        workspaceId: auth.workspaceId,
        createdById: createdById,
        ownerId: createdById
      }
    })

    // Add creator as project member
    await prisma.projectMember.create({
      data: {
        projectId: project.id,
        userId: createdById,
        role: 'OWNER'
      }
    })

    // Apply template data if available
    if (template.templateData) {
      const templateData = template.templateData as any
      
      // Create tasks from template
      if (templateData.tasks && Array.isArray(templateData.tasks)) {
        for (const taskTemplate of templateData.tasks) {
          try {
            await prisma.task.create({
              data: {
                projectId: project.id,
                title: taskTemplate.title || 'Untitled Task',
                description: taskTemplate.description || '',
                status: taskTemplate.status || 'TODO',
                priority: taskTemplate.priority || 'MEDIUM',
                tags: taskTemplate.tags || [],
                createdById: createdById,
                assigneeId: createdById
              }
            })
          } catch (error) {
            console.error('Error creating task from template:', error)
          }
        }
      }

      // Create epics from template
      if (templateData.epics && Array.isArray(templateData.epics)) {
        for (const epicTemplate of templateData.epics) {
          try {
            await prisma.epic.create({
              data: {
                projectId: project.id,
                title: epicTemplate.title || 'Untitled Epic',
                description: epicTemplate.description || '',
                status: epicTemplate.status || 'ACTIVE',
                priority: epicTemplate.priority || 'MEDIUM',
                createdById: createdById
              }
            })
          } catch (error) {
            console.error('Error creating epic from template:', error)
          }
        }
      }

      // Create milestones from template
      if (templateData.milestones && Array.isArray(templateData.milestones)) {
        for (const milestoneTemplate of templateData.milestones) {
          try {
            await prisma.milestone.create({
              data: {
                projectId: project.id,
                title: milestoneTemplate.title || 'Untitled Milestone',
                description: milestoneTemplate.description || '',
                targetDate: milestoneTemplate.targetDate ? new Date(milestoneTemplate.targetDate) : null,
                status: milestoneTemplate.status || 'PENDING',
                createdById: createdById
              }
            })
          } catch (error) {
            console.error('Error creating milestone from template:', error)
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      project: {
        id: project.id,
        name: project.name,
        description: project.description,
        status: project.status,
        createdAt: project.createdAt
      }
    })

  } catch (error) {
    console.error('Error applying template:', error)
    return NextResponse.json({ 
      error: 'Failed to apply template' 
    }, { status: 500 })
  }
}