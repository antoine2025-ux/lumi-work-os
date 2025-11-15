import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'

// GET /api/admin/users - Get all users for admin management
export async function GET(request: NextRequest) {
  try {
    const auth = await getUnifiedAuth(request)
    
    // Assert workspace access (admin only)
    await assertAccess({ 
      userId: auth.user.userId, 
      workspaceId: auth.workspaceId, 
      scope: 'workspace', 
      requireRole: ['ADMIN', 'OWNER'] 
    })

    // Set workspace context for Prisma middleware
    setWorkspaceContext(auth.workspaceId)

    const users = await prisma.user.findMany({
      where: {
        workspaceMemberships: {
          some: {
            workspaceId: auth.workspaceId
          }
        }
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        createdAt: true,
        updatedAt: true,
        bio: true,
        skills: true,
        currentGoals: true,
        interests: true,
        timezone: true,
        location: true,
        phone: true,
        linkedinUrl: true,
        githubUrl: true,
        personalWebsite: true,
        workspaceMemberships: {
          where: {
            workspaceId: auth.workspaceId
          },
          select: {
            role: true,
            joinedAt: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    })

    return NextResponse.json(users)
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }
}

// POST /api/admin/users - Create a new user
export async function POST(request: NextRequest) {
  try {
    const auth = await getUnifiedAuth(request)
    
    // Assert workspace access (admin only)
    await assertAccess({ 
      userId: auth.user.userId, 
      workspaceId: auth.workspaceId, 
      scope: 'workspace', 
      requireRole: ['ADMIN', 'OWNER'] 
    })

    // Set workspace context for Prisma middleware
    setWorkspaceContext(auth.workspaceId)
    const body = await request.json()
    const { 
      workspaceId = auth.workspaceId,
      email, 
      name, 
      role = 'MEMBER',
      bio,
      skills = [],
      currentGoals = [],
      interests = [],
      timezone,
      location,
      phone,
      linkedinUrl,
      githubUrl,
      personalWebsite
    } = body

    if (!email || !name) {
      return NextResponse.json({ 
        error: 'Missing required fields: email, name' 
      }, { status: 400 })
    }

    // Create the user
    const newUser = await prisma.user.create({
      data: {
        email,
        name,
        emailVerified: new Date(),
        bio,
        skills,
        currentGoals,
        interests,
        timezone,
        location,
        phone,
        linkedinUrl,
        githubUrl,
        personalWebsite
      }
    })

    // Add user to workspace
    await prisma.workspaceMember.create({
      data: {
        userId: newUser.id,
        workspaceId,
        role: role as 'OWNER' | 'ADMIN' | 'MEMBER',
        joinedAt: new Date(),
      }
    })

    return NextResponse.json(newUser, { status: 201 })
  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
  }
}