import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/server/authOptions'
import { prisma, prismaUnscoped } from '@/lib/db'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { handleApiError } from '@/lib/api-errors'
import { OnboardingStepSubmissionSchema } from '@/lib/validations/onboarding'
import { createUserWorkspace } from '@/lib/simple-auth'
import { ensureOrgPositionForUser } from '@/lib/org/ensure-org-position'
import { syncOrgContext } from '@/lib/context/org/syncOrgContext'
import { syncDepartmentContexts } from '@/lib/context/org/syncDepartmentContexts'
import { syncTeamContexts } from '@/lib/context/org/syncTeamContexts'
import { syncPersonContexts } from '@/lib/context/org/syncPersonContexts'
import { syncRoleContexts } from '@/lib/context/org/syncRoleContexts'
import { generateOnboardingBriefing } from '@/lib/loopbrain/scenarios/onboarding-briefing'
import { logger } from '@/lib/logger'

// ---------------------------------------------------------------------------
// GET /api/onboarding/progress — Fetch current onboarding progress
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  try {
    // Try unified auth first (works if workspace exists)
    let workspaceId: string | null = null
    try {
      const auth = await getUnifiedAuth(request)
      workspaceId = auth.workspaceId
    } catch {
      // No workspace yet — check if user is authenticated at all
      const session = await getServerSession(authOptions)
      if (!session?.user?.id) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      }
      // User has no workspace — return default Step 1 state
      return NextResponse.json({
        currentStep: 1,
        completedSteps: [],
        isComplete: false,
        companySize: null,
      })
    }

    setWorkspaceContext(workspaceId)

    const progress = await prisma.onboardingProgress.findUnique({
      where: { workspaceId },
    })

    if (!progress) {
      // Workspace exists but no progress record — first onboarding visit after workspace creation
      return NextResponse.json({
        currentStep: 1,
        completedSteps: [],
        isComplete: false,
        companySize: null,
      })
    }

    return NextResponse.json({
      currentStep: progress.currentStep,
      completedSteps: progress.completedSteps,
      isComplete: progress.isComplete,
      companySize: progress.orgSize,
      orgName: progress.orgName,
    })
  } catch (error: unknown) {
    return handleApiError(error, request)
  }
}

// ---------------------------------------------------------------------------
// POST /api/onboarding/progress — Submit data for a specific onboarding step
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = OnboardingStepSubmissionSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { step, data } = parsed.data

    // -----------------------------------------------------------------------
    // Step 1: Create workspace (uses getServerSession — no workspace exists yet)
    // -----------------------------------------------------------------------
    if (step === 1) {
      const session = await getServerSession(authOptions)
      if (!session?.user?.id || !session?.user?.email) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      }

      // Check if user already has a workspace (resuming onboarding)
      const existingMember = await prismaUnscoped.workspaceMember.findFirst({
        where: { userId: session.user.id },
        select: { workspaceId: true },
      })

      let workspaceId: string

      if (existingMember) {
        // Resuming — workspace already exists, update it
        workspaceId = existingMember.workspaceId
        setWorkspaceContext(workspaceId)

        await prisma.workspace.update({
          where: { id: workspaceId },
          data: {
            name: data.workspaceName,
            companySize: data.companySize,
          },
        })

        // Ensure default organizational structure exists
        let defaultDepartment = await prisma.orgDepartment.findFirst({
          where: { workspaceId, name: 'Leadership' },
        })

        if (!defaultDepartment) {
          defaultDepartment = await prisma.orgDepartment.create({
            data: {
              workspaceId,
              name: 'Leadership',
              isActive: true,
            },
          })
        }

        let defaultTeam = await prisma.orgTeam.findFirst({
          where: { workspaceId, name: 'Executive Team', departmentId: defaultDepartment.id },
        })

        if (!defaultTeam) {
          defaultTeam = await prisma.orgTeam.create({
            data: {
              workspaceId,
              departmentId: defaultDepartment.id,
              name: 'Executive Team',
              isActive: true,
              leaderId: session.user.id,
            },
          })
        } else if (!defaultTeam.leaderId) {
          defaultTeam = await prisma.orgTeam.update({
            where: { id: defaultTeam.id },
            data: { leaderId: session.user.id },
          })
        }

        // Update admin's OrgPosition title and ensure it's linked to a team
        const position = await prisma.orgPosition.findFirst({
          where: { userId: session.user.id, workspaceId },
        })
        if (position) {
          await prisma.orgPosition.update({
            where: { id: position.id },
            data: { 
              title: data.adminTitle,
              teamId: position.teamId ?? defaultTeam.id,
            },
          })
        }

        // Update user name
        await prismaUnscoped.user.update({
          where: { id: session.user.id },
          data: { name: data.adminName },
        })
      } else {
        // Fresh workspace creation
        const slug = data.workspaceName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
          .slice(0, 60)

        const authUser = await createUserWorkspace(
          {
            id: session.user.id,
            email: session.user.email,
            name: data.adminName,
            image: session.user.image ?? undefined,
          },
          {
            name: data.workspaceName,
            slug: slug || 'workspace',
            description: '',
            teamSize: data.companySize,
          }
        )

        workspaceId = authUser.workspaceId
        setWorkspaceContext(workspaceId)

        // createUserWorkspace doesn't set companySize — persist it now
        await prisma.workspace.update({
          where: { id: workspaceId },
          data: { companySize: data.companySize },
        })

        // Create default organizational structure so admin appears in org chart
        const defaultDepartment = await prisma.orgDepartment.create({
          data: {
            workspaceId,
            name: 'Leadership',
            isActive: true,
          },
        })

        const defaultTeam = await prisma.orgTeam.create({
          data: {
            workspaceId,
            departmentId: defaultDepartment.id,
            name: 'Executive Team',
            isActive: true,
            leaderId: session.user.id,
          },
        })

        // createUserWorkspace doesn't create an OrgPosition — create one with
        // the admin's title so they appear in the org directory
        await ensureOrgPositionForUser(prisma, {
          workspaceId,
          userId: session.user.id,
          title: data.adminTitle,
          teamId: defaultTeam.id,
        })
      }

      // Upsert OnboardingProgress
      await prisma.onboardingProgress.upsert({
        where: { workspaceId },
        create: {
          workspaceId,
          currentStep: 2,
          completedSteps: [1],
          orgBasicsComplete: true,
          orgName: data.workspaceName,
          orgSize: data.companySize,
        },
        update: {
          currentStep: 2,
          completedSteps: { push: 1 },
          orgBasicsComplete: true,
          orgName: data.workspaceName,
          orgSize: data.companySize,
        },
      })

      return NextResponse.json({
        success: true,
        workspaceId,
        nextStep: 2,
      })
    }

    // -----------------------------------------------------------------------
    // Steps 2-5: Workspace must exist — use getUnifiedAuth
    // -----------------------------------------------------------------------
    const auth = await getUnifiedAuth(request)
    await assertAccess({
      userId: auth.user.userId,
      workspaceId: auth.workspaceId,
      scope: 'workspace',
      requireRole: ['OWNER', 'ADMIN'],
    })
    setWorkspaceContext(auth.workspaceId)

    const workspaceId = auth.workspaceId

    // -----------------------------------------------------------------------
    // Step 2: Invite team members
    // -----------------------------------------------------------------------
    if (step === 2) {
      const inviteResults: Array<{ email: string; status: string }> = []

      if (data.invites && data.invites.length > 0 && !data.skipped) {
        // Map workspace invite roles to OrgRole enum values
        const roleMap: Record<string, 'ADMIN' | 'EDITOR' | 'VIEWER'> = {
          ADMIN: 'ADMIN',
          MEMBER: 'EDITOR',
          VIEWER: 'VIEWER',
        }

        for (const invite of data.invites) {
          try {
            await prisma.orgInvitation.create({
              data: {
                workspaceId,
                email: invite.email,
                role: roleMap[invite.role] ?? 'VIEWER',
                invitedById: auth.user.userId,
                status: 'PENDING',
              },
            })
            inviteResults.push({ email: invite.email, status: 'invited' })
          } catch (err: unknown) {
            // Duplicate invite or other error — skip gracefully
            const message = err instanceof Error ? err.message : 'Unknown error'
            inviteResults.push({ email: invite.email, status: `skipped: ${message}` })
          }
        }
      }

      await prisma.onboardingProgress.update({
        where: { workspaceId },
        data: {
          currentStep: 3,
          completedSteps: { push: 2 },
          peopleInvited: !data.skipped && (data.invites?.length ?? 0) > 0,
        },
      })

      return NextResponse.json({
        success: true,
        nextStep: 3,
        inviteResults,
      })
    }

    // -----------------------------------------------------------------------
    // Step 3: Org Structure (departments + teams)
    // -----------------------------------------------------------------------
    if (step === 3) {
      const createdDepartments: Array<{ id: string; name: string }> = []
      const createdTeams: Array<{ id: string; name: string }> = []
      const createdPositions: Array<{ id: string; title: string }> = []

      if (!data.skipped) {
        // Create departments
        if (data.departments && data.departments.length > 0) {
          for (const dept of data.departments) {
            try {
              const created = await prisma.orgDepartment.create({
                data: {
                  workspaceId,
                  name: dept.name,
                  description: null, // Lead name now stored in OrgPosition, not plain text
                },
              })
              createdDepartments.push({ id: created.id, name: created.name })
            } catch {
              // Duplicate name — skip
            }
          }
        }

        // Create teams and link to departments
        if (data.teams && data.teams.length > 0) {
          for (const team of data.teams) {
            try {
              // Find the department by name
              const dept = await prisma.orgDepartment.findFirst({
                where: { workspaceId, name: team.departmentName },
                select: { id: true },
              })

              const created = await prisma.orgTeam.create({
                data: {
                  workspaceId,
                  name: team.name,
                  departmentId: dept?.id ?? null,
                },
              })
              createdTeams.push({ id: created.id, name: created.name })
            } catch {
              // Duplicate or other error — skip
            }
          }
        }

        // Create lead positions for departments with leadName
        if (data.departments && data.departments.length > 0) {
          for (const dept of data.departments) {
            if (!dept.leadName) continue

            try {
              // Find the created department
              const createdDept = await prisma.orgDepartment.findFirst({
                where: { workspaceId, name: dept.name },
                select: { id: true, name: true },
              })

              if (!createdDept) continue

              // Find or create a team for this department
              let teamId: string | null = null

              // First, check if any teams were created for this department
              const existingTeam = await prisma.orgTeam.findFirst({
                where: { workspaceId, departmentId: createdDept.id },
                select: { id: true },
              })

              if (existingTeam) {
                teamId = existingTeam.id
              } else {
                // No teams exist — create a default team using department name
                const defaultTeam = await prisma.orgTeam.create({
                  data: {
                    workspaceId,
                    name: createdDept.name,
                    departmentId: createdDept.id,
                  },
                })
                teamId = defaultTeam.id
                createdTeams.push({ id: defaultTeam.id, name: defaultTeam.name })
              }

              // Check if the lead name matches the current admin (case-insensitive).
              // Other names aren't in the system yet — keep them as placeholders.
              const adminName = auth.user.name?.trim().toLowerCase() ?? ''
              const leadName = dept.leadName.trim().toLowerCase()
              const isAdminLead = adminName && leadName === adminName

              // Create the lead position
              const position = await prisma.orgPosition.create({
                data: {
                  workspaceId,
                  title: `Head of ${createdDept.name}`,
                  userId: isAdminLead ? auth.user.userId : null,
                  teamId,
                  level: 5, // High level to ensure recognition as department lead
                  roleDescription: isAdminLead ? null : dept.leadName, // Store name only for unmatched leads
                },
              })

              // If the admin is the lead, also set leaderId on the team.
              if (isAdminLead && teamId) {
                await prisma.orgTeam.update({
                  where: { id: teamId },
                  data: { leaderId: auth.user.userId },
                })
              }

              createdPositions.push({ id: position.id, title: position.title ?? '' })
            } catch (error: unknown) {
              // Log but don't fail the entire onboarding step
              logger.warn('[onboarding] Failed to create lead position', {
                workspaceId,
                departmentName: dept.name,
                leadName: dept.leadName,
                error: error instanceof Error ? error.message : String(error),
              })
            }
          }
        }
      }

      await prisma.onboardingProgress.update({
        where: { workspaceId },
        data: {
          currentStep: 4,
          completedSteps: { push: 3 },
          departmentsCreated: createdDepartments.length > 0,
          teamsCreated: createdTeams.length > 0,
        },
      })

      return NextResponse.json({
        success: true,
        nextStep: 4,
        createdDepartments,
        createdTeams,
        createdPositions,
      })
    }

    // -----------------------------------------------------------------------
    // Step 4: Company Type
    // -----------------------------------------------------------------------
    if (step === 4) {
      await prisma.workspace.update({
        where: { id: workspaceId },
        data: { companyType: data.companyType },
      })

      await prisma.onboardingProgress.update({
        where: { workspaceId },
        data: {
          currentStep: 5,
          completedSteps: { push: 4 },
        },
      })

      return NextResponse.json({
        success: true,
        nextStep: 5,
      })
    }

    // -----------------------------------------------------------------------
    // Step 5: Complete onboarding
    // -----------------------------------------------------------------------
    if (step === 5) {
      const now = new Date()

      await prisma.onboardingProgress.update({
        where: { workspaceId },
        data: {
          currentStep: 5,
          completedSteps: { push: 5 },
          isComplete: true,
          completedAt: now,
        },
      })

      // Set onboardingCompletedAt on Workspace so JWT picks it up on next refresh
      await prisma.workspace.update({
        where: { id: workspaceId },
        data: { onboardingCompletedAt: now },
      })

      // Fire-and-forget: sync all org data into Loopbrain context engine
      Promise.allSettled([
        syncOrgContext(workspaceId),
        syncDepartmentContexts(workspaceId),
        syncTeamContexts(workspaceId),
        syncPersonContexts(workspaceId),
        syncRoleContexts(workspaceId),
      ]).catch((err) => {
        logger.warn('[onboarding] Loopbrain context sync failed', {
          workspaceId,
          error: err instanceof Error ? err.message : String(err),
        })
      })

      // Fire-and-forget: pre-generate onboarding briefing so it's ready on first dashboard load
      generateOnboardingBriefing(auth.user.userId, workspaceId).catch((err) => {
        logger.warn('[onboarding] Briefing pre-generation failed', {
          workspaceId,
          userId: auth.user.userId,
          error: err instanceof Error ? err.message : String(err),
        })
      })

      return NextResponse.json({
        success: true,
        isComplete: true,
      })
    }

    return NextResponse.json({ error: 'Invalid step' }, { status: 400 })
  } catch (error: unknown) {
    return handleApiError(error, request)
  }
}
