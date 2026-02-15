import { redirect, notFound } from 'next/navigation'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { getMeetingDetail } from '@/lib/one-on-ones/data.server'
import { MeetingWorkspace } from '@/components/one-on-ones/meeting-workspace'

interface Props {
  params: Promise<{ workspaceSlug: string; seriesId: string; meetingId: string }>
}

export default async function MeetingPage({ params }: Props) {
  const { workspaceSlug, meetingId } = await params
  const auth = await getUnifiedAuth()

  if (!auth.isAuthenticated) {
    redirect('/login')
  }

  setWorkspaceContext(auth.workspaceId)

  const meeting = await getMeetingDetail(meetingId, auth.workspaceId)

  if (!meeting) {
    notFound()
  }

  // Verify the user is a participant
  const isParticipant =
    meeting.managerId === auth.user.userId ||
    meeting.employeeId === auth.user.userId

  if (!isParticipant) {
    notFound()
  }

  return (
    <div className="min-h-full bg-background">
      <div className="p-6">
        <MeetingWorkspace
          meeting={JSON.parse(JSON.stringify(meeting))}
          currentUserId={auth.user.userId}
          workspaceSlug={workspaceSlug}
        />
      </div>
    </div>
  )
}
