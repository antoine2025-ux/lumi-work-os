import { getUnifiedAuth } from '@/lib/unified-auth'
import { redirect } from 'next/navigation'
import { PerformanceDashboard } from '@/components/goals/performance-dashboard'

interface Props {
  params: Promise<{ workspaceSlug: string }>
}

export default async function PerformancePage({ params }: Props) {
  const { workspaceSlug } = await params
  const auth = await getUnifiedAuth()

  if (!auth.isAuthenticated) {
    redirect('/login')
  }

  return (
    <div className="min-h-full bg-background">
      <div className="bg-card border-b border-border">
        <div className="px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-xl font-semibold text-foreground">Performance</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Goal-based performance reviews and 1:1 meetings
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        <PerformanceDashboard
          workspaceSlug={workspaceSlug}
          currentUser={{
            userId: auth.user.userId,
            email: auth.user.email,
            name: auth.user.name,
          }}
        />
      </div>
    </div>
  )
}
