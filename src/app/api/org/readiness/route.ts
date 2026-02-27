import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { handleApiError } from "@/lib/api-errors";

type Verdict = "proceed" | "reassign" | "delay" | "request_support";

type Evidence = {
  key: string;
  label: string;
  severity: "info" | "warn" | "risk";
  detail?: string | null;
};

type OrgReadinessResponse = {
  meta: { asOf: string; lookaheadDays: number; personId?: string | null };
  verdict: { action: Verdict; confidence: "low" | "medium"; rationale: string };
  signals: {
    ownership: "ok" | "warn" | "risk";
    managementLoad: "ok" | "warn" | "risk";
    capacity: "ok" | "warn" | "risk";
    impact: "ok" | "warn" | "risk" | "na";
  };
  summary: {
    unownedDepartments: number;
    unownedTeams: number;
    unownedPositions: number;
    overloadedManagers: number;
    orphans: number;
    availableNow: number;
    effectiveCapacityUnits: number;
    impactedPeople?: number | null;
  };
  evidence: Evidence[];
};

function isoNow() {
  return new Date().toISOString();
}

function riskBand(value: number, warnAt: number, riskAt: number): "ok" | "warn" | "risk" {
  if (value >= riskAt) return "risk";
  if (value >= warnAt) return "warn";
  return "ok";
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const personId = url.searchParams.get("personId");
    const lookaheadDays = Number(url.searchParams.get("lookaheadDays") || "14");

    let auth;
    try {
      auth = await getUnifiedAuth(req);
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspaceId = auth.workspaceId;
    if (!auth.isAuthenticated || !workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await assertAccess({ userId: auth.user.userId, workspaceId, scope: "workspace", requireRole: ["VIEWER"] });
    setWorkspaceContext(workspaceId);

    const now = new Date();
    const lookahead = new Date(now);
    lookahead.setDate(lookahead.getDate() + lookaheadDays);

    // -------------------------------------------------
    // OWNERSHIP (coverage) - schema: OrgDepartment/OrgTeam/OrgPosition scoped by workspaceId
    // -------------------------------------------------
    const departments = await prisma.orgDepartment.findMany({
      where: { workspaceId, isActive: true },
      select: { id: true },
    });

    const teams = await prisma.orgTeam.findMany({
      where: { workspaceId, isActive: true },
      select: { id: true, departmentId: true },
    });

    const filledTeamRows = await prisma.orgPosition.groupBy({
      by: ["teamId"],
      where: {
        workspaceId,
        isActive: true,
        userId: { not: null },
        teamId: { not: null },
      },
      _count: { _all: true },
    });

    const filledTeamIds = new Set<string>(filledTeamRows.map((r) => r.teamId!).filter(Boolean));

    const unownedTeams = teams.filter((t) => !filledTeamIds.has(t.id)).length;

    const deptHasFilledTeam = new Set<string>();
    for (const t of teams) {
      if (filledTeamIds.has(t.id) && t.departmentId) {
        deptHasFilledTeam.add(t.departmentId);
      }
    }

    const unownedDepartments = departments.filter((d) => !deptHasFilledTeam.has(d.id)).length;

    const unownedPositions = await prisma.orgPosition.count({
      where: {
        workspaceId,
        isActive: true,
        userId: null,
      },
    });

    // -------------------------------------------------
    // MANAGEMENT LOAD - schema: OrgPosition.parentId chain
    // -------------------------------------------------
    const overloadedSpan = 8;

    const orphans = await prisma.orgPosition.count({
      where: {
        workspaceId,
        isActive: true,
        userId: { not: null },
        parentId: null,
      },
    });

    const reportRows = await prisma.orgPosition.groupBy({
      by: ["parentId"],
      where: {
        workspaceId,
        isActive: true,
        userId: { not: null },
        parentId: { not: null },
      },
      _count: { _all: true },
    });

    const overloadedManagers = reportRows.filter((r) => (r._count?._all ?? 0) >= overloadedSpan).length;

    // -------------------------------------------------
    // CAPACITY - reuse Step 4 logic (totals only)
    // -------------------------------------------------
    const positions = await prisma.orgPosition.findMany({
      where: {
        workspaceId,
        isActive: true,
        userId: { not: null },
      },
      select: {
        userId: true,
      },
    });

    const userIds = Array.from(new Set(positions.map((p) => p.userId!).filter(Boolean)));

    let availableNow = 0;
    let effectiveCapacityUnits = 0;

    if (userIds.length > 0) {
      const availabilityRecords = await prisma.personAvailability.findMany({
        where: {
          personId: { in: userIds },
          startDate: { lte: lookahead },
          OR: [{ endDate: null }, { endDate: { gte: now } }],
        },
        select: {
          personId: true,
          type: true,
          startDate: true,
          endDate: true,
          fraction: true,
        },
      });

      const allocationRecords = await prisma.projectAllocation.findMany({
        where: {
          personId: { in: userIds },
          workspaceId,
          startDate: { lte: lookahead },
          OR: [{ endDate: null }, { endDate: { gte: now } }],
        },
        select: {
          personId: true,
          fraction: true,
        },
      });

      const availabilityByUser = new Map<string, typeof availabilityRecords>();
      for (const av of availabilityRecords) {
        const existing = availabilityByUser.get(av.personId) || [];
        existing.push(av);
        availabilityByUser.set(av.personId, existing);
      }

      const allocationByUser = new Map<string, number>();
      for (const alloc of allocationRecords) {
        allocationByUser.set(alloc.personId, (allocationByUser.get(alloc.personId) ?? 0) + alloc.fraction);
      }

      for (const uid of userIds) {
        const avRecords = availabilityByUser.get(uid) || [];
        const allocations = allocationByUser.get(uid) || 0;

        const activeUnavailable = avRecords.find(
          (av) =>
            av.type === "UNAVAILABLE" &&
            av.startDate <= now &&
            (av.endDate === null || av.endDate >= now)
        );

        const isUnavailableNow = !!activeUnavailable;
        const isAvailableNow = !isUnavailableNow;

        const partialAv = avRecords.find(
          (av) =>
            av.type === "PARTIAL" &&
            av.startDate <= now &&
            (av.endDate === null || av.endDate >= now)
        );

        const partialFraction = partialAv?.fraction || 1.0;
        const allocatedFraction = Math.min(1.0, allocations);
        const freeFraction = Math.max(0, partialFraction - allocatedFraction);

        if (isAvailableNow) {
          availableNow += 1;
          effectiveCapacityUnits += freeFraction;
        }
      }

      effectiveCapacityUnits = Number(effectiveCapacityUnits.toFixed(2));
    }

    // -------------------------------------------------
    // IMPACT (optional) - if personId provided, compute total impacted people
    // -------------------------------------------------
    let impactedPeople: number | null = null;

    if (personId) {
      const maxDepth = 4;
      const maxNodes = 50;

      const startPosition = await prisma.orgPosition.findFirst({
        where: {
          userId: personId,
          workspaceId,
          isActive: true,
        },
        select: {
          id: true,
          parentId: true,
          teamId: true,
          team: {
            select: {
              department: {
                select: {
                  id: true,
                },
              },
            },
          },
        },
      });

      if (!startPosition) {
        return NextResponse.json({ error: "Person not found." }, { status: 404 });
      }

      const impactedSet = new Set<string>();

      // Direct reports
      const directPositions = await prisma.orgPosition.findMany({
        where: {
          parentId: startPosition.id,
          workspaceId,
          isActive: true,
          userId: { not: null },
        },
        select: {
          id: true,
          userId: true,
        },
        take: 20,
      });

      for (const p of directPositions) {
        if (p.userId) impactedSet.add(p.userId);
      }

      // Indirect reports (bounded BFS)
      const queue: Array<{ positionId: string; depth: number }> = directPositions.map((d) => ({ positionId: d.id, depth: 1 }));
      const seen = new Set<string>([startPosition.id, ...directPositions.map((d) => d.id)]);

      while (queue.length > 0 && impactedSet.size < maxNodes) {
        const { positionId, depth } = queue.shift()!;
        if (depth >= maxDepth) continue;

        const children = await prisma.orgPosition.findMany({
          where: {
            parentId: positionId,
            workspaceId,
            isActive: true,
            userId: { not: null },
          },
          select: {
            id: true,
            userId: true,
          },
          take: 50,
        });

        for (const child of children) {
          if (seen.has(child.id)) continue;
          seen.add(child.id);
          if (child.userId) impactedSet.add(child.userId);
          queue.push({ positionId: child.id, depth: depth + 1 });
          if (impactedSet.size >= maxNodes) break;
        }
      }

      // Team peers
      const teamPeerIds = new Set<string>();
      if (startPosition.teamId) {
        const teamPeers = await prisma.orgPosition.findMany({
          where: {
            teamId: startPosition.teamId,
            workspaceId,
            isActive: true,
            userId: { not: null, notIn: [personId] },
          },
          select: { userId: true },
          take: 20,
        });

        for (const p of teamPeers) {
          if (p.userId) {
            teamPeerIds.add(p.userId);
            impactedSet.add(p.userId);
          }
        }
      }

      // Department peers (excluding team peers)
      const departmentId = startPosition.team?.department?.id ?? null;
      if (departmentId) {
        const deptTeams = await prisma.orgTeam.findMany({
          where: {
            departmentId,
            workspaceId,
            isActive: true,
          },
          select: { id: true },
        });

        const deptTeamIds = deptTeams.map((t) => t.id);
        if (deptTeamIds.length > 0) {
          const deptPeers = await prisma.orgPosition.findMany({
            where: {
              teamId: { in: deptTeamIds },
              workspaceId,
              isActive: true,
              userId: { not: null, notIn: [personId] },
            },
            select: { userId: true },
            take: 20,
          });

          for (const p of deptPeers) {
            if (p.userId && !teamPeerIds.has(p.userId)) impactedSet.add(p.userId);
          }
        }
      }

      // Managers in chain (stakeholders)
      const chainSeen = new Set<string>([startPosition.id]);
      let cur: string | null = startPosition.parentId;
      let chainDepth = 0;
      while (cur && chainDepth < 12) {
        if (chainSeen.has(cur)) break;
        chainSeen.add(cur);

        const mgrPos = await prisma.orgPosition.findFirst({
          where: {
            id: cur,
            workspaceId,
            isActive: true,
          },
          select: { userId: true, parentId: true },
        });

        if (!mgrPos) break;
        if (mgrPos.userId) impactedSet.add(mgrPos.userId);

        cur = mgrPos.parentId;
        chainDepth += 1;
      }

      impactedPeople = impactedSet.size;
    }

    // -------------------------------------------------
    // SIGNALS
    // -------------------------------------------------
    const ownershipSignal = riskBand(unownedDepartments + unownedTeams + unownedPositions, 3, 10);
    const managementSignal = riskBand(overloadedManagers + orphans, 5, 15);

    // capacity thresholds (v1)
    const capacitySignal: "ok" | "warn" | "risk" =
      effectiveCapacityUnits < 3 ? "risk" : effectiveCapacityUnits < 8 ? "warn" : "ok";

    const impactSignal: "ok" | "warn" | "risk" | "na" =
      personId == null
        ? "na"
        : impactedPeople != null && impactedPeople > 20
          ? "risk"
          : impactedPeople != null && impactedPeople > 8
            ? "warn"
            : "ok";

    // -------------------------------------------------
    // EVIDENCE
    // -------------------------------------------------
    const evidence: Evidence[] = [];

    if (unownedDepartments > 0) {
      evidence.push({
        key: "unowned_departments",
        label: `${unownedDepartments} departments missing an owner/lead`,
        severity: unownedDepartments > 3 ? "risk" : "warn",
      });
    }

    if (unownedTeams > 0) {
      evidence.push({
        key: "unowned_teams",
        label: `${unownedTeams} teams missing an owner/lead`,
        severity: unownedTeams > 5 ? "risk" : "warn",
      });
    }

    if (unownedPositions > 0) {
      evidence.push({
        key: "unowned_positions",
        label: `${unownedPositions} unowned positions`,
        severity: unownedPositions > 10 ? "risk" : "warn",
      });
    }

    if (orphans > 0) {
      evidence.push({
        key: "orphans",
        label: `${orphans} people missing a manager`,
        severity: orphans > 10 ? "risk" : "warn",
      });
    }

    if (overloadedManagers > 0) {
      evidence.push({
        key: "overloaded_managers",
        label: `${overloadedManagers} managers over span threshold (${overloadedSpan}+)`,
        severity: overloadedManagers > 3 ? "risk" : "warn",
      });
    }

    if (capacitySignal !== "ok") {
      evidence.push({
        key: "capacity",
        label: `Effective capacity ~${effectiveCapacityUnits} units available now`,
        severity: capacitySignal === "risk" ? "risk" : "warn",
      });
    }

    if (personId && impactedPeople != null) {
      evidence.push({
        key: "impact",
        label: `Impact radius includes ~${impactedPeople} stakeholders`,
        severity: impactedPeople > 15 ? "risk" : impactedPeople > 6 ? "warn" : "info",
      });
    }

    // -------------------------------------------------
    // VERDICT (Org-only, explainable)
    // -------------------------------------------------
    const bands = [ownershipSignal, managementSignal, capacitySignal, impactSignal].filter(
      (s): s is "ok" | "warn" | "risk" => s !== "na"
    );

    const riskCount = bands.filter((s) => s === "risk").length;
    const warnCount = bands.filter((s) => s === "warn").length;

    let action: Verdict = "proceed";
    let rationale = "Structure and coverage look adequate for most work.";
    let confidence: "low" | "medium" = "medium";

    if (capacitySignal === "risk") {
      action = "delay";
      rationale = "Capacity is too constrained to commit safely.";
      confidence = "low";
    } else if (ownershipSignal === "risk") {
      action = "reassign";
      rationale = "Ownership gaps are large — clarify owners before execution.";
      confidence = "low";
    } else if (managementSignal === "risk") {
      action = "request_support";
      rationale = "Management load and reporting gaps suggest execution risk — add support or adjust scope.";
      confidence = "low";
    } else if (riskCount === 0 && warnCount >= 2) {
      action = "proceed";
      rationale = "Proceed with caution — address highlighted gaps early.";
      confidence = "low";
    }

    const payload: OrgReadinessResponse = {
      meta: { asOf: isoNow(), lookaheadDays, personId: personId ?? null },
      verdict: { action, confidence, rationale },
      signals: {
        ownership: ownershipSignal,
        managementLoad: managementSignal,
        capacity: capacitySignal,
        impact: impactSignal,
      },
      summary: {
        unownedDepartments,
        unownedTeams,
        unownedPositions,
        overloadedManagers,
        orphans,
        availableNow,
        effectiveCapacityUnits,
        impactedPeople,
      },
      evidence: evidence.slice(0, 10),
    };

    return NextResponse.json(payload);
  } catch (error) {
    return handleApiError(error, req);
  }
}
