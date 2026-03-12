import { NextRequest, NextResponse } from "next/server"
import { revalidateTag } from "next/cache"
import { handleApiError } from "@/lib/api-errors"
import { prisma } from "@/lib/db"
import { requireActiveWorkspaceId } from "@/server/org/context"
import { normalizeRole, normalizeSkill } from "@/server/org/taxonomy/normalize"
import { assertWriteAllowed } from "@/server/org/writes/guard"
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { logOrgAudit } from '@/lib/audit/org-audit'
import { computeChanges } from '@/lib/audit/diff'
import { UpdatePersonProfileSchema } from '@/lib/validations/org'
import type { AvailabilityStatus } from '@prisma/client'

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
    const body = UpdatePersonProfileSchema.parse(await req.json())
    const personId = body.id

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
      where: { workspaceId_personId: { workspaceId, personId } },
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
      const status = String(body.availability.status ?? "AVAILABLE").toUpperCase() as AvailabilityStatus
      const reason = body.availability.reason ? String(body.availability.reason) : null
      await prisma.personAvailabilityHealth.upsert({
        where: { workspaceId_personId: { workspaceId, personId } },
        update: { status, reason },
        create: { workspaceId, personId, status, reason },
      })
    }

    // Skills overwrite (v0)
    if (Array.isArray(body.skills)) {
      const cleaned = Array.from(new Set(body.skills.map((s) => normalizeSkill(String(s))).filter(Boolean))).slice(0, 50)

      // Upsert skills into taxonomy
      if (cleaned.length) {
        await prisma.orgSkillTaxonomy.createMany({
          data: cleaned.map((label) => ({ workspaceId, label })),
          skipDuplicates: true,
        })
      }

      await prisma.personSkill.deleteMany({ where: { workspaceId, personId } })
      if (cleaned.length) {
        // Look up or create Skill entities, then create PersonSkill links
        const skillRecords = await Promise.all(
          cleaned.map((name) =>
            prisma.skill.upsert({
              where: { workspaceId_name: { workspaceId, name } },
              update: {},
              create: { workspaceId, name },
              select: { id: true },
            })
          )
        )
        await prisma.personSkill.createMany({
          data: skillRecords.map((s) => ({ workspaceId, personId, skillId: s.id })),
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
        await prisma.orgRoleTaxonomy.createMany({
          data: cleaned.map((r) => ({ workspaceId, label: r.role })),
          skipDuplicates: true,
        })
      }

      await prisma.personRoleAssignment.deleteMany({ where: { workspaceId, personId } })
      if (cleaned.length) {
        await prisma.personRoleAssignment.createMany({
          data: cleaned.map((r) => ({ workspaceId, personId, role: r.role, percent: Math.round(r.percent) })),
          skipDuplicates: true,
        })
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
  } catch (error: unknown) {
    return handleApiError(error, req)
  }
}

