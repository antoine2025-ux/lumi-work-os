import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// GET /api/admin/users - Get all users for admin management
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspaceId') || 'workspace-1'
    
    // Get workspace members with their details
    const workspaceMembers = await prisma.workspaceMember.findMany({
      where: {
        workspaceId
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            createdAt: true
          }
        }
      },
      orderBy: {
        joinedAt: 'desc'
      }
    })

    // Get org positions for each user
    const usersWithPositions = await Promise.all(
      workspaceMembers.map(async (member) => {
        const position = await prisma.orgPosition.findFirst({
          where: {
            workspaceId,
            userId: member.user.id,
            isActive: true
          },
          select: {
            id: true,
            title: true,
            department: true
          }
        })

        return {
          id: member.user.id,
          name: member.user.name,
          email: member.user.email,
          image: member.user.image,
          role: member.role,
          department: position?.department || null,
          position: position?.title || null,
          isActive: true, // For now, all workspace members are considered active
          createdAt: member.user.createdAt.toISOString(),
          lastLoginAt: null // Field doesn't exist in current schema
        }
      })
    )

    return NextResponse.json(usersWithPositions)
  } catch (error) {
    console.error('Error fetching admin users:', error)
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }
}

// POST /api/admin/users - Create a new user
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      workspaceId, 
      name, 
      email, 
      role = 'MEMBER',
      department,
      positionId,
      isActive = true,
      createOrgPosition = false,
      orgPositionTitle,
      orgPositionLevel = 3,
      orgPositionParentId
    } = body

    if (!workspaceId || !name || !email) {
      return NextResponse.json({ 
        error: 'Missing required fields: workspaceId, name, email' 
      }, { status: 400 })
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    let userId: string

    if (existingUser) {
      // User exists, add them to workspace
      userId = existingUser.id
      
      // Check if they're already in this workspace
      const existingMember = await prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId,
            userId
          }
        }
      })

      if (!existingMember) {
        await prisma.workspaceMember.create({
          data: {
            workspaceId,
            userId,
            role: role as any
          }
        })
      }
    } else {
      // Create new user
      const newUser = await prisma.user.create({
        data: {
          name,
          email,
          emailVerified: new Date() // For admin-created users
        }
      })
      userId = newUser.id

      // Add to workspace
      await prisma.workspaceMember.create({
        data: {
          workspaceId,
          userId,
          role: role as any
        }
      })
    }

    // Handle org position assignment
    if (createOrgPosition && orgPositionTitle) {
      // Create new org position
      const newPosition = await prisma.orgPosition.create({
        data: {
          workspaceId,
          title: orgPositionTitle,
          department,
          level: orgPositionLevel,
          parentId: orgPositionParentId || null,
          userId,
          order: 0
        }
      })
    } else if (positionId && positionId !== 'none') {
      // Assign to existing position
      await prisma.orgPosition.update({
        where: { id: positionId },
        data: { userId }
      })
    }

    return NextResponse.json({ 
      message: 'User created successfully',
      userId 
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
  }
}
