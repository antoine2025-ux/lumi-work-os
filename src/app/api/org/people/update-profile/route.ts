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

    await prisma.person.update({
      where: { id: personId } as any,
      data: {
        ...(body.name ? { name: String(body.name) } : {}),
        ...(body.title !== undefined ? { title: body.title ? String(body.title) : null } : {}),
      } as any,
    } as any)

    if (body.availability) {
      const status = String(body.availability.status ?? "AVAILABLE").toUpperCase()
      const reason = body.availability.reason ? String(body.availability.reason) : null
      await prisma.personAvailabilityHealth.upsert({
        where: { orgId_personId: { orgId, personId } } as any,
        update: { status, reason } as any,
        create: { orgId, personId, status, reason } as any,
      } as any)
    }

    // Skills overwrite (v0)
    if (Array.isArray(body.skills)) {
      const cleaned = Array.from(new Set(body.skills.map((s) => normalizeSkill(String(s))).filter(Boolean))).slice(0, 50)
      
      // Upsert skills into taxonomy
      if (cleaned.length) {
        await prisma.orgSkillTaxonomy.createMany({
          data: cleaned.map((label) => ({ orgId, label })) as any,
          skipDuplicates: true,
        } as any)
      }
      
      await prisma.personSkill.deleteMany({ where: { orgId, personId } as any })
      if (cleaned.length) {
        await prisma.personSkill.createMany({
          data: cleaned.map((skill) => ({ orgId, personId, skill })) as any,
          skipDuplicates: true,
        } as any)
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
        await prisma.orgRoleTaxonomy.createMany({
          data: cleaned.map((r) => ({ orgId, label: r.role })) as any,
          skipDuplicates: true,
        } as any)
      }

      await prisma.personRoleAssignment.deleteMany({ where: { orgId, personId } as any })
      if (cleaned.length) {
        await prisma.personRoleAssignment.createMany({
          data: cleaned.map((r) => ({ orgId, personId, role: r.role, percent: Math.round(r.percent) })) as any,
          skipDuplicates: true,
        } as any)
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

