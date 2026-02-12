import { redirect } from 'next/navigation'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { prisma } from '@/lib/db'
import { OrgSetupWizardClient } from '@/components/onboarding/org-wizard/OrgSetupWizardClient'

type PageProps = {
  params: Promise<{ workspaceSlug: string }>
}

export default async function OrgSetupPage({ params }: PageProps) {
  const { workspaceSlug } = await params
  const auth = await getUnifiedAuth()

  if (!auth.isAuthenticated || !auth.workspaceId) {
    redirect('/login')
  }

  const onboardingState = await prisma.workspaceOnboardingState.findUnique({
    where: { workspaceId: auth.workspaceId },
    select: {
      adminRole: true,
      adminDepartment: true,
      adminName: true,
    },
  })

  const defaultDepartmentName = onboardingState?.adminDepartment ?? ''
  const defaultRoleName = onboardingState?.adminRole ?? ''
  const defaultTeamName = onboardingState?.adminDepartment
    ? `${onboardingState.adminDepartment} Team`
    : ''

  return (
    <OrgSetupWizardClient
      workspaceSlug={workspaceSlug}
      defaultDepartment={defaultDepartmentName}
      defaultTeam={defaultTeamName}
      defaultRole={defaultRoleName}
    />
  )
}
