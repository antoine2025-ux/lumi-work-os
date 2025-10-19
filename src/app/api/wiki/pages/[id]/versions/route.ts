import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/wiki/pages/[id]/versions - Get version history for a wiki page
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    
    const versions = await prisma.wikiVersion.findMany({
      where: {
        pageId: resolvedParams.id
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        version: 'desc'
      }
    })

    return NextResponse.json(versions)
  } catch (error) {
    console.error('Error fetching version history:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
