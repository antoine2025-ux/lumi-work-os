import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// GET /api/org/positions - Get all org positions for a workspace
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspaceId') || 'cmgl0f0wa00038otlodbw5jhn'
    
    const positions = await prisma.orgPosition.findMany({
      where: {
        workspaceId,
        isActive: true
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
            department: true,
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
      },
      orderBy: [
        { level: 'asc' },
        { order: 'asc' }
      ]
    })

    return NextResponse.json(positions)
  } catch (error) {
    console.error('Error fetching org positions:', error)
    return NextResponse.json({ error: 'Failed to fetch org positions' }, { status: 500 })
  }
}

// POST /api/org/positions - Create a new org position
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      workspaceId, 
      title, 
      department, 
      level = 1,
      parentId,
      userId,
      order = 0
    } = body

    if (!workspaceId || !title) {
      return NextResponse.json({ 
        error: 'Missing required fields: workspaceId, title' 
      }, { status: 400 })
    }

    // Get user ID
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Create the org position
    const position = await prisma.orgPosition.create({
      data: {
        workspaceId,
        title,
        department,
        level,
        parentId: parentId || null,
        userId: userId || null,
        order
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
        }
      }
    })

    return NextResponse.json(position, { status: 201 })
  } catch (error) {
    console.error('Error creating org position:', error)
    return NextResponse.json({ error: 'Failed to create org position' }, { status: 500 })
  }
}
