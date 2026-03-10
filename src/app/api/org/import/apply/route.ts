import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getUnifiedAuth } from "@/lib/unified-auth"
import { assertAccess } from "@/lib/auth/assertAccess"
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware"
import { handleApiError } from "@/lib/api-errors"
import { parseCsv } from "@/server/org/import/csv"
import { asFte, asPercent, asShrinkage, ImportError } from "@/server/org/import/validators"
import { getPeopleEmailMap } from "@/server/org/import/lookup"
import { runInBatches } from "@/server/org/import/batch"
import { logOrgAuditBatch } from "@/lib/audit/org-audit"
import { ImportApplySchema } from '@/lib/validations/org';

export async function POST(req: NextRequest) {
  try {
    const { user, workspaceId, isAuthenticated } = await getUnifiedAuth(req)
    if (!isAuthenticated || !workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    await assertAccess({ userId: user.userId, workspaceId, scope: "workspace", requireRole: ["OWNER", "ADMIN"] })
    setWorkspaceContext(workspaceId)

    const body = ImportApplySchema.parse(await req.json())

    const { entity, csv: csvText } = body;
    const { rows } = parseCsv(csvText)

    const emailMap = await getPeopleEmailMap(workspaceId)

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
        prepared.push({ orgId: workspaceId, personId, managerId }) // orgId is a Prisma field
      })
      if (errors.length) return NextResponse.json({ ok: false, errors }, { status: 400 })

      // De-dupe by personId+managerId (keep last)
      const uniq = new Map<string, any>()
      for (const x of prepared) uniq.set(`${x.personId}::${x.managerId}`, x)

      await prisma.personManagerLink.createMany({
        data: Array.from(uniq.values()),
        skipDuplicates: true as any,
      })

      // Log audit entries (fire-and-forget batch)
      const auditEntries = Array.from(uniq.values()).map((link) => ({
        workspaceId,
        entityType: "MANAGER_LINK" as const,
        entityId: `${link.personId}-${link.managerId}`,
        entityName: `${link.personId} → ${link.managerId}`,
        action: "CREATED" as const,
        actorId: user.userId,
      }))
      logOrgAuditBatch(auditEntries).catch((e) =>
        console.error("[POST /api/org/import/apply] manager_links audit error:", e)
      )

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
        prepared.push({ orgId: workspaceId, personId, role, percent }) // orgId is a Prisma field
      })
      if (errors.length) return NextResponse.json({ ok: false, errors }, { status: 400 })

      // De-dupe by personId+role (keep last)
      const uniq = new Map<string, any>()
      for (const x of prepared) uniq.set(`${x.personId}::${x.role}`, x)

      // Upsert using unique constraint (batched for scale)
      const ops = Array.from(uniq.values()).map((x) =>
        prisma.personRoleAssignment.upsert({
          where: { orgId_personId_role: { orgId: workspaceId, personId: x.personId, role: x.role } } as any,
          update: { percent: x.percent } as any,
          create: x as any,
        })
      )

      await runInBatches(ops, 200, async (batch) => {
        await prisma.$transaction(batch as any)
      })

      // Log audit entries (fire-and-forget batch) - use UPDATED since upsert
      const auditEntries = Array.from(uniq.values()).map((x) => ({
        workspaceId,
        entityType: "PERSON" as const,
        entityId: x.personId,
        entityName: x.personId,
        action: "UPDATED" as const,
        actorId: user.userId,
        metadata: { importEntity: "roles" },
      }))
      logOrgAuditBatch(auditEntries).catch((e) =>
        console.error("[POST /api/org/import/apply] roles audit error:", e)
      )

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
        prepared.push({ orgId: workspaceId, personId, status, reason })
      })
      if (errors.length) return NextResponse.json({ ok: false, errors }, { status: 400 })

      // De-dupe by personId (keep last)
      const uniqPeople = new Map<string, any>()
      for (const x of prepared) uniqPeople.set(x.personId, x)

      // Upsert using unique constraint (batched for scale)
      const ops = Array.from(uniqPeople.values()).map((x) =>
        prisma.personAvailability.upsert({
          where: { orgId_personId: { orgId: workspaceId, personId: x.personId } } as any,
          update: { status: x.status as any, reason: x.reason || null } as any,
          create: { orgId: workspaceId, personId: x.personId, status: x.status as any, reason: x.reason || null } as any,
        })
      )

      await runInBatches(ops, 200, async (batch) => {
        await prisma.$transaction(batch as any)
      })

      // Log audit entries (fire-and-forget batch) - use UPDATED since upsert
      const auditEntries = Array.from(uniqPeople.values()).map((x) => ({
        workspaceId,
        entityType: "PERSON" as const,
        entityId: x.personId,
        entityName: x.personId,
        action: "UPDATED" as const,
        actorId: user.userId,
        metadata: { importEntity: "availability" },
      }))
      logOrgAuditBatch(auditEntries).catch((e) =>
        console.error("[POST /api/org/import/apply] availability audit error:", e)
      )

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
        prepared.push({ orgId: workspaceId, personId, fte, shrinkagePct })
      })
      if (errors.length) return NextResponse.json({ ok: false, errors }, { status: 400 })

      // De-dupe by personId (keep last)
      const uniqPeople = new Map<string, any>()
      for (const x of prepared) uniqPeople.set(x.personId, x)

      // Upsert using unique constraint (batched for scale)
      const ops = Array.from(uniqPeople.values()).map((x) =>
        prisma.personCapacity.upsert({
          where: { orgId_personId: { orgId: workspaceId, personId: x.personId } } as any,
          update: { fte: x.fte, shrinkagePct: x.shrinkagePct } as any,
          create: x as any,
        })
      )

      await runInBatches(ops, 200, async (batch) => {
        await prisma.$transaction(batch as any)
      })

      // Log audit entries (fire-and-forget batch) - use UPDATED since upsert
      const auditEntries = Array.from(uniqPeople.values()).map((x) => ({
        workspaceId,
        entityType: "PERSON" as const,
        entityId: x.personId,
        entityName: x.personId,
        action: "UPDATED" as const,
        actorId: user.userId,
        metadata: { importEntity: "capacity" },
      }))
      logOrgAuditBatch(auditEntries).catch((e) =>
        console.error("[POST /api/org/import/apply] capacity audit error:", e)
      )

      return NextResponse.json({ ok: true, applied: uniqPeople.size })
    }

    return NextResponse.json({ error: "Unknown entity" }, { status: 400 })
  } catch (error) {
    return handleApiError(error, req)
  }
}
