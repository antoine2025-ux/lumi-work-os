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

    // Extract project/task ID from Asana URL
    const asanaMatch = url.match(/app\.asana\.com\/([^\/]+)/)
    if (!asanaMatch) {
      return NextResponse.json({ error: 'Invalid Asana URL' }, { status: 400 })
    }

    const [, path] = asanaMatch

    const embedData = {
      title: 'Asana Project',
      description: 'Asana project or task',
      metadata: {
        path,
        type: 'asana_project'
      }
    }

    return NextResponse.json(embedData)
  } catch (error: unknown) {
    return handleApiError(error)
  }
}
