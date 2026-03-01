import { NextRequest, NextResponse } from "next/server"
import { revalidateTag } from "next/cache"
import { prisma } from "@/lib/db"
import { requireActiveWorkspaceId } from "@/server/org/context"
import { normalizeRole, normalizeSkill } from "@/server/org/taxonomy/normalize"
import { assertWriteAllowed } from "@/server/org/writes/guard"
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { logOrgAudit } from '@/lib/audit/org-audit'
import { computeChanges } from '@/lib/audit/diff'

type Body = {
  id: string
  name?: string
  title?: string | null
  availability?: { status: "AVAILABLE" | "LIMITED" | "UNAVAILABLE"; reason?: string | null }
  skills?: string[] // overwrite set (v0)
  roles?: Array<{ role: string; percent: number }> // overwrite set (v0)
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getUnifiedAuth(req)
    if (!auth.isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    await assertAccess({ userId: auth.user.userId, workspaceId: auth.workspaceId, scope: 'workspace', requireRole: ['ADMIN'] })
    setWorkspaceContext(auth.workspaceId)

    const workspaceId = await requireActiveWorkspaceId()
    assertWriteAllowed("people.updateProfile")
    const body = (await req.json()) as Body
    const personId = String(body.id ?? "")
    if (!personId) return NextResponse.json({ error: "id required" }, { status: 400 })

    // Fetch before state for audit diff
    const position = await prisma.orgPosition.findUnique({
      where: { id: personId },
      select: { 
        userId: true, 
        title: true,
        user: { select: { name: true } }
      },
    })
    
    if (!position) {
      return NextResponse.json({ error: "Person not found" }, { status: 404 })
    }

    const beforeAvailability = await prisma.personAvailabilityHealth.findUnique({
      where: { workspaceId_personId: { workspaceId, personId } } as any,
      select: { status: true, reason: true }
    }).catch(() => null)

    const before = {
      name: position.user?.name ?? null,
      title: position.title ?? null,
      availabilityStatus: beforeAvailability?.status ?? null,
    }

    // Update OrgPosition (title) and User (name)
    const updates = []
    
    if (body.title !== undefined) {
      updates.push(
        prisma.orgPosition.update({
          where: { id: personId },
          data: { title: body.title ? String(body.title) : null },
        })
      )
    }
    
    if (body.name && position.userId) {
      updates.push(
        prisma.user.update({
          where: { id: position.userId },
          data: { name: String(body.name) },
        })
      )
    }
    
    if (updates.length > 0) {
      await Promise.all(updates)
    }

    if (body.availability) {
      const status = String(body.availability.status ?? "AVAILABLE").toUpperCase()
      const reason = body.availability.reason ? String(body.availability.reason) : null
      await prisma.personAvailabilityHealth.upsert({
        where: { workspaceId_personId: { workspaceId, personId } } as any,
        update: { status, reason } as any,
        create: { workspaceId, personId, status, reason } as any,
      } as any)
    }

    // Skills overwrite (v0)
    if (Array.isArray(body.skills)) {
      const cleaned = Array.from(new Set(body.skills.map((s) => normalizeSkill(String(s))).filter(Boolean))).slice(0, 50)
      
      // Upsert skills into taxonomy
      if (cleaned.length) {
        await prisma.orgSkillTaxonomy.createMany({
          data: cleaned.map((label) => ({ orgId: workspaceId, label })) as any,
          skipDuplicates: true,
        } as any)
      }
      
      await prisma.personSkill.deleteMany({ where: { orgId: workspaceId, personId } as any })
      if (cleaned.length) {
        await prisma.personSkill.createMany({
          data: cleaned.map((skill) => ({ orgId: workspaceId, personId, skill })) as any,
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
          data: cleaned.map((r) => ({ orgId: workspaceId, label: r.role })) as any,
          skipDuplicates: true,
        } as any)
      }

      await prisma.personRoleAssignment.deleteMany({ where: { orgId: workspaceId, personId } as any })
      if (cleaned.length) {
        await prisma.personRoleAssignment.createMany({
          data: cleaned.map((r) => ({ orgId: workspaceId, personId, role: r.role, percent: Math.round(r.percent) })) as any,
          skipDuplicates: true,
        } as any)
      }
    }

    // Invalidate cache after updates
    revalidateTag("org:people", "default")
    revalidateTag("org:setup", "default")
    revalidateTag("org:contracts", "default")

    // Log audit entry with diff tracking
    const after = {
      name: body.name ?? before.name,
      title: body.title !== undefined ? body.title : before.title,
      availabilityStatus: body.availability?.status ?? before.availabilityStatus,
    }
    
    const changes = computeChanges(before, after, ['name', 'title', 'availabilityStatus'])
    const metadata: Record<string, unknown> = {}
    
    if (Array.isArray(body.skills)) {
      metadata.skillsUpdated = true
      metadata.skillCount = body.skills.length
    }
    if (Array.isArray(body.roles)) {
      metadata.rolesUpdated = true
      metadata.roleCount = body.roles.length
    }

    logOrgAudit({
      workspaceId,
      entityType: "PERSON",
      entityId: personId,
      entityName: after.name ?? undefined,
      action: "UPDATED",
      actorId: auth.user.userId,
      changes: changes ?? undefined,
      metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
    }).catch((e) => console.error("[POST /api/org/people/update-profile] Audit log error (non-fatal):", e))

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
}

