import { getUnifiedAuth } from '@/lib/unified-auth'
import { getGoalById } from '@/lib/goals/data.server'
import { GoalDetail } from '@/components/goals/goal-detail'
import { redirect, notFound } from 'next/navigation'

interface Props {
  params: Promise<{ workspaceSlug: string; goalId: string }>
}

export default async function GoalDetailPage({ params }: Props) {
  const { workspaceSlug, goalId } = await params
  
  const auth = await getUnifiedAuth()
  
  if (!auth.isAuthenticated) {
    redirect('/login')
  }

  const goal = await getGoalById(goalId, auth.workspaceId)

  if (!goal) {
    notFound()
  }

  return (
    <div className="min-h-full bg-background">
      <div className="p-6 space-y-6">
        <GoalDetail
          goal={goal}
          currentUser={{
            userId: auth.user.userId,
            email: auth.user.email,
            name: auth.user.name,
          }}
          workspaceSlug={workspaceSlug}
        />
      </div>
    </div>
  )
}
