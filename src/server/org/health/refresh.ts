import { computeOrgHealth } from "@/server/org/health/compute"
import { storeOrgHealthSnapshot } from "@/server/org/health/store"

export async function refreshOrgHealth(orgId: string) {
  const computed = await computeOrgHealth({ orgId })
  await storeOrgHealthSnapshot({ orgId, computed })
  return computed
}

