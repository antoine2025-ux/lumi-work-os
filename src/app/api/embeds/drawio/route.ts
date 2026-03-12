import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { handleApiError } from '@/lib/api-errors'
import { EmbedUrlSchema } from '@/lib/validations/embeds'

export async function POST(request: NextRequest) {
  try {
    const auth = await getUnifiedAuth(request)
    await assertAccess({ userId: auth.user.userId, workspaceId: auth.workspaceId, scope: 'workspace', requireRole: ['MEMBER'] })

    const body = EmbedUrlSchema.parse(await request.json())
    const { url } = body

    // Extract diagram ID from Draw.io URL
    const drawioMatch = url.match(/diagrams\.net\/([^\/]+)/)
    if (!drawioMatch) {
      return NextResponse.json({ error: 'Invalid Draw.io URL' }, { status: 400 })
    }

    const [, diagramId] = drawioMatch

    const embedData = {
      title: 'Draw.io Diagram',
      description: 'Interactive diagram or flowchart',
      metadata: {
        diagramId,
        type: 'drawio_diagram'
      }
    }

    return NextResponse.json(embedData)
  } catch (error: unknown) {
    return handleApiError(error)
  }
}
