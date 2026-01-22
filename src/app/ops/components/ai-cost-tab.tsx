import { TabsContent } from '@/components/ui/tabs'
import { AiCostTabContent } from './ai-cost-tab-content'
import { TimeRange } from './ops-toolbar'

interface AiCostTabProps {
  range: TimeRange
  workspaceId?: string | null
}

export function AiCostTab({ range, workspaceId }: AiCostTabProps) {
  return (
    <TabsContent value="ai-cost" className="mt-6">
      <AiCostTabContent range={range} workspaceId={workspaceId} />
    </TabsContent>
  )
}
