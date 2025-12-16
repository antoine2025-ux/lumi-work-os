import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { logger } from '@/lib/logger'
import { buildLogContextFromRequest } from '@/lib/request-context'

// Helper to hash workspaceId for logging (privacy/correlation protection)
function hashWorkspaceId(workspaceId: string | null): string | undefined {
  if (!workspaceId) return undefined
  return workspaceId.slice(-6)
}

// Helper to create caller fingerprint (non-sensitive, for identifying client paths)
function createCallerFingerprint(request: NextRequest, workspaceIdHash?: string): string {
  const userAgent = request.headers.get('user-agent') || 'unknown'
  const userAgentHash = userAgent.slice(0, 40) // First 40 chars (non-sensitive, identifies browser/client)
  const route = new URL(request.url).pathname
  
  // Extract referer path only (no host, no query string) - safe from invite tokens or other sensitive params
  let refererPath = 'direct'
  try {
    const referer = request.headers.get('referer')
    if (referer) {
      // new URL().pathname gives us path-only (no host, no query string, no hash)
      // This ensures we never log invite tokens or other sensitive query params
      const refererUrl = new URL(referer)
      refererPath = refererUrl.pathname.slice(0, 50) // Limit length
    }
  } catch {
    // Invalid referer URL - safe to ignore, use 'direct'
    refererPath = 'invalid-referer'
  }
  
  // Create fingerprint: route + workspace + userAgent prefix + referer path
  // This helps identify which client path is calling tree=1 without exposing PII
  // refererPath is path-only (no host, no query string) - safe from sensitive params
  return `${route}|${workspaceIdHash || 'no-ws'}|${userAgentHash}|${refererPath}`
}

// GET /api/org/positions - Get all org positions for a workspace
// 
// Query params:
//   - includeChildren=true&parentId=<id>: Returns only direct children of parentId
//   - tree=1: Legacy mode - returns full nested tree (DEPRECATED - remove after Jan 31, 2026)
//   - Default: Returns flat list with childCount
export async function GET(request: NextRequest) {
  const startTime = performance.now()
  const baseContext = await buildLogContextFromRequest(request)
  
  try {
    const authStartTime = performance.now()
    const auth = await getUnifiedAuth(request)
    const authDurationMs = performance.now() - authStartTime
    
    // Assert workspace access (VIEWER can read org structure)
    await assertAccess({ 
      userId: auth.user.userId, 
      workspaceId: auth.workspaceId, 
      scope: 'workspace', 
      requireRole: ['VIEWER', 'MEMBER', 'ADMIN', 'OWNER'] 
    })

    // Set workspace context for Prisma middleware
    setWorkspaceContext(auth.workspaceId)
    
    const { searchParams } = new URL(request.url)
    const includeChildren = searchParams.get('includeChildren') === 'true'
    const parentId = searchParams.get('parentId')
    const treeMode = searchParams.get('tree') === '1' // Legacy mode
    
    const dbStartTime = performance.now()
    
    // Mode 1: Lazy-load children for a specific parent
    if (includeChildren && parentId) {
      const children = await prisma.orgPosition.findMany({
        where: {
          workspaceId: auth.workspaceId,
          isActive: true,
          parentId: parentId
        },
        select: {
          id: true,
          title: true,
          level: true,
          parentId: true,
          teamId: true,
          userId: true,
          isActive: true,
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
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true
            }
          }
        },
        orderBy: [
          { order: 'asc' },
          { createdAt: 'asc' }
        ],
        take: 100 // Limit children per parent
      })
      
      // Build response - explicitly omit 'children' field (must not be present)
      const childrenResponse = children.map(child => ({
        id: child.id,
        title: child.title,
        level: child.level ?? 0, // Default to 0 if null
        parentId: child.parentId,
        teamId: child.teamId,
        departmentId: child.team?.department?.id || null,
        userId: child.userId,
        user: child.user,
        team: child.team,
        isActive: child.isActive,
        childCount: 0 // Children of children not loaded in this mode
        // Explicitly omit 'children' - must not be present
      }))
      
      const dbDurationMs = performance.now() - dbStartTime
      const totalDurationMs = performance.now() - startTime
      
      logger.info('org/positions GET (children)', {
        ...baseContext,
        durationMs: Math.round(totalDurationMs * 100) / 100,
        authDurationMs: Math.round(authDurationMs * 100) / 100,
        dbDurationMs: Math.round(dbDurationMs * 100) / 100,
        resultCount: childrenResponse.length,
        payloadMode: 'children',
        parentId,
        workspaceIdHash: hashWorkspaceId(auth.workspaceId)
      })
      
      return NextResponse.json(childrenResponse)
    }
    
    // Mode 2: Legacy tree mode (deprecated - full nested tree)
    // DEPRECATED: Remove after Jan 31, 2026
    // Migration: Use flat mode + client-side tree building or includeChildren for lazy loading
    if (treeMode) {
      const workspaceIdHash = hashWorkspaceId(auth.workspaceId)
      const callerFingerprint = createCallerFingerprint(request, workspaceIdHash)
      
      logger.debug('org/positions GET (legacy tree mode - deprecated, remove after Jan 31, 2026)', {
        ...baseContext,
        workspaceIdHash,
        callerFingerprint // Non-sensitive fingerprint to identify client path when tripwire triggers
      })
      
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
          roleDescription: true,
          responsibilities: true,
          requiredSkills: true,
          preferredSkills: true,
          keyMetrics: true,
          teamSize: true,
          budget: true,
          reportingStructure: true,
          roleCard: {
            select: {
              id: true,
              roleName: true,
              roleDescription: true,
              jobFamily: true
            }
          },
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
        ],
        take: 500 // Safety limit even in legacy mode
      })
      
      const dbDurationMs = performance.now() - dbStartTime
      const totalDurationMs = performance.now() - startTime
      
      // Note: callerFingerprint already computed above (line 143)
      logger.info('org/positions GET (tree)', {
        ...baseContext,
        durationMs: Math.round(totalDurationMs * 100) / 100,
        authDurationMs: Math.round(authDurationMs * 100) / 100,
        dbDurationMs: Math.round(dbDurationMs * 100) / 100,
        resultCount: positions.length,
        payloadMode: 'tree',
        workspaceIdHash,
        callerFingerprint // Non-sensitive fingerprint: route|workspaceIdHash|userAgentPrefix|refererPath
      })
      
      return NextResponse.json(positions)
    }
    
    // Mode 3: Default - Flat list with childCount (OPTIMIZED)
    // Fetch positions and child counts in parallel
    const [positions, childCounts] = await Promise.all([
      prisma.orgPosition.findMany({
        where: {
          workspaceId: auth.workspaceId,
          isActive: true
        },
        select: {
          id: true,
          title: true,
          level: true,
          parentId: true,
          teamId: true,
          userId: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
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
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true
            }
          }
        },
        orderBy: [
          { level: 'asc' },
          { createdAt: 'asc' }
        ],
        take: 200 // Safety limit
      }),
      // Get child counts via grouped query (single query, not N+1)
      prisma.orgPosition.groupBy({
        by: ['parentId'],
        where: {
          workspaceId: auth.workspaceId,
          isActive: true,
          parentId: { not: null }
        },
        _count: {
          _all: true
        }
      })
    ])
    
    // Map child counts onto positions
    const childCountMap = new Map<string, number>()
    childCounts.forEach(({ parentId, _count }) => {
      if (parentId) {
        childCountMap.set(parentId, _count._all)
      }
    })
    
    // Build response with childCount
    // IMPORTANT: Do NOT include 'children' field - it must be undefined/omitted
    // Even empty children: [] adds JSON bloat and can cause UI branching issues
    const positionsWithCounts = positions.map(position => ({
      id: position.id,
      title: position.title,
      level: position.level ?? 0, // Default to 0 if null (edge case handling)
      parentId: position.parentId,
      teamId: position.teamId,
      departmentId: position.team?.department?.id || null,
      userId: position.userId,
      user: position.user,
      team: position.team,
      isActive: position.isActive,
      createdAt: position.createdAt.toISOString(),
      updatedAt: position.updatedAt.toISOString(),
      childCount: childCountMap.get(position.id) || 0
      // Explicitly omit 'children' - must not be present in flat mode
    }))
    
    const dbDurationMs = performance.now() - dbStartTime
    const totalDurationMs = performance.now() - startTime

    logger.info('org/positions GET', {
      ...baseContext,
      durationMs: Math.round(totalDurationMs * 100) / 100,
      authDurationMs: Math.round(authDurationMs * 100) / 100,
      dbDurationMs: Math.round(dbDurationMs * 100) / 100,
      resultCount: positionsWithCounts.length,
      payloadMode: 'flat',
      workspaceIdHash: hashWorkspaceId(auth.workspaceId)
    })
    
    if (totalDurationMs > 1000) {
      logger.warn('org/positions GET (slow)', {
        ...baseContext,
        durationMs: Math.round(totalDurationMs * 100) / 100,
        authDurationMs: Math.round(authDurationMs * 100) / 100,
        dbDurationMs: Math.round(dbDurationMs * 100) / 100,
        resultCount: positionsWithCounts.length,
        payloadMode: 'flat',
        workspaceIdHash: hashWorkspaceId(auth.workspaceId)
      })
    }

    return NextResponse.json(positionsWithCounts)
  } catch (error: unknown) {
    const totalDurationMs = performance.now() - startTime
    logger.error('org/positions GET (error)', {
      ...baseContext,
      durationMs: Math.round(totalDurationMs * 100) / 100
    }, error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to fetch org positions' 
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