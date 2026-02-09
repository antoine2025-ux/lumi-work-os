import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { handleApiError } from '@/lib/api-errors'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import {
  createFirstDepartment,
  createFirstTeam,
  createRoleCard,
  sendFirstInvite,
  completeFullOnboarding,
  markStepComplete,
} from '@/lib/org/onboarding-checklist'
import { createOrgPerson } from '@/server/org/people/write'

// Validation schemas
const DepartmentSchema = z.object({
  name: z.string().min(2, 'Department name must be at least 2 characters'),
  description: z.string().optional().default(''),
})

const TeamSchema = z.object({
  name: z.string().min(2, 'Team name must be at least 2 characters'),
  description: z.string().optional().default(''),
})

const RoleCardSchema = z.object({
  name: z.string().min(2, 'Role name must be at least 2 characters'),
  description: z.string().optional().default(''),
  level: z.enum(['ENTRY', 'JUNIOR', 'MID', 'SENIOR', 'LEAD', 'PRINCIPAL', 'EXECUTIVE']),
})

const InviteSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['ADMIN', 'EDITOR', 'VIEWER']),
  positionIndex: z.number().int().min(0),
})

const OrgBootstrapSchema = z.object({
  department: DepartmentSchema,
  team: TeamSchema,
  roleCards: z.array(RoleCardSchema).min(2, 'At least 2 role cards required').max(5),
  invite: InviteSchema.optional(), // Optional: no email sending; when provided we create record and return link
})

/**
 * POST /api/org/bootstrap
 * 
 * Creates minimum viable org structure in a single transaction:
 * 1. Admin OrgPosition (if not exists)
 * 2. Department
 * 3. Team (with admin as leader)
 * 4. Role cards (2-5)
 * 5. First invite
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await getUnifiedAuth(request)

    if (!auth.isAuthenticated || !auth.user || !auth.workspaceId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only ADMIN/OWNER can bootstrap org structure (use auth.user.userId - UnifiedAuthUser has userId not id)
    await assertAccess({
      userId: auth.user.userId,
      workspaceId: auth.workspaceId,
      requireRole: ['ADMIN', 'OWNER'],
      scope: 'workspace',
    })

    setWorkspaceContext(auth.workspaceId)

    const body = await request.json()
    const validatedData = OrgBootstrapSchema.parse(body)

    // Check if org already bootstrapped
    const onboardingState = await prisma.workspaceOnboardingState.findUnique({
      where: { workspaceId: auth.workspaceId },
    })

    if (onboardingState?.orgStructure) {
      return NextResponse.json(
        { error: 'Org structure already bootstrapped' },
        { status: 400 }
      )
    }

    // Get admin's name from onboarding state or user record
    const adminName = onboardingState?.adminName || auth.user.name || 'Admin'
    const adminRole = onboardingState?.adminRole || 'Administrator'

    // Execute bootstrap in transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create admin OrgPosition if not exists
      let adminPosition = await tx.orgPosition.findFirst({
        where: {
          userId: auth.user!.userId,
          workspaceId: auth.workspaceId!,
          isActive: true,
        },
      })

      if (!adminPosition) {
        const created = await createOrgPerson({
          userId: auth.user!.userId,
          fullName: adminName,
          email: auth.user!.email || null,
          title: adminRole,
          departmentId: null,
          teamId: null,
          workspaceId: auth.workspaceId!,
        })
        // createOrgPerson returns { id, userId }, not { position }
        adminPosition = { id: created.id, userId: created.userId } as typeof adminPosition
      }

      // 2. Create department
      const department = await createFirstDepartment(
        auth.workspaceId!,
        validatedData.department.name,
        validatedData.department.description,
        adminPosition.id
      )

      // 3. Create team with admin as leader
      const team = await createFirstTeam(
        auth.workspaceId!,
        department.id,
        validatedData.team.name,
        validatedData.team.description,
        auth.user!.userId
      )

      // 4. Create role cards
      const roleCards = await Promise.all(
        validatedData.roleCards.map((rc) =>
          createRoleCard(
            auth.workspaceId!,
            rc.name,
            rc.description,
            rc.level,
            auth.user!.userId
          )
        )
      )

      // 5. Optional: create first invite (link-only; no email sent)
      let inviteLink: string | null = null
      if (validatedData.invite) {
        const { token } = await sendFirstInvite(
          auth.workspaceId!,
          validatedData.invite.email,
          validatedData.invite.role,
          auth.user!.userId
        )
        // Build accept URL for sharing (email not sent in this flow)
        const base = process.env.NEXTAUTH_URL || 'http://localhost:3000'
        inviteLink = `${base}/api/invites/${token}/accept`
      } else {
        await markStepComplete(auth.workspaceId!, 'firstInvite')
      }

      return { department, team, roleCards, adminPosition, inviteLink }
    })

    // Complete full onboarding
    await completeFullOnboarding(auth.workspaceId)

    return NextResponse.json({
      success: true,
      data: result,
      inviteLink: result.inviteLink ?? null,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    }
    return handleApiError(error)
  }
}

