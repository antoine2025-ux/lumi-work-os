import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { redirect } from 'next/navigation'
import { ReviewCycleForm } from '@/components/performance/review-cycle-form'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

interface Props {
  params: Promise<{ workspaceSlug: string }>
}

export default async function NewCyclePage({ params }: Props) {
  const { workspaceSlug } = await params
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

  return (
    <div className="min-h-full bg-background">
      <div className="bg-card border-b border-border">
        <div className="px-6 py-4">
          <h1 className="text-xl font-semibold text-foreground">Create Review Cycle</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Set up a new performance review cycle for your team
          </p>
        </div>
      </div>
      <div className="p-6 max-w-3xl">
        <Link
          href={`/w/${workspaceSlug}/org/performance`}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Performance
        </Link>

        <ReviewCycleForm workspaceSlug={workspaceSlug} />
      </div>
    </div>
  )
}
