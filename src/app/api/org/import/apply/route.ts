import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireActiveOrgId } from "@/server/org/context"
import { parseCsv } from "@/server/org/import/csv"
import { asFte, asPercent, asShrinkage, ImportError } from "@/server/org/import/validators"
import { getPeopleEmailMap } from "@/server/org/import/lookup"
import { runInBatches } from "@/server/org/import/batch"

export async function POST(req: NextRequest) {
  try {
    const orgId = await requireActiveOrgId(req)
    const body = (await req.json()) as { entity: string; csv: string }

    const entity = String(body?.entity ?? "")
    const csvText = String(body?.csv ?? "")
    const { rows } = parseCsv(csvText)

    const emailMap = await getPeopleEmailMap(orgId)

    const errors: ImportError[] = []

    // Validate first (same rules as preview) so apply is safe
    const prepared: any[] = []

    if (entity === "manager_links") {
      rows.forEach((r, idx) => {
        const row = idx + 2
        const personIdRaw = String(r.personId ?? r.person_id ?? "").trim()
        const managerIdRaw = String(r.managerId ?? r.manager_id ?? "").trim()
        const personEmail = String(r.personEmail ?? r.person_email ?? "").trim().toLowerCase()
        const managerEmail = String(r.managerEmail ?? r.manager_email ?? "").trim().toLowerCase()

        const personId = personIdRaw || (personEmail ? emailMap.get(personEmail) ?? "" : "")
        const managerId = managerIdRaw || (managerEmail ? emailMap.get(managerEmail) ?? "" : "")

        if (!personId) errors.push({ row, field: "personId/personEmail", message: "Required (or email must match an existing person)" })
        if (!managerId) errors.push({ row, field: "managerId/managerEmail", message: "Required (or email must match an existing person)" })
        prepared.push({ orgId, personId, managerId })
      })
      if (errors.length) return NextResponse.json({ ok: false, errors }, { status: 400 })

      // De-dupe by personId+managerId (keep last)
      const uniq = new Map<string, any>()
      for (const x of prepared) uniq.set(`${x.personId}::${x.managerId}`, x)

      await prisma.personManagerLink.createMany({
        data: Array.from(uniq.values()),
        skipDuplicates: true as any,
      })

      return NextResponse.json({ ok: true, applied: uniq.size })
    }

    if (entity === "roles") {
      rows.forEach((r, idx) => {
        const row = idx + 2
        const personIdRaw = String(r.personId ?? r.person_id ?? "").trim()
        const personEmail = String(r.personEmail ?? r.person_email ?? "").trim().toLowerCase()
        const personId = personIdRaw || (personEmail ? emailMap.get(personEmail) ?? "" : "")
        const role = String(r.role ?? "").trim()
        const percent = asPercent(String(r.percent ?? ""), row, "percent", errors)
        if (!personId) errors.push({ row, field: "personId/personEmail", message: "Required (or email must match an existing person)" })
        if (!role) errors.push({ row, field: "role", message: "Required" })
        prepared.push({ orgId, personId, role, percent })
      })
      if (errors.length) return NextResponse.json({ ok: false, errors }, { status: 400 })

      // De-dupe by personId+role (keep last)
      const uniq = new Map<string, any>()
      for (const x of prepared) uniq.set(`${x.personId}::${x.role}`, x)

      // Upsert using unique constraint (batched for scale)
      const ops = Array.from(uniq.values()).map((x) =>
        prisma.personRoleAssignment.upsert({
          where: { orgId_personId_role: { orgId, personId: x.personId, role: x.role } } as any,
          update: { percent: x.percent } as any,
          create: x as any,
        })
      )

      await runInBatches(ops, 200, async (batch) => {
        await prisma.$transaction(batch as any)
      })

      return NextResponse.json({ ok: true, applied: uniq.size })
    }

    if (entity === "availability") {
      rows.forEach((r, idx) => {
        const row = idx + 2
        const personIdRaw = String(r.personId ?? r.person_id ?? "").trim()
        const personEmail = String(r.personEmail ?? r.person_email ?? "").trim().toLowerCase()
        const personId = personIdRaw || (personEmail ? emailMap.get(personEmail) ?? "" : "")
        const status = String(r.status ?? "").trim().toUpperCase()
        const reason = String(r.reason ?? "").trim()
        const valid = status === "AVAILABLE" || status === "LIMITED" || status === "UNAVAILABLE"
        if (!personId) errors.push({ row, field: "personId/personEmail", message: "Required (or email must match an existing person)" })
        if (!valid) errors.push({ row, field: "status", message: "Must be AVAILABLE/LIMITED/UNAVAILABLE" })
        prepared.push({ orgId, personId, status, reason })
      })
      if (errors.length) return NextResponse.json({ ok: false, errors }, { status: 400 })

      // De-dupe by personId (keep last)
      const uniqPeople = new Map<string, any>()
      for (const x of prepared) uniqPeople.set(x.personId, x)

      // Upsert using unique constraint (batched for scale)
      const ops = Array.from(uniqPeople.values()).map((x) =>
        prisma.personAvailability.upsert({
          where: { orgId_personId: { orgId, personId: x.personId } } as any,
          update: { status: x.status as any, reason: x.reason || null } as any,
          create: { orgId, personId: x.personId, status: x.status as any, reason: x.reason || null } as any,
        })
      )

      await runInBatches(ops, 200, async (batch) => {
        await prisma.$transaction(batch as any)
      })

      return NextResponse.json({ ok: true, applied: uniqPeople.size })
    }

    if (entity === "capacity") {
      rows.forEach((r, idx) => {
        const row = idx + 2
        const personIdRaw = String(r.personId ?? r.person_id ?? "").trim()
        const personEmail = String(r.personEmail ?? r.person_email ?? "").trim().toLowerCase()
        const personId = personIdRaw || (personEmail ? emailMap.get(personEmail) ?? "" : "")
        const fte = asFte(String(r.fte ?? ""), row, "fte", errors)
        const shrinkagePct = asShrinkage(String(r.shrinkagePct ?? r.shrinkage_pct ?? ""), row, "shrinkagePct", errors)
        if (!personId) errors.push({ row, field: "personId/personEmail", message: "Required (or email must match an existing person)" })
        prepared.push({ orgId, personId, fte, shrinkagePct })
      })
      if (errors.length) return NextResponse.json({ ok: false, errors }, { status: 400 })

      // De-dupe by personId (keep last)
      const uniqPeople = new Map<string, any>()
      for (const x of prepared) uniqPeople.set(x.personId, x)

      // Upsert using unique constraint (batched for scale)
      const ops = Array.from(uniqPeople.values()).map((x) =>
        prisma.personCapacity.upsert({
          where: { orgId_personId: { orgId, personId: x.personId } } as any,
          update: { fte: x.fte, shrinkagePct: x.shrinkagePct } as any,
          create: x as any,
        })
      )

      await runInBatches(ops, 200, async (batch) => {
        await prisma.$transaction(batch as any)
      })

      return NextResponse.json({ ok: true, applied: uniqPeople.size })
    }

    return NextResponse.json({ error: "Unknown entity" }, { status: 400 })
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
}

