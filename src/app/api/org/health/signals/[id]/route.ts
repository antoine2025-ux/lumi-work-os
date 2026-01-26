import { NextResponse } from "next/server"
import { NextRequest } from "next/server"
import { prisma } from "@/lib/db"
import { requireActiveOrgId } from "@/server/org/context"

type Action = "resolve" | "dismiss"

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const orgId = await requireActiveOrgId(req)
    const { id } = await ctx.params
    const body = (await req.json().catch(() => ({}))) as { action?: Action }

    const action = body.action
    if (action !== "resolve" && action !== "dismiss") {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }

    // Ensure org scoping: only update signals belonging to active org
    const existing = await prisma.orgHealthSignal.findFirst({
      where: { id, orgId },
      select: { id: true },
    })

    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    const now = new Date()

    await prisma.orgHealthSignal.update({
      where: { id },
      data:
        action === "resolve"
          ? { resolvedAt: now }
          : { dismissedAt: now },
    })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
}

