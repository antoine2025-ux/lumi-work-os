import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { handleApiError } from '@/lib/api-errors'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'

// Validation schemas
const WorkspaceOnboardingSchema = z.object({
  mission: z.string().min(10, 'Mission must be at least 10 characters').max(500),
  industry: z.string().min(2, 'Industry is required'),
  companySize: z.enum(['1-10', '11-50', '51-200', '201-500', '501+']),
  timezone: z.string().min(1, 'Timezone is required'),
})

const AdminProfileSchema = z.object({
  adminName: z.string().min(2, 'Name must be at least 2 characters'),
  adminRole: z.string().min(2, 'Role is required'),
  adminDepartment: z.string().min(2, 'Department is required'),
})

const CompleteOnboardingSchema = WorkspaceOnboardingSchema.merge(AdminProfileSchema)

// GET: Retrieve onboarding state
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  const { workspaceId } = await params
  
  try {
    const auth = await getUnifiedAuth(request)

    if (!auth.isAuthenticated || !auth.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Set workspace context
    setWorkspaceContext(workspaceId)

    // Get workspace and onboarding state
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        onboardingState: true,
      },
    })

    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
    }

    return NextResponse.json({
      workspace: {
        id: workspace.id,
        name: workspace.name,
        mission: workspace.mission,
        industry: workspace.industry,
        companySize: workspace.companySize,
        timezone: workspace.timezone,
        onboardingCompletedAt: workspace.onboardingCompletedAt,
      },
      onboardingState: workspace.onboardingState || null,
    })
  } catch (error: unknown) {
    return handleApiError(error)
  }
}

// POST: Save onboarding data and mark complete
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  const { workspaceId } = await params
  
  try {
    const auth = await getUnifiedAuth(request)

    if (!auth.isAuthenticated || !auth.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only workspace owner/admin can complete onboarding
    await assertAccess({
      userId: auth.user.userId,
      workspaceId,
      scope: 'workspace',
      requireRole: ['ADMIN', 'OWNER'],
    })

    setWorkspaceContext(workspaceId)

    const body = await request.json()
    const validatedData = CompleteOnboardingSchema.parse(body)

    // Update workspace with onboarding data
    const workspace = await prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        mission: validatedData.mission,
        industry: validatedData.industry,
        companySize: validatedData.companySize,
        timezone: validatedData.timezone,
        onboardingCompletedAt: new Date(),
      },
    })

    // Create/update onboarding state
    const onboardingState = await prisma.workspaceOnboardingState.upsert({
      where: { workspaceId },
      create: {
        workspaceId,
        profileSetup: true,
        adminName: validatedData.adminName,
        adminRole: validatedData.adminRole,
        adminDepartment: validatedData.adminDepartment,
      },
      update: {
        profileSetup: true,
        adminName: validatedData.adminName,
        adminRole: validatedData.adminRole,
        adminDepartment: validatedData.adminDepartment,
      },
    })

    return NextResponse.json({
      success: true,
      workspace,
      onboardingState,
    })
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    }
    return handleApiError(error)
  }
}
