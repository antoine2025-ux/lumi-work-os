/**
 * My Team — For users who lead at least one team OR have direct reports (managers)
 */

import { getOrgPermissionContext } from "@/lib/org/permissions.server";
import { prisma } from "@/lib/db";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { OrgPageHeader } from "@/components/org/OrgPageHeader";
import { PendingActionsSection } from "@/components/org/my-team/pending-actions-section";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { resolveEffectiveCapacityBatch } from "@/lib/org/capacity/resolveEffectiveCapacity";
import { getDefaultIssueWindow, getWorkspaceThresholdsAsync } from "@/lib/org/capacity/thresholds";
import { computeTeamCapacityRollup } from "@/lib/org/capacity/teamRollup";
import type { PersonCapacityMeta } from "@/lib/org/capacity/status";
import { format } from "date-fns";

export const dynamic = "force-dynamic";

const LEAVE_TYPE_DISPLAY: Record<string, string> = {
  VACATION: "Vacation",
  SICK: "Sick Leave",
  PERSONAL: "Personal",
  PARENTAL: "Parental Leave",
  UNPAID: "Unpaid",
};

type PageProps = {
  params: Promise<{ workspaceSlug: string }>;
};

export default async function MyTeamPage({ params }: PageProps) {
  const { workspaceSlug } = await params;
  const context = await getOrgPermissionContext();

  if (!context) {
    return (
      <div className="p-10">
        <Alert variant="destructive" className="border-amber-900/60 bg-amber-950/40">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>You need to be in a workspace to view your team.</AlertDescription>
        </Alert>
      </div>
    );
  }

  setWorkspaceContext(context.workspaceId);

  const [ledTeams, managerLinks] = await Promise.all([
    prisma.orgTeam.findMany({
      where: {
        leaderId: context.userId,
        workspaceId: context.workspaceId,
      },
      include: {
        department: true,
        positions: {
          where: { isActive: true, archivedAt: null },
          include: { user: true },
        },
      },
    }),
    prisma.personManagerLink.findMany({
      where: {
        managerId: context.userId,
        workspaceId: context.workspaceId,
      },
    }),
  ]);

  const hasTeam = ledTeams.length > 0;
  const hasReports = managerLinks.length > 0;

  if (!hasTeam && !hasReports) {
    return (
      <>
        <OrgPageHeader
          legacyBreadcrumb="ORG / MY TEAM"
          title="My Team"
          description="Teams you lead or direct reports"
        />
        <div className="p-10">
          <Alert className="border-amber-900/60 bg-amber-950/40">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You must be a team lead or manager to view this page. Contact your admin to be assigned.
            </AlertDescription>
          </Alert>
        </div>
      </>
    );
  }

  const reportPersonIds = managerLinks.map((l) => l.personId);
  const teamMemberPersonIds = ledTeams.flatMap((t) =>
    t.positions.filter((p) => p.userId).map((p) => p.userId!)
  );
  const approvablePersonIds = [
    ...new Set([...reportPersonIds, ...teamMemberPersonIds]),
  ].filter((id) => id !== context.userId);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [pendingLeaveRequests, approvedUpcomingLeave] = await Promise.all([
    approvablePersonIds.length > 0
      ? prisma.leaveRequest.findMany({
          where: {
            workspaceId: context.workspaceId,
            personId: { in: approvablePersonIds },
            status: "PENDING",
          },
          orderBy: { createdAt: "asc" },
        })
      : [],
    approvablePersonIds.length > 0
      ? prisma.leaveRequest.findMany({
          where: {
            workspaceId: context.workspaceId,
            personId: { in: approvablePersonIds },
            status: "APPROVED",
            endDate: { gte: todayStart },
          },
          orderBy: { startDate: "asc" },
        })
      : [],
  ]);

  const userIds = new Set<string>();
  const teamMembers: Array<{
    id: string;
    userId: string;
    name: string | null;
    email: string;
    image: string | null;
    title: string | null;
    source: "team" | "report";
  }> = [];

  for (const team of ledTeams) {
    for (const pos of team.positions) {
      if (pos.userId && !userIds.has(pos.userId)) {
        userIds.add(pos.userId);
        teamMembers.push({
          id: pos.id,
          userId: pos.userId,
          name: pos.user?.name ?? null,
          email: pos.user?.email ?? "—",
          image: pos.user?.image ?? null,
          title: pos.title ?? null,
          source: "team",
        });
      }
    }
  }

  if (reportPersonIds.length > 0) {
    const reportUsers = await prisma.user.findMany({
      where: { id: { in: reportPersonIds } },
      select: { id: true, name: true, email: true, image: true },
    });
    const positions = await prisma.orgPosition.findMany({
      where: {
        userId: { in: reportPersonIds },
        workspaceId: context.workspaceId,
        isActive: true,
        archivedAt: null,
      },
      select: { id: true, userId: true, title: true },
    });
    const posByUser = Object.fromEntries(positions.map((p) => [p.userId!, p]));

    for (const u of reportUsers) {
      if (!userIds.has(u.id)) {
        userIds.add(u.id);
        const pos = posByUser[u.id];
        teamMembers.push({
          id: pos?.id ?? u.id,
          userId: u.id,
          name: u.name ?? null,
          email: u.email ?? "—",
          image: u.image ?? null,
          title: pos?.title ?? null,
          source: "report",
        });
      }
    }
  }

  const usersById = Object.fromEntries(
    teamMembers.map((m) => [m.userId, { id: m.userId, name: m.name, email: m.email, image: m.image }])
  );

  const requestsWithPerson = pendingLeaveRequests.map((r) => ({
    ...r,
    person: usersById[r.personId] ?? {
      id: r.personId,
      name: null,
      email: "—",
      image: null,
    },
  }));

  const approvedLeaveWithPerson = approvedUpcomingLeave.map((r) => ({
    ...r,
    person: usersById[r.personId] ?? {
      id: r.personId,
      name: null,
      email: "—",
      image: null,
    },
  }));

  // Sort team members by name
  teamMembers.sort((a, b) => {
    const nameA = a.name ?? a.email;
    const nameB = b.name ?? b.email;
    return nameA.localeCompare(nameB);
  });

  const team = ledTeams[0];
  const pageTitle = team?.name ?? "My Team";
  const pageDescription =
    team?.department
      ? `${team.department.name} Department`
      : hasTeam && hasReports
        ? "Your direct reports and team overview"
        : "Your direct reports and team overview";

  // Fetch team capacity when we have a led team
  let teamCapacityRollup: {
    availableHours: number;
    allocatedHours: number;
    utilizationPct: number;
  } | null = null;
  let avgUtilizationPct: number | null = null;

  if (team) {
    const issueWindow = getDefaultIssueWindow();
    const positions = await prisma.orgPosition.findMany({
      where: {
        workspaceId: context.workspaceId,
        teamId: team.id,
        isActive: true,
        archivedAt: null,
        userId: { not: null },
        user: {
          workspaceMemberships: {
            some: {
              workspaceId: context.workspaceId,
              employmentStatus: { not: "TERMINATED" },
            },
          },
        },
      },
      select: {
        userId: true,
        title: true,
        user: { select: { id: true, name: true } },
      },
    });

    const personIds = [...new Set(positions.map((p) => p.userId!))];

    if (personIds.length > 0) {
      const capacityMap = await resolveEffectiveCapacityBatch(
        context.workspaceId,
        personIds,
        { start: issueWindow.start, end: issueWindow.end }
      );

      const [contractCounts, availabilityCounts] = await Promise.all([
        prisma.capacityContract.groupBy({
          by: ["personId"],
          where: {
            workspaceId: context.workspaceId,
            personId: { in: personIds },
            effectiveFrom: { lte: issueWindow.start },
            OR: [{ effectiveTo: null }, { effectiveTo: { gte: issueWindow.start } }],
          },
          _count: true,
        }),
        prisma.personAvailability.groupBy({
          by: ["personId"],
          where: {
            workspaceId: context.workspaceId,
            personId: { in: personIds },
            startDate: { lte: issueWindow.end },
            OR: [{ endDate: null }, { endDate: { gte: issueWindow.start } }],
          },
          _count: true,
        }),
      ]);

      const contractCountMap = new Map(contractCounts.map((c) => [c.personId, c._count]));
      const availabilityCountMap = new Map(availabilityCounts.map((a) => [a.personId, a._count]));

      const members = positions
        .map((pos) => {
          const personId = pos.userId!;
          const capacity = capacityMap.get(personId);
          if (!capacity) return null;
          const meta: PersonCapacityMeta = {
            isContractDefault: (contractCountMap.get(personId) ?? 0) === 0,
            hasAvailabilityData: (availabilityCountMap.get(personId) ?? 0) > 0,
          };
          return {
            personId,
            personName: pos.user?.name ?? personId,
            teamId: team.id,
            positionTitle: pos.title,
            capacity,
            meta,
          };
        })
        .filter((m): m is NonNullable<typeof m> => m !== null);

      const teamPlan = await prisma.teamCapacityPlan.findUnique({
        where: { teamId: team.id },
        select: { weeklyDemandHours: true },
      });

      const rollup = computeTeamCapacityRollup(
        team.id,
        team.name,
        team.departmentId,
        members,
        teamPlan
      );

      teamCapacityRollup = {
        availableHours: rollup.availableHours,
        allocatedHours: rollup.allocatedHours,
        utilizationPct: rollup.utilizationPct,
      };
      avgUtilizationPct = rollup.utilizationPct * 100;
    }
  }

  const totalCapacityHours = teamMembers.length * 40;
  const utilizationBarPct = teamCapacityRollup
    ? Math.min(100, Math.round(teamCapacityRollup.utilizationPct * 100))
    : 0;

  // Helper functions for color coding
  const getUtilizationColor = (pct: number) => {
    if (pct < 80) return 'bg-emerald-500';
    if (pct <= 100) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getLeaveTypeBadgeColor = (leaveType: string) => {
    switch (leaveType) {
      case 'VACATION':
        return 'border-blue-500/50 bg-blue-500/10 text-blue-600 dark:text-blue-400';
      case 'SICK':
        return 'border-amber-500/50 bg-amber-500/10 text-amber-600 dark:text-amber-400';
      case 'PERSONAL':
        return 'border-slate-500/50 bg-slate-500/10 text-slate-600 dark:text-slate-400';
      case 'PARENTAL':
        return 'border-purple-500/50 bg-purple-500/10 text-purple-600 dark:text-purple-400';
      default:
        return 'border-slate-500/50 bg-slate-500/10 text-slate-600 dark:text-slate-400';
    }
  };

  return (
    <>
      <OrgPageHeader
        legacyBreadcrumb="ORG / MY TEAM"
        title={pageTitle}
        description={pageDescription}
      />
      <div className="p-10 pb-10 max-w-6xl">
        {/* Stat cards row */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          <div className="bg-card/30 backdrop-blur-sm rounded-lg border border-border/30 p-4">
            <p className="text-xs text-muted-foreground mb-1">Team Size</p>
            <p className="text-2xl font-semibold tracking-tight text-foreground">
              {teamMembers.length} people
            </p>
          </div>
          <div className="bg-card/30 backdrop-blur-sm rounded-lg border border-border/30 p-4">
            <p className="text-xs text-muted-foreground mb-1">Active Today</p>
            <p className="text-2xl font-semibold tracking-tight text-foreground">—</p>
          </div>
          <div className="bg-card/30 backdrop-blur-sm rounded-lg border border-border/30 p-4">
            <p className="text-xs text-muted-foreground mb-1">Avg Utilization</p>
            <p className="text-2xl font-semibold tracking-tight text-foreground">
              {avgUtilizationPct != null ? `${Math.round(avgUtilizationPct)}%` : "—"}
            </p>
          </div>
          <div className="bg-card/30 backdrop-blur-sm rounded-lg border border-border/30 p-4">
            <p className="text-xs text-muted-foreground mb-1">Pending Approvals</p>
            <p
              className={`text-2xl font-semibold tracking-tight ${
                pendingLeaveRequests.length > 0 ? "text-amber-600 dark:text-amber-500" : "text-foreground"
              }`}
            >
              {pendingLeaveRequests.length}
            </p>
          </div>
        </div>

        {/* Pending Actions — only show if count > 0 */}
        {pendingLeaveRequests.length > 0 && (
          <div className="mb-6">
            <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-3">
              Pending Actions
            </h3>
            <PendingActionsSection requests={requestsWithPerson} workspaceSlug={workspaceSlug} />
          </div>
        )}

        {/* Team Workload (left) + Capacity Overview & Who's Out (right) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
          {/* Left: Team Workload */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              Team Workload
            </h3>
            <div className="space-y-1">
              {teamMembers.map((member) => {
                // TODO: Wire to /api/org/capacity/people/[personId] for per-member utilization and project count
                const utilization = 0;
                const projectCount = "—";
                const utilizationColor = getUtilizationColor(utilization);

                return (
                  <Link
                    key={member.id}
                    href={`/w/${workspaceSlug}/org/people/${member.userId}`}
                    className="flex items-center gap-3 py-2 px-3 rounded-md hover:bg-accent/20 transition-colors"
                  >
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarImage src={member.image ?? undefined} />
                      <AvatarFallback className="bg-primary/20 text-foreground text-xs">
                        {member.name?.charAt(0).toUpperCase() ?? "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {member.name ?? member.email}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {member.title ?? "Member"}
                      </p>
                    </div>
                    <div className="w-28 flex items-center gap-2 shrink-0">
                      <div className="flex-1 h-2 rounded-full bg-muted min-w-0">
                        <div
                          className={`h-full rounded-full ${utilization > 0 ? utilizationColor : 'bg-muted'} transition-all`}
                          style={{ width: `${utilization}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground w-8 text-right">
                        {utilization > 0 ? `${utilization}%` : "—"}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {projectCount} projects
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Right: Capacity Overview + Who's Out stacked */}
          <div className="flex flex-col gap-6">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                Capacity Overview
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total capacity</span>
                  <span className="font-medium text-foreground">{totalCapacityHours}h/week</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Allocated</span>
                  <span className="font-medium text-foreground">
                    {teamCapacityRollup
                      ? `${Math.round(teamCapacityRollup.allocatedHours * 10) / 10}h`
                      : "—"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Available</span>
                  <span className="font-medium text-foreground">
                    {teamCapacityRollup
                      ? `${Math.round(teamCapacityRollup.availableHours * 10) / 10}h`
                      : "—"}
                  </span>
                </div>
                <div className="pt-2">
                  <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full ${utilizationBarPct > 0 ? getUtilizationColor(utilizationBarPct) : 'bg-muted'} transition-all`}
                      style={{ width: `${utilizationBarPct}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Utilization {teamCapacityRollup ? `${utilizationBarPct}%` : "—"}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                Who&apos;s Out
              </h3>
              {approvedLeaveWithPerson.length > 0 ? (
                <div className="space-y-2">
                  {approvedLeaveWithPerson.map((req) => (
                    <div
                      key={req.id}
                      className="flex items-center gap-3 py-2 border-b border-border/50 last:border-b-0"
                    >
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarImage src={req.person.image ?? undefined} />
                        <AvatarFallback className="bg-primary/20 text-xs">
                          {req.person.name?.charAt(0).toUpperCase() ?? "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {req.person.name ?? req.person.email}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(req.startDate), "MMM d")} –{" "}
                            {format(new Date(req.endDate), "MMM d")}
                          </span>
                          <Badge variant="outline" className={getLeaveTypeBadgeColor(req.leaveType)}>
                            {LEAVE_TYPE_DISPLAY[req.leaveType] ?? req.leaveType}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-2">No upcoming time off</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
