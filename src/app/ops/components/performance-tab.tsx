import { PerformanceTabContent } from './performance-tab-content'
import { TabsContent } from '@/components/ui/tabs'

type TimeRange = '15m' | '1h' | '24h' | '7d'

interface PerformanceTabProps {
  range: TimeRange
  workspaceId?: string | null
}

export function PerformanceTab({ range, workspaceId }: PerformanceTabProps) {
  return (
    <TabsContent value="performance" className="mt-6">
      <PerformanceTabContent range={range} workspaceId={workspaceId} />
    </TabsContent>
  )
}
