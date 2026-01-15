import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { prisma } from '@/lib/db'
import { z } from 'zod'

// SpaceType and SpaceVisibility enum values (pending prisma generate)
const SpaceType = {
  PERSONAL: 'PERSONAL',
  TEAM: 'TEAM',
  CUSTOM: 'CUSTOM'
} as const

const SpaceVisibility = {
  PUBLIC: 'PUBLIC',
  TARGETED: 'TARGETED',
  PRIVATE: 'PRIVATE'
} as const

// Schema for creating a space
const CreateSpaceSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  visibility: z.enum(['PUBLIC', 'TARGETED', 'PRIVATE']).default('PUBLIC'),
  memberUserIds: z.array(z.string()).optional()
})

// GET /api/spaces - List spaces user can access
export async function GET(request: NextRequest) {
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

    // Get user's space memberships
    const userSpaceMemberships = await (prisma as any).spaceMember.findMany({
      where: {
        userId: auth.user.userId,
        space: {
          workspaceId: auth.workspaceId
        }
      },
      select: {
        spaceId: true
      }
    }) as Array<{ spaceId: string }>
    const userSpaceIds = userSpaceMemberships.map((m: { spaceId: string }) => m.spaceId)

    // Get spaces user can access:
    // 1. PUBLIC spaces in workspace
    // 2. TARGETED spaces where user is a member
    // 3. PERSONAL spaces where user is owner
    const spaces = await (prisma as any).space.findMany({
      where: {
        workspaceId: auth.workspaceId,
        OR: [
          // PUBLIC spaces
          {
            visibility: SpaceVisibility.PUBLIC
          },
          // TARGETED spaces where user is member
          {
            visibility: SpaceVisibility.TARGETED,
            id: {
              in: userSpaceIds
            }
          },
          // PERSONAL spaces where user is owner
          {
            type: SpaceType.PERSONAL,
            ownerId: auth.user.userId
          }
        ]
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        _count: {
          select: {
            members: true,
            projects: true,
            wikiPages: true
          }
        }
      },
      orderBy: [
        { type: 'asc' }, // PERSONAL first, then TEAM, then CUSTOM
        { createdAt: 'asc' }
      ]
    }) as Array<{
      id: string
      name: string
      description: string | null
      type: string
      visibility: string
      ownerId: string | null
      owner: { id: string; name: string | null; email: string } | null
      createdAt: Date
      updatedAt: Date
      _count: { members: number; projects: number; wikiPages: number }
    }>

    return NextResponse.json({
      spaces: spaces.map((space: typeof spaces[number]) => ({
        id: space.id,
        name: space.name,
        description: space.description,
        type: space.type,
        visibility: space.visibility,
        ownerId: space.ownerId,
        owner: space.owner,
        createdAt: space.createdAt,
        updatedAt: space.updatedAt,
        _count: space._count
      }))
    })
  } catch (error: any) {
    console.error('Error fetching spaces:', error)
    
    if (error.message?.includes('Unauthorized') || error.message?.includes('Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    
    return NextResponse.json({ 
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 })
  }
}

// POST /api/spaces - Create a CUSTOM space
export async function POST(request: NextRequest) {
  try {
    const auth = await getUnifiedAuth(request)
    
    // Assert workspace access (MEMBER+ required to create spaces)
    await assertAccess({ 
      userId: auth.user.userId, 
      workspaceId: auth.workspaceId, 
      scope: 'workspace', 
      requireRole: ['MEMBER'] 
    })

    // Set workspace context for Prisma middleware
    setWorkspaceContext(auth.workspaceId)

    const body = await request.json()
    const validatedData = CreateSpaceSchema.parse(body)
    const { name, description, visibility, memberUserIds } = validatedData

    // Create the space
    const space = await (prisma as any).space.create({
      data: {
        workspaceId: auth.workspaceId,
        name,
        description,
        type: SpaceType.CUSTOM,
        visibility: visibility as typeof SpaceVisibility[keyof typeof SpaceVisibility],
        ownerId: null // CUSTOM spaces don't have a single owner
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    }) as {
      id: string
      name: string
      description: string | null
      type: string
      visibility: string
      ownerId: string | null
      owner: { id: string; name: string | null; email: string } | null
      createdAt: Date
      updatedAt: Date
    }

    // If TARGETED visibility, add members
    if (visibility === 'TARGETED' && memberUserIds && memberUserIds.length > 0) {
      // Verify all user IDs belong to the workspace
      const workspaceMembers = await prisma.workspaceMember.findMany({
        where: {
          workspaceId: auth.workspaceId,
          userId: {
            in: memberUserIds
          }
        },
        select: {
          userId: true
        }
      })
      const validUserIds = workspaceMembers.map(m => m.userId)

      // Create SpaceMember records
      await (prisma as any).spaceMember.createMany({
        data: validUserIds.map(userId => ({
          spaceId: space.id,
          userId,
          role: null
        })),
        skipDuplicates: true
      })

      // Always add creator as member
      await (prisma as any).spaceMember.upsert({
        where: {
          spaceId_userId: {
            spaceId: space.id,
            userId: auth.user.userId
          }
        },
        create: {
          spaceId: space.id,
          userId: auth.user.userId,
          role: null
        },
        update: {}
      })
    } else if (visibility === 'PUBLIC') {
      // For PUBLIC spaces, creator is automatically a member (but not required for access)
      // We can optionally add them, but it's not necessary
    }

    return NextResponse.json({
      id: space.id,
      name: space.name,
      description: space.description,
      type: space.type,
      visibility: space.visibility,
      ownerId: space.ownerId,
      owner: space.owner,
      createdAt: space.createdAt,
      updatedAt: space.updatedAt
    }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating space:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Validation error',
        details: error.issues
      }, { status: 400 })
    }
    
    if (error.message?.includes('Unauthorized') || error.message?.includes('Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    
    return NextResponse.json({ 
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 })
  }
}
