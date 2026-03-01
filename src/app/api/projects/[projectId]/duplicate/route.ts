import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { handleApiError } from '@/lib/api-errors'

const DuplicateProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(255, 'Project name too long').optional()
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params

    // 1. Auth
    const auth = await getUnifiedAuth(request)
    
    // 2. Workspace access check
    await assertAccess({ 
      userId: auth.user.userId, 
      workspaceId: auth.workspaceId, 
      scope: 'workspace', 
      requireRole: ['MEMBER'] 
    })

    // 3. Set workspace context
    setWorkspaceContext(auth.workspaceId)

    // 4. Validate input
    const body = await request.json()
    const validatedData = DuplicateProjectSchema.parse(body)

    // 5. Load source project with all relations
    const sourceProject = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        epics: {
          orderBy: { order: 'asc' }
        },
        milestones: true,
        customFields: true,
        projectDocumentation: {
          orderBy: { order: 'asc' }
        },
        tasks: {
          include: {
            subtasks: {
              orderBy: { order: 'asc' }
            }
          },
          orderBy: { order: 'asc' }
        }
      }
    })

    if (!sourceProject) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    // 6. Duplicate project in a transaction
    const newProject = await prisma.$transaction(async (tx) => {
      // 6.1 Create new project
      const newProjectName = validatedData.name || `${sourceProject.name} (Copy)`
      
      const createdProject = await tx.project.create({
        data: {
          workspaceId: auth.workspaceId,
          name: newProjectName,
          description: sourceProject.description,
          status: 'ACTIVE',
          priority: sourceProject.priority,
          color: sourceProject.color,
          department: sourceProject.department,
          team: sourceProject.team,
          teamId: sourceProject.teamId,
          isArchived: false,
          startDate: null,
          endDate: null,
          dailySummaryEnabled: sourceProject.dailySummaryEnabled,
          createdById: auth.user.userId,
          ownerId: auth.user.userId,
        }
      })

      // 6.2 Create epic mapping
      const epicMapping = new Map<string, string>()
      
      for (const epic of sourceProject.epics) {
        const newEpic = await tx.epic.create({
          data: {
            workspaceId: auth.workspaceId,
            projectId: createdProject.id,
            title: epic.title,
            description: epic.description,
            color: epic.color,
            order: epic.order,
          }
        })
        epicMapping.set(epic.id, newEpic.id)
      }

      // 6.3 Create milestone mapping
      const milestoneMapping = new Map<string, string>()
      
      for (const milestone of sourceProject.milestones) {
        const newMilestone = await tx.milestone.create({
          data: {
            workspaceId: auth.workspaceId,
            projectId: createdProject.id,
            title: milestone.title,
            description: milestone.description,
            startDate: null,
            endDate: null,
          }
        })
        milestoneMapping.set(milestone.id, newMilestone.id)
      }

      // 6.4 Create custom field definition mapping
      const customFieldMapping = new Map<string, string>()
      
      for (const field of sourceProject.customFields) {
        const newUniqueKey = `${createdProject.id}_${field.key}_${Date.now()}`
        
        const newField = await tx.customFieldDef.create({
          data: {
            workspaceId: auth.workspaceId,
            projectId: createdProject.id,
            key: field.key,
            label: field.label,
            type: field.type,
            options: field.options as any,
            uniqueKey: newUniqueKey,
          }
        })
        customFieldMapping.set(field.id, newField.id)
      }

      // 6.5 Create task mapping
      const taskMapping = new Map<string, string>()
      
      for (const task of sourceProject.tasks) {
        const newTask = await tx.task.create({
          data: {
            workspaceId: auth.workspaceId,
            projectId: createdProject.id,
            title: task.title,
            description: task.description,
            status: 'TODO',
            priority: task.priority,
            order: task.order,
            tags: task.tags,
            blocks: [],
            dependsOn: [],
            epicId: task.epicId ? epicMapping.get(task.epicId) : null,
            milestoneId: task.milestoneId ? milestoneMapping.get(task.milestoneId) : null,
            points: task.points,
            assigneeId: null,
            dueDate: null,
            completedAt: null,
            createdById: auth.user.userId,
          }
        })
        taskMapping.set(task.id, newTask.id)

        // 6.6 Create subtasks for this task
        for (const subtask of task.subtasks) {
          await tx.subtask.create({
            data: {
              workspaceId: auth.workspaceId,
              taskId: newTask.id,
              title: subtask.title,
              description: subtask.description,
              status: 'TODO',
              order: subtask.order,
              assigneeId: null,
              dueDate: null,
              completedAt: null,
            }
          })
        }
      }

      // 6.7 Copy project documentation
      for (const doc of sourceProject.projectDocumentation) {
        await tx.projectDocumentation.create({
          data: {
            workspaceId: auth.workspaceId,
            projectId: createdProject.id,
            wikiPageId: doc.wikiPageId,
            order: doc.order,
          }
        })
      }

      // 6.8 Create ProjectMember for current user as OWNER
      await tx.projectMember.create({
        data: {
          workspaceId: auth.workspaceId,
          projectId: createdProject.id,
          userId: auth.user.userId,
          role: 'OWNER',
        }
      })

      // Return the created project with basic info
      return await tx.project.findUnique({
        where: { id: createdProject.id },
        select: {
          id: true,
          name: true,
          description: true,
          status: true,
          color: true,
          createdAt: true,
        }
      })
    })

    return NextResponse.json(newProject, { status: 201 })

  } catch (error) {
    return handleApiError(error)
  }
}
