import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { getCycleDetail } from '@/lib/performance/data.server'
import { redirect, notFound } from 'next/navigation'
import { CycleDetailPage } from './cycle-detail-page'

interface Props {
  params: Promise<{ workspaceSlug: string; cycleId: string }>
}

export default async function CycleDetailRoute({ params }: Props) {
  const { workspaceSlug, cycleId } = await params
  const auth = await getUnifiedAuth()

  if (!auth.isAuthenticated) {
    redirect('/login')
  }

  await assertAccess({
    userId: auth.user.userId,
    workspaceId: auth.workspaceId,
    scope: 'workspace',
    requireRole: ['ADMIN', 'OWNER'],
  })

  const cycle = await getCycleDetail(cycleId, auth.workspaceId)

  if (!cycle) {
    notFound()
  }

  return (
    <div className="min-h-full bg-background">
      <div className="bg-card border-b border-border">
        <div className="px-6 py-4">
          <h1 className="text-xl font-semibold text-foreground">{cycle.name}</h1>
          {cycle.description && (
            <p className="text-sm text-muted-foreground mt-1">{cycle.description}</p>
          )}
        </div>
      </div>
      <div className="p-6">
        <CycleDetailPage
          cycle={JSON.parse(JSON.stringify(cycle))}
          workspaceSlug={workspaceSlug}
        />
      </div>
    </div>
  )
}
