import { NextRequest, NextResponse } from "next/server"
import { getUnifiedAuth } from "@/lib/unified-auth"
import { assertAccess } from "@/lib/auth/assertAccess"
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware"
import { handleApiError } from "@/lib/api-errors"
import { parseCsv } from "@/server/org/import/csv"
import { asFte, asPercent, asShrinkage, ImportError } from "@/server/org/import/validators"
import { getPeopleEmailMap } from "@/server/org/import/lookup"
import { ImportPreviewSchema } from '@/lib/validations/org';

type Preview =
  | { ok: boolean; entity: "manager_links"; count: number; sample: any[]; errors: ImportError[] }
  | { ok: boolean; entity: "roles"; count: number; sample: any[]; errors: ImportError[] }
  | { ok: boolean; entity: "availability"; count: number; sample: any[]; errors: ImportError[] }
  | { ok: boolean; entity: "capacity"; count: number; sample: any[]; errors: ImportError[] }

export async function POST(req: NextRequest) {
  try {
    const { user, workspaceId, isAuthenticated } = await getUnifiedAuth(req)
    if (!isAuthenticated || !workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    await assertAccess({ userId: user.userId, workspaceId, scope: "workspace" })
    setWorkspaceContext(workspaceId)

    const body = ImportPreviewSchema.parse(await req.json())

    const { entity, csv: csvText } = body;
    const { rows } = parseCsv(csvText)

    const emailMap = await getPeopleEmailMap(workspaceId)

    const errors: ImportError[] = []
    const sample: any[] = []

    if (entity === "manager_links") {
      rows.forEach((r, idx) => {
        const row = idx + 2
        const personIdRaw = String(r.personId ?? r.person_id ?? "").trim()
        const managerIdRaw = String(r.managerId ?? r.manager_id ?? "").trim()
        const personEmail = String(r.personEmail ?? r.person_email ?? "").trim().toLowerCase()
        const managerEmail = String(r.managerEmail ?? r.manager_email ?? "").trim().toLowerCase()

        const personId = personIdRaw || (personEmail ? (emailMap.get(personEmail) ?? "") : "")
        const managerId = managerIdRaw || (managerEmail ? (emailMap.get(managerEmail) ?? "") : "")

        if (!personId) errors.push({ row, field: "personId/personEmail", message: "Required (or email must match an existing person)" })
        if (!managerId) errors.push({ row, field: "managerId/managerEmail", message: "Required (or email must match an existing person)" })
        if (sample.length < 8) sample.push({ personId, managerId, personEmail, managerEmail })
      })
      return NextResponse.json({ ok: errors.length === 0, entity, count: rows.length, sample, errors } satisfies Preview)
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
        if (sample.length < 8) sample.push({ personId, role, percent, personEmail })
      })
      return NextResponse.json({ ok: errors.length === 0, entity, count: rows.length, sample, errors } satisfies Preview)
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
        if (sample.length < 8) sample.push({ personId, status, reason, personEmail })
      })
      return NextResponse.json({ ok: errors.length === 0, entity, count: rows.length, sample, errors } satisfies Preview)
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
        if (sample.length < 8) sample.push({ personId, fte, shrinkagePct, personEmail })
      })
      return NextResponse.json({ ok: errors.length === 0, entity, count: rows.length, sample, errors } satisfies Preview)
    }

    return NextResponse.json({ error: "Unknown entity" }, { status: 400 })
  } catch (error) {
    return handleApiError(error, req)
  }
}
