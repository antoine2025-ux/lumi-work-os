import { TabsContent } from '@/components/ui/tabs'
import { ErrorsTabContent } from './errors-tab-content'
import { TimeRange } from './ops-toolbar'

interface ErrorsTabProps {
  range: TimeRange
  fingerprintFilter?: string
  workspaceId?: string | null
}

export function ErrorsTab({ range, fingerprintFilter, workspaceId }: ErrorsTabProps) {
  return (
    <TabsContent value="errors" className="mt-6">
      <ErrorsTabContent range={range} fingerprintFilter={fingerprintFilter} workspaceId={workspaceId} />
    </TabsContent>
  )
}
