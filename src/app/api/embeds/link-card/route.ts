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

    const urlObj = new URL(url)
    const hostname = urlObj.hostname

    const embedData = {
      title: hostname,
      description: `Link to ${hostname}`,
      thumbnail: `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`,
      metadata: {
        type: 'link_card',
        url,
        hostname
      }
    }

    return NextResponse.json(embedData)
  } catch (error: unknown) {
    return handleApiError(error)
  }
}
