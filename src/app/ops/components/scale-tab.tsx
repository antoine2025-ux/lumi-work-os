import { ScaleTabContent } from './scale-tab-content'

interface ScaleTabProps {
  workspaceId?: string | null
}

export function ScaleTab({ workspaceId }: ScaleTabProps) {
  return <ScaleTabContent workspaceId={workspaceId} />
}
