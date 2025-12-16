import { deriveEffectiveCapacity } from "../deriveEffectiveCapacity";

export type TeamCapacityRow = {
  teamKey: string; // teamId or team name
  headcount: number;
  unavailableCount: number;
  partialCount: number;
  avgEffectiveCapacityPct: number; // 0..100
  overallocatedCount: number;
};

export function deriveTeamCapacity(args: {
  people: any[];
  availabilityByPersonId: Record<string, { status: "available" | "partial" | "unavailable"; fraction?: number }>;
  allocationsByPersonId: Record<string, { fraction: number; startDate: Date; endDate?: Date }[]>;
  at?: Date;
}): TeamCapacityRow[] {
  const at = args.at ?? new Date();

  const byTeam = new Map<string, any[]>();
  for (const p of args.people) {
    const key = (p.teamId || p.teamName || p.team || "Unassigned").toString();
    if (!byTeam.has(key)) byTeam.set(key, []);
    byTeam.get(key)!.push(p);
  }

  const rows: TeamCapacityRow[] = [];

  for (const [teamKey, teamPeople] of byTeam.entries()) {
    let unavailableCount = 0;
    let partialCount = 0;
    let overallocatedCount = 0;
    let sumEffective = 0;

    for (const p of teamPeople) {
      const av = args.availabilityByPersonId[p.id] ?? { status: "available" as const };
      const alloc = args.allocationsByPersonId[p.id] ?? [];
      const eff = deriveEffectiveCapacity({
        availabilityStatus: av.status,
        partialFraction: av.fraction,
        allocations: alloc,
        at,
      });

      sumEffective += eff.effectiveFraction;

      if (av.status === "unavailable") unavailableCount += 1;
      if (av.status === "partial") partialCount += 1;

      // Overallocated = allocations exceed base availability (factual check)
      const base = av.status === "unavailable" ? 0 : av.status === "partial" ? (av.fraction ?? 0.5) : 1;
      const allocated = alloc.reduce((s, a) => s + (a.fraction || 0), 0);
      if (allocated > base + 1e-6) overallocatedCount += 1;
    }

    const headcount = teamPeople.length;
    const avgEffectiveCapacityPct = headcount === 0 ? 0 : Math.round((sumEffective / headcount) * 100);

    rows.push({
      teamKey,
      headcount,
      unavailableCount,
      partialCount,
      avgEffectiveCapacityPct,
      overallocatedCount,
    });
  }

  return rows.sort((a, b) => a.teamKey.localeCompare(b.teamKey));
}

