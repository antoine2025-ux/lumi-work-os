import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { handleApiError } from '@/lib/api-errors'

const BUILTIN_IDS = [
  'blank',
  'meeting-notes',
  'sprint-retrospective',
  'one-on-one',
  'rfc-technical-design',
  'bug-report',
  'runbook',
  'prd',
  'feature-brief',
  'release-notes',
  'sop',
  'onboarding-checklist',
  'blank-with-structure',
]

// DELETE /api/wiki/templates/[id] - Delete a user-created template
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getUnifiedAuth(request)
    const resolvedParams = await context.params
    const id = resolvedParams.id

    if (!id) {
      return NextResponse.json({ error: 'Template ID is required' }, { status: 400 })
    }

    if (BUILTIN_IDS.includes(id)) {
      return NextResponse.json(
        { error: 'Cannot delete built-in template' },
        { status: 400 }
      )
    }

    setWorkspaceContext(auth.workspaceId)

    const template = await prisma.wikiTemplate.findUnique({
      where: { id },
    })

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    if (template.workspaceId !== auth.workspaceId) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    // Allow if creator, else require ADMIN
    if (template.createdById !== auth.user.userId) {
      await assertAccess({
        userId: auth.user.userId,
        workspaceId: auth.workspaceId,
        scope: 'workspace',
        requireRole: ['ADMIN', 'OWNER'],
      })
    } else {
      await assertAccess({
        userId: auth.user.userId,
        workspaceId: auth.workspaceId,
        scope: 'workspace',
        requireRole: ['MEMBER'],
      })
    }

    await prisma.wikiTemplate.delete({
      where: { id },
    })

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    return handleApiError(error, request)
  }
}
