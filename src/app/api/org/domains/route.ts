import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getUnifiedAuth } from "@/lib/unified-auth"
import { assertAccess } from "@/lib/auth/assertAccess"
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware"
import { handleApiError } from "@/lib/api-errors"
import { CreateDecisionDomainSchema } from "@/lib/validations/org"

export async function GET(req: NextRequest) {
  try {
    const { user, workspaceId, isAuthenticated } = await getUnifiedAuth(req)
    if (!isAuthenticated || !workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    await assertAccess({ userId: user.userId, workspaceId, scope: "workspace" })
    setWorkspaceContext(workspaceId)

    const domains = await prisma.domain.findMany({
      where: { workspaceId },
      select: { id: true, name: true, description: true, createdAt: true } as any,
      take: 5000,
      orderBy: { createdAt: "desc" } as any,
    })
    return NextResponse.json({ domains })
  } catch (error) {
    return handleApiError(error, req)
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, workspaceId, isAuthenticated } = await getUnifiedAuth(req)
    if (!isAuthenticated || !workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    await assertAccess({ userId: user.userId, workspaceId, scope: "workspace" })
    setWorkspaceContext(workspaceId)

    const body = CreateDecisionDomainSchema.parse(await req.json())
    const name = body.name

    const created = await prisma.domain.create({
      data: { workspaceId, name, description: body.description ?? null },
      select: { id: true } as any,
    })
    return NextResponse.json({ ok: true, id: created.id })
  } catch (error) {
    return handleApiError(error, req)
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { user, workspaceId, isAuthenticated } = await getUnifiedAuth(req)
    if (!isAuthenticated || !workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    await assertAccess({ userId: user.userId, workspaceId, scope: "workspace" })
    setWorkspaceContext(workspaceId)

    const body = (await req.json()) as { id?: string; name?: string; description?: string }
    const id = String(body?.id ?? "")
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })

    const name = body?.name ? String(body.name).trim() : undefined

    await prisma.domain.update({
      where: { id } as any,
      data: {
        ...(name ? { name } : {}),
        ...(body?.description !== undefined ? { description: body.description } : {}),
      } as any,
    })

    // NOTE: Ownership completeness will update on refresh; no aggressive signal resolving here.
    return NextResponse.json({ ok: true })
  } catch (error) {
    return handleApiError(error, req)
  }
}
