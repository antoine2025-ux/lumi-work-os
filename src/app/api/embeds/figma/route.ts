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

    // Extract file ID from Figma URL
    const fileIdMatch = url.match(/figma\.com\/file\/([a-zA-Z0-9]+)/)
    if (!fileIdMatch) {
      return NextResponse.json({ error: 'Invalid Figma URL' }, { status: 400 })
    }

    const fileId = fileIdMatch[1]

    const embedData = {
      title: 'Figma Design',
      description: 'Interactive Figma design',
      thumbnail: `https://www.figma.com/api/figma/file/${fileId}/images`,
      metadata: {
        fileId,
        type: 'figma_file'
      }
    }

    return NextResponse.json(embedData)
  } catch (error: unknown) {
    return handleApiError(error)
  }
}
