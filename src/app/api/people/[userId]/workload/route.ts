import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { handleApiError } from '@/lib/api-errors'
import { prisma } from '@/lib/db'

// ---------------------------------------------------------------------------
// GET /api/people/[userId]/workload — Person's workload across all projects
// ---------------------------------------------------------------------------
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const auth = await getUnifiedAuth(request)
    await assertAccess({
      userId: auth.user.userId,
      workspaceId: auth.workspaceId,
      scope: 'workspace',
      requireRole: ['MEMBER'],
    })
    setWorkspaceContext(auth.workspaceId)

    const { userId } = await params

    // Get all project links for this person
    const links = await prisma.projectPersonLink.findMany({
      where: { userId },
      include: {
        project: {
          select: { id: true, name: true, status: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    // Get current capacity contract (latest active)
    const now = new Date()
    const contract = await prisma.capacityContract.findFirst({
      where: {
        personId: userId,
        workspaceId: auth.workspaceId,
        effectiveFrom: { lte: now },
        OR: [
          { effectiveTo: null },
          { effectiveTo: { gte: now } },
        ],
      },
      orderBy: { effectiveFrom: 'desc' },
    })

    const weeklyCapacityHours = contract?.weeklyCapacityHours ?? 40

    // Get active work allocations for utilization tracking
    const allocations = await prisma.workAllocation.findMany({
      where: {
        personId: userId,
        workspaceId: auth.workspaceId,
        startDate: { lte: now },
        OR: [
          { endDate: null },
          { endDate: { gte: now } },
        ],
      },
    })

    const totalAllocatedFromWorkAllocations = allocations.reduce(
      (sum, a) => sum + a.allocationPercent * weeklyCapacityHours,
      0
    )

    // Build project-level allocation from person links
    const projects = links.map((link) => ({
      projectId: link.project.id,
      projectName: link.project.name,
      projectStatus: link.project.status,
      role: link.role,
      allocatedHours: link.allocatedHours,
    }))

    // Use the higher of link-based hours or allocation-based hours
    const totalFromLinks = links.reduce(
      (sum, l) => sum + (l.allocatedHours ?? 0),
      0
    )
    const totalAllocatedHours = Math.max(totalFromLinks, totalAllocatedFromWorkAllocations)

    const utilizationPct =
      weeklyCapacityHours > 0
        ? Math.round((totalAllocatedHours / weeklyCapacityHours) * 1000) / 10
        : 0

    return NextResponse.json({
      userId,
      totalAllocatedHours: Math.round(totalAllocatedHours * 10) / 10,
      weeklyCapacityHours,
      utilizationPct,
      projects,
    })
  } catch (error: unknown) {
    return handleApiError(error, request)
  }
}
