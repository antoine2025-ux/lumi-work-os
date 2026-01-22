import { TabsContent } from '@/components/ui/tabs'
import { OverviewTabContent } from './overview-tab-content'
import { TimeRange } from './ops-toolbar'

interface OverviewTabProps {
  range: TimeRange
  workspaceId?: string | null
}

export function OverviewTab({ range, workspaceId }: OverviewTabProps) {
  return (
    <TabsContent value="overview" className="mt-6">
      <OverviewTabContent range={range} workspaceId={workspaceId} />
    </TabsContent>
  )
}
