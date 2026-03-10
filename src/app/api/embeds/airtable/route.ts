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

    // Extract base ID and table ID from Airtable URL
    const airtableMatch = url.match(/airtable\.com\/([^\/]+)\/([^\/]+)/)
    if (!airtableMatch) {
      return NextResponse.json({ error: 'Invalid Airtable URL' }, { status: 400 })
    }

    const [, baseId, tableId] = airtableMatch

    const embedData = {
      title: 'Airtable Base',
      description: 'Interactive Airtable database',
      metadata: {
        baseId,
        tableId,
        type: 'airtable_base'
      }
    }

    return NextResponse.json(embedData)
  } catch (error: unknown) {
    return handleApiError(error)
  }
}
