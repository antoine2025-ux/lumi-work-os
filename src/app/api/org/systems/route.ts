import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getUnifiedAuth } from "@/lib/unified-auth"
import { assertAccess } from "@/lib/auth/assertAccess"
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware"
import { handleApiError } from "@/lib/api-errors"
import { CreateSystemSchema } from "@/lib/validations/org"

export async function GET(req: NextRequest) {
  try {
    const auth = await getUnifiedAuth(req)
    if (!auth.isAuthenticated || !auth.workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    await assertAccess({
      userId: auth.user.userId,
      workspaceId: auth.workspaceId,
      scope: "workspace",
      requireRole: ["ADMIN", "OWNER"],
    })
    setWorkspaceContext(auth.workspaceId)

    const workspaceId = auth.workspaceId
    const systems = await prisma.systemEntity.findMany({
      where: { workspaceId },
      select: { id: true, name: true, description: true, createdAt: true } as any,
      take: 5000,
      orderBy: { createdAt: "desc" } as any,
    })
    return NextResponse.json({ systems })
  } catch (error: unknown) {
    return handleApiError(error, req)
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getUnifiedAuth(req)
    if (!auth.isAuthenticated || !auth.workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    await assertAccess({
      userId: auth.user.userId,
      workspaceId: auth.workspaceId,
      scope: "workspace",
      requireRole: ["ADMIN", "OWNER"],
    })
    setWorkspaceContext(auth.workspaceId)

    const workspaceId = auth.workspaceId
    const body = CreateSystemSchema.parse(await req.json())
    const name = body.name

    const created = await prisma.systemEntity.create({
      data: { workspaceId, name, description: body.description ?? null },
      select: { id: true } as any,
    })
    return NextResponse.json({ ok: true, id: created.id })
  } catch (error: unknown) {
    return handleApiError(error, req)
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await getUnifiedAuth(req)
    if (!auth.isAuthenticated || !auth.workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    await assertAccess({
      userId: auth.user.userId,
      workspaceId: auth.workspaceId,
      scope: "workspace",
      requireRole: ["ADMIN", "OWNER"],
    })
    setWorkspaceContext(auth.workspaceId)
    const body = (await req.json()) as { id?: string; name?: string; description?: string }
    const id = String(body?.id ?? "")
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })

    const name = body?.name ? String(body.name).trim() : undefined

    await prisma.systemEntity.update({
      where: { id } as any,
      data: {
        ...(name ? { name } : {}),
        ...(body?.description !== undefined ? { description: body.description } : {}),
      } as any,
    })

    return NextResponse.json({ ok: true })
  } catch (error: unknown) {
    return handleApiError(error, req)
  }
}

