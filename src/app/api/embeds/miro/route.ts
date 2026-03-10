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

    // Extract board ID from Miro URL
    const miroMatch = url.match(/miro\.com\/([^\/]+)/)
    if (!miroMatch) {
      return NextResponse.json({ error: 'Invalid Miro URL' }, { status: 400 })
    }

    const [, boardId] = miroMatch

    const embedData = {
      title: 'Miro Board',
      description: 'Interactive Miro whiteboard',
      metadata: {
        boardId,
        type: 'miro_board'
      }
    }

    return NextResponse.json(embedData)
  } catch (error: unknown) {
    return handleApiError(error)
  }
}
