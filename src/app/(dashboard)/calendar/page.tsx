export const dynamic = 'force-dynamic'

import { getUnifiedAuth } from '@/lib/unified-auth'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'

// Mark as dynamic since we use authentication
export const dynamic = 'force-dynamic'

/**
 * Legacy calendar route redirect
 * Redirects /calendar to /w/[workspaceSlug]/calendar
 */
export default async function LegacyCalendarPage() {
  const auth = await getUnifiedAuth()
  
  if (!auth.isAuthenticated) {
    redirect('/login')
  }

  // Get workspace slug
  const workspace = await prisma.workspace.findUnique({
    where: { id: auth.workspaceId },
    select: { slug: true },
  })

  if (!workspace) {
    redirect('/home')
  }

  redirect(`/w/${workspace.slug}/calendar`)
}
