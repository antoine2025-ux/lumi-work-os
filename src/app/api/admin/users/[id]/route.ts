import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

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
    console.error('Error fetching user:', error)
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 })
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

    const body = await request.json()
    const { 
      name, 
      email, 
      role,
      department,
      positionId,
      isActive = true,
      createOrgPosition = false,
      orgPositionTitle,
      orgPositionLevel = 3,
      orgPositionParentId,
      workspaceId
    } = body

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: params.id }
    })

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Update user basic info
    const updatedUser = await prisma.user.update({
      where: { id: params.id },
      data: {
        name,
        email
      }
    })

    // Update workspace member role
    if (role && workspaceId) {
      await prisma.workspaceMember.updateMany({
        where: {
          userId: params.id,
          workspaceId
        },
        data: {
          role: role as any
        }
      })
    }

    // Handle org position assignment
    if (createOrgPosition && orgPositionTitle && workspaceId) {
      // Remove user from current position
      await prisma.orgPosition.updateMany({
        where: {
          workspaceId,
          userId: params.id
        },
        data: { userId: null }
      })

      // Create new org position
      await prisma.orgPosition.create({
        data: {
          workspaceId,
          title: orgPositionTitle,
          department,
          level: orgPositionLevel,
          parentId: orgPositionParentId || null,
          userId: params.id,
          order: 0
        }
      })
    } else if (positionId && positionId !== 'none' && workspaceId) {
      // Remove user from current position
      await prisma.orgPosition.updateMany({
        where: {
          workspaceId,
          userId: params.id
        },
        data: { userId: null }
      })

      // Assign to new position
      await prisma.orgPosition.update({
        where: { id: positionId },
        data: { userId: params.id }
      })
    } else if (positionId === 'none' && workspaceId) {
      // Remove user from any position
      await prisma.orgPosition.updateMany({
        where: {
          workspaceId,
          userId: params.id
        },
        data: { userId: null }
      })
    }

    return NextResponse.json({ 
      message: 'User updated successfully',
      user: updatedUser 
    })
  } catch (error) {
    console.error('Error updating user:', error)
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
  }
}

// DELETE /api/admin/users/[id] - Delete a user
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspaceId')

    if (!workspaceId) {
      return NextResponse.json({ error: 'Missing workspaceId' }, { status: 400 })
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: params.id }
    })

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Remove user from workspace (soft delete)
    await prisma.workspaceMember.deleteMany({
      where: {
        userId: params.id,
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
    console.error('Error deleting user:', error)
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 })
  }
}
