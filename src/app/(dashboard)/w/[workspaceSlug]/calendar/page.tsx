import { getUnifiedAuth } from '@/lib/unified-auth'
import { redirect } from 'next/navigation'
import { CalendarPageClient } from './CalendarPageClient'

interface Props {
  params: Promise<{ workspaceSlug: string }>
}

export default async function CalendarPage({ params }: Props) {
  await params
  
  const auth = await getUnifiedAuth()
  
  if (!auth.isAuthenticated) {
    redirect('/login')
  }

  return (
    <div className="min-h-full bg-background">
      {/* Clean Header */}
      <div className="bg-card border-b border-border">
        <div className="px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-xl font-semibold text-foreground">Calendar</h1>
              <p className="text-sm text-muted-foreground mt-1">View and manage your meetings</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <CalendarPageClient />
    </div>
  )
}
