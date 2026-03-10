// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { emitEvent } from '@/lib/events/emit'
import { ORG_EVENTS, OrgPositionUpdatedEvent, OrgPersonUpdatedEvent } from '@/lib/events/orgEvents'
import {
  onOrgPositionDeleted,
} from '@/lib/org/liveUpdateHooks'
import { safeRebuildOrgContext } from '@/lib/org/org-context-service'
import { handleApiError } from '@/lib/api-errors'
import { logOrgAudit } from '@/lib/audit/org-audit'
import { computeChanges } from '@/lib/audit/diff'
import { UpdatePositionSchema } from '@/lib/validations/org'

// GET /api/org/positions/[id] - Get a specific org position
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getUnifiedAuth(request)
    const resolvedParams = await params
    
    await assertAccess({ 
      userId: auth.user.userId, 
      workspaceId: auth.workspaceId, 
      scope: 'workspace', 
      requireRole: ['MEMBER'] 
    })

    setWorkspaceContext(auth.workspaceId)

    const position = await prisma.orgPosition.findFirst({
      where: { 
        id: resolvedParams.id,
        workspaceId: auth.workspaceId
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true
          }
        },
        team: {
          select: {
            id: true,
            name: true,
            department: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        parent: {
          select: {
            id: true,
            title: true,
            user: {
              select: {
                name: true
              }
            }
          }
        },
        children: {
          where: {
            isActive: true
          },
          select: {
            id: true,
            title: true,
            teamId: true,
            level: true,
            user: {
              select: {
                name: true,
                email: true
              }
            }
          },
          orderBy: {
            order: 'asc'
          }
        }
      }
    })

    if (!position) {
      return NextResponse.json({ error: 'Position not found' }, { status: 404 })
    }

    return NextResponse.json(position)
  } catch (error) {
    return handleApiError(error, request)
  }
}

// PUT /api/org/positions/[id] - Update an org position
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getUnifiedAuth(request)
    const resolvedParams = await params
    
    await assertAccess({ 
      userId: auth.user.userId, 
      workspaceId: auth.workspaceId, 
      scope: 'workspace', 
      requireRole: ['ADMIN', 'OWNER'] 
    })

    setWorkspaceContext(auth.workspaceId)

    const body = UpdatePositionSchema.parse(await request.json())
    const { 
      title, 
      teamId,
      level,
      parentId,
      userId,
      order,
      isActive
    } = body

    // Check if position exists (fetch before state for audit)
    const existingPosition = await prisma.orgPosition.findFirst({
      where: { 
        id: resolvedParams.id,
        workspaceId: auth.workspaceId
      },
      select: {
        id: true,
        title: true,
        teamId: true,
        level: true,
        parentId: true,
        userId: true,
        isActive: true,
        workspaceId: true,
      }
    })

    if (!existingPosition) {
      return NextResponse.json({ error: 'Position not found' }, { status: 404 })
    }
    
    const before = {
      title: existingPosition.title,
      teamId: existingPosition.teamId,
      level: existingPosition.level,
      parentId: existingPosition.parentId,
      userId: existingPosition.userId,
      isActive: existingPosition.isActive,
    }

    // Build update data - only include fields that are provided
    const updateData: any = {}
    if (title !== undefined) updateData.title = title
    if (teamId !== undefined) updateData.teamId = teamId || null
    if (level !== undefined) updateData.level = level
    if (parentId !== undefined) updateData.parentId = parentId || null
    if (userId !== undefined) updateData.userId = userId || null
    if (order !== undefined) updateData.order = order
    if (isActive !== undefined) updateData.isActive = isActive

    // Update the org position
    const position = await prisma.orgPosition.update({
      where: { id: resolvedParams.id },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true
          }
        },
        team: {
          select: {
            id: true,
            name: true,
            department: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        parent: {
          select: {
            id: true,
            title: true,
            user: {
              select: {
                name: true
              }
            }
          }
        },
        children: {
          where: {
            isActive: true
          },
          select: {
            id: true,
            title: true,
            teamId: true,
            level: true,
            user: {
              select: {
                name: true,
                email: true
              }
            }
          },
          orderBy: {
            order: 'asc'
          }
        }
      }
    })

    // Emit position updated event
    await emitEvent<OrgPositionUpdatedEvent>(ORG_EVENTS.POSITION_UPDATED, {
      workspaceId: auth.workspaceId,
      positionId: position.id,
      teamId: position.teamId,
      userId: position.userId,
      data: {
        id: position.id,
        title: position.title,
        level: position.level,
        isActive: position.isActive,
        workspaceId: position.workspaceId,
        teamId: position.teamId,
        userId: position.userId,
        createdAt: position.createdAt,
        updatedAt: position.updatedAt,
      },
    });

    // If userId changed, emit person updated event
    const oldUserId = existingPosition.userId;
    const newUserId = position.userId;
    if (oldUserId !== newUserId) {
      if (oldUserId) {
        // Person was unassigned
        await emitEvent<OrgPersonUpdatedEvent>(ORG_EVENTS.PERSON_UPDATED, {
          workspaceId: auth.workspaceId,
          userId: oldUserId,
          positionId: null,
          teamId: null,
          departmentId: null,
          data: {
            id: oldUserId,
            name: null,
            email: '',
            updatedAt: new Date(),
          },
        });
      }
      if (newUserId && position.user) {
        // Person was assigned
        await emitEvent<OrgPersonUpdatedEvent>(ORG_EVENTS.PERSON_UPDATED, {
          workspaceId: auth.workspaceId,
          userId: newUserId,
          positionId: position.id,
          teamId: position.teamId,
          departmentId: position.team?.department?.id ?? null,
          data: {
            id: newUserId,
            name: position.user.name,
            email: position.user.email,
            updatedAt: position.user.updatedAt ?? new Date(),
          },
        });
      }
    }

    // Log audit entry
    const after = {
      title: position.title,
      teamId: position.teamId,
      level: position.level,
      parentId: position.parentId,
      userId: position.userId,
      isActive: position.isActive,
    }
    const changes = computeChanges(before, after, ['title', 'teamId', 'level', 'parentId', 'userId', 'isActive'])
    logOrgAudit({
      workspaceId: auth.workspaceId,
      entityType: "POSITION",
      entityId: position.id,
      entityName: position.title,
      action: "UPDATED",
      actorId: auth.user.userId,
      changes: changes ?? undefined,
    }).catch((e) => console.error("[PUT /api/org/positions/[id]] Audit log error (non-fatal):", e))

    // Keep Loopbrain org context in sync
    // Fire-and-forget: don't await to avoid blocking the response
    void safeRebuildOrgContext(auth.workspaceId);

    return NextResponse.json(position)
  } catch (error) {
    return handleApiError(error, request)
  }
}

// DELETE /api/org/positions/[id] - Delete an org position
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getUnifiedAuth(request)
    const resolvedParams = await params
    
    await assertAccess({ 
      userId: auth.user.userId, 
      workspaceId: auth.workspaceId, 
      scope: 'workspace', 
      requireRole: ['ADMIN', 'OWNER'] 
    })

    setWorkspaceContext(auth.workspaceId)

    // Check if position exists
    const existingPosition = await prisma.orgPosition.findFirst({
      where: { 
        id: resolvedParams.id,
        workspaceId: auth.workspaceId
      },
      include: {
        children: true
      }
    })

    if (!existingPosition) {
      return NextResponse.json({ error: 'Position not found' }, { status: 404 })
    }

    // Check if position has children
    if (existingPosition.children.length > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete position with direct reports. Please reassign or delete direct reports first.' 
      }, { status: 400 })
    }

    // Soft delete by setting isActive to false
    const position = await prisma.orgPosition.update({
      where: { id: resolvedParams.id },
      data: { isActive: false },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        team: {
          select: {
            id: true,
            department: {
              select: {
                id: true,
              },
            },
          },
        },
      },
    });

    // Log audit entry
    logOrgAudit({
      workspaceId: auth.workspaceId,
      entityType: "POSITION",
      entityId: position.id,
      entityName: position.title,
      action: "ARCHIVED",
      actorId: auth.user.userId,
    }).catch((e) => console.error("[DELETE /api/org/positions/[id]] Audit log error (non-fatal):", e));

    // Emit position updated event (soft delete)
    await emitEvent<OrgPositionUpdatedEvent>(ORG_EVENTS.POSITION_UPDATED, {
      workspaceId: auth.workspaceId,
      positionId: position.id,
      teamId: position.teamId,
      userId: position.userId,
      data: {
        id: position.id,
        title: position.title,
        level: position.level,
        isActive: false,
        workspaceId: position.workspaceId,
        teamId: position.teamId,
        userId: position.userId,
        createdAt: position.createdAt,
        updatedAt: position.updatedAt,
      },
    });

    // If position had a user assigned, emit person updated event
    if (position.userId && position.user) {
      await emitEvent<OrgPersonUpdatedEvent>(ORG_EVENTS.PERSON_UPDATED, {
        workspaceId: auth.workspaceId,
        userId: position.userId,
        positionId: null,
        teamId: null,
        departmentId: null,
        data: {
          id: position.userId,
          name: position.user.name,
          email: position.user.email,
          updatedAt: position.user.updatedAt ?? new Date(),
        },
      });
    }

    // Archive role ContextItem in Context Store
    await onOrgPositionDeleted({
      workspaceId: auth.workspaceId,
      positionId: position.id,
    });

    // Keep Loopbrain org context in sync
    // Fire-and-forget: don't await to avoid blocking the response
    void safeRebuildOrgContext(auth.workspaceId);

    return NextResponse.json({ message: 'Position deleted successfully' })
  } catch (error) {
    return handleApiError(error, request)
  }
}
