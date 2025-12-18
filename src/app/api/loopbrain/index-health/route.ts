/**
 * Index Health Endpoint (Dev-Only)
 * 
 * Returns indexing health metrics for a workspace.
 * Used to verify sync between Prisma entities and ContextItems.
 * 
 * GET /api/loopbrain/index-health?workspaceId=...
 */

import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  // Dev-only guard
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  try {
    const auth = await getUnifiedAuth(request)
    const workspaceId = auth.workspaceId

    if (!workspaceId) {
      return NextResponse.json({ error: 'Workspace ID required' }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const sampleSize = parseInt(searchParams.get('sample') || '0', 10)

    // Get counts of entities per type
    const entityCounts = {
      project: await prisma.project.count({ where: { workspaceId } }),
      task: await prisma.task.count({ where: { workspaceId } }),
      page: await prisma.wikiPage.count({ where: { workspaceId } }),
      epic: await prisma.epic.count({ where: { workspaceId } }),
      person: await prisma.user.count({
        where: {
          orgPositions: {
            some: {
              workspaceId,
              isActive: true,
            },
          },
        },
      }),
      team: await prisma.orgTeam.count({ where: { workspaceId } }),
      role: await prisma.orgPosition.count({ where: { workspaceId } }),
      time_off: await prisma.timeOff.count({ where: { workspaceId } }),
    }

    // Get counts of ContextItems per type
    const contextItemCounts = {
      project: await prisma.contextItem.count({
        where: { workspaceId, type: 'project' },
      }),
      task: await prisma.contextItem.count({
        where: { workspaceId, type: 'task' },
      }),
      page: await prisma.contextItem.count({
        where: { workspaceId, type: 'page' },
      }),
      epic: await prisma.contextItem.count({
        where: { workspaceId, type: 'epic' },
      }),
      person: await prisma.contextItem.count({
        where: { workspaceId, type: 'person' },
      }),
      team: await prisma.contextItem.count({
        where: { workspaceId, type: 'team' },
      }),
      role: await prisma.contextItem.count({
        where: { workspaceId, type: 'role' },
      }),
      time_off: await prisma.contextItem.count({
        where: { workspaceId, type: 'time_off' },
      }),
    }

    // Calculate coverage ratios
    const coverage: Record<string, { entityCount: number; contextItemCount: number; ratio: number }> = {}
    for (const [type, entityCount] of Object.entries(entityCounts)) {
      const contextItemCount = contextItemCounts[type as keyof typeof contextItemCounts] || 0
      coverage[type] = {
        entityCount,
        contextItemCount,
        ratio: entityCount > 0 ? contextItemCount / entityCount : 0,
      }
    }

    // Get top 20 most recently updated ContextItems
    const recentContextItems = await prisma.contextItem.findMany({
      where: { workspaceId },
      orderBy: { updatedAt: 'desc' },
      take: 20,
      select: {
        id: true,
        contextId: true,
        type: true,
        title: true,
        updatedAt: true,
        createdAt: true,
      },
    })

    // Sample entities and check for drift (if sampleSize > 0)
    let staleSamples = 0
    const staleSampleIds: Record<string, string[]> = {
      project: [],
      task: [],
      page: [],
      epic: [],
      person: [],
      team: [],
      role: [],
      time_off: [],
    }

    if (sampleSize > 0) {
      // Sample each entity type
      for (const [entityType, entityCount] of Object.entries(entityCounts)) {
        if (entityCount === 0) continue

        const sampleCount = Math.min(sampleSize, entityCount)
        let samples: Array<{ id: string; updatedAt: Date }> = []

        try {
          switch (entityType) {
            case 'project':
              samples = await prisma.project.findMany({
                where: { workspaceId },
                select: { id: true, updatedAt: true },
                take: sampleCount,
                orderBy: { updatedAt: 'desc' },
              })
              break
            case 'task':
              samples = await prisma.task.findMany({
                where: { workspaceId },
                select: { id: true, updatedAt: true },
                take: sampleCount,
                orderBy: { updatedAt: 'desc' },
              })
              break
            case 'page':
              samples = await prisma.wikiPage.findMany({
                where: { workspaceId },
                select: { id: true, updatedAt: true },
                take: sampleCount,
                orderBy: { updatedAt: 'desc' },
              })
              break
            case 'epic':
              samples = await prisma.epic.findMany({
                where: { workspaceId },
                select: { id: true, updatedAt: true },
                take: sampleCount,
                orderBy: { updatedAt: 'desc' },
              })
              break
            case 'team':
              samples = await prisma.orgTeam.findMany({
                where: { workspaceId },
                select: { id: true, updatedAt: true },
                take: sampleCount,
                orderBy: { updatedAt: 'desc' },
              })
              break
            case 'role':
              samples = await prisma.orgPosition.findMany({
                where: { workspaceId },
                select: { id: true, updatedAt: true },
                take: sampleCount,
                orderBy: { updatedAt: 'desc' },
              })
              break
            case 'time_off':
              samples = await prisma.timeOff.findMany({
                where: { workspaceId },
                select: { id: true, updatedAt: true },
                take: sampleCount,
                orderBy: { updatedAt: 'desc' },
              })
              break
            case 'person':
              // For persons, sample users with active positions
              const users = await prisma.user.findMany({
                where: {
                  orgPositions: {
                    some: {
                      workspaceId,
                      isActive: true,
                    },
                  },
                },
                select: { id: true },
                distinct: ['id'],
                take: sampleCount,
              })
              // Get updatedAt from their most recent position
              for (const user of users) {
                const position = await prisma.orgPosition.findFirst({
                  where: {
                    workspaceId,
                    userId: user.id,
                    isActive: true,
                  },
                  select: { updatedAt: true },
                  orderBy: { updatedAt: 'desc' },
                })
                if (position) {
                  samples.push({ id: user.id, updatedAt: position.updatedAt })
                }
              }
              break
          }

          // Check each sample for staleness
          for (const sample of samples) {
            const contextItem = await prisma.contextItem.findFirst({
              where: {
                workspaceId,
                contextId: sample.id,
                type: entityType,
              },
              select: { updatedAt: true },
            })

            if (!contextItem || contextItem.updatedAt < sample.updatedAt) {
              staleSamples++
              staleSampleIds[entityType as keyof typeof staleSampleIds].push(sample.id)
            }
          }
        } catch (error) {
          console.error(`Error sampling ${entityType}:`, error)
        }
      }
    }

    return NextResponse.json({
      workspaceId,
      entityCounts,
      contextItemCounts,
      coverage,
      recentContextItems: recentContextItems.map(item => ({
        id: item.id,
        contextId: item.contextId,
        type: item.type,
        title: item.title,
        updatedAt: item.updatedAt.toISOString(),
        createdAt: item.createdAt.toISOString(),
      })),
      ...(sampleSize > 0 && {
        sampling: {
          sampleSize,
          staleSamples,
          staleSampleIds,
        },
      }),
    })
  } catch (error) {
    console.error('Error fetching index health:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch index health',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

