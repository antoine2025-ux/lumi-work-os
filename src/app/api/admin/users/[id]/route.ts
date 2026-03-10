// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/server/authOptions'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { safeRebuildOrgContext } from '@/lib/org/org-context-service'
import { handleApiError } from '@/lib/api-errors'
import { AdminUpdateUserSchema } from '@/lib/validations/admin'

// GET /api/admin/users/[id] - Get a specific user
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Set workspace context for Prisma scoping
    const auth = await getUnifiedAuth(request)
    if (!auth.isAuthenticated || !auth.workspaceId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    await assertAccess({ userId: auth.user.userId, workspaceId: auth.workspaceId, scope: 'workspace', requireRole: ['OWNER'] })
    setWorkspaceContext(auth.workspaceId)

    const { id } = await params
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        createdAt: true,
        lastLoginAt: true
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json(user)
  } catch (error) {
    return handleApiError(error, request)
  }
}

// PUT /api/admin/users/[id] - Update a user
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Set workspace context for Prisma scoping
    const authCtx = await getUnifiedAuth(request)
    if (!authCtx.isAuthenticated || !authCtx.workspaceId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    await assertAccess({ userId: authCtx.user.userId, workspaceId: authCtx.workspaceId, scope: 'workspace', requireRole: ['OWNER'] })
    setWorkspaceContext(authCtx.workspaceId)

    const { id } = await params
    const body = AdminUpdateUserSchema.parse(await request.json())
    const { 
      name, 
      email, 
      role,
      department,
      positionId,
      isActive: _isActive = true,
      createOrgPosition = false,
      orgPositionTitle,
      orgPositionLevel = 3,
      orgPositionParentId,
      workspaceId
    } = body

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id }
    })

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Update user basic info
    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        name,
        email
      },
      include: {
        workspaceMemberships: {
          select: {
            workspaceId: true,
          },
        },
      },
    })

    // Update workspace member role
    if (role && workspaceId) {
      await prisma.workspaceMember.updateMany({
        where: {
          userId: id,
          workspaceId
        },
        data: {
          role: role as any
        }
      })
    }

    // If name or email changed, rebuild org context for all workspaces this user belongs to
    if ((name !== existingUser.name || email !== existingUser.email) && workspaceId) {
      // Rebuild for the workspace being edited
      void safeRebuildOrgContext(workspaceId);
    }

    // Handle org position assignment
    if (createOrgPosition && orgPositionTitle && workspaceId) {
      // Find positions that will be updated (for syncing)
      const _positionsToRemoveFrom = await prisma.orgPosition.findMany({
        where: {
          workspaceId,
          userId: params.id
        }
      });

      // Remove user from current position
      await prisma.orgPosition.updateMany({
        where: {
          workspaceId,
          userId: params.id
        },
        data: { userId: null }
      })

      // Create new org position
      const _newPosition = await prisma.orgPosition.create({
        data: {
          workspaceId,
          title: orgPositionTitle,
          department,
          level: orgPositionLevel,
          parentId: orgPositionParentId || null,
          userId: id,
          order: 0
        }
      })

      // Keep Loopbrain org context in sync
      // Fire-and-forget: don't await to avoid blocking the response
      if (workspaceId) {
        void safeRebuildOrgContext(workspaceId);
      }
    } else if (positionId && positionId !== 'none' && workspaceId) {
      // Find positions that will be updated (for syncing)
      const _positionsToRemoveFrom = await prisma.orgPosition.findMany({
        where: {
          workspaceId,
          userId: params.id
        }
      });

      // Remove user from current position
      await prisma.orgPosition.updateMany({
        where: {
          workspaceId,
          userId: params.id
        },
        data: { userId: null }
      })

      // Assign to new position
      const updatedPosition = await prisma.orgPosition.update({
        where: { id: positionId },
        data: { userId: id },
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

      // Emit events for position and person updates
      const { emitEvent } = await import("@/lib/events/emit");
      const { ORG_EVENTS, OrgPositionUpdatedEvent: _OrgPositionUpdatedEvent, OrgPersonUpdatedEvent: _OrgPersonUpdatedEvent } = await import("@/lib/events/orgEvents");

      await emitEvent<OrgPositionUpdatedEvent>(ORG_EVENTS.POSITION_UPDATED, {
        workspaceId,
        positionId: updatedPosition.id,
        teamId: updatedPosition.teamId,
        userId: updatedPosition.userId,
        data: {
          id: updatedPosition.id,
          title: updatedPosition.title,
          level: updatedPosition.level,
          isActive: updatedPosition.isActive,
          workspaceId: updatedPosition.workspaceId,
          teamId: updatedPosition.teamId,
          userId: updatedPosition.userId,
          createdAt: updatedPosition.createdAt,
          updatedAt: updatedPosition.updatedAt,
        },
      });

      if (updatedPosition.user) {
        await emitEvent<OrgPersonUpdatedEvent>(ORG_EVENTS.PERSON_UPDATED, {
          workspaceId,
          userId: updatedPosition.user.id,
          positionId: updatedPosition.id,
          teamId: updatedPosition.teamId,
          departmentId: updatedPosition.team?.department?.id ?? null,
          data: {
            id: updatedPosition.user.id,
            name: updatedPosition.user.name,
            email: updatedPosition.user.email,
            updatedAt: updatedPosition.user.updatedAt ?? new Date(),
          },
        });
      }

      // Keep Loopbrain org context in sync
      // Fire-and-forget: don't await to avoid blocking the response
      if (workspaceId) {
        void safeRebuildOrgContext(workspaceId);
      }
    } else if (positionId === 'none' && workspaceId) {
      // Remove user from any position
      // Find positions that will be updated
      const positionsToUpdate = await prisma.orgPosition.findMany({
        where: {
          workspaceId,
          userId: params.id,
        },
        include: {
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

      await prisma.orgPosition.updateMany({
        where: {
          workspaceId,
          userId: params.id,
        },
        data: { userId: null },
      });

      // Emit events for each position update
      const { emitEvent } = await import("@/lib/events/emit");
      const { ORG_EVENTS, OrgPositionUpdatedEvent: _OrgPositionUpdatedEvent, OrgPersonUpdatedEvent: _OrgPersonUpdatedEvent } = await import("@/lib/events/orgEvents");

      for (const pos of positionsToUpdate) {
        await emitEvent<OrgPositionUpdatedEvent>(ORG_EVENTS.POSITION_UPDATED, {
          workspaceId,
          positionId: pos.id,
          teamId: pos.teamId,
          userId: null,
          data: {
            id: pos.id,
            title: pos.title,
            level: pos.level,
            isActive: pos.isActive,
            workspaceId: pos.workspaceId,
            teamId: pos.teamId,
            userId: null,
            createdAt: pos.createdAt,
            updatedAt: pos.updatedAt,
          },
        });
      }

      // Emit person updated event
      await emitEvent<OrgPersonUpdatedEvent>(ORG_EVENTS.PERSON_UPDATED, {
        workspaceId,
        userId: params.id,
        positionId: null,
        teamId: null,
        departmentId: null,
        data: {
          id: params.id,
          name: null,
          email: '',
          updatedAt: new Date(),
        },
      });

      // Keep Loopbrain org context in sync
      // Fire-and-forget: don't await to avoid blocking the response
      if (workspaceId) {
        void safeRebuildOrgContext(workspaceId);
      }
    }

    return NextResponse.json({ 
      message: 'User updated successfully',
      user: updatedUser 
    })
  } catch (error) {
    return handleApiError(error, request)
  }
}

// DELETE /api/admin/users/[id] - Delete a user
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Set workspace context for Prisma scoping
    const authDel = await getUnifiedAuth(request)
    if (!authDel.isAuthenticated || !authDel.workspaceId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    await assertAccess({ userId: authDel.user.userId, workspaceId: authDel.workspaceId, scope: 'workspace', requireRole: ['OWNER'] })
    setWorkspaceContext(authDel.workspaceId)

    const { id } = await params
    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspaceId')

    if (!workspaceId) {
      return NextResponse.json({ error: 'Missing workspaceId' }, { status: 400 })
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id }
    })

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Remove user from workspace (soft delete)
    await prisma.workspaceMember.deleteMany({
      where: {
        userId: id,
        workspaceId
      }
    })

    // Remove user from org positions
    await prisma.orgPosition.updateMany({
      where: {
        workspaceId,
        userId: params.id
      },
      data: { userId: null }
    })

    return NextResponse.json({ message: 'User removed from workspace successfully' })
  } catch (error) {
    return handleApiError(error, request)
  }
}
