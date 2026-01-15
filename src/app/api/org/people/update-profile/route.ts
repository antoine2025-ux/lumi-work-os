import { NextResponse } from "next/server"
import { revalidateTag } from "next/cache"
import { prisma } from "@/lib/db"
import { requireActiveOrgId } from "@/server/org/context"
import { normalizeRole, normalizeSkill } from "@/server/org/taxonomy/normalize"
import { assertWriteAllowed } from "@/server/org/writes/guard"

type Body = {
  id: string
  name?: string
  title?: string | null
  availability?: { status: "AVAILABLE" | "LIMITED" | "UNAVAILABLE"; reason?: string | null }
  skills?: string[] // overwrite set (v0)
  roles?: Array<{ role: string; percent: number }> // overwrite set (v0)
}

export async function POST(req: Request) {
  try {
    const orgId = await requireActiveOrgId()
    assertWriteAllowed("people.updateProfile")
    const body = (await req.json()) as Body
    const personId = String(body.id ?? "")
    if (!personId) return NextResponse.json({ error: "id required" }, { status: 400 })

    await (prisma as any).person.update({
      where: { id: personId },
      data: {
        ...(body.name ? { name: String(body.name) } : {}),
        ...(body.title !== undefined ? { title: body.title ? String(body.title) : null } : {}),
      },
    })

    if (body.availability) {
      const status = String(body.availability.status ?? "AVAILABLE").toUpperCase()
      const reason = body.availability.reason ? String(body.availability.reason) : null
      await (prisma as any).personAvailabilityHealth.upsert({
        where: { orgId_personId: { orgId, personId } },
        update: { status, reason },
        create: { orgId, personId, status, reason },
      })
    }

    // Skills overwrite (v0)
    if (Array.isArray(body.skills)) {
      const cleaned = Array.from(new Set(body.skills.map((s) => normalizeSkill(String(s))).filter(Boolean))).slice(0, 50)
      
      // Upsert skills into taxonomy
      if (cleaned.length) {
        await (prisma as any).orgSkillTaxonomy.createMany({
          data: cleaned.map((label) => ({ orgId, label })),
          skipDuplicates: true,
        })
      }
      
      await (prisma as any).personSkill.deleteMany({ where: { orgId, personId } })
      if (cleaned.length) {
        await (prisma as any).personSkill.createMany({
          data: cleaned.map((skill) => ({ orgId, personId, skill })),
          skipDuplicates: true,
        })
      }
    }

    // Roles overwrite (v0)
    if (Array.isArray(body.roles)) {
      const cleaned = body.roles
        .map((r) => ({ role: normalizeRole(String(r.role ?? "").trim()), percent: Number(r.percent ?? 100) }))
        .filter((r) => r.role && Number.isFinite(r.percent) && r.percent > 0 && r.percent <= 200)
        .slice(0, 20)

      // Upsert roles into taxonomy
      if (cleaned.length) {
        await (prisma as any).orgRoleTaxonomy.createMany({
          data: cleaned.map((r) => ({ orgId, label: r.role })),
          skipDuplicates: true,
        })
      }

      await (prisma as any).personRoleAssignment.deleteMany({ where: { orgId, personId } })
      if (cleaned.length) {
        await (prisma as any).personRoleAssignment.createMany({
          data: cleaned.map((r) => ({ orgId, personId, role: r.role, percent: Math.round(r.percent) })),
          skipDuplicates: true,
        })
      }
    }

    // Invalidate cache after updates
    revalidateTag("org:people")
    revalidateTag("org:setup")
    revalidateTag("org:contracts")

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
}

