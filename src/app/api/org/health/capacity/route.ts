import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { handleApiError } from "@/lib/api-errors";
import { isOrgCapacityEnabled } from "@/lib/org/feature-flags";

/**
 * Capacity Snapshot (v1)
 * - "Availability" means: person is active AND not currently unavailable within [now, now+lookaheadDays]
 * - "Capacity" means: availability * allocationFreeFraction (if allocation data exists), else availability-only.
 *
 * IMPORTANT:
 * - This is a first-pass endpoint. It will be refined once Projects/Allocations are fully wired.
 * - Keep it fast: counts + small examples only.
 */

type CapacitySnapshotResponse = {
  meta: {
    lookaheadDays: number;
    asOf: string;
  };
  totals: {
    people: number;
    availableNow: number;
    unavailableNow: number;
    returningSoon: number;
    effectiveCapacityUnits: number; // sum of 1.0 per available person * freeFraction if available
  };
  byDepartment: Array<{
    id: string;
    name: string;
    people: number;
    availableNow: number;
    unavailableNow: number;
    returningSoon: number;
    effectiveCapacityUnits: number;
  }>;
  byRoleFamily: Array<{
    key: string; // e.g. "Engineering", "Product", "Design", "Ops", "Other"
    people: number;
    availableNow: number;
    effectiveCapacityUnits: number;
  }>;
  examples: {
    unavailableNow: Array<{ id: string; name: string; title?: string | null; returnsOn?: string | null }>;
    returningSoon: Array<{ id: string; name: string; title?: string | null; returnsOn?: string | null }>;
    availableNow: Array<{ id: string; name: string; title?: string | null }>;
  };
};

function toISO(d: Date) {
  return d.toISOString();
}

function roleFamilyFromTitle(title?: string | null): string {
  const t = (title || "").toLowerCase();
  if (t.includes("engineer") || t.includes("developer") || t.includes("frontend") || t.includes("backend")) return "Engineering";
  if (t.includes("product") || t.includes("pm")) return "Product";
  if (t.includes("design") || t.includes("ux")) return "Design";
  if (t.includes("ops") || t.includes("operation")) return "Ops";
  if (t.includes("sales")) return "Sales";
  if (t.includes("marketing")) return "Marketing";
  return "Other";
}

export async function GET(req: NextRequest) {
  try {
    const { user, workspaceId, isAuthenticated } = await getUnifiedAuth(req);
    if (!isAuthenticated || !workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await assertAccess({ userId: user.userId, workspaceId, scope: "workspace" });
    setWorkspaceContext(workspaceId);

    // Check if capacity feature is enabled
    const capacityEnabled = await isOrgCapacityEnabled(workspaceId);
    if (!capacityEnabled) {
      return NextResponse.json(
        { error: "Capacity features are not enabled for this workspace." },
        { status: 403 }
      );
    }

    const url = new URL(req.url);
    const lookaheadDays = Number(url.searchParams.get("lookaheadDays") || "14");
    const now = new Date();
    const lookahead = new Date(now);
    lookahead.setDate(lookahead.getDate() + lookaheadDays);

    // Get all active positions with users (these are our "people")
    const positions = await prisma.orgPosition.findMany({
      where: {
        workspaceId,
        isActive: true,
        userId: { not: null },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
        team: {
          include: {
            department: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    const userIds = positions.map((p) => p.user!.id);

    // Fetch availability records for these users
    const availabilityRecords = await prisma.personAvailability.findMany({
      where: {
        personId: { in: userIds },
        startDate: { lte: lookahead },
        OR: [
          { endDate: null },
          { endDate: { gte: now } },
        ],
      },
      select: {
        personId: true,
        type: true,
        startDate: true,
        endDate: true,
        fraction: true,
      },
    });

    // Fetch allocation records for these users
    const allocationRecords = await prisma.projectAllocation.findMany({
      where: {
        personId: { in: userIds },
        workspaceId,
        startDate: { lte: lookahead },
        OR: [
          { endDate: null },
          { endDate: { gte: now } },
        ],
      },
      select: {
        personId: true,
        fraction: true,
      },
    });

    // Group availability/allocation by userId
    const availabilityByUser = new Map<string, typeof availabilityRecords>();
    for (const av of availabilityRecords) {
      const existing = availabilityByUser.get(av.personId) || [];
      existing.push(av);
      availabilityByUser.set(av.personId, existing);
    }

    const allocationByUser = new Map<string, number>();
    for (const alloc of allocationRecords) {
      const existing = allocationByUser.get(alloc.personId) || 0;
      allocationByUser.set(alloc.personId, existing + alloc.fraction);
    }

    // Compute availability + effective capacity for each person
    const rows = positions
      .filter((p) => p.user)
      .map((p) => {
        const posUser = p.user!;
        const userId = posUser.id;
        const avRecords = availabilityByUser.get(userId) || [];
        const allocations = allocationByUser.get(userId) || 0;

        // Find active unavailability (UNAVAILABLE type that overlaps with now)
        const activeUnavailable = avRecords.find(
          (av) =>
            av.type === "UNAVAILABLE" &&
            av.startDate <= now &&
            (av.endDate === null || av.endDate >= now)
        );

        const unavailableNow = !!activeUnavailable;
        const returnsOn = activeUnavailable?.endDate || null;
        const returningSoon = unavailableNow && returnsOn && returnsOn <= lookahead;
        const availableNow = !unavailableNow;

        // Compute effective capacity: available * (1 - allocatedFraction)
        // If PARTIAL availability exists, reduce base capacity by that fraction
        const partialAv = avRecords.find(
          (av) =>
            av.type === "PARTIAL" &&
            av.startDate <= now &&
            (av.endDate === null || av.endDate >= now)
        );
        const partialFraction = partialAv?.fraction || 1.0;

        const allocatedFraction = Math.min(1.0, allocations);
        const freeFraction = Math.max(0, partialFraction - allocatedFraction);
        const effectiveCapacityUnits = availableNow ? freeFraction : 0;

        return {
          id: posUser.id,
          name: posUser.name || "Unnamed",
          title: p.title || null,
          departmentId: p.team?.department?.id || null,
          departmentName: p.team?.department?.name || null,
          availableNow,
          unavailableNow,
          returningSoon,
          returnsOn: returnsOn ? toISO(returnsOn) : null,
          roleFamily: roleFamilyFromTitle(p.title || null),
          effectiveCapacityUnits,
        };
      });

    const totals = {
      people: rows.length,
      availableNow: rows.filter((r) => r.availableNow).length,
      unavailableNow: rows.filter((r) => r.unavailableNow).length,
      returningSoon: rows.filter((r) => r.returningSoon).length,
      effectiveCapacityUnits: Number(rows.reduce((s, r) => s + r.effectiveCapacityUnits, 0).toFixed(2)),
    };

    // Group by department
    const deptMap = new Map<
      string,
      { id: string; name: string; people: number; availableNow: number; unavailableNow: number; returningSoon: number; effectiveCapacityUnits: number }
    >();
    for (const r of rows) {
      const id = r.departmentId || "unknown";
      const name = r.departmentName || "Unassigned";
      const cur =
        deptMap.get(id) ||
        ({ id, name, people: 0, availableNow: 0, unavailableNow: 0, returningSoon: 0, effectiveCapacityUnits: 0 } as any);
      cur.people += 1;
      cur.availableNow += r.availableNow ? 1 : 0;
      cur.unavailableNow += r.unavailableNow ? 1 : 0;
      cur.returningSoon += r.returningSoon ? 1 : 0;
      cur.effectiveCapacityUnits += r.effectiveCapacityUnits;
      deptMap.set(id, cur);
    }

    const byDepartment = Array.from(deptMap.values())
      .map((d) => ({ ...d, effectiveCapacityUnits: Number(d.effectiveCapacityUnits.toFixed(2)) }))
      .sort((a, b) => b.effectiveCapacityUnits - a.effectiveCapacityUnits);

    // Group by role family
    const roleMap = new Map<string, { key: string; people: number; availableNow: number; effectiveCapacityUnits: number }>();
    for (const r of rows) {
      const key = r.roleFamily;
      const cur = roleMap.get(key) || { key, people: 0, availableNow: 0, effectiveCapacityUnits: 0 };
      cur.people += 1;
      cur.availableNow += r.availableNow ? 1 : 0;
      cur.effectiveCapacityUnits += r.effectiveCapacityUnits;
      roleMap.set(key, cur);
    }

    const byRoleFamily = Array.from(roleMap.values())
      .map((x) => ({ ...x, effectiveCapacityUnits: Number(x.effectiveCapacityUnits.toFixed(2)) }))
      .sort((a, b) => b.effectiveCapacityUnits - a.effectiveCapacityUnits);

    const examples = {
      unavailableNow: rows
        .filter((r) => r.unavailableNow)
        .slice(0, 5)
        .map((r) => ({ id: r.id, name: r.name, title: r.title, returnsOn: r.returnsOn })),
      returningSoon: rows
        .filter((r) => r.returningSoon)
        .slice(0, 5)
        .map((r) => ({ id: r.id, name: r.name, title: r.title, returnsOn: r.returnsOn })),
      availableNow: rows
        .filter((r) => r.availableNow)
        .slice(0, 5)
        .map((r) => ({ id: r.id, name: r.name, title: r.title })),
    };

    const payload: CapacitySnapshotResponse = {
      meta: { lookaheadDays, asOf: toISO(now) },
      totals,
      byDepartment,
      byRoleFamily,
      examples,
    };

    return NextResponse.json(payload);
  } catch (error: unknown) {
    return handleApiError(error, req);
  }
}
