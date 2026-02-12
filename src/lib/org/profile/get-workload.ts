/**
 * User workload for profile page
 *
 * Combines CapacityContract, WorkAllocation, and ProjectMember
 * to compute weekly capacity utilization and active projects.
 */

import { prisma } from "@/lib/db";
import { startOfWeek, addWeeks } from "date-fns";
import { getCapacityContracts, resolveContractForWindow, DEFAULT_WEEKLY_CAPACITY_HOURS } from "@/lib/org/capacity/read";
import {
  getWorkAllocations,
  computeTotalAllocatedHoursForWindow,
  computeAllocatedHoursForWindow,
  type WorkAllocation,
} from "@/lib/org/allocations";
import { AllocationContextType } from "@prisma/client";

export interface UserWorkload {
  totalCapacity: number;
  allocatedHours: number;
  availableHours: number;
  utilizationPct: number;
  projects: Array<{
    id: string;
    name: string;
    hoursAllocated: number;
    role: string;
  }>;
}

export async function getUserWorkload(
  userId: string,
  workspaceId: string
): Promise<UserWorkload> {
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 0 });
  const weekEnd = addWeeks(weekStart, 1);
  const timeWindow = { start: weekStart, end: weekEnd };

  const [contracts, allocations] = await Promise.all([
    getCapacityContracts(workspaceId, userId),
    getWorkAllocations(workspaceId, userId, timeWindow),
  ]);

  const resolution = resolveContractForWindow(contracts, timeWindow);
  const totalCapacity =
    resolution.contract?.weeklyCapacityHours ?? DEFAULT_WEEKLY_CAPACITY_HOURS;

  const { totalHours: allocatedHours } = computeTotalAllocatedHoursForWindow(
    allocations,
    totalCapacity,
    timeWindow
  );

  const availableHours = totalCapacity - allocatedHours;
  const utilizationPct =
    totalCapacity > 0 ? Math.round((allocatedHours / totalCapacity) * 100) : 0;

  // Per-project breakdown: filter PROJECT allocations
  const projectAllocations = allocations.filter(
    (a): a is WorkAllocation & { contextId: string } =>
      a.contextType === AllocationContextType.PROJECT && a.contextId != null
  );

  const projectIdsFromAllocations = [
    ...new Set(projectAllocations.map((a) => a.contextId)),
  ];

  // Get project memberships for active projects (ACTIVE, ON_HOLD)
  const memberships = await prisma.projectMember.findMany({
    where: {
      userId,
      project: {
        workspaceId,
        status: { in: ["ACTIVE", "ON_HOLD"] },
      },
    },
    include: {
      project: {
        select: { id: true, name: true },
      },
    },
  });

  const projectIdsFromMembership = memberships.map((m) => m.project.id);
  const allProjectIds = [
    ...new Set([...projectIdsFromAllocations, ...projectIdsFromMembership]),
  ];

  const projectsData =
    allProjectIds.length > 0
      ? await prisma.project.findMany({
          where: {
            id: { in: allProjectIds },
            workspaceId,
            status: { in: ["ACTIVE", "ON_HOLD"] },
          },
          select: { id: true, name: true },
        })
      : [];

  const projectMap = new Map<string, { name: string; hours: number; role: string }>();

  for (const p of projectsData) {
    projectMap.set(p.id, { name: p.name, hours: 0, role: "member" });
  }

  for (const alloc of projectAllocations) {
    const entry = projectMap.get(alloc.contextId);
    if (entry) {
      const { hours } = computeAllocatedHoursForWindow(
        alloc,
        totalCapacity,
        timeWindow
      );
      entry.hours += hours;
    }
  }

  for (const m of memberships) {
    const entry = projectMap.get(m.project.id);
    if (entry) {
      entry.role = m.role === "OWNER" ? "owner" : "member";
    }
  }

  const projects = Array.from(projectMap.entries())
    .map(([id, data]) => ({
      id,
      name: data.name,
      hoursAllocated: Math.round(data.hours * 10) / 10,
      role: data.role,
    }))
    .sort((a, b) => b.hoursAllocated - a.hoursAllocated);

  return {
    totalCapacity,
    allocatedHours: Math.round(allocatedHours * 10) / 10,
    availableHours: Math.round(availableHours * 10) / 10,
    utilizationPct,
    projects,
  };
}
