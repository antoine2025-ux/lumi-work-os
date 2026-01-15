import { prisma } from "@/lib/db"

export type OrgCompletenessItem = {
  key: string
  label: string
  ok: boolean
  hint?: string
}

export async function getOrgCompleteness(orgId: string): Promise<OrgCompletenessItem[]> {
  try {
    const [peopleCountResult, teamCountResult, ownersCountResult] = await Promise.allSettled([
      prisma.orgPosition.count({ where: { workspaceId: orgId, userId: { not: null }, isActive: true } as any }).catch(() => 0),
      prisma.orgTeam.count({ where: { workspaceId: orgId } as any }).catch(() => 0),
      (async () => {
        try {
          if (prisma.ownerAssignment && typeof (prisma.ownerAssignment as any).count === "function") {
            return await (prisma.ownerAssignment as any).count({ where: { orgId, isPrimary: true } as any }).catch(() => 0);
          }
          return 0;
        } catch {
          return 0;
        }
      })(),
    ])

    const peopleCount = peopleCountResult.status === "fulfilled" ? peopleCountResult.value : 0
    const teamCount = teamCountResult.status === "fulfilled" ? teamCountResult.value : 0
    const ownersCount = ownersCountResult.status === "fulfilled" ? ownersCountResult.value : 0

    return [
      {
        key: "people",
        label: "At least one person exists",
        ok: peopleCount > 0,
        hint: peopleCount === 0 ? "Add at least one person" : undefined,
      },
      {
        key: "teams",
        label: "At least one team exists",
        ok: teamCount > 0,
        hint: teamCount === 0 ? "Create a team" : undefined,
      },
      {
        key: "ownership",
        label: "Primary ownership assigned",
        ok: ownersCount > 0,
        hint: ownersCount === 0 ? "Assign at least one primary owner" : undefined,
      },
    ]
  } catch (error: any) {
    console.error("[getOrgCompleteness] Unexpected error:", error);
    // Return safe defaults
    return [
      {
        key: "people",
        label: "At least one person exists",
        ok: false,
        hint: "Error checking completeness",
      },
      {
        key: "teams",
        label: "At least one team exists",
        ok: false,
        hint: "Error checking completeness",
      },
      {
        key: "ownership",
        label: "Primary ownership assigned",
        ok: false,
        hint: "Error checking completeness",
      },
    ]
  }
}

