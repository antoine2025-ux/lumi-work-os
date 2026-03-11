import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { handleApiError } from '@/lib/api-errors'
import { WikiTemplateCreateSchema } from '@/lib/validations/wiki'
import { WIKI_TEMPLATES } from '@/lib/wiki/templates'
import { isValidProseMirrorJSON } from '@/lib/wiki/text-extract'

// GET /api/wiki/templates - List all templates (built-in + user-created) for current workspace
export async function GET(request: NextRequest) {
  try {
    const auth = await getUnifiedAuth(request)

    await assertAccess({
      userId: auth.user.userId,
      workspaceId: auth.workspaceId,
      scope: 'workspace',
      requireRole: ['VIEWER'],
    })

    setWorkspaceContext(auth.workspaceId)

    const userTemplates = await prisma.wikiTemplate.findMany({
      where: { workspaceId: auth.workspaceId },
      include: {
        createdBy: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    const builtIn = WIKI_TEMPLATES.map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      icon: t.icon,
      category: t.category,
      content: t.content,
      source: 'builtin' as const,
    }))

    const user = userTemplates.map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description ?? '',
      icon: t.icon ?? 'FileText',
      category: t.category,
      content: t.content as object,
      source: 'user' as const,
      createdByName: t.createdBy?.name ?? null,
    }))

    const templates = [...builtIn, ...user]

    return NextResponse.json({ templates })
  } catch (error: unknown) {
    return handleApiError(error, request)
  }
}

// POST /api/wiki/templates - Save a new template
export async function POST(request: NextRequest) {
  try {
    const auth = await getUnifiedAuth(request)

    await assertAccess({
      userId: auth.user.userId,
      workspaceId: auth.workspaceId,
      scope: 'workspace',
      requireRole: ['MEMBER'],
    })

    setWorkspaceContext(auth.workspaceId)

    const body = WikiTemplateCreateSchema.parse(await request.json())
    const { name, description, icon, category, content } = body

    if (!isValidProseMirrorJSON(content)) {
      return NextResponse.json(
        { error: 'Invalid content: must be valid ProseMirror JSON' },
        { status: 400 }
      )
    }

    const template = await prisma.wikiTemplate.create({
      data: {
        workspaceId: auth.workspaceId,
        createdById: auth.user.userId,
        name,
        description: description ?? null,
        icon: icon ?? null,
        category: category ?? 'custom',
        content: content as object,
      },
      include: {
        createdBy: { select: { name: true } },
      },
    })

    return NextResponse.json(template, { status: 201 })
  } catch (error: unknown) {
    return handleApiError(error, request)
  }
}
