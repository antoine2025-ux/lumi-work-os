import { computeOrgHealth } from "@/server/org/health/compute"
import { storeOrgHealthSnapshot } from "@/server/org/health/store"

export async function refreshOrgHealth(workspaceId: string) {
  const computed = await computeOrgHealth({ workspaceId })
  await storeOrgHealthSnapshot({ workspaceId, computed })
  return computed
}

