/**
 * Org Admin — Capacity Planning
 *
 * Server component. Fetches all active positions + their capacity contracts
 * and work allocations in three parallel queries, then computes per-person
 * utilization stats for the current week.
 */

import { redirect } from "next/navigation";
import { getOrgPermissionContext } from "@/lib/org/permissions.server";
import { assertAccess } from "@/lib/auth/assertAccess";
import { prisma } from "@/lib/db";
import {
  getCapacityContractsBatch,
  resolveActiveContractBatch,
  DEFAULT_WEEKLY_CAPACITY_HOURS,
} from "@/lib/org/capacity/read";
import { getWorkAllocationsBatch, computeAllocationSummary } from "@/lib/org/allocations";
import { AllocationContextType } from "@prisma/client";
import { startOfWeek, addWeeks } from "date-fns";
import { OrgPageHeader } from "@/components/org/OrgPageHeader";
import { OrgCard } from "@/components/org/ui/OrgCard";
import { OrgEmpty } from "@/components/org/ui/OrgEmpty";
import { orgTokens } from "@/components/org/ui/tokens";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ workspaceSlug: string }>;
};

function utilizationBarColor(pct: number): string {
  if (pct > 90) return "bg-red-500";
  if (pct >= 70) return "bg-amber-400";
  return "bg-emerald-500";
}

function utilizationTextColor(pct: number): string {
  if (pct > 90) return "text-red-500";
  if (pct >= 70) return "text-amber-500";
  return "text-emerald-500";
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export default async function CapacityPlanningPage({ params }: PageProps) {
  const { workspaceSlug } = await params;

  const context = await getOrgPermissionContext();

  if (!context) {
    redirect("/welcome");
  }

  try {
    await assertAccess({
      userId: context.userId,
      workspaceId: context.workspaceId,
      scope: "workspace",
      requireRole: ["OWNER", "ADMIN"],
    });
  } catch {
    redirect(`/w/${workspaceSlug}/org/profile`);
  }

  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 0 });
  const weekEnd = addWeeks(weekStart, 1);
  const timeWindow = { start: weekStart, end: weekEnd };

  // Step 1: Fetch all active positions with user and team info
  const rawPositions = await prisma.orgPosition.findMany({
    where: { workspaceId: context.workspaceId, isActive: true, userId: { not: null } },
    include: {
      user: { select: { id: true, name: true, image: true } },
      team: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  // Keep only positions where user is actually present (guard against soft deletes)
  const positions = rawPositions.filter(
    (p): p is typeof p & { userId: string; user: NonNullable<(typeof p)["user"]> } =>
      p.userId !== null && p.user !== null
  );

  const userIds = [...new Set(positions.map((p) => p.userId))];

  // Step 2: Batch fetch capacity contracts and allocations in parallel
  const [contractsByPerson, allocationsByPerson] = await Promise.all([
    getCapacityContractsBatch(context.workspaceId, userIds),
    getWorkAllocationsBatch(context.workspaceId, userIds, timeWindow),
  ]);

  // Step 3: Batch-resolve which contract is active for each person this week
  const resolutionsByPerson = resolveActiveContractBatch(contractsByPerson, now);

  // Step 4: Compute per-person utilization rows
  const personRows = positions.map((p) => {
    const resolution = resolutionsByPerson.get(p.userId);
    const weeklyCapacity =
      resolution?.contract?.weeklyCapacityHours ?? DEFAULT_WEEKLY_CAPACITY_HOURS;
    const isDefault = resolution?.isDefault ?? true;

    const allocations = allocationsByPerson.get(p.userId) ?? [];
    const summary = computeAllocationSummary(allocations, now);

    const allocatedHours = round1(summary.totalAllocationPercent * weeklyCapacity);
    const availableHours = round1(weeklyCapacity - allocatedHours);
    const utilizationPct = Math.round(summary.totalAllocationPercent * 100);

    const projectNames = summary.activeAllocations
      .filter((a) => a.contextType === AllocationContextType.PROJECT)
      .map((a) => a.contextLabel ?? a.contextId ?? "")
      .filter(Boolean);

    return {
      userId: p.userId,
      name: p.user.name ?? "Unknown",
      image: p.user.image,
      teamName: p.team?.name ?? null,
      weeklyCapacity,
      isDefault,
      allocatedHours,
      availableHours,
      utilizationPct,
      projectNames,
    };
  });

  // Step 5: Summary totals
  const totalHeadcount = personRows.length;
  const totalWeeklyHours = round1(personRows.reduce((sum, r) => sum + r.weeklyCapacity, 0));
  const totalAllocatedHours = round1(personRows.reduce((sum, r) => sum + r.allocatedHours, 0));
  const overallUtilizationPct =
    totalWeeklyHours > 0 ? Math.round((totalAllocatedHours / totalWeeklyHours) * 100) : 0;

  const hasAnyContracts = userIds.some(
    (id) => (contractsByPerson.get(id)?.length ?? 0) > 0
  );

  const isEmpty = positions.length === 0;

  return (
    <>
      <OrgPageHeader
        legacyBreadcrumb="ORG / ADMIN / CAPACITY"
        title="Capacity Planning"
        description="Track weekly capacity and utilization across your organization"
      />

      <div className="p-10 pb-10 space-y-6">
        {/* Summary row */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className={orgTokens.card}>
            <div className={orgTokens.subtleText}>Headcount</div>
            <div className="mt-1 text-2xl font-semibold tabular-nums">{totalHeadcount}</div>
          </div>
          <div className={orgTokens.card}>
            <div className={orgTokens.subtleText}>Weekly Capacity</div>
            <div className="mt-1 text-2xl font-semibold tabular-nums">{totalWeeklyHours}h</div>
          </div>
          <div className={orgTokens.card}>
            <div className={orgTokens.subtleText}>Allocated Hours</div>
            <div className="mt-1 text-2xl font-semibold tabular-nums">{totalAllocatedHours}h</div>
          </div>
          <div className={orgTokens.card}>
            <div className={orgTokens.subtleText}>Overall Utilization</div>
            <div
              className={cn(
                "mt-1 text-2xl font-semibold tabular-nums",
                utilizationTextColor(overallUtilizationPct)
              )}
            >
              {overallUtilizationPct}%
            </div>
          </div>
        </div>

        {/* Empty states */}
        {isEmpty ? (
          <OrgEmpty
            title="No active people"
            description="Add people to your org structure to begin tracking capacity."
          />
        ) : !hasAnyContracts ? (
          <OrgEmpty
            title="No capacity contracts set up"
            description="Set up capacity contracts to track team utilization. Until then, all people default to 40h/week."
          />
        ) : (
          /* People table */
          <OrgCard title="Team Capacity">
            <div className="overflow-x-auto -mx-1">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th
                      className={cn(
                        "pb-3 text-left font-medium",
                        orgTokens.subtleText
                      )}
                    >
                      Person
                    </th>
                    <th
                      className={cn(
                        "pb-3 text-left font-medium pl-4",
                        orgTokens.subtleText
                      )}
                    >
                      Team
                    </th>
                    <th
                      className={cn(
                        "pb-3 text-right font-medium pl-4",
                        orgTokens.subtleText
                      )}
                    >
                      Capacity
                    </th>
                    <th
                      className={cn(
                        "pb-3 text-right font-medium pl-4",
                        orgTokens.subtleText
                      )}
                    >
                      Allocated
                    </th>
                    <th
                      className={cn(
                        "pb-3 text-right font-medium pl-4",
                        orgTokens.subtleText
                      )}
                    >
                      Available
                    </th>
                    <th
                      className={cn(
                        "pb-3 text-left font-medium pl-6",
                        orgTokens.subtleText
                      )}
                    >
                      Utilization
                    </th>
                    <th
                      className={cn(
                        "pb-3 text-left font-medium pl-4",
                        orgTokens.subtleText
                      )}
                    >
                      Projects
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {personRows.map((row) => (
                    <tr
                      key={row.userId}
                      className={cn("border-b last:border-0", orgTokens.itemHover)}
                    >
                      {/* Name + Avatar */}
                      <td className="py-3 pr-2">
                        <div className="flex items-center gap-2.5">
                          {row.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={row.image}
                              alt={row.name}
                              className="h-7 w-7 rounded-full object-cover shrink-0"
                            />
                          ) : (
                            <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground shrink-0">
                              {row.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <span className={orgTokens.title}>{row.name}</span>
                        </div>
                      </td>

                      {/* Team */}
                      <td className={cn("py-3 pl-4 pr-2 whitespace-nowrap", orgTokens.subtleText)}>
                        {row.teamName ?? <span className="italic opacity-40">—</span>}
                      </td>

                      {/* Capacity */}
                      <td className="py-3 pl-4 pr-2 text-right tabular-nums whitespace-nowrap">
                        <span>{row.weeklyCapacity}h</span>
                        {row.isDefault && (
                          <span className={cn("ml-1 text-xs", orgTokens.subtleText)}>
                            (default)
                          </span>
                        )}
                      </td>

                      {/* Allocated */}
                      <td className={cn("py-3 pl-4 pr-2 text-right tabular-nums whitespace-nowrap")}>
                        {row.allocatedHours}h
                      </td>

                      {/* Available */}
                      <td
                        className={cn(
                          "py-3 pl-4 pr-2 text-right tabular-nums whitespace-nowrap",
                          row.availableHours < 0 ? "text-red-500" : orgTokens.subtleText
                        )}
                      >
                        {row.availableHours}h
                      </td>

                      {/* Utilization bar */}
                      <td className="py-3 pl-6 pr-4 min-w-[160px]">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden min-w-[80px]">
                            <div
                              className={cn(
                                "h-full rounded-full",
                                utilizationBarColor(row.utilizationPct)
                              )}
                              style={{ width: `${Math.min(row.utilizationPct, 100)}%` }}
                            />
                          </div>
                          <span
                            className={cn(
                              "text-xs tabular-nums w-9 text-right shrink-0",
                              utilizationTextColor(row.utilizationPct)
                            )}
                          >
                            {row.utilizationPct}%
                          </span>
                        </div>
                      </td>

                      {/* Projects */}
                      <td className="py-3 pl-4">
                        {row.projectNames.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {row.projectNames.slice(0, 3).map((name) => (
                              <span key={name} className={orgTokens.chip}>
                                {name}
                              </span>
                            ))}
                            {row.projectNames.length > 3 && (
                              <span className={orgTokens.chip}>
                                +{row.projectNames.length - 3}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className={cn("italic opacity-40", orgTokens.subtleText)}>—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </OrgCard>
        )}
      </div>
    </>
  );
}
