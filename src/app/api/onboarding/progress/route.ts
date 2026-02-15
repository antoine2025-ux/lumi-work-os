import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/server/authOptions'
import { prisma, prismaUnscoped } from '@/lib/db'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { handleApiError } from '@/lib/api-errors'
import { OnboardingStepSubmissionSchema } from '@/lib/validations/onboarding'
import { createUserWorkspace } from '@/lib/simple-auth'

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
  } catch (error) {
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

        // Update admin's OrgPosition title
        const position = await prisma.orgPosition.findFirst({
          where: { userId: session.user.id, workspaceId },
        })
        if (position) {
          await prisma.orgPosition.update({
            where: { id: position.id },
            data: { title: data.adminTitle },
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

        // Update admin title on the OrgPosition
        const position = await prisma.orgPosition.findFirst({
          where: { userId: session.user.id, workspaceId },
        })
        if (position) {
          await prisma.orgPosition.update({
            where: { id: position.id },
            data: { title: data.adminTitle },
          })
        }
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

      if (!data.skipped) {
        // Create departments
        if (data.departments && data.departments.length > 0) {
          for (const dept of data.departments) {
            try {
              const created = await prisma.orgDepartment.create({
                data: {
                  workspaceId,
                  name: dept.name,
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
      })
    }

    // -----------------------------------------------------------------------
    // Step 4: First Space
    // -----------------------------------------------------------------------
    if (step === 4) {
      // Map onboarding visibility (PUBLIC | PRIVATE) to DB enum (PUBLIC | TARGETED)
      const visibility = data.visibility === 'PRIVATE' ? 'TARGETED' : 'PUBLIC'
      const space = await prisma.projectSpace.create({
        data: {
          workspaceId,
          name: data.spaceName,
          description: null,
          visibility,
        },
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
        spaceId: space.id,
        spaceName: space.name,
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

      return NextResponse.json({
        success: true,
        isComplete: true,
      })
    }

    return NextResponse.json({ error: 'Invalid step' }, { status: 400 })
  } catch (error) {
    return handleApiError(error, request)
  }
}
