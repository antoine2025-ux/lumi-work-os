import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'

// GET /api/org/positions - Get all org positions for a workspace
export async function GET(request: NextRequest) {
  try {
    const auth = await getUnifiedAuth(request)
    
    // Assert workspace access (VIEWER can read org structure)
    await assertAccess({ 
      userId: auth.user.userId, 
      workspaceId: auth.workspaceId, 
      scope: 'workspace', 
      requireRole: ['VIEWER', 'MEMBER', 'ADMIN', 'OWNER'] 
    })

    // Set workspace context for Prisma middleware
    setWorkspaceContext(auth.workspaceId)
    
    const positions = await prisma.orgPosition.findMany({
      where: {
        workspaceId: auth.workspaceId,
        isActive: true
      },
      select: {
        id: true,
        title: true,
        teamId: true,
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
        level: true,
        parentId: true,
        userId: true,
        order: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        // Contextual role fields
        roleDescription: true,
        responsibilities: true,
        requiredSkills: true,
        preferredSkills: true,
        keyMetrics: true,
        teamSize: true,
        budget: true,
        reportingStructure: true,
        // Role card relation
        roleCard: {
          select: {
            id: true,
            roleName: true,
            roleDescription: true,
            jobFamily: true
          }
        },
        // User fields (basic first)
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true
          }
        },
        // Parent and children (basic)
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
  } catch (error: any) {
    console.error('Error fetching org positions:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to fetch org positions' 
    }, { status: 500 })
  }
}

// POST /api/org/positions - Create a new org position
export async function POST(request: NextRequest) {
  try {
    const auth = await getUnifiedAuth(request)
    
    // Assert workspace access
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
      title, 
      teamId,
      level = 1,
      parentId,
      userId,
      order = 0,
      roleDescription,
      responsibilities = [],
      requiredSkills = [],
      preferredSkills = [],
      keyMetrics = [],
      teamSize,
      budget,
      reportingStructure
    } = body

    if (!title) {
      return NextResponse.json({ 
        error: 'Missing required field: title' 
      }, { status: 400 })
    }

    // Create the org position
    const position = await prisma.orgPosition.create({
      data: {
        workspaceId: auth.workspaceId,
        title,
        teamId: teamId || null,
        level,
        parentId: parentId || null,
        userId: userId || null,
        order,
        roleDescription,
        responsibilities,
        requiredSkills,
        preferredSkills,
        keyMetrics,
        teamSize,
        budget,
        reportingStructure
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            bio: true,
            skills: true,
            currentGoals: true,
            interests: true,
            timezone: true,
            location: true,
            phone: true,
            linkedinUrl: true,
            githubUrl: true,
            personalWebsite: true
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