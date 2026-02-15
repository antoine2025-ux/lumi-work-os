import { getUnifiedAuth } from '@/lib/unified-auth'
import { redirect } from 'next/navigation'
import { WorkflowRulesManager } from '@/components/goals/workflow-rules-manager'

interface Props {
  params: Promise<{ workspaceSlug: string }>
}

export default async function GoalWorkflowsPage({ params }: Props) {
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
              <h1 className="text-xl font-semibold text-foreground">Goal Workflows</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Automated rules that take action when goals meet specific conditions
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        <WorkflowRulesManager workspaceSlug={workspaceSlug} />
      </div>
    </div>
  )
}
